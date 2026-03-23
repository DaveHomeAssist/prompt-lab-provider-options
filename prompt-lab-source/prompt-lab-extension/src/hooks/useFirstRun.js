import { useCallback, useEffect, useState } from 'react';
import { isExtension, loadProviderSettings } from '../lib/platform.js';
import { PROVIDER_SETTINGS_KEYS } from '../lib/providerRegistry.js';
import { hasConfiguredProvider, hasStoredProviderState } from '../lib/hasConfiguredProvider.js';

const DISMISSED_KEY = 'pl2-setup-dismissed';
const FIRST_RUN_COMPLETE_KEY = 'pl2-first-run-complete';
const STORAGE_SETTINGS_KEY = 'pl2-provider-settings';

function readFlag(key) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeFlag(key) {
  try {
    localStorage.setItem(key, 'true');
  } catch {
    // localStorage is best-effort here; UI state still updates locally.
  }
}

function readLocalProviderSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadExtensionProviderSettings() {
  return new Promise((resolve) => {
    try {
      if (!globalThis.chrome?.storage?.local?.get) {
        resolve({});
        return;
      }
      globalThis.chrome.storage.local.get(PROVIDER_SETTINGS_KEYS, (result) => {
        if (globalThis.chrome?.runtime?.lastError) {
          resolve({});
          return;
        }
        resolve(result && typeof result === 'object' ? result : {});
      });
    } catch {
      resolve({});
    }
  });
}

async function loadProviderSettingsSnapshot() {
  if (isExtension) return loadExtensionProviderSettings();
  try {
    const stored = await loadProviderSettings();
    if (stored && typeof stored === 'object') return stored;
  } catch {
    // Fall back to localStorage for malformed or unavailable desktop/web loads.
  }
  return readLocalProviderSettings();
}

export default function useFirstRun() {
  const [showSetupCard, setShowSetupCard] = useState(false);
  const [isFirstEverLaunch, setIsFirstEverLaunch] = useState(false);

  const refresh = useCallback(async () => {
    const dismissed = readFlag(DISMISSED_KEY);
    const firstRunComplete = readFlag(FIRST_RUN_COMPLETE_KEY);
    const settings = await loadProviderSettingsSnapshot();
    const configured = hasConfiguredProvider(settings);
    const hasStoredState = hasStoredProviderState(settings);

    setIsFirstEverLaunch(!dismissed && !firstRunComplete && !hasStoredState);
    setShowSetupCard(!dismissed && !firstRunComplete && !configured);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const dismissed = readFlag(DISMISSED_KEY);
      const firstRunComplete = readFlag(FIRST_RUN_COMPLETE_KEY);
      const settings = await loadProviderSettingsSnapshot();
      if (cancelled) return;
      const configured = hasConfiguredProvider(settings);
      const hasStoredState = hasStoredProviderState(settings);

      setIsFirstEverLaunch(!dismissed && !firstRunComplete && !hasStoredState);
      setShowSetupCard(!dismissed && !firstRunComplete && !configured);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sync().catch(() => {});
      }
    };

    sync().catch(() => {});
    window.addEventListener('focus', handleVisibility);
    window.addEventListener('pl:provider-settings-updated', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('pl:provider-settings-updated', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const dismissSetupCard = useCallback(() => {
    writeFlag(DISMISSED_KEY);
    setShowSetupCard(false);
  }, []);

  const markFirstRunComplete = useCallback(() => {
    writeFlag(FIRST_RUN_COMPLETE_KEY);
    writeFlag(DISMISSED_KEY);
    setShowSetupCard(false);
    setIsFirstEverLaunch(false);
  }, []);

  return {
    showSetupCard,
    isFirstEverLaunch,
    dismissSetupCard,
    markFirstRunComplete,
    refreshFirstRunState: refresh,
  };
}
