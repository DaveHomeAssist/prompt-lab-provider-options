async function callAnthropicDirect(payload) {
  const keyFromStorage = typeof localStorage !== 'undefined' ? localStorage.getItem('pl2-dev-api-key') : '';
  const apiKey = keyFromStorage || (typeof window !== 'undefined' ? window.ANTHROPIC_API_KEY : '');
  if (!apiKey) {
    throw new Error('No API key found for web mode. Set localStorage key "pl2-dev-api-key".');
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `Request failed (${response.status})`);
  }
  return data;
}

/**
 * Sends a model request through extension background worker when available.
 * Falls back to direct Anthropic fetch for web mode.
 */
export function callModel(payload) {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(
        { type: 'MODEL_REQUEST', payload },
        (response) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (!response) {
            return reject(
              new Error('No response from background. Is your API key set in Options?')
            );
          }
          if (response.error) {
            return reject(new Error(response.error));
          }
          resolve(response.data);
        }
      );
      return;
    }

    callAnthropicDirect(payload).then(resolve).catch(reject);
  });
}

// Backward-compatible export used by existing App code.
export const callAnthropic = callModel;
