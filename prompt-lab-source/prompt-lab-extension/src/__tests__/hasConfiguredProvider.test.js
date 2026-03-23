import { describe, expect, it } from 'vitest';
import {
  configuredProviders,
  hasConfiguredProvider,
  hasStoredProviderState,
} from '../lib/hasConfiguredProvider.js';

describe('hasConfiguredProvider', () => {
  it('treats real remote keys as configured', () => {
    expect(hasConfiguredProvider({
      provider: 'openai',
      openaiApiKey: 'sk-openai-12345678901234567890',
    })).toBe(true);
  });

  it('treats ollama base urls as configured without a key', () => {
    expect(configuredProviders({
      provider: 'ollama',
      ollamaBaseUrl: 'http://localhost:11434',
    })).toEqual(['ollama']);
  });

  it('ignores placeholder or too-short values', () => {
    expect(hasConfiguredProvider({
      provider: 'anthropic',
      apiKey: 'demo',
      openrouterApiKey: 'short',
      anthropicModel: 'claude-sonnet-4-20250514',
    })).toBe(false);
  });

  it('tracks any saved provider state separately from usable configuration', () => {
    expect(hasStoredProviderState({
      provider: 'anthropic',
      anthropicModel: 'claude-sonnet-4-20250514',
    })).toBe(true);
    expect(hasConfiguredProvider({
      provider: 'anthropic',
      anthropicModel: 'claude-sonnet-4-20250514',
    })).toBe(false);
  });
});
