import { useEffect, useMemo, useState } from 'react';
import Ic from './icons';
import { callModelDirect, listOllamaModelsDirect, saveSettings } from './lib/desktopApi.js';
import { isExtension } from './lib/platform.js';

const STORAGE_KEY = 'pl2-provider-settings';

const DEFAULT_SETTINGS = {
  provider: 'anthropic',
  apiKey: '',
  anthropicModel: 'claude-sonnet-4-20250514',
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openrouterApiKey: '',
  openrouterModel: 'anthropic/claude-sonnet-4-20250514',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2:3b',
};

function loadStoredSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export default function DesktopSettingsModal({ show, onClose, m, notify }) {
  const [settings, setSettings] = useState(() => loadStoredSettings());
  const [ollamaModels, setOllamaModels] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState('');
  const [ollamaStatusType, setOllamaStatusType] = useState('neutral');
  const [connectionStatus, setConnectionStatus] = useState('');
  const [connectionStatusType, setConnectionStatusType] = useState('neutral');
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm ${m.input} ${m.border} ${m.text}`;
  const buttonClass = `px-4 py-2 rounded-lg text-sm font-medium ${m.btn} ${m.textAlt}`;

  useEffect(() => {
    if (!show) return;
    setSettings(loadStoredSettings());
    setConnectionStatus('');
    setConnectionStatusType('neutral');
    setOllamaStatus('');
    setOllamaStatusType('neutral');
    setOllamaModels([]);
  }, [show]);

  const currentModel = useMemo(() => {
    switch (settings.provider) {
      case 'openai':
        return settings.openaiModel || DEFAULT_SETTINGS.openaiModel;
      case 'gemini':
        return settings.geminiModel || DEFAULT_SETTINGS.geminiModel;
      case 'openrouter':
        return settings.openrouterModel || DEFAULT_SETTINGS.openrouterModel;
      case 'ollama':
        return settings.ollamaModel || DEFAULT_SETTINGS.ollamaModel;
      case 'anthropic':
      default:
        return settings.anthropicModel || DEFAULT_SETTINGS.anthropicModel;
    }
  }, [settings]);

  if (isExtension || !show) return null;

  function updateSetting(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    try {
      await saveSettings(settings);
      setConnectionStatus('Settings saved.');
      setConnectionStatusType('success');
      notify?.('Provider settings saved');
    } catch (error) {
      setConnectionStatus(error?.message || 'Failed to save settings.');
      setConnectionStatusType('error');
    }
  }

  async function handleRefreshModels() {
    setIsRefreshingModels(true);
    setOllamaStatus('');
    setOllamaStatusType('neutral');
    try {
      const models = await listOllamaModelsDirect(settings.ollamaBaseUrl || DEFAULT_SETTINGS.ollamaBaseUrl);
      setOllamaModels(models);
      if (models.length > 0 && !models.includes(settings.ollamaModel)) {
        updateSetting('ollamaModel', models[0]);
      }
      setOllamaStatus(`${models.length} model${models.length === 1 ? '' : 's'} found`);
      setOllamaStatusType('success');
    } catch (error) {
      setOllamaModels([]);
      setOllamaStatus(error?.message || 'Failed to load models');
      setOllamaStatusType('error');
    } finally {
      setIsRefreshingModels(false);
    }
  }

  async function handleTestConnection() {
    setIsTestingConnection(true);
    setConnectionStatus('');
    setConnectionStatusType('neutral');
    try {
      await saveSettings(settings);
      await callModelDirect({
        model: currentModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      });
      setConnectionStatus('Connected!');
      setConnectionStatusType('success');
    } catch (error) {
      setConnectionStatus(error?.message || 'Connection failed.');
      setConnectionStatusType('error');
    } finally {
      setIsTestingConnection(false);
    }
  }

  const statusClass = connectionStatusType === 'success'
    ? 'text-emerald-400'
    : connectionStatusType === 'error'
      ? 'text-red-400'
      : m.textMuted;

  const ollamaStatusClass = ollamaStatusType === 'success'
    ? 'text-emerald-400'
    : ollamaStatusType === 'error'
      ? 'text-red-400'
      : m.textMuted;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${m.bg} ${m.border} ${m.text}`}
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`text-base font-semibold ${m.text}`}>Provider Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg p-2 ${m.btn} ${m.textAlt}`}
            aria-label="Close provider settings"
          >
            <Ic n="X" size={15} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block space-y-1">
            <span className={`text-xs font-medium uppercase tracking-wide ${m.textMuted}`}>Provider</span>
            <select
              value={settings.provider}
              onChange={event => updateSetting('provider', event.target.value)}
              className={inputClass}
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="openrouter">OpenRouter</option>
              <option value="ollama">Ollama (local)</option>
            </select>
          </label>

          {settings.provider === 'anthropic' && (
            <>
              <label className="block space-y-1">
                <span className={`text-xs font-medium uppercase tracking-wide ${m.textMuted}`}>API Key</span>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={settings.apiKey}
                  onChange={event => updateSetting('apiKey', event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1">
                <span className={`text-xs font-medium uppercase tracking-wide ${m.textMuted}`}>Model</span>
                <input
                  type="text"
                  value={settings.anthropicModel}
                  onChange={event => updateSetting('anthropicModel', event.target.value)}
                  className={inputClass}
                />
              </label>
            </>
          )}

          {settings.provider === 'openai' && (
            <>
              <label className="block space-y-1">
                <span className={`text-xs font-medium uppercase tracking-wide ${m.textMuted}`}>API Key</span>
                <input
                  type="password"
                  value={settings.openaiApiKey}
                  onChange={event => updateSetting('openaiApiKey', event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1">
                <span className={`text-xs font-medium uppercase tracking-wide ${m.textMuted}`}>Model</span>
                <input
                  type="text"
                  value={settings.openaiModel}
                  onChange={event => updateSetting('openaiModel', event.target.value)}
                  className={inputClass}
                />
              </label>
            </>
          )}

          {settings.provider === 'gemini' && (
            <>
              <label className="block space-y-1">
                <span className={`text-xs font-medium uppercase tracking-wide ${m.textMuted}`}>API Key</span>
                <input
                  type="password"
                  value={settings.geminiApiKey}
                  onChange={event => updateSetting('geminiApiKey', event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1">
                <span className={`text-xs font-medium uppercase tracking-wide ${m.textMuted}`}>Model</span>
                <input
                  type="text"
                  value={settings.geminiModel}
                  onChange={event => updateSetting('geminiModel', event.target.value)}
                  className={inputClass}
                />
              </label>
            </>
          )}

          {settings.provider === 'openrouter' && (
            <>
              <label className="block space-y-1">
                <span className={`text-xs font-medium uppercase tracking-wide ${m.textMuted}`}>API Key</span>
                <input
                  type="password"
                  value={settings.openrouterApiKey}
                  onChange={event => updateSetting('openrouterApiKey', event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1">
                <span className={`text-xs font-medium uppercase tracking-wide ${m.textMuted}`}>Model</span>
                <input
                  type="text"
                  value={settings.openrouterModel}
                  onChange={event => updateSetting('openrouterModel', event.target.value)}
                  className={inputClass}
                />
              </label>
            </>
          )}

          {settings.provider === 'ollama' && (
            <>
              <label className="block space-y-1">
                <span className={`text-xs font-medium uppercase tracking-wide ${m.textMuted}`}>Base URL</span>
                <input
                  type="text"
                  value={settings.ollamaBaseUrl}
                  onChange={event => updateSetting('ollamaBaseUrl', event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1">
                <span className={`text-xs font-medium uppercase tracking-wide ${m.textMuted}`}>Model</span>
                <input
                  type="text"
                  value={settings.ollamaModel}
                  onChange={event => updateSetting('ollamaModel', event.target.value)}
                  className={inputClass}
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshModels}
                  disabled={isRefreshingModels}
                  className={`${buttonClass} shrink-0`}
                >
                  {isRefreshingModels ? 'Refreshing...' : 'Refresh Models'}
                </button>
                <span className={`text-xs ${ollamaStatusClass}`}>{ollamaStatus || 'Load available local models'}</span>
              </div>
              {ollamaModels.length > 0 && (
                <label className="block space-y-1">
                  <span className={`text-xs font-medium uppercase tracking-wide ${m.textMuted}`}>Available Models</span>
                  <select
                    value={settings.ollamaModel}
                    onChange={event => updateSetting('ollamaModel', event.target.value)}
                    className={inputClass}
                  >
                    {ollamaModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}

          <div className="space-y-3 border-t border-white/10 pt-4">
            {connectionStatus && <p className={`text-sm ${statusClass}`}>{connectionStatus}</p>}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className={buttonClass}
              >
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
