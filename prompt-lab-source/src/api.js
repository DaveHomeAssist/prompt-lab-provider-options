const IS_EXTENSION = typeof chrome !== 'undefined' && chrome.runtime?.sendMessage;

function getWebApiKey() {
  try {
    const stored = localStorage.getItem('pl2-anthropic-api-key');
    if (stored && stored.trim()) return stored.trim();
  } catch {}
  if (typeof window !== 'undefined' && typeof window.__ANTHROPIC_API_KEY === 'string' && window.__ANTHROPIC_API_KEY.trim()) {
    return window.__ANTHROPIC_API_KEY.trim();
  }
  return '';
}

export function callAnthropic(payload) {
  if (IS_EXTENSION) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'ANTHROPIC_REQUEST', payload },
        (response) => {
          if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
          if (!response) return reject(new Error('No response from background. Is your API key set in Options?'));
          if (response.error) return reject(new Error(response.error));
          return resolve(response.data);
        },
      );
    });
  }

  const apiKey = getWebApiKey();
  if (!apiKey) {
    throw new Error('Missing API key. In web mode, set localStorage key pl2-anthropic-api-key.');
  }

  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || `${res.status} ${res.statusText}`);
    }
    return data;
  });
}
