import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import type Stripe from 'stripe';

function log(message: string, prefix = 'webhook') {
  const now = new Date().toLocaleTimeString();
  console.log(`${now} [${prefix}] ${message}`);
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    
    // First, let stripe-replit-sync process and verify the webhook
    // This handles signature verification and syncs data to internal tables
    await sync.processWebhook(payload, signature, uuid);
    
    // Parse the event from the raw payload
    // Signature was already verified by stripe-replit-sync above
    const stripe = await getUncachableStripeClient();
    
    try {
      // Parse the raw JSON to get the event
      const eventData = JSON.parse(payload.toString('utf8'));
      const event = eventData as Stripe.Event;
      
      log(`Processing event: ${event.type} (${event.id})`);
      
      // Handle subscription-related events to update users table
      await WebhookHandlers.handleStripeEvent(event, stripe);
      
    } catch (err: any) {
      log(`Error processing webhook for user update: ${err.message}`);
      // Don't throw - the sync already succeeded, this is just for user updates
    }
  }
  
  static async handleStripeEvent(event: Stripe.Event, stripe: Stripe): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await WebhookHandlers.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session, stripe);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await WebhookHandlers.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await WebhookHandlers.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await WebhookHandlers.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await WebhookHandlers.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      default:
        // Ignore other events
        break;
    }
  }
  
  static async handleCheckoutComplete(session: Stripe.Checkout.Session, stripe: Stripe): Promise<void> {
    log(`Checkout completed: ${session.id}`);
    
    // Get userId from metadata
    const userId = session.metadata?.userId;
    
    if (!userId) {
      log('No userId in checkout session metadata - cannot update user');
      return;
    }
    
    // Check if this is an extra location purchase
    if (session.metadata?.type === 'extra_location') {
      log(`Extra location purchase completed for user ${userId}`);
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUserStripeInfo(userId, {
          extraLocations: (user.extraLocations || 0) + 1
        });
        log(`Added extra location for user ${userId}, now has ${(user.extraLocations || 0) + 1}`);
      }
      return;
    }
    
    // Get subscription details if this was a subscription checkout
    if (session.mode === 'subscription' && session.subscription) {
      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription.id;
      
      // Fetch full subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      // Get plan info from metadata or subscription
      const planId = session.metadata?.planId || subscription.metadata?.planId;
      const billingCycle = session.metadata?.billingCycle || subscription.metadata?.billingCycle || 'monthly';
      
      // Determine subscription status from Stripe (Stripe is source of truth)
      let status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'pending' = 'active';
      if (subscription.status === 'trialing') {
        status = 'trialing';
      } else if (subscription.status === 'past_due') {
        status = 'past_due';
      }
      
      // Calculate trial end date if applicable
      let trialEndsAt: Date | null = null;
      if (subscription.trial_end) {
        trialEndsAt = new Date(subscription.trial_end * 1000);
      }
      
      // Update user with subscription info
      await storage.updateUserStripeInfo(userId, {
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: status,
        subscriptionPlan: planId || null,
        billingCycle: billingCycle as 'monthly' | 'yearly',
        trialEndsAt: trialEndsAt,
        monthlyRepliesUsed: 0,
        monthlyRepliesPeriodStart: new Date(),
      });
      
      log(`User ${userId} activated: plan=${planId}, status=${status}, cycle=${billingCycle}`);
    }
  }
  
  static async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);
    
    // Get userId from subscription metadata
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      log('No userId in subscription metadata - trying to find by customer ID');
      
      // Try to find user by stripeCustomerId
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer.id;
      
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        log(`No user found for customer ${customerId}`);
        return;
      }
      
      await WebhookHandlers.updateUserFromSubscription(user.id, subscription);
      return;
    }
    
    await WebhookHandlers.updateUserFromSubscription(userId, subscription);
  }
  
  static async updateUserFromSubscription(userId: string, subscription: Stripe.Subscription): Promise<void> {
    // Skip if this is an extra location subscription
    if (subscription.metadata?.type === 'extra_location') {
      log(`Skipping extra location subscription update for ${subscription.id}`);
      return;
    }
    
    // Determine status from Stripe (Stripe is source of truth)
    let status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'pending';
    switch (subscription.status) {
      case 'active':
        status = 'active';
        break;
      case 'trialing':
        status = 'trialing';
        break;
      case 'past_due':
        status = 'past_due';
        break;
      case 'canceled':
      case 'unpaid':
      case 'incomplete_expired':
        status = 'canceled';
        break;
      default:
        status = 'pending';
    }
    
    // Get plan and billing cycle from metadata
    const planId = subscription.metadata?.planId;
    const billingCycle = subscription.metadata?.billingCycle || 'monthly';
    
    // Calculate trial end date if applicable
    let trialEndsAt: Date | null = null;
    if (subscription.trial_end) {
      trialEndsAt = new Date(subscription.trial_end * 1000);
    }
    
    const updateData: any = {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      billingCycle: billingCycle as 'monthly' | 'yearly',
    };
    
    // Only update plan if we have it in metadata
    if (planId) {
      updateData.subscriptionPlan = planId;
    }
    
    // Only update trialEndsAt if subscription has a trial
    if (trialEndsAt) {
      updateData.trialEndsAt = trialEndsAt;
    }
    
    await storage.updateUserStripeInfo(userId, updateData);
    log(`User ${userId} subscription updated: status=${status}, plan=${planId || 'unchanged'}`);
  }
  
  static async handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    log(`Subscription canceled: ${subscription.id}`);
    
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      // Try by customer ID
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer.id;
      
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (user) {
        // IMPORTANT: Keep stripeSubscriptionId to preserve subscription history for anti-abuse
        // Only update status to canceled
        await storage.updateUserStripeInfo(user.id, {
          subscriptionStatus: 'canceled',
        });
        log(`User ${user.id} subscription canceled (kept subscription ID for history)`);
      }
      return;
    }
    
    // IMPORTANT: Keep stripeSubscriptionId to preserve subscription history for anti-abuse
    // Only update status to canceled
    await storage.updateUserStripeInfo(userId, {
      subscriptionStatus: 'canceled',
    });
    log(`User ${userId} subscription canceled (kept subscription ID for history)`);
  }
  
  static async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const customerId = typeof invoice.customer === 'string' 
      ? invoice.customer 
      : (invoice.customer as any)?.id;
    
    if (!customerId) return;
    
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) return;
    
    const subscriptionId = (invoice as any).subscription;
    if (subscriptionId) {
      // Reset monthly reply usage on successful payment (new billing period)
      await storage.updateUserReplyUsage(user.id, 0, new Date());
      log(`Reset monthly replies for user ${user.id} after invoice payment`);
      
      // If user was trialing, activate their plan now that first payment succeeded
      if (user.subscriptionStatus === 'trialing' || user.subscriptionStatus === 'trial') {
        await storage.updateUserStripeInfo(user.id, {
          subscriptionStatus: 'active',
        });
        log(`User ${user.id} trial ended - first payment successful, plan activated`);
      }
    }
  }
  
  static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = typeof invoice.customer === 'string' 
      ? invoice.customer 
      : (invoice.customer as any)?.id;
    
    if (!customerId) return;
    
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) return;
    
    // Mark subscription as past_due
    const subscriptionId = (invoice as any).subscription;
    if (subscriptionId) {
      await storage.updateUserStripeInfo(user.id, {
        subscriptionStatus: 'past_due',
      });
      log(`User ${user.id} payment failed - marked as past_due`);
    }
  }
}
