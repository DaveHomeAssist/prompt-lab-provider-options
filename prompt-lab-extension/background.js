// Background service worker — Manifest V3
// This is the ONLY place API credentials are used.
// panel.html sends messages here; this worker calls configured providers.

const DEFAULT_PROVIDER = 'anthropic';
const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'llama3.2:3b';

function normalizeProvider(provider) {
  return provider === 'ollama' ? 'ollama' : DEFAULT_PROVIDER;
}

function normalizeBaseUrl(baseUrl) {
  const raw = (baseUrl || DEFAULT_OLLAMA_BASE_URL).trim();
  return raw.replace(/\/+$/, '');
}

function anthropicBlocksToText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((block) => (typeof block?.text === 'string' ? block.text : ''))
    .join('');
}

function toOllamaMessages(payload) {
  const out = [];
  if (typeof payload?.system === 'string' && payload.system.trim()) {
    out.push({ role: 'system', content: payload.system });
  }
  for (const msg of payload?.messages || []) {
    const role = ['system', 'assistant', 'user'].includes(msg?.role) ? msg.role : 'user';
    const content = anthropicBlocksToText(msg?.content);
    out.push({ role, content });
  }
  return out;
}

async function readErrorMessage(response, fallback) {
  try {
    const data = await response.json();
    return data?.error?.message || data?.message || fallback;
  } catch {
    return fallback;
  }
}

async function callAnthropic(payload, apiKey) {
  if (!apiKey) {
    throw new Error('No Anthropic API key set. Open extension Options to add one.');
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await readErrorMessage(
      response,
      `Anthropic request failed (${response.status})`
    );
    throw new Error(msg);
  }
  return response.json();
}

async function callOllama(payload, baseUrl, model) {
  const requestBody = {
    model: model || DEFAULT_OLLAMA_MODEL,
    stream: false,
    messages: toOllamaMessages(payload),
  };

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const msg = await readErrorMessage(
      response,
      `Ollama request failed (${response.status}). Is Ollama running?`
    );
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data?.message?.content;
  if (!text) {
    throw new Error('Ollama returned empty content.');
  }

  // Normalize into Anthropic-like shape so existing UI parsing keeps working.
  return {
    content: [{ type: 'text', text }],
    model: requestBody.model,
    provider: 'ollama',
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!['ANTHROPIC_REQUEST', 'MODEL_REQUEST'].includes(msg?.type)) return;

  chrome.storage.local.get(
    ['provider', 'apiKey', 'ollamaBaseUrl', 'ollamaModel'],
    async ({ provider, apiKey, ollamaBaseUrl, ollamaModel }) => {
      const selected = normalizeProvider(provider);
      try {
        const data =
          selected === 'ollama'
            ? await callOllama(msg.payload, ollamaBaseUrl, ollamaModel)
            : await callAnthropic(msg.payload, apiKey);
        sendResponse({ data });
      } catch (error) {
        sendResponse({ error: error?.message || String(error) });
      }
    }
  );

  return true; // keep channel open for async response
});
