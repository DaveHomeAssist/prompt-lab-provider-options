import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppHeader from '../AppHeader.jsx';

vi.mock('../icons.jsx', () => ({
  default: () => null,
}));

vi.mock('../constants.js', () => ({
  APP_VERSION: '1.7.0-test',
}));

function renderHeader(overrides = {}) {
  const noop = vi.fn();

  return render(
    <AppHeader
      m={{
        header: 'bg-slate-900',
        textMuted: 'text-slate-400',
        btn: 'bg-slate-800',
        textAlt: 'text-slate-100',
        textSub: 'text-slate-300',
      }}
      compact={false}
      libraryCount={3}
      colorMode="dark"
      setColorMode={noop}
      activeSection="create"
      openSection={noop}
      openCreateView={noop}
      openRunsView={noop}
      primaryView="create"
      setPrimaryView={noop}
      workspaceView="editor"
      runsView="history"
      effectiveEditorLayout="editor"
      setEditorLayout={noop}
      createLayoutOptions={[]}
      setShowCmdPalette={noop}
      setCmdQuery={noop}
      setShowShortcuts={noop}
      setShowSettings={noop}
      {...overrides}
    />
  );
}

describe('AppHeader', () => {
  it('shows Create, Library, and Evaluate as the primary workspaces', () => {
    renderHeader();

    expect(screen.getByRole('tab', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Library' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Evaluate' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Experiments' })).not.toBeInTheDocument();
  });

  it('shows Write and Compose as Create sub-modes instead of the old Build utility button', () => {
    renderHeader();

    expect(screen.getByRole('button', { name: 'Write' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compose' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notebook' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Build' })).not.toBeInTheDocument();
  });
});
