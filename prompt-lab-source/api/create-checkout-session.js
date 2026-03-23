import { requireAuthenticatedUser } from './_lib/auth.js';
import { empty, json } from './_lib/http.js';
import {
  buildBillingUrls,
  findOrCreateCustomer,
  getStripeClient,
  getStripeConfig,
} from './_lib/stripeBilling.js';

export default async function handler(request) {
  const origin = request.headers.get('origin') || '';

  if (request.method === 'OPTIONS') {
    return empty(204, origin, request);
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, origin, request);
  }

  const auth = await requireAuthenticatedUser(request);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const stripeConfig = getStripeConfig();
  if (!stripeConfig.secretKey || !stripeConfig.priceId) {
    return json(
      { error: 'Billing is not configured. Missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID.' },
      503,
      auth.origin,
      request,
    );
  }

  try {
    const stripe = getStripeClient();
    const customer = await findOrCreateCustomer(stripe, auth.user);
    const billingUrls = buildBillingUrls(auth.baseUrl);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      client_reference_id: auth.user.id,
      customer: customer.id,
      line_items: [
        {
          price: stripeConfig.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        clerkUserId: auth.user.id,
        clerkEmail: auth.user.email || '',
      },
      subscription_data: {
        metadata: {
          clerkUserId: auth.user.id,
          clerkEmail: auth.user.email || '',
        },
      },
      success_url: billingUrls.successUrl,
      cancel_url: billingUrls.cancelUrl,
    });

    return json(
      {
        ok: true,
        sessionId: session.id,
        checkoutUrl: session.url,
        customerId: customer.id,
      },
      200,
      auth.origin,
      request,
    );
  } catch (error) {
    return json(
      { error: error?.message || 'Stripe checkout session creation failed.' },
      500,
      auth.origin,
      request,
    );
  }
}
