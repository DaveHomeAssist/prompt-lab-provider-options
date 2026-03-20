import { useEffect, useState } from 'react';
import usePersistedState from '../usePersistedState.js';

function readInitialFontSize(primaryKey, legacyKey, fallback) {
  if (typeof window === 'undefined') return fallback;

  try {
    const primaryRaw = localStorage.getItem(primaryKey);
    if (primaryRaw !== null) {
      const primaryValue = JSON.parse(primaryRaw);
      const n = Number(primaryValue);
      if (Number.isFinite(n) && n >= 10 && n <= 22) return n;
    }

    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw !== null) {
      const legacyValue = JSON.parse(legacyRaw);
      const n = Number(legacyValue);
      if (Number.isFinite(n) && n >= 10 && n <= 22) return n;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export default function useUiState() {
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 420));
  const [viewportHeight, setViewportHeight] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 720));
  const [colorMode, setColorMode] = usePersistedState('pl2-mode', 'dark', {
    validate: value => (value === 'dark' || value === 'light') ? value : 'dark',
  });
  const [density, setDensity] = usePersistedState('pl2-density', 'comfortable', {
    validate: value => ['compact', 'comfortable', 'spacious'].includes(value) ? value : 'comfortable',
  });
  const [editorFontSize, setEditorFontSize] = usePersistedState('pl2-editor-font-size', readInitialFontSize('pl2-editor-font-size', 'pl2-font-size', 14), {
    validate: value => {
      const n = Number(value);
      return Number.isFinite(n) && n >= 10 && n <= 22 ? n : 14;
    },
  });
  const [resultFontSize, setResultFontSize] = usePersistedState('pl2-result-font-size', readInitialFontSize('pl2-result-font-size', 'pl2-font-size', 14), {
    validate: value => {
      const n = Number(value);
      return Number.isFinite(n) && n >= 10 && n <= 22 ? n : 14;
    },
  });
  const [primaryView, setPrimaryView] = useState('create');
  const [workspaceView, setWorkspaceView] = useState('editor');
  const [runsView, setRunsView] = useState('history');
  const [toast, setToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');

  const tab = (() => {
    if (primaryView === 'notebook') return 'pad';
    if (primaryView === 'runs') return runsView === 'compare' ? 'abtest' : 'history';
    if (workspaceView === 'composer') return 'composer';
    return 'editor';
  })();

  const setTab = (nextTab) => {
    if (nextTab === 'editor') {
      setPrimaryView('create');
      setWorkspaceView('editor');
      return;
    }
    if (nextTab === 'composer') {
      setPrimaryView('create');
      setWorkspaceView('composer');
      return;
    }
    if (nextTab === 'abtest') {
      setPrimaryView('runs');
      setRunsView('compare');
      return;
    }
    if (nextTab === 'history') {
      setPrimaryView('runs');
      setRunsView('history');
      return;
    }
    if (nextTab === 'pad') {
      setPrimaryView('notebook');
      return;
    }
  };

  useEffect(() => {
    const onResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    viewportWidth,
    viewportHeight,
    colorMode,
    setColorMode,
    density,
    setDensity,
    editorFontSize,
    setEditorFontSize,
    resultFontSize,
    setResultFontSize,
    primaryView,
    setPrimaryView,
    workspaceView,
    setWorkspaceView,
    runsView,
    setRunsView,
    tab,
    setTab,
    toast,
    setToast,
    notify: message => setToast(message),
    showSettings,
    setShowSettings,
    showCmdPalette,
    setShowCmdPalette,
    showShortcuts,
    setShowShortcuts,
    cmdQuery,
    setCmdQuery,
  };
}
