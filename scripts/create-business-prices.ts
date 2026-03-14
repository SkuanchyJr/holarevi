import Stripe from 'stripe';

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', 'stripe');
  url.searchParams.set('environment', 'development');

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  const connectionSettings = data.items?.[0];
  return connectionSettings.settings.secret;
}

async function main() {
  const secretKey = await getCredentials();
  const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });

  console.log('Creating Business product...');
  const product = await stripe.products.create({
    name: 'Business Plan',
    description: 'For multi-location chains. Includes 5 locations, 1000 AI replies/month, unlimited team members.',
  });
  console.log('Product created:', product.id);

  console.log('Creating Business monthly price (€199/month)...');
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 19900,
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: { planId: 'business', billingCycle: 'monthly' }
  });
  console.log('Monthly price created:', monthlyPrice.id);

  console.log('Creating Business yearly price (€1909.60/year)...');
  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 190960,
    currency: 'eur',
    recurring: { interval: 'year' },
    metadata: { planId: 'business', billingCycle: 'yearly' }
  });
  console.log('Yearly price created:', yearlyPrice.id);

  console.log('\n=== RESULTS ===');
  console.log('Business Monthly Price ID:', monthlyPrice.id);
  console.log('Business Yearly Price ID:', yearlyPrice.id);
}

main().catch(console.error);
