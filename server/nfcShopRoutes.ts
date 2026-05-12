import type { Express, Request, Response } from "express";
import { db } from "./db";
import { nfcOrders } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sendNfcOrderConfirmationEmail } from "./jobs/nfcOrderEmail";

const NFC_PRICE_CENTS = 2500; // €25.00

export function registerNfcShopRoutes(app: Express): void {
  // Config: publishable key + price info
  app.get("/api/nfc-shop/config", async (_req: Request, res: Response) => {
    try {
      const publishableKey = await getStripePublishableKey();
      return res.json({ success: true, publishableKey, priceCents: NFC_PRICE_CENTS, currency: "eur" });
    } catch {
      return res.status(503).json({ success: false, message: "Payment service unavailable" });
    }
  });

  // Create a Stripe PaymentIntent for the NFC stand
  app.post("/api/nfc-shop/create-payment-intent", async (req: Request, res: Response) => {
    try {
      const quantity = Math.max(1, Math.min(10, parseInt(req.body.quantity ?? 1)));
      const totalCents = NFC_PRICE_CENTS * quantity;

      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: "eur",
        automatic_payment_methods: { enabled: true },
        metadata: {
          product: "nfc_stand",
          product_id: process.env.STRIPE_NFC_PRODUCT_ID ?? "",
          quantity: String(quantity),
        },
      });

      return res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        totalCents,
      });
    } catch (error: any) {
      console.error("[NFC Shop] create-payment-intent error:", error?.message);
      return res.status(500).json({ success: false, message: "Failed to initialize payment" });
    }
  });

  // Save customer info linked to a PaymentIntent (called before stripe.confirmPayment)
  app.post("/api/nfc-shop/save-order-info", async (req: Request, res: Response) => {
    try {
      const {
        paymentIntentId, firstName, lastName, email,
        phone, company, address, city, postalCode, province, quantity, notes,
      } = req.body;

      if (!paymentIntentId || !firstName || !lastName || !email || !address || !city || !postalCode) {
        return res.status(400).json({ success: false, message: "Faltan campos obligatorios" });
      }

      const qty = Math.max(1, Math.min(10, parseInt(quantity ?? 1)));
      const totalCents = NFC_PRICE_CENTS * qty;

      const existing = await db.query.nfcOrders.findFirst({
        where: eq(nfcOrders.stripePaymentIntentId, paymentIntentId),
      });

      if (existing) {
        await db.update(nfcOrders)
          .set({
            firstName, lastName, email,
            phone: phone || null, company: company || null,
            address, city, postalCode, province: province || null,
            quantity: qty, totalCents, notes: notes || null,
            updatedAt: new Date(),
          })
          .where(eq(nfcOrders.stripePaymentIntentId, paymentIntentId));
      } else {
        await db.insert(nfcOrders).values({
          stripePaymentIntentId: paymentIntentId,
          status: "pending_payment",
          firstName, lastName, email,
          phone: phone || null, company: company || null,
          address, city, postalCode, province: province || null,
          country: "ES", quantity: qty,
          unitPriceCents: NFC_PRICE_CENTS, totalCents,
          notes: notes || null,
        });
      }

      // Update Stripe metadata + shipping for receipt
      try {
        const stripe = await getUncachableStripeClient();
        await stripe.paymentIntents.update(paymentIntentId, {
          receipt_email: email,
          metadata: {
            product: "nfc_stand",
            quantity: String(qty),
            customerName: `${firstName} ${lastName}`,
            company: company || "",
          },
          shipping: {
            name: `${firstName} ${lastName}`,
            address: {
              line1: address,
              city,
              postal_code: postalCode,
              state: province || "",
              country: "ES",
            },
            phone: phone || "",
          },
        });
      } catch (stripeErr: any) {
        console.warn("[NFC Shop] Could not update Stripe metadata:", stripeErr?.message);
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error("[NFC Shop] save-order-info error:", error?.message);
      return res.status(500).json({ success: false, message: "Failed to save order info" });
    }
  });

  // Confirm payment after Stripe redirect — verifies with Stripe + sends email
  app.post("/api/nfc-shop/confirm-payment", async (req: Request, res: Response) => {
    try {
      const { paymentIntentId } = req.body;
      if (!paymentIntentId) {
        return res.status(400).json({ success: false, message: "Missing paymentIntentId" });
      }

      const stripe = await getUncachableStripeClient();
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (pi.status !== "succeeded") {
        return res.status(400).json({ success: false, message: "Payment not confirmed", status: pi.status });
      }

      // Update order status
      const [updatedOrder] = await db.update(nfcOrders)
        .set({ status: "paid", updatedAt: new Date() })
        .where(eq(nfcOrders.stripePaymentIntentId, paymentIntentId))
        .returning();

      // Send confirmation email if not already sent
      if (updatedOrder && !updatedOrder.confirmationEmailSent) {
        try {
          await sendNfcOrderConfirmationEmail(updatedOrder);
          await db.update(nfcOrders)
            .set({ confirmationEmailSent: true })
            .where(eq(nfcOrders.stripePaymentIntentId, paymentIntentId));
        } catch (emailErr: any) {
          console.error("[NFC Shop] Email send error:", emailErr?.message);
        }
      }

      return res.json({ success: true, order: updatedOrder });
    } catch (error: any) {
      console.error("[NFC Shop] confirm-payment error:", error?.message);
      return res.status(500).json({ success: false, message: "Failed to confirm payment" });
    }
  });

  // Get order by PaymentIntent ID (for success page display)
  app.get("/api/nfc-shop/order-by-intent/:paymentIntentId", async (req: Request, res: Response) => {
    try {
      const { paymentIntentId } = req.params;

      const order = await db.query.nfcOrders.findFirst({
        where: eq(nfcOrders.stripePaymentIntentId, paymentIntentId),
      });

      if (!order) {
        const stripe = await getUncachableStripeClient();
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        return res.json({
          success: true,
          order: { status: pi.status === "succeeded" ? "paid" : "pending_payment", email: pi.receipt_email, totalCents: pi.amount },
        });
      }

      return res.json({ success: true, order });
    } catch (error: any) {
      console.error("[NFC Shop] order-by-intent error:", error?.message);
      return res.status(500).json({ success: false, message: "Failed to fetch order" });
    }
  });

  // Stripe webhook (optional — configure STRIPE_NFC_WEBHOOK_SECRET in env)
  app.post("/api/nfc-shop/webhook", async (req: Request, res: Response) => {
    let event: any;
    try {
      const stripe = await getUncachableStripeClient();
      const sig = req.headers["stripe-signature"] as string;
      const secret = process.env.STRIPE_NFC_WEBHOOK_SECRET;
      event = secret && sig
        ? stripe.webhooks.constructEvent(req.body, sig, secret)
        : req.body;
    } catch (err: any) {
      return res.status(400).json({ error: "Webhook error: " + err.message });
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      if (pi.metadata?.product !== "nfc_stand") return res.json({ received: true });

      try {
        const [updatedOrder] = await db.update(nfcOrders)
          .set({ status: "paid", updatedAt: new Date() })
          .where(eq(nfcOrders.stripePaymentIntentId, pi.id))
          .returning();

        if (updatedOrder && !updatedOrder.confirmationEmailSent) {
          await sendNfcOrderConfirmationEmail(updatedOrder);
          await db.update(nfcOrders)
            .set({ confirmationEmailSent: true })
            .where(eq(nfcOrders.stripePaymentIntentId, pi.id));
        }
      } catch (err: any) {
        console.error("[NFC Webhook] Processing error:", err?.message);
      }
    }

    return res.json({ received: true });
  });
}
