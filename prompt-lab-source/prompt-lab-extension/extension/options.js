const DEFAULT_PROVIDER = 'anthropic';
const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'llama3.2:3b';

const els = {
  provider: document.getElementById('provider'),
  key: document.getElementById('key'),
  ollamaBaseUrl: document.getElementById('ollamaBaseUrl'),
  ollamaModel: document.getElementById('ollamaModel'),
  anthropicSection: document.getElementById('anthropicSection'),
  ollamaSection: document.getElementById('ollamaSection'),
  saveBtn: document.getElementById('saveBtn'),
  status: document.getElementById('status'),
};

let storedApiKey = '';

function normalizeProvider(provider) {
  return provider === 'ollama' ? 'ollama' : DEFAULT_PROVIDER;
}

function normalizeBaseUrl(url) {
  return (url || DEFAULT_OLLAMA_BASE_URL).trim().replace(/\/+$/, '');
}

function setStatus(message, ok = true) {
  els.status.textContent = message;
  els.status.style.color = ok ? '#4ade80' : '#f87171';
}

function renderProviderSections() {
  const provider = normalizeProvider(els.provider.value);
  const anthropic = provider === 'anthropic';
  els.anthropicSection.classList.toggle('hidden', !anthropic);
  els.ollamaSection.classList.toggle('hidden', anthropic);
}

function loadSettings() {
  chrome.storage.local.get(
    ['provider', 'apiKey', 'ollamaBaseUrl', 'ollamaModel'],
    ({ provider, apiKey, ollamaBaseUrl, ollamaModel }) => {
      const selected = normalizeProvider(provider);
      storedApiKey = apiKey || '';
      els.provider.value = selected;

      if (storedApiKey) {
        els.key.placeholder = 'sk-ant-********' + storedApiKey.slice(-4);
      }

      els.ollamaBaseUrl.value = normalizeBaseUrl(ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL);
      els.ollamaModel.value = (ollamaModel || DEFAULT_OLLAMA_MODEL).trim();
      renderProviderSections();
    }
  );
}

function saveSettings() {
  const provider = normalizeProvider(els.provider.value);
  const next = {
    provider,
    ollamaBaseUrl: normalizeBaseUrl(els.ollamaBaseUrl.value),
    ollamaModel: (els.ollamaModel.value || DEFAULT_OLLAMA_MODEL).trim(),
  };

  if (provider === 'anthropic') {
    const enteredKey = els.key.value.trim();
    if (enteredKey && !enteredKey.startsWith('sk-ant-')) {
      setStatus('Key should start with sk-ant-.', false);
      return;
    }
    if (!enteredKey && !storedApiKey) {
      setStatus('Enter an Anthropic API key.', false);
      return;
    }
    if (enteredKey) {
      next.apiKey = enteredKey;
      storedApiKey = enteredKey;
    }
  } else {
    if (!/^https?:\/\//.test(next.ollamaBaseUrl)) {
      setStatus('Ollama URL must start with http:// or https://', false);
      return;
    }
    if (!next.ollamaModel) {
      setStatus('Enter an Ollama model name (example: llama3.2:3b).', false);
      return;
    }
  }

  chrome.storage.local.set(next, () => {
    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message || 'Failed to save settings.', false);
      return;
    }
    els.key.value = '';
    if (storedApiKey) {
      els.key.placeholder = 'sk-ant-********' + storedApiKey.slice(-4);
    }
    setStatus('Saved');
  });
}

els.provider.addEventListener('change', renderProviderSections);
els.saveBtn.addEventListener('click', saveSettings);
loadSettings();
