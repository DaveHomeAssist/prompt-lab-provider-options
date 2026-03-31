export const config = { runtime: 'edge' };

import {
  buildStripeConfig,
  createPortalSession,
  jsonResponse,
  optionsResponse,
  parseJsonBody,
} from '../_lib/stripeBilling.js';

export default async function handler(request) {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const body = await parseJsonBody(request);

  try {
    const payload = await createPortalSession(buildStripeConfig(), {
      customerId: typeof body?.customerId === 'string' ? body.customerId.trim() : '',
      customerEmail: typeof body?.customerEmail === 'string' ? body.customerEmail.trim() : '',
    });

    return jsonResponse({
      ok: true,
      url: payload.url,
      customerId: payload.customerId,
      customerEmail: payload.customerEmail,
    });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Could not create billing portal session.' }, 400);
  }
}
