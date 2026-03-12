const FALLBACK = Object.freeze({
  category: 'provider',
  code: 'PROVIDER_001',
  userMessage: 'Provider request failed',
  details: 'The model provider returned an unexpected error.',
  suggestions: [
    'Retry the request.',
    'Check provider configuration and model selection.',
    'Review prompt size and formatting.',
  ],
});

function buildActions(category, context = {}) {
  const actions = [];
  if (category === 'auth') actions.push('open_settings');
  if (context.canRetry !== false) actions.push('retry');
  if (category === 'timeout' || category === 'schema') actions.push('shorten_request');
  return [...new Set(actions)];
}

function normalizeMessage(input) {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (input?.message) return String(input.message);
  return String(input);
}

export function normalizeModelError(error, context = {}) {
  const raw = normalizeMessage(error);
  const msg = raw.toLowerCase();
  let mapped = { ...FALLBACK };

  if (
    msg.includes('api key') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('missing key')
  ) {
    mapped = {
      category: 'auth',
      code: 'AUTH_001',
      userMessage: 'Authentication error',
      details: raw || 'API key missing, invalid, or unauthorized.',
      suggestions: [
        'Open provider settings and verify your API key.',
        'Confirm you selected the intended provider/model.',
        'Retry after saving settings.',
      ],
    };
  } else if (
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('too many requests')
  ) {
    mapped = {
      category: 'quota',
      code: 'QUOTA_001',
      userMessage: 'Quota or rate limit reached',
      details: raw || 'Provider rate limit or quota was exceeded.',
      suggestions: [
        'Wait briefly, then retry.',
        'Reduce request frequency.',
        'Switch provider/model if available.',
      ],
    };
  } else if (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('dns') ||
    msg.includes('ssl') ||
    msg.includes('offline')
  ) {
    mapped = {
      category: 'network',
      code: 'NET_001',
      userMessage: 'Network connectivity issue',
      details: raw || 'A network error interrupted the request.',
      suggestions: [
        'Check internet connection and retry.',
        'Verify local network/firewall settings.',
        'If using a local provider, confirm it is running.',
      ],
    };
  } else if (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('response too large') ||
    msg.includes('max_tokens')
  ) {
    mapped = {
      category: 'timeout',
      code: 'TIMEOUT_001',
      userMessage: 'Request timed out',
      details: raw || 'The request took too long or response payload was too large.',
      suggestions: [
        'Shorten the prompt or reduce requested output size.',
        'Try again with a smaller max token budget.',
        'Split the task into smaller steps.',
      ],
    };
  } else if (
    msg.includes('json') ||
    msg.includes('schema') ||
    msg.includes('parse') ||
    msg.includes('valid json') ||
    msg.includes('invalid response')
  ) {
    mapped = {
      category: 'schema',
      code: 'SCHEMA_001',
      userMessage: 'Response format mismatch',
      details: raw || 'The model output did not match expected JSON/schema.',
      suggestions: [
        'Make output format constraints more explicit.',
        'Request strict JSON-only output.',
        'Retry with a shorter, clearer prompt.',
      ],
    };
  }

  return {
    ...mapped,
    actions: buildActions(mapped.category, context),
    context,
    raw,
  };
}
