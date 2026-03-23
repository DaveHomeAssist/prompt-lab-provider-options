const STATIC_ALLOWED_ORIGINS = new Set([
  'https://promptlab.tools',
  'https://www.promptlab.tools',
  'https://prompt-lab-tawny.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]);

function getRequestUrl(request) {
  try {
    return new URL(request.url);
  } catch {
    return null;
  }
}

function isSameOriginPreview(origin, request) {
  const requestUrl = getRequestUrl(request);
  if (!requestUrl) return false;
  return origin === requestUrl.origin && requestUrl.hostname.endsWith('.vercel.app');
}

export function isAllowedOrigin(origin, request) {
  if (!origin) return false;
  return STATIC_ALLOWED_ORIGINS.has(origin) || isSameOriginPreview(origin, request);
}

export function getAuthorizedParties(request) {
  const requestUrl = getRequestUrl(request);
  const parties = new Set(STATIC_ALLOWED_ORIGINS);
  if (requestUrl?.hostname.endsWith('.vercel.app')) {
    parties.add(requestUrl.origin);
  }
  return [...parties];
}

export function getCorsHeaders(origin, request) {
  const allowedOrigin = isAllowedOrigin(origin, request) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

export function json(body, status = 200, origin = '', request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin, request),
    },
  });
}

export function empty(status = 204, origin = '', request) {
  return new Response(null, {
    status,
    headers: getCorsHeaders(origin, request),
  });
}

export function getBaseUrl(request) {
  const origin = request.headers.get('origin') || '';
  if (isAllowedOrigin(origin, request)) {
    return origin;
  }

  const requestUrl = getRequestUrl(request);
  return requestUrl?.origin || 'https://promptlab.tools';
}
