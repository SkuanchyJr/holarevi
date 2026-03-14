import { getUncachableStripeClient } from '../server/stripeClient';

async function seedStripeProducts() {
  console.log('Creating Stripe products and prices...');
  
  const stripe = await getUncachableStripeClient();

  // Check if products already exist
  const existingProducts = await stripe.products.list({ limit: 10 });
  const starterExists = existingProducts.data.find(p => p.name === 'Starter Plan');
  const professionalExists = existingProducts.data.find(p => p.name === 'Professional Plan');

  // Create Starter Plan
  if (!starterExists) {
    console.log('Creating Starter Plan...');
    const starterProduct = await stripe.products.create({
      name: 'Starter Plan',
      description: 'Perfect for single-location restaurants. Includes unlimited reviews, AI-powered replies, and multilingual support.',
      metadata: {
        plan_id: 'starter',
        max_restaurants: '1',
      },
    });

    const starterPrice = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 5000, // €50.00 in cents
      currency: 'eur',
      recurring: { interval: 'month' },
      metadata: {
        plan_id: 'starter',
      },
    });

    console.log(`Created Starter Plan: ${starterProduct.id} with price ${starterPrice.id}`);
  } else {
    console.log('Starter Plan already exists');
  }

  // Create Professional Plan
  if (!professionalExists) {
    console.log('Creating Professional Plan...');
    const professionalProduct = await stripe.products.create({
      name: 'Professional Plan',
      description: 'For restaurant chains and groups. Includes up to 5 locations, auto-post mode, priority support, and analytics.',
      metadata: {
        plan_id: 'professional',
        max_restaurants: '5',
      },
    });

    const professionalPrice = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 9900, // €99.00 in cents
      currency: 'eur',
      recurring: { interval: 'month' },
      metadata: {
        plan_id: 'professional',
      },
    });

    console.log(`Created Professional Plan: ${professionalProduct.id} with price ${professionalPrice.id}`);
  } else {
    console.log('Professional Plan already exists');
  }

  console.log('Done!');
}

seedStripeProducts().catch(console.error);
