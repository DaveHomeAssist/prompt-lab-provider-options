import { allProviders } from './providerRegistry.js';

const MIN_API_KEY_LENGTH = 20;
const MIN_BASE_URL_LENGTH = 8;
const PLACEHOLDER_KEYS = new Set(['demo', 'placeholder', 'changeme']);

function isMeaningfulString(value, minLength = 1) {
  return typeof value === 'string' && value.trim().length >= minLength;
}

function isUsableApiKey(value) {
  if (!isMeaningfulString(value, MIN_API_KEY_LENGTH)) return false;
  return !PLACEHOLDER_KEYS.has(value.trim().toLowerCase());
}

function isUsableBaseUrl(value) {
  return isMeaningfulString(value, MIN_BASE_URL_LENGTH);
}

function isProviderConfigured(settings, provider) {
  if (!settings || typeof settings !== 'object' || !provider) return false;
  if (provider.id === 'ollama') return isUsableBaseUrl(settings.ollamaBaseUrl);
  if (!provider.requiresApiKey) return false;
  return isUsableApiKey(settings[provider.apiKeyField]);
}

export function configuredProviders(settings) {
  return allProviders()
    .filter((provider) => isProviderConfigured(settings, provider))
    .map((provider) => provider.id);
}

export function hasConfiguredProvider(settings) {
  return configuredProviders(settings).length > 0;
}

export function hasStoredProviderState(settings) {
  if (!settings || typeof settings !== 'object') return false;
  return Object.values(settings).some((value) => typeof value === 'string' && value.trim().length > 0);
}
