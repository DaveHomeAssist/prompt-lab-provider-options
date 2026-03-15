/**
 * Shared schema contracts for gateway boundaries.
 *
 * These typedefs and validators are intentionally centralized so both the
 * ProviderGateway and StorageGateway can rely on the same object shapes.
 */

import { normalizeEntry } from '../lib/promptSchema.js';
import { VALID_PROVIDERS } from '../lib/providerRegistry.js';

/**
 * @typedef {'anthropic' | 'openai' | 'gemini' | 'openrouter' | 'ollama'} ProviderName
 */

/**
 * @typedef {Object} ProviderMessage
 * @property {'system' | 'user' | 'assistant'} role
 * @property {string | Array<{ type: string, text: string }>} content
 */

/**
 * Canonical request shape passed into the ProviderGateway.
 *
 * @typedef {Object} ProviderRequest
 * @property {ProviderName} [provider]
 * @property {string} [model]
 * @property {string} [system]
 * @property {ProviderMessage[]} [messages]
 * @property {number} [max_tokens]
 * @property {number} [temperature]
 * @property {'json'} [responseFormat]
 */

/**
 * Canonical normalized response returned by the ProviderGateway.
 *
 * @typedef {Object} ProviderResponse
 * @property {Array<{ type: string, text: string }>} content
 * @property {string} model
 * @property {ProviderName} provider
 */

/**
 * @typedef {Object} SavedPromptVariant
 * @property {string} label
 * @property {string} content
 */

/**
 * @typedef {Object} SavedPromptVersion
 * @property {string} id
 * @property {string} original
 * @property {string} enhanced
 * @property {SavedPromptVariant[]} variants
 * @property {string} notes
 * @property {string} savedAt
 * @property {string} changeNote
 * @property {string} source
 */

/**
 * @typedef {Object} SavedPromptTestCase
 * @property {string} id
 * @property {string} name
 * @property {string} input
 * @property {string[]} expectedTraits
 * @property {string[]} exclusions
 * @property {string} notes
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} SavedPromptGoldenResponse
 * @property {string} text
 * @property {string} pinnedAt
 * @property {string} pinnedFromRunId
 * @property {string} provider
 * @property {string} model
 */

/**
 * Canonical persisted prompt entity used by the StorageGateway.
 *
 * @typedef {Object} SavedPromptEntity
 * @property {string} id
 * @property {string} title
 * @property {string} original
 * @property {string} enhanced
 * @property {SavedPromptVariant[]} variants
 * @property {string} notes
 * @property {string[]} tags
 * @property {string} collection
 * @property {string} createdAt
 * @property {string | undefined} updatedAt
 * @property {number} useCount
 * @property {string} currentVersionId
 * @property {SavedPromptVersion[]} versions
 * @property {SavedPromptTestCase[]} testCases
 * @property {SavedPromptGoldenResponse | null} goldenResponse
 * @property {number} goldenThreshold
 * @property {{
 *   owner: string,
 *   purpose: string,
 *   status: string,
 *   compatibility: string[],
 *   riskLevel: string
 * }} metadata
 */

/**
 * @template T
 * @typedef {Object} GatewaySuccess
 * @property {true} ok
 * @property {T} data
 * @property {null} error
 * @property {{ source?: string, operation?: string }} [meta]
 */

/**
 * @typedef {Object} GatewayFailure
 * @property {false} ok
 * @property {null} data
 * @property {import('../lib/errorTaxonomy.js').AppError} error
 * @property {{ source?: string, operation?: string }} [meta]
 */

/**
 * @template T
 * @typedef {GatewaySuccess<T> | GatewayFailure} GatewayResult
 */

/**
 * @param {*} value
 * @returns {string[]}
 */
export function validateProviderRequest(value) {
  const issues = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ['ProviderRequest must be a non-null object'];
  }
  if (value.provider !== undefined && !VALID_PROVIDERS.includes(value.provider)) {
    issues.push(`provider must be one of: ${VALID_PROVIDERS.join(', ')}`);
  }
  if (value.system !== undefined && typeof value.system !== 'string') {
    issues.push('system must be a string');
  }
  if (value.messages !== undefined) {
    if (!Array.isArray(value.messages)) {
      issues.push('messages must be an array');
    } else {
      value.messages.forEach((msg, index) => {
        if (!msg || typeof msg !== 'object') {
          issues.push(`messages[${index}] must be an object`);
          return;
        }
        if (!['system', 'user', 'assistant'].includes(msg.role)) {
          issues.push(`messages[${index}].role must be system, user, or assistant`);
        }
        if (typeof msg.content !== 'string' && !Array.isArray(msg.content)) {
          issues.push(`messages[${index}].content must be a string or content block array`);
        }
      });
    }
  }
  if (value.max_tokens !== undefined && (!Number.isFinite(value.max_tokens) || value.max_tokens < 1)) {
    issues.push('max_tokens must be a positive number');
  }
  if (value.temperature !== undefined && (!Number.isFinite(value.temperature) || value.temperature < 0)) {
    issues.push('temperature must be a non-negative number');
  }
  if (value.responseFormat !== undefined && value.responseFormat !== 'json') {
    issues.push('responseFormat currently supports only "json"');
  }
  return issues;
}

/**
 * @param {*} value
 * @returns {string[]}
 */
export function validateProviderResponse(value) {
  const issues = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ['ProviderResponse must be a non-null object'];
  }
  if (!Array.isArray(value.content)) {
    issues.push('content must be an array');
  } else if (value.content.some((block) => !block || typeof block.text !== 'string')) {
    issues.push('content blocks must contain a text string');
  }
  if (typeof value.model !== 'string' || !value.model.trim()) {
    issues.push('model must be a non-empty string');
  }
  if (!VALID_PROVIDERS.includes(value.provider)) {
    issues.push(`provider must be one of: ${VALID_PROVIDERS.join(', ')}`);
  }
  return issues;
}

/**
 * Validate a prompt entity using the existing prompt normalizer as the source
 * of truth for persistence shape.
 *
 * @param {*} value
 * @returns {string[]}
 */
export function validateSavedPromptEntity(value) {
  const normalized = normalizeEntry(value);
  if (!normalized) {
    return ['SavedPromptEntity did not normalize to a valid prompt entry'];
  }

  const issues = [];
  if (typeof normalized.id !== 'string' || !normalized.id) issues.push('id is required');
  if (typeof normalized.title !== 'string' || !normalized.title.trim()) issues.push('title is required');
  if (typeof normalized.enhanced !== 'string' || !normalized.enhanced.trim()) issues.push('enhanced is required');
  if (!Array.isArray(normalized.versions)) issues.push('versions must be an array');
  if (!Array.isArray(normalized.testCases)) issues.push('testCases must be an array');
  if (!Array.isArray(normalized.tags)) issues.push('tags must be an array');
  if (!Number.isFinite(normalized.useCount) || normalized.useCount < 0) issues.push('useCount must be a non-negative number');
  if (!Number.isFinite(normalized.goldenThreshold) || normalized.goldenThreshold < 0 || normalized.goldenThreshold > 1) {
    issues.push('goldenThreshold must be between 0 and 1');
  }
  return issues;
}
