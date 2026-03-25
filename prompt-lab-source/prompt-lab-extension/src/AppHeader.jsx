import Ic from './icons';
import { APP_VERSION } from './constants';
import { SUBVIEWS } from './lib/navigationRegistry.js';

export default function AppHeader({
  m, compact, libraryCount, colorMode, setColorMode,
  activeSection, openSection, openCreateView, openRunsView,
  primaryView, setPrimaryView, workspaceView, runsView,
  effectiveEditorLayout, setEditorLayout, createLayoutOptions,
  setShowCmdPalette, setCmdQuery, setShowShortcuts, setShowSettings,
}) {
  const createModeButtons = [
    { id: 'editor', label: 'Write', action: () => openSection('create'), active: primaryView === 'create' && workspaceView !== 'composer' },
    { id: 'composer', label: 'Compose', action: () => openCreateView('composer'), active: primaryView === 'create' && workspaceView === 'composer' },
  ];

  return (
    <header className={`px-4 py-2 ${m.header} border-b shrink-0`}>
      <div className={`flex ${compact ? 'flex-col gap-2' : 'items-center justify-between gap-3'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Ic n="Wand2" size={15} className="text-violet-500" />
              <span className="font-bold text-sm">Prompt Lab</span>
              <span className={`text-[10px] font-mono ${m.textMuted}`}>v{APP_VERSION}</span>
            </div>
            <span className={`text-[11px] ${m.textMuted}`}>{libraryCount} saved</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => { setShowCmdPalette(true); setCmdQuery(''); }} className={`ui-control px-2 py-1 rounded-lg ${m.btn} ${m.textAlt} text-[11px] font-mono hover:text-violet-400 transition-colors`}>⌘K</button>
            <button type="button" aria-label={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setColorMode(p => p === 'dark' ? 'light' : 'dark')} className={`ui-control p-1.5 rounded-lg ${m.btn} ${m.textAlt} hover:text-violet-400 transition-colors`}>
              {colorMode === 'dark' ? <Ic n="Sun" size={13} /> : <Ic n="Moon" size={13} />}
            </button>
            <button type="button" aria-label="Keyboard shortcuts" onClick={() => setShowShortcuts(true)} className={`ui-control p-1.5 rounded-lg ${m.btn} ${m.textAlt} hover:text-violet-400 transition-colors`}><Ic n="Keyboard" size={13} /></button>
            <button type="button" aria-label="Settings" onClick={() => setShowSettings(true)} className={`ui-control p-1.5 rounded-lg ${m.btn} ${m.textAlt} hover:text-violet-400 transition-colors`}><Ic n="Settings" size={13} /></button>
          </div>
        </div>
      </div>
      <div className={`flex items-center justify-between gap-2 mt-2 ${compact ? 'flex-col items-stretch' : ''}`}>
        <div className={`${compact ? 'overflow-x-auto pb-1 pl-subtle-scroll' : ''}`} role="tablist" aria-label="Primary workspaces">
          <div className="pl-scroll-row">
          {[
            ['create', 'Create'],
            ['library', 'Library'],
            ['evaluate', 'Evaluate'],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => openSection(id)} role="tab" aria-selected={activeSection === id}
              className={`pl-tab-btn ui-control px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${activeSection === id ? 'bg-violet-600 text-white' : `${m.btn} ${m.textAlt}`}`}>
              {label}
            </button>
          ))}
          </div>
        </div>
        <div className={`${compact ? 'overflow-x-auto pb-1 pl-subtle-scroll' : ''}`} aria-label="Prompt Lab utilities">
          <div className="pl-scroll-row">
          <button type="button" onClick={() => setPrimaryView('notebook')}
            className={`pl-tab-btn ui-control px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${primaryView === 'notebook' ? 'bg-violet-600 text-white' : `${m.btn} ${m.textAlt}`}`}>
            Notebook
          </button>
          </div>
        </div>
      </div>
      <div className={`mt-2 ${compact ? 'overflow-x-auto pb-1 pl-subtle-scroll' : ''}`} role="tablist" aria-label={activeSection === 'evaluate' ? 'Evaluate views' : primaryView === 'notebook' ? 'Notebook status' : activeSection === 'create' ? 'Create workspace modes' : 'Library status'}>
        <div className="pl-scroll-row">
        {activeSection === 'evaluate' && (
          <>
            {SUBVIEWS.runs.map(({ id, label }) => (
              <button key={id} type="button" onClick={() => openRunsView(id)} role="tab" aria-selected={runsView === id}
                className={`pl-tab-btn ui-control px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${runsView === id ? 'bg-violet-600 text-white' : `${m.btn} ${m.textAlt}`}`}>
                {label}
              </button>
            ))}
          </>
        )}
        {primaryView === 'notebook' && (
          <span className={`text-[11px] ${m.textMuted}`}>Multi-pad notes with library handoff</span>
        )}
        {activeSection === 'create' && (
          <>
            {createModeButtons.map(({ id, label, action, active }) => (
              <button key={id} type="button" onClick={action}
                className={`pl-tab-btn ui-control px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${active ? 'bg-violet-600 text-white' : `${m.btn} ${m.textAlt}`}`}>
                {label}
              </button>
            ))}
            {!compact && (
              <span className={`text-[11px] ${m.textMuted}`}>
                {workspaceView === 'composer'
                  ? 'Assemble blocks without leaving Create'
                  : 'Draft, enhance, and save from one workbench'}
              </span>
            )}
            {createLayoutOptions.map(([id, label]) => (
              <button key={id} type="button" onClick={() => setEditorLayout(id)}
                className={`pl-tab-btn ui-control px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${effectiveEditorLayout === id ? 'bg-violet-600 text-white' : `${m.btn} ${m.textAlt}`}`}>
                {label}
              </button>
            ))}
          </>
        )}
        {activeSection === 'library' && (
          <span className={`text-[11px] ${m.textMuted}`}>Browse, filter, and reuse saved prompts</span>
        )}
        </div>
      </div>
    </header>
  );
}
