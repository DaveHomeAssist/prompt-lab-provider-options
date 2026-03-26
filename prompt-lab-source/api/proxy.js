export const config = { runtime: 'edge' };

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const ipHits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  let entry = ipHits.get(ip);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    ipHits.set(ip, entry);
  }

  entry.count += 1;

  // Prune stale entries to keep the in-memory map bounded on warm instances.
  if (ipHits.size > 500) {
    for (const [key, value] of ipHits) {
      if (now >= value.resetAt) {
        ipHits.delete(key);
      }
    }
  }

  return entry.count > RATE_LIMIT;
}

const ALLOWED_HOSTS = new Set([
  'api.anthropic.com',
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'openrouter.ai',
]);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function injectServerKey(url, headers) {
  const host = new URL(url).hostname;

  if (host === 'api.anthropic.com' && process.env.ANTHROPIC_API_KEY) {
    headers['x-api-key'] = process.env.ANTHROPIC_API_KEY;
  }

  if (host === 'api.openai.com' && process.env.OPENAI_API_KEY) {
    headers.Authorization = `Bearer ${process.env.OPENAI_API_KEY}`;
  }

  if (host === 'openrouter.ai' && process.env.OPENROUTER_API_KEY) {
    headers.Authorization = `Bearer ${process.env.OPENROUTER_API_KEY}`;
  }

  if (host === 'generativelanguage.googleapis.com' && process.env.GEMINI_API_KEY) {
    const rewritten = new URL(url);
    rewritten.searchParams.set('key', process.env.GEMINI_API_KEY);
    return { url: rewritten.toString(), headers };
  }

  return { url, headers };
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (isRateLimited(clientIp)) {
    return jsonResponse({ error: 'Rate limit exceeded. Try again shortly.' }, 429);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { targetUrl, headers = {}, body } = payload || {};

  if (!targetUrl) {
    return jsonResponse({ error: 'Missing targetUrl' }, 400);
  }

  try {
    const { hostname, protocol } = new URL(targetUrl);

    if (protocol !== 'https:') {
      return jsonResponse({ error: 'HTTPS required' }, 403);
    }

    if (!ALLOWED_HOSTS.has(hostname)) {
      return jsonResponse(
        { error: 'Blocked: not an allowed provider domain' },
        403,
      );
    }
  } catch {
    return jsonResponse({ error: 'Invalid targetUrl' }, 400);
  }

  const injected = injectServerKey(targetUrl, { ...headers });

  try {
    const upstream = await fetch(injected.url, {
      method: 'POST',
      headers: injected.headers,
      body,
    });

    const responseBody = await upstream.arrayBuffer();

    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('Content-Type') || 'application/json',
        ...CORS_HEADERS,
      },
    });
  } catch (error) {
    return jsonResponse(
      { error: error.message || 'Upstream fetch failed' },
      502,
    );
  }
}
