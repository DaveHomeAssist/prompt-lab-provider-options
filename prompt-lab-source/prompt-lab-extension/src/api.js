/**
 * Sends a model request through the extension background worker.
 * The worker routes to the configured provider (Anthropic or Ollama).
 *
 * @param {Object} payload - Anthropic-style message payload
 * @returns {Promise<Object>} - Provider response normalized by background.js
 */
export function callModel(payload) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return reject(new Error('Not running as an extension. chrome.runtime unavailable.'));
    }
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
  });
}

// Backward-compatible export used by existing App code.
export const callAnthropic = callModel;
