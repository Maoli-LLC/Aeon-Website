import Stripe from 'stripe';

function getCredentials() {
  const livePublishable = process.env.STRIPE_LIVE_PUBLISHABLE_KEY;
  const liveSecret = process.env.STRIPE_LIVE_SECRET_KEY;

  if (livePublishable && liveSecret) {
    console.log('Stripe: Using live production keys');
    return {
      publishableKey: livePublishable,
      secretKey: liveSecret,
    };
  }

  throw new Error('Stripe live keys not configured - add STRIPE_LIVE_PUBLISHABLE_KEY and STRIPE_LIVE_SECRET_KEY to secrets');
}

export async function getUncachableStripeClient() {
  const { secretKey } = getCredentials();
  return new Stripe(secretKey);
}

export async function getStripePublishableKey() {
  const { publishableKey } = getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();
    const databaseUrl = process.env.SUPABASE_DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('SUPABASE_DATABASE_URL is required for Stripe sync');
    }

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
