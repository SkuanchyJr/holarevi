import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { LandingHeader } from "@/components/landing-header";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, Truck, Star, Loader2, Mail, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Order {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  quantity?: number;
  totalCents?: number;
  status?: string;
}

export default function NFCOrderSuccess() {
  const [, params] = useLocation();
  const { language } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentIntentId = searchParams.get("payment_intent");
    const redirectStatus = searchParams.get("redirect_status");

    if (!paymentIntentId || redirectStatus !== "succeeded") {
      setLoading(false);
      return;
    }

    async function confirm() {
      try {
        // Confirm with server (updates DB + sends email)
        const confirmRes = await fetch("/api/nfc-shop/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId }),
        });
        if (confirmRes.ok) {
          const data = await confirmRes.json();
          if (data.order) setOrder(data.order);
          setConfirmed(true);
        }

        // Fallback: get order info
        if (!confirmed) {
          const orderRes = await fetch(`/api/nfc-shop/order-by-intent/${paymentIntentId}`);
          if (orderRes.ok) {
            const data = await orderRes.json();
            if (data.order) setOrder(data.order);
          }
        }
      } catch {
        // Silent — order still shows success UI
      } finally {
        setLoading(false);
      }
    }

    confirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const redirectStatus = searchParams.get("redirect_status");
  const isSuccess = redirectStatus === "succeeded";

  const orderRef = order?.id ? order.id.slice(0, 8).toUpperCase() : "—";
  const total = order?.totalCents
    ? `${(order.totalCents / 100).toFixed(2).replace(".", ",")}€`
    : "25,00€";

  return (
    <div className="page-texture min-h-screen">
      <LandingHeader />

      <div className="container mx-auto max-w-2xl px-4 py-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-gray-500">Confirmando tu pedido...</p>
          </div>
        ) : !isSuccess ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No se pudo confirmar el pago
            </p>
            <p className="text-gray-500 mb-6">
              Si crees que es un error, escríbenos a{" "}
              <a href="mailto:info@holarevi.com" className="text-blue-600 underline">
                info@holarevi.com
              </a>
            </p>
            <Link href={`/${language}/nfc`}>
              <Button variant="outline">Volver al producto</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main confirmation card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 mx-auto mb-6 shadow-inner">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                ¡Pedido confirmado!
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mb-1">
                Referencia:{" "}
                <span className="font-bold text-gray-900 dark:text-gray-100">#{orderRef}</span>
              </p>
              {order?.email && (
                <p className="text-sm text-gray-400 flex items-center justify-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Hemos enviado la confirmación a <strong>{order.email}</strong>
                </p>
              )}
            </div>

            {/* Order details */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Resumen del pedido</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Producto</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Stand NFC HolaRevi × {order?.quantity ?? 1}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Envío</span>
                  <span className="font-medium text-emerald-600">Gratis · España Península</span>
                </div>
                {order?.city && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Dirección</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-right max-w-[200px]">
                      {order.address}, {order.postalCode} {order.city}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="font-bold text-gray-900 dark:text-gray-100">Total pagado</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{total}</span>
                </div>
              </div>
            </div>

            {/* What's next */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-5">¿Qué pasa ahora?</h2>
              <div className="space-y-5">
                {[
                  {
                    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
                    bg: "bg-emerald-50 dark:bg-emerald-900/30",
                    title: "Pedido confirmado ✓",
                    desc: "Tu pago se ha procesado correctamente.",
                    done: true,
                  },
                  {
                    icon: <Star className="h-5 w-5 text-blue-600" />,
                    bg: "bg-blue-50 dark:bg-blue-900/30",
                    title: "Personalización",
                    desc: "Preparamos tu stand con la configuración de tu Google Business.",
                  },
                  {
                    icon: <Package className="h-5 w-5 text-amber-600" />,
                    bg: "bg-amber-50 dark:bg-amber-900/30",
                    title: "Preparación y envío",
                    desc: "Estimado Q1 2026. Te enviaremos el número de seguimiento por email.",
                  },
                  {
                    icon: <Truck className="h-5 w-5 text-purple-600" />,
                    bg: "bg-purple-50 dark:bg-purple-900/30",
                    title: "Entrega en 5-7 días laborables",
                    desc: "Envío gratuito a España Península.",
                  },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className={`h-10 w-10 rounded-full ${step.bg} flex items-center justify-center flex-shrink-0`}>
                      {step.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{step.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 text-center shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                Mientras recibes tu stand…
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Activa HolaRevi y empieza a responder reseñas de Google con IA. Gratis los primeros 14 días.
              </p>
              <Link href={`/${language}/auth`}>
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-bold shadow-md">
                  Crear mi cuenta HolaRevi
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <p className="text-center text-sm text-gray-400 dark:text-gray-500">
              ¿Tienes alguna pregunta? Escríbenos a{" "}
              <a href="mailto:info@holarevi.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                info@holarevi.com
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
