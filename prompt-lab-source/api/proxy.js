export const config = { runtime: 'edge' };

// Burst rate limit: 30 req / 60 sec (prevents abuse)
const BURST_LIMIT = 30;
const BURST_WINDOW_MS = 60_000;

// Demo daily limit: 3 server-keyed requests per IP per day
// Only applies when the server injects an API key (no user key provided)
const DEMO_DAILY_LIMIT = 3;
const DEMO_WINDOW_MS = 24 * 60 * 60_000;

const burstHits = new Map();
const demoHits = new Map();

function pruneMap(map, now) {
  if (map.size > 500) {
    for (const [key, value] of map) {
      if (now >= value.resetAt) map.delete(key);
    }
  }
}

function isBurstLimited(ip) {
  const now = Date.now();
  let entry = burstHits.get(ip);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + BURST_WINDOW_MS };
    burstHits.set(ip, entry);
  }
  entry.count += 1;
  pruneMap(burstHits, now);
  return entry.count > BURST_LIMIT;
}

function isDemoLimited(ip) {
  const now = Date.now();
  let entry = demoHits.get(ip);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + DEMO_WINDOW_MS };
    demoHits.set(ip, entry);
  }
  entry.count += 1;
  pruneMap(demoHits, now);
  return {
    limited: entry.count > DEMO_DAILY_LIMIT,
    remaining: Math.max(0, DEMO_DAILY_LIMIT - entry.count),
    resetAt: entry.resetAt,
  };
}

function isDemoRequest(headers) {
  // If the client sends their own API key, it's not a demo request
  return !headers['x-api-key'] && !headers['authorization'];
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

  if (isBurstLimited(clientIp)) {
    return jsonResponse({ error: 'Rate limit exceeded. Try again shortly.' }, 429);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { targetUrl, headers = {}, body } = payload || {};

  // Check demo daily limit for server-keyed requests
  if (isDemoRequest(headers)) {
    const demo = isDemoLimited(clientIp);
    if (demo.limited) {
      return jsonResponse(
        {
          error: 'Daily demo limit reached. Add your own API key or upgrade to Pro for unlimited access.',
          demo_remaining: 0,
          demo_reset_at: new Date(demo.resetAt).toISOString(),
        },
        429,
        { 'X-Demo-Remaining': '0', 'X-Demo-Reset': new Date(demo.resetAt).toISOString() },
      );
    }
  }

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

    // Add demo remaining header for server-keyed requests
    const demoHeaders = {};
    if (isDemoRequest(headers)) {
      const entry = demoHits.get(clientIp);
      const remaining = entry ? Math.max(0, DEMO_DAILY_LIMIT - entry.count) : DEMO_DAILY_LIMIT;
      demoHeaders['X-Demo-Remaining'] = String(remaining);
    }

    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('Content-Type') || 'application/json',
        ...CORS_HEADERS,
        ...demoHeaders,
      },
    });
  } catch (error) {
    return jsonResponse(
      { error: error.message || 'Upstream fetch failed' },
      502,
    );
  }
}
