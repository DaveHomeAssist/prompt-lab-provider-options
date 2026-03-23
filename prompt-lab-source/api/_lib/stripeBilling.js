import Stripe from 'stripe';

let stripeClient;

function buildMetadata(user) {
  const metadata = {
    clerkUserId: user.id,
  };

  if (user.email) {
    metadata.clerkEmail = user.email;
  }

  return metadata;
}

function escapeSearchValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function getStripeConfig() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY,
    priceId: process.env.STRIPE_PRICE_ID,
    portalConfigurationId: process.env.STRIPE_PORTAL_CONFIGURATION_ID || null,
  };
}

export function getStripeClient() {
  const { secretKey } = getStripeConfig();
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

async function searchCustomerByUserId(stripe, userId) {
  if (!userId) return null;

  try {
    const result = await stripe.customers.search({
      limit: 1,
      query: `metadata['clerkUserId']:'${escapeSearchValue(userId)}'`,
    });

    return result.data[0] || null;
  } catch {
    return null;
  }
}

async function searchCustomerByEmail(stripe, email) {
  if (!email) return null;
  const result = await stripe.customers.list({ email, limit: 10 });
  return result.data.find((entry) => !entry.deleted) || null;
}

export async function findCustomerByClerkUser(stripe, user) {
  const directMatch = await searchCustomerByUserId(stripe, user.id);
  if (directMatch) {
    return directMatch;
  }

  const emailMatch = await searchCustomerByEmail(stripe, user.email);
  if (!emailMatch) {
    return null;
  }

  const metadata = {
    ...emailMatch.metadata,
    ...buildMetadata(user),
  };

  return stripe.customers.update(emailMatch.id, {
    email: user.email || undefined,
    name: user.displayName || undefined,
    metadata,
  });
}

export async function findOrCreateCustomer(stripe, user) {
  const existing = await findCustomerByClerkUser(stripe, user);
  if (existing) {
    const nextMetadata = {
      ...existing.metadata,
      ...buildMetadata(user),
    };
    const needsUpdate = existing.email !== (user.email || null)
      || existing.name !== (user.displayName || null)
      || existing.metadata?.clerkUserId !== user.id
      || (user.email && existing.metadata?.clerkEmail !== user.email);

    if (!needsUpdate) {
      return existing;
    }

    return stripe.customers.update(existing.id, {
      email: user.email || undefined,
      name: user.displayName || undefined,
      metadata: nextMetadata,
    });
  }

  return stripe.customers.create({
    email: user.email || undefined,
    name: user.displayName || undefined,
    metadata: buildMetadata(user),
  });
}

export function buildBillingUrls(baseUrl) {
  const normalizedBaseUrl = String(baseUrl || 'https://promptlab.tools').replace(/\/$/, '');
  return {
    successUrl: `${normalizedBaseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${normalizedBaseUrl}/billing/cancel`,
    returnUrl: `${normalizedBaseUrl}/app/`,
  };
}
