import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * useRouteSync — bidirectional sync between React Router hash routes
 * and the existing useUiState / useNavigation state model.
 *
 * Route map:
 *   /           → create / editor
 *   /library    → create / library
 *   /composer   → create / composer
 *   /evaluate   → runs / history
 *   /compare    → runs / compare
 *   /pad        → notebook
 *
 * This hook reads the URL on mount and pushes state → URL on nav changes.
 * It preserves the existing state model so all current code keeps working.
 */

const ROUTE_TO_STATE = {
  '/': { primaryView: 'create', workspaceView: 'editor' },
  '/library': { primaryView: 'create', workspaceView: 'library' },
  '/composer': { primaryView: 'create', workspaceView: 'composer' },
  '/evaluate': { primaryView: 'runs', runsView: 'history' },
  '/compare': { primaryView: 'runs', runsView: 'compare' },
  '/pad': { primaryView: 'notebook' },
};

function stateToRoute(primaryView, workspaceView, runsView) {
  if (primaryView === 'notebook') return '/pad';
  if (primaryView === 'runs') return runsView === 'compare' ? '/compare' : '/evaluate';
  if (workspaceView === 'library') return '/library';
  if (workspaceView === 'composer') return '/composer';
  return '/';
}

export default function useRouteSync({
  primaryView, setPrimaryView,
  workspaceView, setWorkspaceView,
  runsView, setRunsView,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const suppressPush = useRef(false);

  // URL → state: on mount and browser back/forward
  useEffect(() => {
    const mapping = ROUTE_TO_STATE[location.pathname];
    if (!mapping) return;

    suppressPush.current = true;

    if (mapping.primaryView) setPrimaryView(mapping.primaryView);
    if (mapping.workspaceView) setWorkspaceView(mapping.workspaceView);
    if (mapping.runsView) setRunsView(mapping.runsView);

    // Allow the state update to settle before re-enabling URL push
    requestAnimationFrame(() => { suppressPush.current = false; });
  }, [location.pathname, setPrimaryView, setWorkspaceView, setRunsView]);

  // State → URL: when nav state changes, update the URL
  useEffect(() => {
    if (suppressPush.current) return;

    const target = stateToRoute(primaryView, workspaceView, runsView);
    if (target !== location.pathname) {
      navigate(target, { replace: true });
    }
  }, [primaryView, workspaceView, runsView, navigate, location.pathname]);
}
