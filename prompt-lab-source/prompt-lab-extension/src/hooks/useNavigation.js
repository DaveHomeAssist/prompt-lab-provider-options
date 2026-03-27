import { useCallback, useMemo } from 'react';

/**
 * useNavigation — wraps raw view state into a single, formalized navigation API.
 *
 * Replaces the scattered openSection / openCreateView / openRunsView functions
 * that were previously inlined in App.jsx.
 */
export default function useNavigation({
  primaryView, setPrimaryView,
  workspaceView, setWorkspaceView,
  runsView, setRunsView,
  tab, setTab,
}) {
  const activeSection = useMemo(() => {
    if (primaryView === 'runs') return 'evaluate';
    if (workspaceView === 'library') return 'library';
    return 'create';
  }, [primaryView, workspaceView]);

  const openCreateView = useCallback((nextView) => {
    setPrimaryView('create');
    setWorkspaceView(nextView);
  }, [setPrimaryView, setWorkspaceView]);

  const openSection = useCallback((nextSection) => {
    if (nextSection === 'create') {
      setPrimaryView('create');
      setWorkspaceView('editor');
      return;
    }
    if (nextSection === 'library') {
      setPrimaryView('create');
      setWorkspaceView('library');
      return;
    }
    if (nextSection === 'evaluate' || nextSection === 'experiments') {
      setPrimaryView('runs');
      // Don't force runsView — preserve user's history/compare state
    }
  }, [setPrimaryView, setWorkspaceView, setRunsView]);

  const openRunsView = useCallback((nextView) => {
    setPrimaryView('runs');
    setRunsView(nextView);
  }, [setPrimaryView, setRunsView]);

  return {
    activeSection,
    openCreateView,
    openSection,
    openRunsView,
    primaryView, setPrimaryView,
    workspaceView, setWorkspaceView,
    runsView, setRunsView,
    tab, setTab,
  };
}
