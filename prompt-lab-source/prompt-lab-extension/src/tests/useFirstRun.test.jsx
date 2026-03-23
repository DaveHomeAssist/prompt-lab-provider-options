import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadProviderSettings } = vi.hoisted(() => ({
  loadProviderSettings: vi.fn(),
}));

vi.mock('../lib/platform.js', () => ({
  isExtension: false,
  loadProviderSettings,
}));

import useFirstRun from '../hooks/useFirstRun.js';

describe('useFirstRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    loadProviderSettings.mockResolvedValue({});
  });

  it('shows the setup card on a true first launch', async () => {
    const { result } = renderHook(() => useFirstRun());

    await waitFor(() => {
      expect(result.current.showSetupCard).toBe(true);
    });

    expect(result.current.isFirstEverLaunch).toBe(true);
  });

  it('hides the setup card when a usable provider key exists', async () => {
    loadProviderSettings.mockResolvedValue({
      provider: 'openai',
      openaiApiKey: 'sk-openai-12345678901234567890',
    });

    const { result } = renderHook(() => useFirstRun());

    await waitFor(() => {
      expect(result.current.showSetupCard).toBe(false);
    });

    expect(result.current.isFirstEverLaunch).toBe(false);
  });

  it('dismisses and completes first-run state persistently', async () => {
    const { result } = renderHook(() => useFirstRun());

    await waitFor(() => {
      expect(result.current.showSetupCard).toBe(true);
    });

    act(() => {
      result.current.dismissSetupCard();
    });

    expect(localStorage.getItem('pl2-setup-dismissed')).toBe('true');
    expect(result.current.showSetupCard).toBe(false);

    act(() => {
      result.current.markFirstRunComplete();
    });

    expect(localStorage.getItem('pl2-first-run-complete')).toBe('true');
    expect(localStorage.getItem('pl2-setup-dismissed')).toBe('true');
    expect(result.current.isFirstEverLaunch).toBe(false);
  });

  it('refreshes setup state after provider settings are updated', async () => {
    loadProviderSettings.mockResolvedValueOnce({});
    const { result } = renderHook(() => useFirstRun());

    await waitFor(() => {
      expect(result.current.showSetupCard).toBe(true);
    });

    loadProviderSettings.mockResolvedValue({
      provider: 'openai',
      openaiApiKey: 'sk-openai-12345678901234567890',
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('pl:provider-settings-updated'));
    });

    await waitFor(() => {
      expect(result.current.showSetupCard).toBe(false);
    });
  });
});
