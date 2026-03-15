/**
 * Provider execution layer.
 *
 * All provider-specific logic (endpoints, headers, payloads, response shapes)
 * lives in the descriptor objects in providerRegistry.js. This module provides
 * the generic execution pipeline: validate → build → fetch → normalize → return.
 *
 * Backward-compatible named exports (callAnthropic, callOllama, etc.) are
 * preserved so existing call sites don't need to change yet.
 */

import {
  DEFAULTS,
  DEFAULT_PROVIDER,
  normalizeBaseUrl,
  normalizeProvider,
  getProvider,
  toChatMessages,
  toGeminiContents,
} from './providerRegistry.js';
import { normalizeError, authError } from './errorTaxonomy.js';

export { DEFAULT_PROVIDER, normalizeProvider, getProvider, allProviders, providerHasCapability } from './providerRegistry.js';
export { AppError, normalizeError, isRetryable, getUserMessage } from './errorTaxonomy.js';

// ── Shared fetch helpers ────────────────────────────────────────────

async function readErrorMessage(response, fallback) {
  try {
    const data = await response.json();
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    return fallback;
  } catch {
    return fallback;
  }
}

function fetchOrThrow(fetchImpl) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required.');
  }
  return fetchImpl;
}

// ── Generic provider call via registry ──────────────────────────────

async function executeProvider(descriptor, payload, settings, fetchImpl) {
  // Auth gate
  if (descriptor.requiresApiKey && !settings[descriptor.apiKeyField]) {
    throw authError(descriptor.label);
  }

  // Build request
  const requestBody = descriptor.buildPayload(payload, settings);
  const resolvedModel = descriptor.resolveModel(payload, settings);
  const endpoint = typeof descriptor.resolveEndpoint === 'function'
    ? descriptor.resolveEndpoint(settings, payload)
    : descriptor.endpoint;
  const headers = descriptor.buildHeaders(settings);

  // Execute
  const response = await fetchOrThrow(fetchImpl)(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `${descriptor.label} request failed (${response.status})`));
  }

  const data = await response.json();
  return descriptor.normalizeResponse(data, requestBody, resolvedModel);
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Call any registered provider by ID.
 * Normalizes all errors into AppError at the boundary.
 */
export async function callProvider({ provider = DEFAULT_PROVIDER, payload, settings = {}, fetchImpl = globalThis.fetch }) {
  const resolved = normalizeProvider(provider);
  const descriptor = getProvider(resolved);
  try {
    return await executeProvider(descriptor, payload, settings, fetchImpl);
  } catch (err) {
    throw normalizeError(err, resolved);
  }
}

// ── Backward-compatible named exports ───────────────────────────────
// These preserve the existing call signatures so nothing else needs to change.

export async function callAnthropic(payload, settings = {}, fetchImpl = globalThis.fetch) {
  return executeProvider(getProvider('anthropic'), payload, settings, fetchImpl);
}

export async function callOllama(payload, settings = {}, fetchImpl = globalThis.fetch) {
  return executeProvider(getProvider('ollama'), payload, settings, fetchImpl);
}

export async function callOpenAI(payload, settings = {}, fetchImpl = globalThis.fetch) {
  return executeProvider(getProvider('openai'), payload, settings, fetchImpl);
}

export async function callGemini(payload, settings = {}, fetchImpl = globalThis.fetch) {
  return executeProvider(getProvider('gemini'), payload, settings, fetchImpl);
}

export async function callOpenRouter(payload, settings = {}, fetchImpl = globalThis.fetch) {
  return executeProvider(getProvider('openrouter'), payload, settings, fetchImpl);
}

// ── Ollama model listing ────────────────────────────────────────────

export async function listOllamaModels(baseUrl, fetchImpl = globalThis.fetch) {
  const response = await fetchOrThrow(fetchImpl)(`${normalizeBaseUrl(baseUrl, DEFAULTS.ollamaBaseUrl)}/api/tags`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);

  const data = await response.json();
  return (data?.models || []).map((model) => ({
    name: model.name,
    size: model.size,
    modified: model.modified_at,
    family: model.details?.family || '',
    paramSize: model.details?.parameter_size || '',
  }));
}
