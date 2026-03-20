import { useEffect, useMemo, useRef, useState } from 'react';
import Ic from './icons';
import { logWarn } from './lib/logger.js';
import {
  buildDefaultNotebookPayload,
  createNotebookEntry,
  DEFAULT_PROJECT,
  filterNotebookEntries,
  formatNotebookTimestamp,
  getNotebookEntryStats,
  migrateNotebookStorage,
  normalizeNotebookProject,
  normalizeNotebookStatus,
  normalizeNotebookTitle,
  NOTEBOOK_STATUS,
  persistNotebookState,
  readNotebookPayload,
} from './lib/notebookModel.js';
import { matchPadShortcut } from './lib/padShortcuts.js';
import { preparePromptLabHandoff } from './lib/promptLabBridge.js';

function buildEditorDraft(entry) {
  return {
    title: entry?.title || 'Scratchpad',
    body: entry?.body || '',
    project: entry?.project || DEFAULT_PROJECT,
    status: entry?.status || 'draft',
  };
}

function buildEmptyEntryName(entries) {
  return `Note ${entries.length + 1}`;
}

function sanitizeFilename(value) {
  const base = String(value || 'notebook-entry')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'notebook-entry';
}

function statusTone(status) {
  if (status === 'archived') {
    return 'border-slate-500/40 bg-slate-500/10 text-slate-300';
  }
  if (status === 'in_test') {
    return 'border-blue-500/35 bg-blue-500/12 text-blue-300';
  }
  return 'border-violet-500/35 bg-violet-500/12 text-violet-200';
}

export default function PadTab({
  m,
  notify,
  pageScroll = false,
  onPromoteToLibrary,
  onSendToEditor,
}) {
  const migrationCheckedRef = useRef(false);
  const textareaRef = useRef(null);
  const notebookRef = useRef(null);
  const timerRef = useRef(null);
  const savedStateTimerRef = useRef(null);

  const [notebookState, setNotebookState] = useState(() => {
    const payload = readNotebookPayload();
    return payload || buildDefaultNotebookPayload('', Date.now());
  });
  const [filters, setFilters] = useState({ query: '', status: 'all', project: 'all' });
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(0);
  const [selectionText, setSelectionText] = useState('');
  const [draft, setDraft] = useState(() => buildEditorDraft(notebookState.entries[0]));
  const [clipboardBanner, setClipboardBanner] = useState('');
  const [clockTick, setClockTick] = useState(Date.now());
  const draftRef = useRef(draft);

  notebookRef.current = notebookState;
  draftRef.current = draft;

  const activeEntry = useMemo(() => (
    notebookState.entries.find((entry) => entry.id === notebookState.selectedEntryId) || notebookState.entries[0]
  ), [notebookState]);
  const filteredEntries = useMemo(() => (
    filterNotebookEntries(notebookState.entries, filters)
  ), [filters, notebookState.entries]);
  const projectOptions = useMemo(() => (
    Array.from(new Set(notebookState.entries.map((entry) => entry.project.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  ), [notebookState.entries]);

  const stats = getNotebookEntryStats(draft.body);
  const shellMinHeightClass = pageScroll ? 'min-h-[calc(100vh-9rem)]' : 'min-h-[calc(100vh-7rem)]';
  const editorPaneMinHeightClass = pageScroll ? 'min-h-[calc(100vh-13rem)]' : 'min-h-[calc(100vh-11rem)]';
  const textareaMinHeightClass = pageScroll ? 'min-h-[calc(100vh-19rem)]' : 'min-h-[calc(100vh-17rem)]';
  const copyBtnClass = m.text?.includes('gray-100')
    ? 'border border-violet-400/30 bg-violet-500/15 text-violet-200 hover:border-violet-300 hover:bg-violet-500/25'
    : 'border border-violet-300 bg-violet-50 text-violet-700 hover:border-violet-400 hover:bg-violet-100';

  const scheduleIdleStatus = () => {
    clearTimeout(savedStateTimerRef.current);
    savedStateTimerRef.current = setTimeout(() => setSaveState('idle'), 1800);
  };

  const syncSelectionState = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setSelectionText('');
      return '';
    }
    const nextSelection = draft.body.slice(textarea.selectionStart, textarea.selectionEnd);
    setSelectionText(nextSelection);
    return nextSelection;
  };

  const loadEntryIntoEditor = (entry) => {
    const nextDraft = buildEditorDraft(entry);
    setDraft(nextDraft);
    setSaveState('idle');
    setSaveError('');
    setLastSavedAt(entry?.updatedAt || 0);
    setSelectionText('');
    setClipboardBanner('');
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const commitDraft = (nextDraft = draftRef.current, { silent = false } = {}) => {
    const baseState = notebookRef.current;
    const selectedId = baseState?.selectedEntryId;
    if (!selectedId) return baseState;

    const currentEntry = baseState.entries.find((entry) => entry.id === selectedId);
    if (!currentEntry) return baseState;

    const normalized = {
      title: normalizeNotebookTitle(nextDraft.title, nextDraft.body),
      body: String(nextDraft.body || ''),
      project: normalizeNotebookProject(nextDraft.project),
      status: normalizeNotebookStatus(nextDraft.status),
    };

    const changed = (
      currentEntry.title !== normalized.title ||
      currentEntry.body !== normalized.body ||
      currentEntry.project !== normalized.project ||
      currentEntry.status !== normalized.status
    );

    if (!changed) {
      if (silent) return baseState;
      setSaveState('idle');
      setSaveError('');
      return baseState;
    }

    const updatedAt = Date.now();
    const nextState = {
      ...baseState,
      entries: baseState.entries.map((entry) => (
        entry.id === selectedId
          ? {
              ...entry,
              ...normalized,
              updatedAt,
            }
          : entry
      )),
    };

    persistNotebookState(nextState);
    notebookRef.current = nextState;
    setNotebookState(nextState);
    setDraft(normalized);
    setLastSavedAt(updatedAt);
    setSaveError('');

    if (silent) {
      setSaveState('idle');
      return nextState;
    }

    setSaveState('saved');
    scheduleIdleStatus();
    return nextState;
  };

  const flushDraft = ({ silent = false } = {}) => {
    clearTimeout(timerRef.current);
    return commitDraft(draftRef.current, { silent });
  };

  const updateEntryMeta = (mutator) => {
    const baseState = flushDraft({ silent: true });
    const selectedId = baseState.selectedEntryId;
    const nextState = {
      ...baseState,
      entries: baseState.entries.map((entry) => (
        entry.id === selectedId ? mutator(entry) : entry
      )),
    };
    persistNotebookState(nextState);
    notebookRef.current = nextState;
    setNotebookState(nextState);
    const nextEntry = nextState.entries.find((entry) => entry.id === selectedId);
    if (nextEntry) {
      loadEntryIntoEditor(nextEntry);
    }
    return nextEntry;
  };

  const queueDraftChange = (patch, { immediate = false } = {}) => {
    const nextDraft = {
      ...draft,
      ...patch,
    };
    setDraft(nextDraft);
    setSaveError('');
    clearTimeout(savedStateTimerRef.current);
    clearTimeout(timerRef.current);

    if (immediate) {
      commitDraft(nextDraft);
      return;
    }

    setSaveState('pending');
    timerRef.current = setTimeout(() => {
      try {
        commitDraft(nextDraft);
      } catch (error) {
        logWarn('notebook autosave', error);
        setSaveState('idle');
        setSaveError('Save failed');
      }
    }, 500);
  };

  useEffect(() => {
    if (migrationCheckedRef.current) return;
    migrationCheckedRef.current = true;
    const { payload, error, migrated } = migrateNotebookStorage();
    notebookRef.current = payload;
    setNotebookState(payload);
    const selected = payload.entries.find((entry) => entry.id === payload.selectedEntryId) || payload.entries[0];
    loadEntryIntoEditor(selected);

    if (error) {
      notify?.('Notebook migration failed; using fallback note.');
      return;
    }
    if (migrated) {
      notify?.('Notebook upgraded to structured entries.');
    }
  }, [notify]);

  useEffect(() => {
    const selected = notebookState.entries.find((entry) => entry.id === notebookState.selectedEntryId) || notebookState.entries[0];
    if (!selected) return;
    if (
      draft.title === selected.title &&
      draft.body === selected.body &&
      draft.project === selected.project &&
      draft.status === selected.status
    ) {
      return;
    }
    loadEntryIntoEditor(selected);
  }, [notebookState.selectedEntryId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!lastSavedAt) return undefined;
    const intervalId = setInterval(() => setClockTick(Date.now()), 30000);
    return () => clearInterval(intervalId);
  }, [lastSavedAt]);

  useEffect(() => () => {
    flushDraft({ silent: true });
    clearTimeout(timerRef.current);
    clearTimeout(savedStateTimerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleBeforeUnload = () => {
      flushDraft({ silent: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushDraft({ silent: true });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateEntry = () => {
    const baseState = flushDraft({ silent: true });
    const newEntry = createNotebookEntry({
      title: buildEmptyEntryName(baseState.entries),
      body: '',
      project: DEFAULT_PROJECT,
      status: 'draft',
    });
    const nextState = {
      entries: [newEntry, ...baseState.entries],
      selectedEntryId: newEntry.id,
    };
    persistNotebookState(nextState);
    notebookRef.current = nextState;
    setNotebookState(nextState);
    loadEntryIntoEditor(newEntry);
    notify?.(`Created ${newEntry.title}`);
  };

  const handleSelectEntry = (entryId) => {
    if (entryId === notebookState.selectedEntryId) return;
    const baseState = flushDraft({ silent: true });
    const nextState = {
      ...baseState,
      selectedEntryId: entryId,
    };
    persistNotebookState(nextState);
    notebookRef.current = nextState;
    setNotebookState(nextState);
    const nextEntry = nextState.entries.find((entry) => entry.id === entryId) || nextState.entries[0];
    loadEntryIntoEditor(nextEntry);
  };

  const handleDeleteEntry = () => {
    if (notebookState.entries.length <= 1) return;
    if (!window.confirm(`Delete "${draft.title}"? This cannot be undone.`)) return;
    const currentIndex = notebookState.entries.findIndex((entry) => entry.id === notebookState.selectedEntryId);
    const remainingEntries = notebookState.entries.filter((entry) => entry.id !== notebookState.selectedEntryId);
    const fallbackEntry = remainingEntries[Math.max(0, currentIndex - 1)] || remainingEntries[0];
    const nextState = {
      entries: remainingEntries,
      selectedEntryId: fallbackEntry.id,
    };
    persistNotebookState(nextState);
    notebookRef.current = nextState;
    setNotebookState(nextState);
    loadEntryIntoEditor(fallbackEntry);
    notify?.('Notebook entry deleted.');
  };

  const handleClearBody = () => {
    if (!window.confirm('Clear the body of this notebook entry?')) return;
    queueDraftChange({ body: '' }, { immediate: true });
    notify?.('Entry body cleared.');
  };

  const handleCopy = () => {
    if (!draft.body.trim()) return;
    try {
      navigator.clipboard.writeText(draft.body);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = draft.body;
      textarea.style.cssText = 'position:fixed;top:-9999px;opacity:0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    notify?.('Notebook entry copied.');
  };

  const exportEntry = () => {
    if (!draft.body.trim()) return;
    const filename = `${sanitizeFilename(draft.title)}.txt`;
    const blob = new Blob([draft.body], { type: 'text/plain;charset=utf-8' });
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.msSaveOrOpenBlob === 'function') {
        navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
      notify?.('Notebook entry downloaded.');
    } catch (error) {
      logWarn('notebook export', error);
      notify?.('Download unavailable.');
    }
  };

  const insertAtCursor = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.body.slice(start, end);
    const inserted = prefix + selected + suffix;
    const body = draft.body.slice(0, start) + inserted + draft.body.slice(end);
    queueDraftChange({ body }, { immediate: true });
    const cursorPos = selected ? start + inserted.length : start + prefix.length;
    setTimeout(() => {
      textarea.selectionStart = cursorPos;
      textarea.selectionEnd = cursorPos;
      textarea.focus();
      syncSelectionState();
    }, 0);
  };

  const insertDate = () => {
    const separator = `\n── ${new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })} ──\n`;
    insertAtCursor(separator);
    notify?.('Date separator inserted.');
  };

  const handleStatusChange = (status) => {
    queueDraftChange({ status }, { immediate: true });
  };

  const handleSendToEditor = ({ selectionOnly = false } = {}) => {
    if (!onSendToEditor) return;
    const selected = selectionOnly ? syncSelectionState().trim() : '';
    const content = selectionOnly ? selected : draft.body.trim();
    if (!content) {
      notify?.(selectionOnly ? 'Select text to send.' : 'Nothing to send.');
      return;
    }
    const title = selectionOnly ? `${draft.title} Selection` : draft.title;
    onSendToEditor(title, content, {
      project: draft.project,
      status: draft.status,
      source: 'notebook',
    });
  };

  const openPromptLabWindow = (url) => {
    if (window?.open) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.assign(url);
  };

  const handleSendToPromptLab = async ({ selectionOnly = false } = {}) => {
    const selected = selectionOnly ? syncSelectionState().trim() : '';
    const content = selectionOnly ? selected : draft.body.trim();
    if (!content) {
      notify?.(selectionOnly ? 'Select text to send.' : 'Nothing to send.');
      return;
    }

    const title = selectionOnly ? `${draft.title} Selection` : draft.title;
    const handoff = await preparePromptLabHandoff({
      draft: content,
      title,
      source: 'notebook',
      tab: 'editor',
    });

    if (!handoff.ok) {
      notify?.('Prompt Lab handoff failed.');
      return;
    }

    updateEntryMeta((entry) => ({
      ...entry,
      status: entry.status === 'archived' ? 'archived' : 'in_test',
      updatedAt: Date.now(),
      lastSentAt: Date.now(),
      promptLabLink: handoff.promptLabLink,
    }));
    setClipboardBanner(handoff.clipboard ? 'Draft copied to clipboard for Prompt Lab import.' : '');
    openPromptLabWindow(handoff.url);
    notify?.(
      handoff.clipboard
        ? 'Prompt Lab opened. Paste from clipboard in the editor banner.'
        : 'Prompt Lab opened with notebook draft.'
    );
  };

  const handleOpenLastPromptLabLink = () => {
    if (!activeEntry?.promptLabLink) return;
    openPromptLabWindow(activeEntry.promptLabLink);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const shortcut = matchPadShortcut(event);
      if (!shortcut) return;
      event.preventDefault();
      switch (shortcut.id) {
        case 'export':
          exportEntry();
          return;
        case 'insertDate':
          insertDate();
          return;
        case 'copyAll':
          handleCopy();
          return;
        case 'clear':
          handleClearBody();
          return;
        default:
          return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectionText, draft.body]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`${shellMinHeightClass} flex ${pageScroll ? '' : 'flex-1 overflow-hidden'}`}>
      <aside className={`w-[300px] shrink-0 border-r ${m.border} ${pageScroll ? '' : 'overflow-hidden'} flex flex-col`}>
        <div className={`border-b ${m.border} px-3 py-3 shrink-0`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${m.textSub}`}>Notebook</p>
              <p className={`text-[11px] ${m.textMuted}`}>Draft, test, archive, and hand off notes.</p>
            </div>
            <button
              type="button"
              onClick={handleCreateEntry}
              className={`ui-control flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${m.btn} ${m.textAlt} transition-colors`}
            >
              <Ic n="Plus" size={11} />
              New
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <label className="relative block">
              <Ic n="Search" size={12} className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${m.textMuted}`} />
              <input
                value={filters.query}
                onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
                placeholder="Search notes…"
                className={`${m.input} ${m.text} w-full rounded-lg border px-8 py-2 text-xs focus:outline-none focus:border-violet-500`}
              />
            </label>
            <div className="flex gap-2">
              <select
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                className={`${m.input} ${m.text} min-w-0 flex-1 rounded-lg border px-2 py-2 text-xs focus:outline-none focus:border-violet-500`}
              >
                <option value="all">All statuses</option>
                {NOTEBOOK_STATUS.map((status) => (
                  <option key={status.id} value={status.id}>{status.label}</option>
                ))}
              </select>
              <select
                value={filters.project}
                onChange={(event) => setFilters((prev) => ({ ...prev, project: event.target.value }))}
                className={`${m.input} ${m.text} min-w-0 flex-1 rounded-lg border px-2 py-2 text-xs focus:outline-none focus:border-violet-500`}
              >
                <option value="all">All projects</option>
                {projectOptions.map((project) => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={`flex-1 ${pageScroll ? '' : 'overflow-y-auto'} px-2 py-2`}>
          {filteredEntries.length === 0 ? (
            <div className={`rounded-xl border ${m.border} ${m.surface} px-3 py-4 text-xs ${m.textMuted}`}>
              No notebook entries match the current filters.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredEntries.map((entry) => {
                const isActive = entry.id === notebookState.selectedEntryId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleSelectEntry(entry.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      isActive
                        ? 'border-violet-500/60 bg-violet-600/10'
                        : `${m.border} ${m.surface}`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`min-w-0 truncate text-sm font-semibold ${isActive ? 'text-violet-200' : m.text}`}>
                        {entry.title}
                      </span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusTone(entry.status)}`}>
                        {NOTEBOOK_STATUS.find((status) => status.id === entry.status)?.label || 'Draft'}
                      </span>
                    </div>
                    <div className={`mt-1 text-[11px] ${m.textMuted}`}>
                      {entry.project} · {formatNotebookTimestamp(entry.updatedAt, clockTick)}
                    </div>
                    {entry.body.trim() && (
                      <div className={`mt-2 line-clamp-3 text-xs ${m.textMuted}`}>
                        {entry.body.slice(0, 140)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <section className={`flex-1 min-w-0 ${pageScroll ? '' : 'overflow-hidden'} flex flex-col`}>
        <div className={`border-b ${m.border} px-4 py-3 shrink-0`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={draft.title}
                  onChange={(event) => queueDraftChange({ title: event.target.value })}
                  placeholder="Untitled notebook entry"
                  className={`${m.input} ${m.text} min-w-[14rem] flex-[2_1_18rem] rounded-lg border px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500`}
                />
                <input
                  value={draft.project}
                  onChange={(event) => queueDraftChange({ project: event.target.value })}
                  placeholder={DEFAULT_PROJECT}
                  className={`${m.input} ${m.text} min-w-[11rem] flex-[1_1_12rem] rounded-lg border px-3 py-2 text-xs focus:outline-none focus:border-violet-500`}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {NOTEBOOK_STATUS.map((status) => (
                  <button
                    key={status.id}
                    type="button"
                    onClick={() => handleStatusChange(status.id)}
                    className={`ui-control rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                      draft.status === status.id
                        ? 'border-violet-500 bg-violet-600 text-white'
                        : `${m.btn} ${m.textAlt}`
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
                <span className={`text-xs ${m.textMuted}`}>
                  {stats.words}w · {stats.chars}c · ~{stats.tokens} tok
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {onSendToEditor && (
                <button
                  type="button"
                  onClick={() => handleSendToEditor()}
                  disabled={!draft.body.trim()}
                  className={`ui-control flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    draft.body.trim() ? 'bg-emerald-600 text-white hover:bg-emerald-500' : `${m.btn} ${m.textMuted} opacity-40 cursor-not-allowed`
                  }`}
                >
                  <Ic n="ArrowRight" size={11} />
                  Open in Editor
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSendToPromptLab()}
                disabled={!draft.body.trim()}
                className={`ui-control flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  draft.body.trim() ? 'bg-violet-600 text-white hover:bg-violet-500' : `${m.btn} ${m.textMuted} opacity-40 cursor-not-allowed`
                }`}
              >
                <Ic n="Share2" size={11} />
                Send to Prompt Lab
              </button>
              <button
                type="button"
                onClick={() => handleSendToPromptLab({ selectionOnly: true })}
                disabled={!selectionText.trim()}
                className={`ui-control rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  selectionText.trim() ? `${m.btn} ${m.textAlt}` : `${m.btn} ${m.textMuted} opacity-40 cursor-not-allowed`
                }`}
              >
                Send Selected
              </button>
              {onPromoteToLibrary && (
                <button
                  type="button"
                  onClick={() => onPromoteToLibrary(draft.title, draft.body)}
                  disabled={!draft.body.trim()}
                  className={`ui-control flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    draft.body.trim() ? `${m.btn} ${m.textAlt}` : `${m.btn} ${m.textMuted} opacity-40 cursor-not-allowed`
                  }`}
                >
                  <Ic n="Save" size={11} />
                  Library
                </button>
              )}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!draft.body.trim()}
                className={`ui-control flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${copyBtnClass} ${
                  draft.body.trim() ? '' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <Ic n="Copy" size={11} />
                Copy
              </button>
              <button
                type="button"
                onClick={exportEntry}
                disabled={!draft.body.trim()}
                className={`ui-control rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                  draft.body.trim() ? `${m.btn} ${m.textAlt}` : `${m.btn} ${m.textMuted} opacity-40 cursor-not-allowed`
                }`}
              >
                <Ic n="Download" size={11} />
              </button>
              <details className="relative">
                <summary className={`ui-control list-none cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold ${m.btn} ${m.textAlt}`}>
                  More
                </summary>
                <div className={`absolute right-0 z-10 mt-2 w-44 rounded-xl border ${m.border} ${m.surface} p-1 shadow-xl`}>
                  {activeEntry?.promptLabLink && (
                    <button
                      type="button"
                      onClick={handleOpenLastPromptLabLink}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${m.textAlt} hover:bg-violet-600/10`}
                    >
                      <Ic n="Share2" size={11} />
                      Reopen Prompt Lab
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClearBody}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${m.textAlt} hover:bg-violet-600/10`}
                  >
                    <Ic n="RotateCcw" size={11} />
                    Clear Body
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteEntry}
                    disabled={notebookState.entries.length <= 1}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                      notebookState.entries.length > 1 ? 'text-red-400 hover:bg-red-950/30' : `${m.textMuted} opacity-40 cursor-not-allowed`
                    }`}
                  >
                    <Ic n="Trash2" size={11} />
                    Delete Entry
                  </button>
                </div>
              </details>
            </div>
          </div>

          {(clipboardBanner || activeEntry?.lastSentAt) && (
            <div className={`mt-3 rounded-xl border ${m.border} ${m.surface} px-3 py-2`}>
              {clipboardBanner && (
                <p className={`text-xs font-medium text-violet-300`}>{clipboardBanner}</p>
              )}
              {activeEntry?.lastSentAt && (
                <p className={`text-[11px] ${m.textMuted} ${clipboardBanner ? 'mt-1' : ''}`}>
                  Last Prompt Lab handoff {formatNotebookTimestamp(activeEntry.lastSentAt, clockTick)}
                </p>
              )}
            </div>
          )}
        </div>

        <div className={`border-b ${m.border} px-4 py-2 shrink-0 flex items-center gap-1`}>
          <span className={`mr-2 text-[10px] font-semibold uppercase tracking-wider ${m.textMuted}`}>Format</span>
          <button type="button" onClick={() => insertAtCursor('\n## ', '\n')} className={`rounded px-2 py-1 text-xs font-bold ${m.btn} ${m.textAlt}`} title="Heading">H</button>
          <button type="button" onClick={() => insertAtCursor('\n- ')} className={`rounded px-2 py-1 text-xs ${m.btn} ${m.textAlt}`} title="Bullet list"><Ic n="Layers" size={12} /></button>
          <button type="button" onClick={() => insertAtCursor('\n1. ')} className={`rounded px-2 py-1 text-xs font-mono ${m.btn} ${m.textAlt}`} title="Numbered list">1.</button>
          <button type="button" onClick={() => insertAtCursor('\n```\n', '\n```\n')} className={`rounded px-2 py-1 text-xs font-mono ${m.btn} ${m.textAlt}`} title="Code block">{'{}'}</button>
          <button type="button" onClick={() => insertAtCursor('\n> ')} className={`rounded px-2 py-1 text-xs ${m.btn} ${m.textAlt}`} title="Quote">&gt;</button>
          <button type="button" onClick={insertDate} className={`rounded px-2 py-1 text-xs ${m.btn} ${m.textAlt}`} title="Date separator">📅</button>
        </div>

        <div className={`flex-1 p-4 flex flex-col gap-2 ${editorPaneMinHeightClass} ${pageScroll ? '' : 'overflow-hidden'}`}>
          <textarea
            id="plNotebookBody"
            ref={textareaRef}
            value={draft.body}
            onChange={(event) => queueDraftChange({ body: event.target.value })}
            onSelect={syncSelectionState}
            onKeyUp={syncSelectionState}
            onClick={syncSelectionState}
            spellCheck
            className={`flex-1 w-full ${textareaMinHeightClass} resize-none rounded-xl border ${m.input} p-4 text-sm leading-relaxed focus:outline-none focus:border-violet-500 transition-colors ${m.text}`}
            aria-label="Notebook entry body"
            placeholder={'Draft prompt ideas, context, notes, and test snippets…\n\nUse Send to Prompt Lab to open the editor with this note.'}
          />

          <div className="flex min-h-5 items-center justify-between gap-3">
            <div>
              {saveError ? (
                <div className="flex items-center gap-1.5 text-xs font-mono text-red-400">
                  <Ic n="X" size={11} />
                  <span>{saveError}</span>
                </div>
              ) : saveState === 'pending' ? (
                <div className={`flex items-center gap-1.5 text-xs font-mono ${m.textMuted}`}>
                  <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Saving…</span>
                </div>
              ) : saveState === 'saved' ? (
                <div className="flex items-center gap-1.5 text-xs font-mono text-green-500">
                  <Ic n="Check" size={11} />
                  <span>Saved</span>
                </div>
              ) : lastSavedAt ? (
                <div className={`flex items-center gap-1.5 text-xs font-mono ${m.textMuted}`}>
                  <Ic n="Clock" size={11} />
                  <span>Last saved {formatNotebookTimestamp(lastSavedAt, clockTick)}</span>
                </div>
              ) : null}
            </div>
            <div className={`text-xs ${m.textMuted}`}>
              {selectionText.trim() ? `${selectionText.trim().split(/\s+/).length} selected` : 'No text selected'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
