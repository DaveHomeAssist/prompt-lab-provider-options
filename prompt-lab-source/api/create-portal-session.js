import { requireAuthenticatedUser } from './_lib/auth.js';
import { empty, json } from './_lib/http.js';
import {
  buildBillingUrls,
  findCustomerByClerkUser,
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

  try {
    const stripeConfig = getStripeConfig();
    if (!stripeConfig.secretKey) {
      return json(
        { error: 'Billing is not configured. Missing STRIPE_SECRET_KEY.' },
        503,
        auth.origin,
        request,
      );
    }

    const stripe = getStripeClient();
    const customer = await findCustomerByClerkUser(stripe, auth.user);

    if (!customer) {
      return json(
        { error: 'No Stripe billing profile exists for this account yet.' },
        404,
        auth.origin,
        request,
      );
    }

    const billingUrls = buildBillingUrls(auth.baseUrl);
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: billingUrls.returnUrl,
      ...(stripeConfig.portalConfigurationId
        ? { configuration: stripeConfig.portalConfigurationId }
        : {}),
    });

    return json(
      {
        ok: true,
        portalUrl: session.url,
        customerId: customer.id,
      },
      200,
      auth.origin,
      request,
    );
  } catch (error) {
    return json(
      { error: error?.message || 'Stripe portal session creation failed.' },
      500,
      auth.origin,
      request,
    );
  }
}
