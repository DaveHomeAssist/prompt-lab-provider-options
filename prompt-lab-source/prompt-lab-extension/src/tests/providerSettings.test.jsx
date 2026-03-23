import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loadProviderSettings,
  saveProviderSettings,
  listOllamaModels,
  testProviderConnection,
} = vi.hoisted(() => ({
  loadProviderSettings: vi.fn(),
  saveProviderSettings: vi.fn(),
  listOllamaModels: vi.fn(),
  testProviderConnection: vi.fn(),
}));

const baselineChrome = globalThis.chrome;

vi.mock('../lib/platform.js', () => ({
  isExtension: false,
  loadProviderSettings,
  saveProviderSettings,
  listOllamaModels,
  testProviderConnection,
}));

const theme = {
  input: 'bg-slate-900',
  border: 'border-slate-700',
  text: 'text-white',
  textAlt: 'text-slate-200',
  textMuted: 'text-slate-400',
  btn: 'bg-slate-800',
  bg: 'bg-slate-950',
};

async function renderModal(props = {}) {
  delete globalThis.chrome;
  vi.doMock('../lib/platform.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      isExtension: false,
      loadProviderSettings,
      saveProviderSettings,
      listOllamaModels,
      testProviderConnection,
    };
  });
  const { default: DesktopSettingsModal } = await import('../DesktopSettingsModal.jsx');
  const onClose = vi.fn();
  const notify = vi.fn();
  const view = render(
    <DesktopSettingsModal
      show
      onClose={onClose}
      m={theme}
      notify={notify}
      {...props}
    />
  );
  return { ...view, onClose, notify };
}

describe('DesktopSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadProviderSettings.mockResolvedValue({
      provider: 'anthropic',
      apiKey: 'sk-ant',
      anthropicModel: 'claude-sonnet-4-20250514',
      openaiApiKey: 'sk-openai',
      openaiModel: 'gpt-4o',
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.2:3b',
    });
    saveProviderSettings.mockResolvedValue(undefined);
    listOllamaModels.mockResolvedValue([]);
    testProviderConnection.mockResolvedValue({ ok: true });
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.chrome = baselineChrome;
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('provider_selection_persists_and_rehydrates', async () => {
    const firstView = await renderModal();

    const providerSelect = await screen.findByLabelText(/^provider$/i, { selector: 'select' });
    fireEvent.change(providerSelect, { target: { value: 'openai' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(saveProviderSettings).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'openai',
        openaiApiKey: 'sk-openai',
        openaiModel: 'gpt-4o',
      }));
    });

    loadProviderSettings.mockResolvedValueOnce({
      provider: 'openai',
      openaiApiKey: 'sk-openai',
      openaiModel: 'gpt-4o-mini',
    });

    firstView.unmount();
    await renderModal();

    const rehydratedProvider = await screen.findByLabelText(/^provider$/i, { selector: 'select' });
    fireEvent.change(rehydratedProvider, { target: { value: 'openai' } });

    await waitFor(() => {
      expect(screen.getByLabelText(/model/i)).toHaveValue('gpt-4o-mini');
    });
  });

  it('connection_test_sets_success_state', async () => {
    await renderModal();

    fireEvent.click(await screen.findByRole('button', { name: 'Test Connection' }));

    expect(await screen.findByText('Connected!')).toBeInTheDocument();
    expect(testProviderConnection).toHaveBeenCalledTimes(1);
    // Verify the test payload includes the resolved model and minimal messages
    expect(testProviderConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(String),
        messages: expect.arrayContaining([expect.objectContaining({ role: 'user' })]),
      }),
      expect.objectContaining({ provider: 'anthropic' }),
    );
  });

  it('ollama_refresh_updates_model_list_only', async () => {
    loadProviderSettings.mockResolvedValueOnce({
      provider: 'ollama',
      openaiApiKey: 'sk-openai-preserved',
      openaiModel: 'gpt-4o',
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.2:3b',
    });
    listOllamaModels.mockResolvedValueOnce([
      { name: 'llama3.2:8b', paramSize: '8B' },
      { name: 'mistral:7b', paramSize: '7B' },
    ]);

    await renderModal();

    fireEvent.click(await screen.findByRole('button', { name: 'Refresh Models' }));

    expect(await screen.findByRole('option', { name: /llama3\.2:8b/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/base url/i)).toHaveValue('http://localhost:11434');
    expect(saveProviderSettings).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^provider$/i, { selector: 'select' }), { target: { value: 'openai' } });

    await waitFor(() => {
      expect(screen.getByLabelText(/api key/i)).toHaveValue('sk-openai-preserved');
    });
  });

  it('dispatches a provider refresh event after save', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    await renderModal();

    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(saveProviderSettings).toHaveBeenCalledTimes(1);
    });

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'pl:provider-settings-updated',
    }));
  });

});
