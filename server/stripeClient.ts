import Stripe from 'stripe';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectorName = 'stripe';
  
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  
  url.searchParams.set('environment', 'production');
  const prodResponse = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });
  const prodData = await prodResponse.json();
  const prodSettings = prodData.items?.[0];
  
  if (prodSettings?.settings?.publishable && prodSettings?.settings?.secret) {
    connectionSettings = prodSettings;
    console.log('Stripe: Using production credentials');
    return {
      publishableKey: prodSettings.settings.publishable,
      secretKey: prodSettings.settings.secret,
    };
  }

  url.searchParams.set('environment', 'development');
  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  
  connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe connection not found - please connect Stripe via OAuth`);
  }

  console.log('Stripe: Using development/sandbox credentials (no production keys found)');
  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey);
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
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
