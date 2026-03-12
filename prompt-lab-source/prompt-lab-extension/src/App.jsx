import { useState, useEffect, useMemo, useRef } from 'react';
import Ic from './icons';
import { callAnthropic } from './api';
import { applyQuickFix, lintPrompt, LINT_QUICK_FIXES } from './promptLint';
import { DEFAULT_REDACTION_SETTINGS, redactPayload, scanSensitiveData, summarizeMatches } from './redactionGate';
import { normalizeModelError } from './errorTaxonomy';
import { hashText, listExperiments, saveExperiment } from './experimentStore';

// ── Constants ─────────────────────────────────────────────────────────────────
const TAG_COLORS = {
  Writing: 'bg-blue-600', Code: 'bg-green-600', Research: 'bg-purple-600',
  Analysis: 'bg-yellow-600', Creative: 'bg-pink-600', System: 'bg-red-600',
  'Role-play': 'bg-orange-600', Other: 'bg-gray-500',
};
const ALL_TAGS = Object.keys(TAG_COLORS);

const MODES = [
  { id: 'balanced', label: '⚖️ Balanced', sys: 'Improve clarity, specificity, and structure. Add role, task, format, and constraints where missing.' },
  { id: 'claude', label: '🟣 Claude', sys: 'Optimize for Claude. Use XML tags, clear instructions, explicit output format.' },
  { id: 'chatgpt', label: '🟢 ChatGPT', sys: 'Optimize for GPT-4/o. Use system/user cues, chain-of-thought prompting, JSON output where appropriate.' },
  { id: 'image', label: '🎨 Image Gen', sys: 'Optimize for image generation. Include style, medium, lighting, composition, aspect ratio, quality modifiers.' },
  { id: 'code', label: '💻 Code Gen', sys: 'Optimize for code generation. Specify language, framework, input/output types, error handling, coding style.' },
  { id: 'concise', label: '✂️ Concise', sys: 'Make the prompt as short and direct as possible while preserving all intent.' },
  { id: 'detailed', label: '📝 Detailed', sys: 'Expand with rich context, examples, edge cases, explicit constraints. Make it comprehensive.' },
];

const MODEL_OPTIONS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
];

const STARTER_TEMPLATES = [
  {
    id: 'coding',
    label: 'Coding',
    text: 'You are a senior software engineer. Goal: Explain this bug and propose a fix.\n\nConstraints:\n- Keep answer under 250 words.\n- Include root cause and patch steps.\n\nOutput format:\n## Root Cause\n## Patch Plan\n## Test Plan',
  },
  {
    id: 'writing',
    label: 'Writing',
    text: 'Goal: Rewrite this paragraph for clarity and confidence.\n\nConstraints:\n- Preserve core meaning.\n- Use plain language.\n\nOutput format:\n- Revised paragraph\n- 3 rationale bullets',
  },
  {
    id: 'support',
    label: 'Support',
    text: 'You are a support specialist. Goal: Respond to this customer issue clearly and empathetically.\n\nConstraints:\n- Keep tone calm and specific.\n- Include next steps.\n\nOutput format:\n## Response\n## Internal Notes',
  },
  {
    id: 'research',
    label: 'Research',
    text: 'Goal: Summarize the document and identify decisions required.\n\nConstraints:\n- Keep under 8 bullets.\n- Separate facts from assumptions.\n\nOutput format:\n## Summary\n## Decisions Needed\n## Open Questions',
  },
];

const STORAGE_KEYS = Object.freeze({
  REDACTION_SETTINGS: 'pl2-redaction-settings',
  ONBOARDING_DONE: 'pl2-onboarding-complete',
  ONBOARDING_HIDE: 'pl2-onboarding-hide',
});

const T = {
  dark: {
    bg: 'bg-gray-950', surface: 'bg-gray-900', border: 'border-gray-800', borderHov: 'hover:border-gray-700',
    input: 'bg-gray-900 border-gray-700', text: 'text-gray-100', textSub: 'text-gray-500', textMuted: 'text-gray-600',
    textBody: 'text-gray-300', textAlt: 'text-gray-400', btn: 'bg-gray-800 hover:bg-gray-700',
    header: 'bg-gray-900 border-gray-800', modalBg: 'bg-black/70', modal: 'bg-gray-900 border-gray-700',
    notesBg: 'bg-amber-950/40 border-amber-900/50', notesText: 'text-amber-400', codeBlock: 'bg-gray-950',
    dangerBtn: 'bg-red-950 hover:bg-red-900 text-red-400',
    scoreGood: 'text-green-400', scoreBad: 'text-gray-700',
    diffAdd: 'bg-green-900/60 text-green-200', diffDel: 'bg-red-900/60 text-red-300 line-through opacity-60', diffEq: 'text-gray-300',
    draggable: 'bg-gray-800 border-gray-700 hover:border-violet-500',
    dropZone: 'border-gray-700 border-dashed bg-gray-900/30', dropOver: 'border-violet-500 border-dashed bg-violet-950/20',
    composedBlock: 'bg-gray-800 border-gray-700', pill: 'bg-gray-800 text-gray-300',
  },
  light: {
    bg: 'bg-gray-50', surface: 'bg-white', border: 'border-gray-200', borderHov: 'hover:border-gray-300',
    input: 'bg-white border-gray-300', text: 'text-gray-900', textSub: 'text-gray-500', textMuted: 'text-gray-400',
    textBody: 'text-gray-700', textAlt: 'text-gray-500', btn: 'bg-gray-100 hover:bg-gray-200',
    header: 'bg-white border-gray-200', modalBg: 'bg-black/40', modal: 'bg-white border-gray-200',
    notesBg: 'bg-amber-50 border-amber-200', notesText: 'text-amber-600', codeBlock: 'bg-gray-50',
    dangerBtn: 'bg-red-50 hover:bg-red-100 text-red-600',
    scoreGood: 'text-green-600', scoreBad: 'text-gray-300',
    diffAdd: 'bg-green-100 text-green-700', diffDel: 'bg-red-100 text-red-500 line-through', diffEq: 'text-gray-700',
    draggable: 'bg-gray-50 border-gray-200 hover:border-violet-400',
    dropZone: 'border-gray-300 border-dashed bg-gray-100/50', dropOver: 'border-violet-400 border-dashed bg-violet-50',
    composedBlock: 'bg-gray-50 border-gray-200', pill: 'bg-gray-100 text-gray-600',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function wordDiff(a, b) {
  const wa = a.split(' ').slice(0, 200), wb = b.split(' ').slice(0, 200);
  const dp = Array(wa.length + 1).fill(null).map(() => Array(wb.length + 1).fill(0));
  for (let i = 1; i <= wa.length; i++)
    for (let j = 1; j <= wb.length; j++)
      dp[i][j] = wa[i - 1] === wb[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const res = [];
  let i = wa.length, j = wb.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && wa[i - 1] === wb[j - 1]) { res.unshift({ t: 'eq', v: wa[i - 1] }); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) { res.unshift({ t: 'add', v: wb[j - 1] }); j--; }
    else { res.unshift({ t: 'del', v: wa[i - 1] }); i--; }
  }
  return res;
}

function scorePrompt(text) {
  if (!text.trim()) return null;
  return {
    role: /\b(you are|act as|as a|your role|persona)\b/i.test(text),
    task: /\b(write|create|generate|explain|analyze|summarize|list|help|please|provide)\b/i.test(text),
    format: /\b(format|output|respond in|json|list|bullet|markdown|table|return)\b/i.test(text),
    constraints: /\b(do not|don't|avoid|must|should|limit|max|minimum|only|never|always)\b/i.test(text),
    context: text.length > 80,
    tokens: Math.round(text.length / 4),
  };
}

function extractVars(text) {
  return [...new Set([...text.matchAll(/\{\{(\w[\w ]*)\}\}/g)].map(m => m[1]))];
}

function encodeShare(entry) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify({
      title: entry.title, original: entry.original, enhanced: entry.enhanced,
      variants: entry.variants, tags: entry.tags, notes: entry.notes,
    }))));
  } catch { return null; }
}

function decodeShare(str) {
  try { return JSON.parse(decodeURIComponent(escape(atob(str)))); }
  catch { return null; }
}

function extractTextFromAnthropic(data) {
  if (data?.error?.message) {
    throw new Error(data.error.message);
  }
  if (!Array.isArray(data?.content)) {
    throw new Error('Model returned no content.');
  }
  const text = data.content.map(b => (typeof b.text === 'string' ? b.text : '')).join('').trim();
  if (!text) {
    throw new Error('Model returned empty content. Try again.');
  }
  return text;
}

function parseEnhancedPayload(rawText) {
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  if (!cleaned) {
    throw new Error('Model returned empty content. Try again.');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {}
    }
    throw new Error('Model response was not valid JSON. Try again.');
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-violet-700 text-white px-4 py-2 rounded-lg shadow-2xl z-50 text-sm font-medium">
      {message}
    </div>
  );
}

function TagChip({ tag, onRemove, onClick, selected }) {
  const color = TAG_COLORS[tag] || 'bg-gray-500';
  return (
    <span onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full text-white font-medium transition-all px-2 py-0.5 text-xs ${color} ${onClick ? 'cursor-pointer' : ''} ${selected ? 'ring-2 ring-violet-300 ring-offset-1 opacity-100' : 'opacity-70 hover:opacity-90'}`}>
      {tag}
      {onRemove && <Ic n="X" size={10} className="cursor-pointer" onClick={e => { e.stopPropagation(); onRemove(tag); }} />}
    </span>
  );
}

function SeverityPill({ severity }) {
  const isWarn = severity === 'warning';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isWarn ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
      {isWarn ? 'Warning' : 'Info'}
    </span>
  );
}

function ErrorPanel({ error, onAction, m }) {
  if (!error) return null;
  const actionLabel = {
    open_settings: 'Open provider settings',
    retry: 'Retry',
    shorten_request: 'Shorten request',
  };
  return (
    <div className="text-xs bg-red-950/30 border border-red-800/70 rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-red-300 font-semibold">{error.userMessage}</p>
        <span className={`font-mono ${m.textMuted}`}>{error.code}</span>
      </div>
      <p className={m.textAlt}>{error.details}</p>
      {Array.isArray(error.suggestions) && error.suggestions.length > 0 && (
        <ul className={`list-disc ml-4 ${m.textBody}`}>
          {error.suggestions.map((tip, idx) => <li key={`${error.code}-tip-${idx}`}>{tip}</li>)}
        </ul>
      )}
      {Array.isArray(error.actions) && error.actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {error.actions.map((action) => (
            <button
              key={`${error.code}-${action}`}
              onClick={() => onAction?.(action)}
              className="px-2 py-1 rounded-md bg-red-900/60 hover:bg-red-800/70 text-red-100 transition-colors"
            >
              {actionLabel[action] || action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PadTab({ m, notify }) {
  const PAD_KEY = 'pl-pad';
  const [text, setText] = useState(() => { try { return localStorage.getItem(PAD_KEY) || ''; } catch { return ''; } });
  const [stamp, setStamp] = useState(() => { try { return localStorage.getItem(PAD_KEY + '_meta') || ''; } catch { return ''; } });
  const timerRef = useRef(null);
  const wc = text.trim() ? text.trim().split(/\s+/).length : 0;

  const onChange = e => {
    const v = e.target.value;
    setText(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(PAD_KEY, v);
        const s = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem(PAD_KEY + '_meta', s);
        setStamp(s);
      } catch {}
    }, 600);
  };

  const insertDate = () => {
    const d = new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const entry = `\n── ${d} ──\n`;
    const ta = document.getElementById('plPadArea');
    const pos = ta.selectionStart;
    const next = text.slice(0, pos) + entry + text.slice(ta.selectionEnd);
    setText(next);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + entry.length; ta.focus(); }, 0);
    try { localStorage.setItem(PAD_KEY, next); } catch {}
  };

  const copyPad = () => {
    if (!text.trim()) return;
    try { navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement('textarea'); el.value = text;
      el.style.cssText = 'position:fixed;top:-9999px;opacity:0';
      document.body.appendChild(el); el.focus(); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    }
    notify('Pad copied!');
  };

  const clearPad = () => {
    if (!window.confirm('Clear all notes?')) return;
    setText(''); setStamp('');
    try { localStorage.removeItem(PAD_KEY); localStorage.removeItem(PAD_KEY + '_meta'); } catch {}
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ height: 'calc(100vh - 44px)' }}>
      <div className={`flex items-center justify-between px-4 py-2 border-b ${m.border} shrink-0`}>
        <span className={`text-xs font-mono ${m.textMuted}`}>{wc} word{wc !== 1 ? 's' : ''} · {text.length} chars</span>
        <div className="flex gap-2">
          <button onClick={insertDate} className={`flex items-center gap-1 text-xs ${m.btn} ${m.textAlt} px-2 py-1 rounded-lg transition-colors`}>📅 Date</button>
          <button onClick={copyPad} className={`flex items-center gap-1 text-xs ${m.btn} ${m.textAlt} px-2 py-1 rounded-lg transition-colors`}><Ic n="Copy" size={11} />Copy</button>
          <button onClick={clearPad} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors text-red-400 hover:bg-red-950/30"><Ic n="Trash2" size={11} />Clear</button>
        </div>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-2 overflow-hidden">
        <textarea id="plPadArea"
          className={`flex-1 w-full resize-none rounded-xl border ${m.input} border p-4 text-sm leading-relaxed focus:outline-none focus:border-violet-500 transition-colors ${m.text}`}
          placeholder={'Notes, ideas, prompt snippets…\n\nUse 📅 Date to timestamp entries.'}
          value={text} onChange={onChange} spellCheck />
        <div className={`text-xs font-mono text-right ${m.textMuted}`}>{stamp}</div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [colorMode, setColorMode] = useState('dark');
  const m = T[colorMode];
  const [tab, setTab] = useState('editor');
  const [raw, setRaw] = useState('');
  const [enhanced, setEnhanced] = useState('');
  const [variants, setVariants] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [showSave, setShowSave] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveTags, setSaveTags] = useState([]);
  const [saveCollection, setSaveCollection] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [enhMode, setEnhMode] = useState('balanced');
  const [showNotes, setShowNotes] = useState(true);
  const [showNewColl, setShowNewColl] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [varVals, setVarVals] = useState({});
  const [showVarForm, setShowVarForm] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [library, setLibrary] = useState([]);
  const [libReady, setLibReady] = useState(false);
  const [collections, setCollections] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedVersionId, setExpandedVersionId] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [composerBlocks, setComposerBlocks] = useState([]);
  const [dragOverComposer, setDragOverComposer] = useState(false);
  const [draggingLibId, setDraggingLibId] = useState(null);
  const [dragOverBlockIdx, setDragOverBlockIdx] = useState(null);
  const [abA, setAbA] = useState({ prompt: '', response: '', loading: false, error: null });
  const [abB, setAbB] = useState({ prompt: '', response: '', loading: false, error: null });
  const [abWinner, setAbWinner] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [lintIssues, setLintIssues] = useState([]);
  const [dismissedLintRules, setDismissedLintRules] = useState([]);
  const [showChecklist, setShowChecklist] = useState(true);
  const [redactionSettings, setRedactionSettings] = useState(DEFAULT_REDACTION_SETTINGS);
  const [redactionModal, setRedactionModal] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historySelectedId, setHistorySelectedId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [winnerNote, setWinnerNote] = useState('');
  const [showWinnerNoteModal, setShowWinnerNoteModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardTemplateId, setWizardTemplateId] = useState(STARTER_TEMPLATES[0].id);
  const [wizardDraft, setWizardDraft] = useState(STARTER_TEMPLATES[0].text);
  const [wizardRunOutput, setWizardRunOutput] = useState('');
  const [wizardModel, setWizardModel] = useState(MODEL_OPTIONS[0].id);
  const [wizardConnectivity, setWizardConnectivity] = useState({ status: 'idle', message: '' });
  const [showCallouts, setShowCallouts] = useState(false);
  const lintDebounceRef = useRef(null);
  const retryActionRef = useRef(null);
  const winnerSelectionRef = useRef(null);
  const redactionResolveRef = useRef(null);
  const notify = msg => setToast(msg);

  // ── Persistence (localStorage) ────────────────────────────────────────────
  useEffect(() => {
    try {
      const l = localStorage.getItem('pl2-library'); if (l) setLibrary(JSON.parse(l));
      const c = localStorage.getItem('pl2-collections'); if (c) setCollections(JSON.parse(c));
      const md = localStorage.getItem('pl2-mode'); if (md) setColorMode(md);
      const rs = localStorage.getItem(STORAGE_KEYS.REDACTION_SETTINGS);
      if (rs) setRedactionSettings({ ...DEFAULT_REDACTION_SETTINGS, ...JSON.parse(rs) });
      const onboardingDone = localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE) === 'true';
      const onboardingHidden = localStorage.getItem(STORAGE_KEYS.ONBOARDING_HIDE) === 'true';
      if (!onboardingDone && !onboardingHidden) setShowWizard(true);
      const hash = window.location.hash;
      if (hash.startsWith('#share=')) {
        const d = decodeShare(hash.slice(7));
        if (d) {
          setRaw(d.original || ''); setEnhanced(d.enhanced || ''); setVariants(d.variants || []);
          setNotes(d.notes || ''); setSaveTags(d.tags || []); setSaveTitle(d.title || '');
          setShowSave(true); notify('Shared prompt loaded!');
        }
      }
    } catch {}
    setLibReady(true);
  }, []);
  useEffect(() => { if (libReady) { try { localStorage.setItem('pl2-library', JSON.stringify(library)); } catch {} } }, [library, libReady]);
  useEffect(() => { try { localStorage.setItem('pl2-collections', JSON.stringify(collections)); } catch {} }, [collections]);
  useEffect(() => { try { localStorage.setItem('pl2-mode', colorMode); } catch {} }, [colorMode]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.REDACTION_SETTINGS, JSON.stringify(redactionSettings)); } catch {}
  }, [redactionSettings]);

  useEffect(() => {
    clearTimeout(lintDebounceRef.current);
    lintDebounceRef.current = setTimeout(() => {
      const issues = lintPrompt(raw).filter((issue) => !dismissedLintRules.includes(issue.id));
      setLintIssues(issues);
    }, 220);
    return () => clearTimeout(lintDebounceRef.current);
  }, [raw, dismissedLintRules]);

  // ── Clipboard ─────────────────────────────────────────────────────────────
  const copy = async (text, msg = 'Copied!') => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      try {
        const el = document.createElement('textarea'); el.value = text;
        el.style.cssText = 'position:fixed;top:-9999px;opacity:0';
        document.body.appendChild(el); el.focus(); el.select();
        document.execCommand('copy'); document.body.removeChild(el);
      } catch { notify('Copy unavailable'); return; }
    }
    notify(msg);
  };

  const openProviderSettings = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
      return;
    }
    setShowSettings(true);
  };

  const onErrorAction = (action) => {
    if (action === 'open_settings') {
      openProviderSettings();
      return;
    }
    if (action === 'retry' && typeof retryActionRef.current === 'function') {
      retryActionRef.current();
      return;
    }
    if (action === 'shorten_request') {
      setRaw((prev) => prev.slice(0, Math.max(120, Math.floor(prev.length * 0.7))));
      notify('Prompt shortened. Review before retrying.');
    }
  };

  const askRedactionDecision = (matches) => new Promise((resolve) => {
    setRedactionModal({ matches: summarizeMatches(matches) });
    retryActionRef.current = null;
    redactionResolveRef.current = (decision) => {
      setRedactionModal(null);
      resolve(decision);
    };
  });

  const runModelRequest = async (payload, context = {}, requestMeta = {}) => {
    const scan = scanSensitiveData({ prompt: raw, variables: varVals, payload }, redactionSettings);
    let safePayload = payload;
    if (scan.matches.length > 0) {
      const decision = await askRedactionDecision(scan.matches);
      if (decision === 'edit') {
        const cancelErr = new Error('Request paused so you can edit sensitive content.');
        cancelErr.isUserCancel = true;
        throw cancelErr;
      }
      if (decision === 'redact') {
        safePayload = redactPayload(payload, scan.matches);
      }
    }
    try {
      return await callAnthropic(safePayload);
    } catch (err) {
      const normalized = normalizeModelError(err, context);
      normalized.requestMeta = requestMeta;
      throw normalized;
    }
  };

  const refreshHistory = async () => {
    setHistoryLoading(true);
    try {
      const rows = await listExperiments({
        search: historySearch,
        dateFrom: historyDateFrom,
        dateTo: historyDateTo,
      });
      setHistoryItems(rows);
      if (rows.length && !historySelectedId) setHistorySelectedId(rows[0].id);
      if (!rows.length) setHistorySelectedId(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'history') return;
    refreshHistory();
  }, [tab, historySearch, historyDateFrom, historyDateTo]);

  const selectedWizardTemplate = STARTER_TEMPLATES.find((entry) => entry.id === wizardTemplateId) || STARTER_TEMPLATES[0];

  useEffect(() => {
    setWizardDraft(selectedWizardTemplate.text);
  }, [wizardTemplateId]);

  const runWizardConnectivityTest = async () => {
    setWizardConnectivity({ status: 'loading', message: 'Testing provider connection…' });
    try {
      const payload = {
        model: wizardModel,
        max_tokens: 80,
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      };
      const data = await runModelRequest(payload, { surface: 'wizard', canRetry: true }, { kind: 'wizard-connectivity' });
      const response = extractTextFromAnthropic(data);
      setWizardConnectivity({ status: 'ok', message: response.slice(0, 80) });
    } catch (err) {
      if (err?.isUserCancel) {
        setWizardConnectivity({ status: 'idle', message: 'Request cancelled.' });
      } else {
        const normalized = err?.category ? err : normalizeModelError(err, { surface: 'wizard' });
        setWizardConnectivity({ status: 'error', message: normalized.userMessage });
      }
    }
  };

  const runWizardFirstPrompt = async () => {
    if (!wizardDraft.trim()) return;
    setWizardRunOutput('Running…');
    try {
      const data = await runModelRequest(
        { model: wizardModel, max_tokens: 500, messages: [{ role: 'user', content: wizardDraft }] },
        { surface: 'wizard', canRetry: true, canShorten: true },
        { kind: 'wizard-first-run' }
      );
      setWizardRunOutput(extractTextFromAnthropic(data).slice(0, 1200));
    } catch (err) {
      if (err?.isUserCancel) {
        setWizardRunOutput('Run cancelled so you can edit sensitive content.');
      } else {
        const normalized = err?.category ? err : normalizeModelError(err, { surface: 'wizard' });
        setWizardRunOutput(`${normalized.userMessage}: ${normalized.details}`);
      }
    }
  };

  const completeWizard = (hideFuture = false) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_HIDE, hideFuture ? 'true' : 'false');
    } catch {}
    setShowWizard(false);
    setWizardStep(0);
    setRaw(wizardDraft);
    setTab('editor');
    setShowChecklist(true);
    setShowCallouts(true);
    notify('Getting started complete.');
  };

  // ── Enhance ───────────────────────────────────────────────────────────────
  const enhance = async () => {
    if (!raw.trim()) return;
    retryActionRef.current = enhance;
    setLoading(true); setErrorState(null); setEnhanced(''); setVariants([]); setNotes('');
    setShowSave(false); setShowDiff(false);
    const modeObj = MODES.find(x => x.id === enhMode) || MODES[0];
    const sys = `You are an expert prompt engineer. ${modeObj.sys}\nReturn ONLY valid JSON, no markdown, no backticks:\n{"enhanced":"...","variants":[{"label":"...","content":"..."}],"notes":"...","tags":["..."]}\nProduce 2 variants. Available tags: ${ALL_TAGS.join(', ')}.`;
    try {
      const data = await runModelRequest({
        model: 'claude-sonnet-4-20250514', max_tokens: 1500,
        system: sys, messages: [{ role: 'user', content: raw }],
      }, { surface: 'editor', canRetry: true, canShorten: true });
      const txt = extractTextFromAnthropic(data);
      const p = parseEnhancedPayload(txt);
      setEnhanced(p.enhanced || ''); setVariants(p.variants || []); setNotes(p.notes || '');
      setSaveTags(p.tags || []); setSaveTitle(''); setShowSave(true);
    } catch (e) {
      if (e?.isUserCancel) {
        notify('Edit prompt and retry when ready.');
      } else {
        setErrorState(e?.category ? e : normalizeModelError(e, { surface: 'editor', canRetry: true, canShorten: true }));
      }
    }
    setLoading(false);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const doSave = (enh = enhanced, vars = variants, nts = notes, tags = saveTags, title = saveTitle, col = saveCollection) => {
    setLibrary(prev => {
      const existing = title ? prev.find(e => e.title === title) : null;
      if (existing) {
        return prev.map(e => e.id === existing.id ? {
          ...e, enhanced: enh, variants: vars, notes: nts, tags, collection: col,
          versions: [...(e.versions || []), { enhanced: e.enhanced, variants: e.variants, savedAt: e.updatedAt || e.createdAt }].slice(-10),
          lintDismissed: dismissedLintRules,
          updatedAt: new Date().toISOString(),
        } : e);
      }
      return [{
        id: crypto.randomUUID(), title: title || 'Untitled Prompt', original: raw,
        enhanced: enh, variants: vars, notes: nts, tags, collection: col,
        lintDismissed: dismissedLintRules,
        createdAt: new Date().toISOString(), useCount: 0, versions: [],
      }, ...prev];
    });
    notify('Saved!'); setShowSave(false);
  };
  const del = id => setLibrary(prev => prev.filter(e => e.id !== id));
  const bumpUse = id => setLibrary(prev => prev.map(e => e.id === id ? { ...e, useCount: e.useCount + 1 } : e));

  const loadEntry = entry => {
    const vars = extractVars(entry.enhanced);
    if (vars.length > 0) { setPendingTemplate(entry); setVarVals(Object.fromEntries(vars.map(v => [v, '']))); setShowVarForm(true); }
    else applyEntry(entry);
  };
  const applyEntry = entry => {
    setRaw(entry.original); setEnhanced(entry.enhanced); setVariants(entry.variants || []);
    setNotes(entry.notes || ''); setSaveTags(entry.tags || []); setSaveTitle(entry.title);
    setSaveCollection(entry.collection || ''); setShowSave(false); setShowDiff(false);
    setDismissedLintRules(Array.isArray(entry.lintDismissed) ? entry.lintDismissed : []);
    setErrorState(null);
    bumpUse(entry.id); setTab('editor'); notify('Loaded into editor!');
  };
  const applyTemplate = () => {
    if (!pendingTemplate) return;
    let text = pendingTemplate.enhanced;
    Object.entries(varVals).forEach(([k, v]) => { text = text.replaceAll(`{{${k}}}`, v); });
    applyEntry({ ...pendingTemplate, enhanced: text });
    setShowVarForm(false); setPendingTemplate(null);
  };

  // ── Export/Import ─────────────────────────────────────────────────────────
  const exportLib = () => {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' })),
      download: 'prompt-library.json',
    });
    a.click();
  };
  const importLib = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      try { const d = JSON.parse(ev.target.result); if (Array.isArray(d)) { setLibrary(prev => [...d, ...prev]); notify(`Imported ${d.length} prompts!`); } }
      catch { notify('Import failed'); }
    };
    r.readAsText(file); e.target.value = '';
  };
  const getShareUrl = entry => { const c = encodeShare(entry); return c ? `${window.location.origin}${window.location.pathname}#share=${c}` : null; };

  // ── Composer ──────────────────────────────────────────────────────────────
  const addToComposer = entry => {
    setComposerBlocks(prev => [...prev, { id: crypto.randomUUID(), label: entry.title, content: entry.enhanced, sourceId: entry.id }]);
    bumpUse(entry.id); notify('Added to Composer!');
  };
  const composedPrompt = composerBlocks.map(b => `# ${b.label}\n${b.content}`).join('\n\n---\n\n');

  // ── A/B Test ──────────────────────────────────────────────────────────────
  const runAB = async side => {
    const state = side === 'a' ? abA : abB, setter = side === 'a' ? setAbA : setAbB;
    if (!state.prompt.trim()) return;
    retryActionRef.current = () => runAB(side);
    setter(p => ({ ...p, loading: true, response: '', error: null }));
    try {
      const data = await runModelRequest(
        { model: 'claude-sonnet-4-20250514', max_tokens: 800, messages: [{ role: 'user', content: state.prompt }] },
        { surface: 'abtest', canRetry: true, canShorten: true },
        { kind: 'abtest', side }
      );
      setter(p => ({ ...p, response: extractTextFromAnthropic(data), loading: false, error: null }));
    } catch (e) {
      if (e?.isUserCancel) {
        notify('Edit prompt and retry when ready.');
        setter(p => ({ ...p, loading: false }));
      } else {
        const norm = e?.category ? e : normalizeModelError(e, { surface: 'abtest', canRetry: true, canShorten: true });
        setter(p => ({ ...p, loading: false, response: '', error: norm }));
      }
    }
  };

  const persistABExperiment = async (winnerLabel, noteText = winnerNote) => {
    const winnerId = winnerLabel === 'Variant A' ? 'a' : 'b';
    const winnerPrompt = winnerId === 'a' ? abA.prompt : abB.prompt;
    const now = new Date().toISOString();
    const label = saveTitle?.trim() || raw.split('\n')[0]?.slice(0, 72) || 'A/B Experiment';
    await saveExperiment({
      id: crypto.randomUUID(),
      createdAt: now,
      label,
      variants: [
        {
          id: 'a',
          name: 'Variant A',
          promptHash: hashText(abA.prompt),
          promptText: abA.prompt,
          outputPreview: abA.response?.slice(0, 400) || '',
          model: 'claude-sonnet-4-20250514',
          provider: 'configured',
        },
        {
          id: 'b',
          name: 'Variant B',
          promptHash: hashText(abB.prompt),
          promptText: abB.prompt,
          outputPreview: abB.response?.slice(0, 400) || '',
          model: 'claude-sonnet-4-20250514',
          provider: 'configured',
        },
      ],
      keyInputSnapshot: raw.slice(0, 700),
      outcome: { winnerVariantId: winnerId, winnerPromptHash: hashText(winnerPrompt) },
      notes: String(noteText || '').trim(),
    });
    notify('Experiment saved to history.');
    if (tab === 'history') refreshHistory();
  };

  const finalizeWinnerSelection = async (noteText = '') => {
    const selectedWinner = winnerSelectionRef.current || abWinner;
    if (!selectedWinner) {
      setShowWinnerNoteModal(false);
      return;
    }
    try {
      await persistABExperiment(selectedWinner, noteText);
      setShowWinnerNoteModal(false);
      setWinnerNote('');
    } catch {
      notify('Could not save experiment history.');
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const allLibTags = [...new Set(library.flatMap(e => e.tags || []))];
  const filtered = library
    .filter(e => {
      const q = search.toLowerCase();
      return (!q || e.title.toLowerCase().includes(q) || (e.tags || []).some(t => t.toLowerCase().includes(q)))
        && (!activeTag || (e.tags || []).includes(activeTag))
        && (!activeCollection || e.collection === activeCollection);
    })
    .sort((a, b) => sortBy === 'oldest' ? new Date(a.createdAt) - new Date(b.createdAt)
      : sortBy === 'most-used' ? b.useCount - a.useCount
      : new Date(b.createdAt) - new Date(a.createdAt));
  const quickInject = [...library].sort((a, b) => b.useCount - a.useCount).slice(0, 5);
  const selectedHistory = historyItems.find((entry) => entry.id === historySelectedId) || null;
  const winningHistoryVariant = selectedHistory
    ? (selectedHistory.variants || []).find((variant) => variant.id === selectedHistory?.outcome?.winnerVariantId) || null
    : null;
  const score = scorePrompt(raw);
  const wc = raw.trim() ? raw.trim().split(/\s+/).length : 0;
  const lintIssuesByLine = useMemo(() => {
    const grouped = new Map();
    lintIssues.forEach((issue) => {
      const line = Number(issue.line) > 0 ? Number(issue.line) : 1;
      if (!grouped.has(line)) grouped.set(line, []);
      grouped.get(line).push(issue);
    });
    return grouped;
  }, [lintIssues]);
  const inp = `w-full ${m.input} border rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-400 ${m.text}`;

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const h = e => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter') { e.preventDefault(); if (!loading && raw.trim()) enhance(); }
      if (mod && e.key === 's') { e.preventDefault(); if (enhanced && !showSave) setShowSave(true); else if (enhanced && showSave) doSave(); }
      if (mod && e.key === 'k') { e.preventDefault(); setShowCmdPalette(p => !p); setCmdQuery(''); }
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) setShowShortcuts(p => !p);
      if (e.key === 'Escape') {
        setShowCmdPalette(false);
        setShowShortcuts(false);
        setShowSettings(false);
        setShareId(null);
        if (showWinnerNoteModal && (winnerSelectionRef.current || abWinner)) finalizeWinnerSelection('');
        else setShowWinnerNoteModal(false);
        if (redactionModal) redactionResolveRef.current?.('edit');
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [loading, raw, enhanced, showSave, redactionModal, showWinnerNoteModal, abWinner]);

  // ── Command palette actions ───────────────────────────────────────────────
  const CMD_ACTIONS = [
    { label: 'Enhance Prompt', hint: '⌘↵', action: () => { if (!loading && raw.trim()) enhance(); setShowCmdPalette(false); } },
    { label: 'Save Prompt', hint: '⌘S', action: () => { if (enhanced) setShowSave(true); setShowCmdPalette(false); } },
    { label: 'Clear Editor', hint: '', action: () => { setRaw(''); setEnhanced(''); setVariants([]); setNotes(''); setShowSave(false); setErrorState(null); setDismissedLintRules([]); setShowCmdPalette(false); } },
    { label: 'Go to Editor', hint: '', action: () => { setTab('editor'); setShowCmdPalette(false); } },
    { label: 'Go to Composer', hint: '', action: () => { setTab('composer'); setShowCmdPalette(false); } },
    { label: 'Go to A/B Test', hint: '', action: () => { setTab('abtest'); setShowCmdPalette(false); } },
    { label: 'Go to History', hint: '', action: () => { setTab('history'); setShowCmdPalette(false); } },
    { label: 'Go to Pad', hint: '', action: () => { setTab('pad'); setShowCmdPalette(false); } },
    { label: 'Toggle Light / Dark', hint: '', action: () => { setColorMode(p => p === 'dark' ? 'light' : 'dark'); setShowCmdPalette(false); } },
    { label: 'Export Library', hint: '', action: () => { exportLib(); setShowCmdPalette(false); } },
    { label: 'Open Settings', hint: '', action: () => { setShowSettings(true); setShowCmdPalette(false); } },
    { label: 'Extension Options (API Key)', hint: '', action: () => { openProviderSettings(); setShowCmdPalette(false); } },
    { label: 'Getting Started Wizard', hint: '', action: () => { setShowWizard(true); setWizardStep(0); setShowCmdPalette(false); } },
    { label: 'Show Keyboard Shortcuts', hint: '?', action: () => { setShowShortcuts(true); setShowCmdPalette(false); } },
  ];
  const filteredCmds = CMD_ACTIONS.filter(a => !cmdQuery || a.label.toLowerCase().includes(cmdQuery.toLowerCase()));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${m.bg} ${m.text} flex flex-col`} style={{ fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <header className={`flex items-center justify-between px-4 py-2 ${m.header} border-b shrink-0`}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Ic n="Wand2" size={15} className="text-violet-500" />
            <span className="font-bold text-sm">Prompt Lab</span>
          </div>
          <div className="flex items-center gap-1">
            {[['editor', 'Editor'], ['composer', 'Composer'], ['abtest', 'A/B Test'], ['history', 'History'], ['pad', 'Pad']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`px-2 py-1.5 font-semibold rounded-lg transition-colors whitespace-nowrap ${tab === id ? 'bg-violet-600 text-white' : `${m.btn} ${m.textAlt}`}`}
                style={{ fontSize: '0.6rem', letterSpacing: '0.03em' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-xs ${m.textMuted} mr-1 hidden sm:inline`}>{library.length} saved</span>
          <button onClick={() => { setShowCmdPalette(true); setCmdQuery(''); }} className={`px-1.5 py-1 rounded-lg ${m.btn} ${m.textAlt} text-xs font-mono hover:text-violet-400 transition-colors`}>⌘K</button>
          <button onClick={() => setColorMode(p => p === 'dark' ? 'light' : 'dark')} className={`p-1 rounded-lg ${m.btn} ${m.textAlt} hover:text-violet-400 transition-colors`}>
            {colorMode === 'dark' ? <Ic n="Sun" size={13} /> : <Ic n="Moon" size={13} />}
          </button>
          <button onClick={() => setShowShortcuts(true)} className={`p-1 rounded-lg ${m.btn} ${m.textAlt} hover:text-violet-400 transition-colors`}><Ic n="Keyboard" size={13} /></button>
          <button onClick={() => setShowSettings(true)} className={`p-1 rounded-lg ${m.btn} ${m.textAlt} hover:text-violet-400 transition-colors`}><Ic n="Settings" size={13} /></button>
        </div>
      </header>

      {/* ══ EDITOR TAB ══ */}
      {tab === 'editor' && (
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 44px)' }}>
          <div className={`w-1/2 flex flex-col border-r ${m.border} overflow-y-auto`}>
            <div className="p-4 flex flex-col gap-3">
              {showCallouts && (
                <div className="bg-violet-500/10 border border-violet-500/40 rounded-lg p-2.5 text-xs text-violet-200 flex items-start justify-between gap-3">
                  <p>
                    Tip: Use <strong>Prompt Checklist</strong> for linting, <strong>History</strong> for A/B wins, and structured error cards for guided fixes.
                  </p>
                  <button onClick={() => setShowCallouts(false)} className="text-violet-300 hover:text-white transition-colors">Dismiss</button>
                </div>
              )}
              {/* Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`text-xs ${m.textSub} uppercase tracking-widest font-semibold`}>Input</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowChecklist((prev) => !prev)}
                      className={`text-[11px] ${m.btn} ${m.textAlt} px-2 py-1 rounded-md transition-colors`}
                    >
                      {showChecklist ? 'Hide Checklist' : 'Prompt Checklist'}
                    </button>
                    <span className={`text-xs ${m.textMuted}`}>{wc}w · {raw.length}c{score ? ` · ~${score.tokens} tok` : ''}</span>
                  </div>
                </div>
                <div className={`border ${m.border} rounded-lg overflow-hidden flex`}>
                  <div className={`${m.codeBlock} border-r ${m.border} w-12 shrink-0 p-1.5 flex flex-col gap-1 overflow-y-auto`}>
                    {lintIssues.length === 0 ? (
                      <span className="text-[11px] text-green-400 text-center py-1">✓</span>
                    ) : (
                      lintIssues.map((issue) => (
                        <button
                          key={`gutter-${issue.id}-${issue.line}`}
                          onClick={() => setShowChecklist(true)}
                          title={`${issue.id} · line ${issue.line || 1}`}
                          className={`text-[10px] rounded px-1 py-0.5 text-left truncate transition-colors ${issue.severity === 'warning' ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'}`}
                        >
                          ⚑{issue.line || 1}
                        </button>
                      ))
                    )}
                  </div>
                  <textarea
                    rows={5}
                    className={`flex-1 ${m.input} p-3 text-sm resize-none focus:outline-none transition-colors placeholder-gray-400 ${m.text}`}
                    placeholder="Paste or write your prompt here…"
                    value={raw}
                    onChange={e => { setRaw(e.target.value); setErrorState(null); }}
                  />
                </div>
                {lintIssues.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {lintIssues.map((issue) => (
                      <div key={`marker-${issue.id}`} className={`px-2 py-1 rounded-md text-[11px] flex items-center gap-1 ${issue.severity === 'warning' ? 'bg-amber-500/15 text-amber-300' : 'bg-blue-500/15 text-blue-300'}`}>
                        <span>⚑ Line {issue.line || 1}</span>
                        <span className="opacity-80">{issue.id}</span>
                      </div>
                    ))}
                  </div>
                )}
                {showChecklist && (
                  <div className={`${m.surface} border ${m.border} rounded-lg p-3 mt-2 flex flex-col gap-2`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${m.textSub} uppercase tracking-wider font-semibold`}>Prompt Checklist</span>
                      <span className={`text-xs ${m.textMuted}`}>{lintIssues.length === 0 ? 'No issues' : `${lintIssues.length} issues`}</span>
                    </div>
                    {lintIssues.length === 0 ? (
                      <p className="text-xs text-green-400">Looks good. Your prompt includes key structure signals.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {lintIssues.map((issue) => (
                          <div key={`issue-${issue.id}`} className={`${m.codeBlock} border ${m.border} rounded-md p-2`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <SeverityPill severity={issue.severity} />
                                  <span className={`text-[11px] ${m.textMuted}`}>Line {issue.line || 1}</span>
                                  {lintIssuesByLine.get(issue.line || 1)?.length > 1 && (
                                    <span className={`text-[11px] ${m.textMuted}`}>
                                      {lintIssuesByLine.get(issue.line || 1).length} issues on this line
                                    </span>
                                  )}
                                </div>
                                <p className={`text-xs ${m.textBody}`}>{issue.message}</p>
                              </div>
                              <button
                                onClick={() => setDismissedLintRules((prev) => [...new Set([...prev, issue.id])])}
                                className={`text-[11px] ${m.textAlt} hover:text-white transition-colors`}
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="pt-1 border-t border-dashed border-gray-700">
                      <p className={`text-[11px] ${m.textMuted} mb-1`}>Quick fixes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {LINT_QUICK_FIXES.map((fix) => (
                          <button
                            key={fix.id}
                            onClick={() => {
                              setRaw((prev) => applyQuickFix(prev, fix.id));
                              setDismissedLintRules([]);
                            }}
                            className={`text-[11px] ${m.btn} ${m.textAlt} px-2 py-1 rounded-md transition-colors`}
                          >
                            {fix.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Scoring */}
              {score && (() => {
                const checks = [['Role', score.role], ['Task', score.task], ['Format', score.format], ['Constraints', score.constraints], ['Context', score.context]];
                const cnt = checks.filter(c => c[1]).length;
                return (
                  <div className={`${m.surface} border ${m.border} rounded-lg p-3`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider`}>Prompt Quality</span>
                      <span className={`text-xs font-bold ${cnt >= 4 ? 'text-green-500' : cnt >= 2 ? 'text-yellow-500' : 'text-red-500'}`}>{cnt}/5</span>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {checks.map(([lbl, ok]) => (
                        <span key={lbl} className={`flex items-center gap-1 text-xs ${ok ? m.scoreGood : m.scoreBad}`}>
                          {ok ? <Ic n="Check" size={9} /> : <Ic n="X" size={9} />}{lbl}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {/* Mode + Enhance */}
              <div className="flex gap-2">
                <select value={enhMode} onChange={e => setEnhMode(e.target.value)}
                  className={`${m.input} border rounded-lg px-2 py-1.5 text-xs ${m.text} focus:outline-none shrink-0 max-w-36`}>
                  {MODES.map(md => <option key={md.id} value={md.id}>{md.label}</option>)}
                </select>
                <button onClick={enhance} disabled={loading || !raw.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-semibold transition-colors">
                  {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enhancing…</> : <><Ic n="Wand2" size={13} />Enhance ⌘↵</>}
                </button>
                <button onClick={() => { setRaw(''); setEnhanced(''); setVariants([]); setNotes(''); setShowSave(false); setErrorState(null); setDismissedLintRules([]); }}
                  className={`px-3 ${m.btn} rounded-lg ${m.textAlt} transition-colors`}><Ic n="X" size={13} /></button>
              </div>
              <ErrorPanel error={errorState} onAction={onErrorAction} m={m} />
              {/* Enhanced */}
              {enhanced && <>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-violet-400 uppercase tracking-widest font-semibold">Enhanced</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setShowDiff(p => !p)} className={`flex items-center gap-1 text-xs transition-colors ${showDiff ? 'text-violet-400' : `${m.textSub} hover:text-white`}`}>
                        <Ic n="GitBranch" size={10} />{showDiff ? 'Hide Diff' : 'Show Diff'}
                      </button>
                      <button onClick={() => copy(enhanced)} className={`flex items-center gap-1 text-xs ${m.textSub} hover:text-white transition-colors`}><Ic n="Copy" size={10} />Copy</button>
                    </div>
                  </div>
                  {showDiff ? (
                    <div className={`${m.codeBlock} border ${m.border} rounded-lg p-3 text-sm leading-loose`}>
                      {wordDiff(raw, enhanced).map((d, i) => (
                        <span key={i} className={`${d.t === 'add' ? m.diffAdd : d.t === 'del' ? m.diffDel : m.diffEq} px-0.5 rounded mr-0.5`}>{d.v}</span>
                      ))}
                    </div>
                  ) : (
                    <textarea rows={5} className={`${inp} border-violet-500/40`} value={enhanced} onChange={e => setEnhanced(e.target.value)} />
                  )}
                </div>
                {/* Variants */}
                {variants.length > 0 && (
                  <div>
                    <span className={`text-xs ${m.textSub} uppercase tracking-widest font-semibold block mb-2`}>Variants</span>
                    <div className="flex flex-col gap-2">
                      {variants.map((v, i) => (
                        <div key={i} className={`${m.surface} border ${m.border} ${m.borderHov} rounded-lg p-3 transition-colors`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-violet-400">{v.label}</span>
                            <div className="flex gap-3">
                              <button onClick={() => setEnhanced(v.content)} className={`text-xs ${m.textAlt} hover:text-violet-400 transition-colors`}>Use</button>
                              <button onClick={() => {
                                setAbA({ prompt: enhanced, response: '', loading: false, error: null });
                                setAbB({ prompt: v.content, response: '', loading: false, error: null });
                                setAbWinner(null);
                                setTab('abtest');
                                notify('Loaded into A/B Test!');
                              }}
                                className={`text-xs ${m.textAlt} hover:text-violet-400 transition-colors`}>A/B</button>
                              <button onClick={() => copy(v.content)} className={`${m.textAlt} hover:text-white transition-colors`}><Ic n="Copy" size={10} /></button>
                            </div>
                          </div>
                          <p className={`text-xs ${m.textAlt} leading-relaxed line-clamp-2`}>{v.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {showNotes && notes && (
                  <div className={`${m.notesBg} border rounded-lg p-3`}>
                    <p className={`text-xs font-bold ${m.notesText} mb-1`}>Enhancement Notes</p>
                    <p className={`text-xs ${m.textBody} leading-relaxed`}>{notes}</p>
                  </div>
                )}
                {/* Save panel */}
                {showSave && (
                  <div className={`${m.surface} border ${m.border} rounded-lg p-3 flex flex-col gap-2`}>
                    <span className={`text-xs ${m.textAlt} font-semibold uppercase tracking-wider`}>Save to Library</span>
                    <input className={`${m.input} border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500 ${m.text}`}
                      placeholder="Prompt title…" value={saveTitle} onChange={e => setSaveTitle(e.target.value)} />
                    <div className="flex gap-2">
                      <select value={saveCollection} onChange={e => setSaveCollection(e.target.value)}
                        className={`flex-1 ${m.input} border rounded-lg px-2 py-1.5 text-xs ${m.text} focus:outline-none`}>
                        <option value="">No Collection</option>
                        {collections.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {showNewColl ? (
                        <div className="flex gap-1">
                          <input autoFocus className={`w-28 ${m.input} border rounded-lg px-2 py-1.5 text-xs ${m.text} focus:outline-none focus:border-violet-500`}
                            placeholder="Name…" value={newCollName} onChange={e => setNewCollName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { const n = newCollName.trim(); if (n && !collections.includes(n)) { setCollections(p => [...p, n]); setSaveCollection(n); } setNewCollName(''); setShowNewColl(false); }
                              if (e.key === 'Escape') setShowNewColl(false);
                            }} />
                          <button onClick={() => { const n = newCollName.trim(); if (n && !collections.includes(n)) { setCollections(p => [...p, n]); setSaveCollection(n); } setNewCollName(''); setShowNewColl(false); }}
                            className="px-2 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs transition-colors"><Ic n="Check" size={11} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setShowNewColl(true)} className={`px-2.5 ${m.btn} rounded-lg ${m.textAlt} text-xs transition-colors flex items-center gap-1`}><Ic n="Plus" size={11} /></button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_TAGS.map(t => <TagChip key={t} tag={t} selected={saveTags.includes(t)} onClick={() => setSaveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} />)}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => doSave()} className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg py-1.5 text-sm font-semibold transition-colors"><Ic n="Save" size={12} />Save ⌘S</button>
                      <button onClick={() => setShowSave(false)} className={`px-4 ${m.btn} rounded-lg text-sm ${m.textBody} transition-colors`}>Cancel</button>
                    </div>
                  </div>
                )}
              </>}
              {/* Quick Inject */}
              {quickInject.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><Ic n="Zap" size={10} className="text-yellow-500" /><span className={`text-xs ${m.textSub} uppercase tracking-widest font-semibold`}>Quick Inject</span></div>
                  {quickInject.map(e => (
                    <div key={e.id} className={`flex items-center justify-between ${m.surface} border ${m.border} ${m.borderHov} rounded-lg px-3 py-2 gap-2 mb-1 transition-colors`}>
                      <span className={`text-xs ${m.textBody} truncate flex-1`}>{e.title}</span>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { copy(e.enhanced, `Copied: ${e.title}`); bumpUse(e.id); }} className={`${m.textSub} hover:text-violet-400 transition-colors`}><Ic n="Copy" size={11} /></button>
                        <button onClick={() => loadEntry(e)} className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors">Load</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — Library */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className={`p-3 border-b ${m.border} flex flex-col gap-2 shrink-0`}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Ic n="Search" size={11} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${m.textMuted}`} />
                  <input className={`w-full ${m.input} border rounded-lg pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:border-violet-500 ${m.text}`}
                    placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className={`${m.input} border rounded-lg px-2 py-1.5 text-xs ${m.textBody} focus:outline-none`}>
                  <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="most-used">Most Used</option>
                </select>
              </div>
              {collections.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => setActiveCollection(null)} className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${!activeCollection ? 'bg-violet-600 text-white' : `${m.btn} ${m.textAlt}`}`}>All</button>
                  {collections.map(c => (
                    <button key={c} onClick={() => setActiveCollection(p => p === c ? null : c)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${activeCollection === c ? 'bg-violet-600 text-white' : `${m.btn} ${m.textAlt}`}`}>
                      <Ic n="FolderOpen" size={9} />{c}
                    </button>
                  ))}
                </div>
              )}
              {allLibTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {allLibTags.map(t => <TagChip key={t} tag={t} selected={activeTag === t} onClick={() => setActiveTag(p => p === t ? null : t)} />)}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <Ic n="Wand2" size={24} className={m.textMuted} />
                  <p className={`text-sm ${m.textSub}`}>{library.length === 0 ? 'No saved prompts yet.' : 'No results found.'}</p>
                </div>
              )}
              {filtered.map(entry => (
                <div key={entry.id} className={`${m.surface} border ${m.border} ${m.borderHov} rounded-lg overflow-hidden transition-colors`}>
                  <div className="flex items-start justify-between px-3 py-2.5 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${m.text} truncate`}>{entry.title}</p>
                      <div className={`flex items-center gap-2 text-xs ${m.textMuted} mt-0.5 flex-wrap`}>
                        {entry.collection && <span className="flex items-center gap-1"><Ic n="FolderOpen" size={8} />{entry.collection}</span>}
                        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                        {entry.useCount > 0 && <span className="text-violet-400">{entry.useCount}×</span>}
                        {(entry.versions || []).length > 0 && <span className="flex items-center gap-0.5 text-blue-400"><Ic n="Clock" size={8} />{entry.versions.length}v</span>}
                        {extractVars(entry.enhanced).length > 0 && <span className="text-amber-400">{'{{vars}}'}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => { copy(entry.enhanced); bumpUse(entry.id); }} className={`p-1.5 rounded ${m.btn} ${m.textSub} hover:text-violet-400 transition-colors`}><Ic n="Copy" size={12} /></button>
                      <button onClick={() => loadEntry(entry)} className={`px-2 py-1 rounded ${m.btn} text-violet-400 text-xs font-semibold transition-colors`}>Load</button>
                      <button onClick={() => addToComposer(entry)} className={`p-1.5 rounded ${m.btn} ${m.textSub} hover:text-violet-400 transition-colors`}><Ic n="Layers" size={12} /></button>
                      <button onClick={() => setShareId(p => p === entry.id ? null : entry.id)} className={`p-1.5 rounded ${m.btn} ${m.textSub} hover:text-violet-400 transition-colors`}><Ic n="Share2" size={12} /></button>
                      <button onClick={() => setExpandedId(p => p === entry.id ? null : entry.id)} className={`p-1.5 rounded ${m.btn} ${m.textSub} transition-colors`}>
                        {expandedId === entry.id ? <Ic n="ChevronUp" size={12} /> : <Ic n="ChevronDown" size={12} />}
                      </button>
                      <button onClick={() => del(entry.id)} className={`p-1.5 rounded ${m.btn} ${m.textMuted} hover:text-red-400 transition-colors`}><Ic n="Trash2" size={12} /></button>
                    </div>
                  </div>
                  {(entry.tags || []).length > 0 && <div className="flex flex-wrap gap-1 px-3 pb-2">{entry.tags.map(t => <TagChip key={t} tag={t} />)}</div>}
                  {shareId === entry.id && (
                    <div className={`border-t ${m.border} px-3 py-2 flex gap-2`}>
                      <input readOnly className={`flex-1 ${m.input} border rounded-lg px-2 py-1 text-xs focus:outline-none ${m.text} font-mono`} value={getShareUrl(entry) || 'Error'} />
                      <button onClick={() => copy(getShareUrl(entry) || '')} className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-medium transition-colors">Copy URL</button>
                    </div>
                  )}
                  {expandedId === entry.id && (
                    <div className={`border-t ${m.border} px-3 py-3 flex flex-col gap-3`}>
                      {[['Original', m.textSub, entry.original], ['Enhanced', 'text-violet-400', entry.enhanced]].map(([lbl, col, txt]) => (
                        <div key={lbl}><p className={`text-xs ${col} font-semibold mb-1 uppercase tracking-wider`}>{lbl}</p><p className={`text-xs ${m.textBody} leading-relaxed ${m.codeBlock} rounded-lg p-2`}>{txt}</p></div>
                      ))}
                      {entry.notes && <div><p className={`text-xs ${m.notesText} font-semibold mb-1 uppercase tracking-wider`}>Notes</p><p className={`text-xs ${m.textAlt} leading-relaxed`}>{entry.notes}</p></div>}
                      {(entry.variants || []).length > 0 && (
                        <div><p className={`text-xs ${m.textSub} font-semibold mb-1.5 uppercase tracking-wider`}>Variants</p>
                          {entry.variants.map((v, i) => <div key={i} className="mb-1.5"><span className="text-xs text-violet-400 font-bold">{v.label}: </span><span className={`text-xs ${m.textAlt}`}>{v.content}</span></div>)}
                        </div>
                      )}
                      {(entry.versions || []).length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider flex items-center gap-1"><Ic n="Clock" size={9} />Version History ({entry.versions.length})</p>
                            <button onClick={() => setExpandedVersionId(p => p === entry.id ? null : entry.id)} className={`text-xs ${m.textSub} hover:text-white transition-colors`}>
                              {expandedVersionId === entry.id ? 'Collapse' : 'Expand'}
                            </button>
                          </div>
                          {expandedVersionId === entry.id && (
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                              {[...entry.versions].reverse().map((v, i) => (
                                <div key={i} className={`${m.codeBlock} border ${m.border} rounded-lg p-2`}>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs ${m.textMuted}`}>{new Date(v.savedAt).toLocaleString()}</span>
                                    <button onClick={() => { setLibrary(prev => prev.map(e => e.id === entry.id ? { ...e, enhanced: v.enhanced, variants: v.variants || [] } : e)); notify('Restored!'); }}
                                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"><Ic n="RotateCcw" size={9} />Restore</button>
                                  </div>
                                  <p className={`text-xs ${m.textAlt} line-clamp-2`}>{v.enhanced}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ COMPOSER TAB ══ */}
      {tab === 'composer' && (
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 44px)' }}>
          <div className={`w-64 shrink-0 flex flex-col border-r ${m.border} overflow-hidden`}>
            <div className={`px-3 py-2 border-b ${m.border} shrink-0`}><p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider`}>Library · Drag to add</p></div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
              {library.length === 0 && <p className={`text-xs ${m.textMuted} p-2`}>No saved prompts yet.</p>}
              {library.map(entry => (
                <div key={entry.id} draggable
                  onDragStart={e => { e.dataTransfer.setData('entryId', entry.id); setDraggingLibId(entry.id); }}
                  onDragEnd={() => setDraggingLibId(null)}
                  className={`border rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-colors ${m.draggable} ${draggingLibId === entry.id ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Ic n="GripVertical" size={11} className={m.textMuted} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${m.text} truncate`}>{entry.title}</p>
                      <p className={`text-xs ${m.textAlt} line-clamp-1 mt-0.5`}>{entry.enhanced}</p>
                    </div>
                    <button onClick={() => addToComposer(entry)} className="text-violet-400 hover:text-violet-300 shrink-0 transition-colors"><Ic n="Plus" size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`px-4 py-2 border-b ${m.border} flex items-center justify-between shrink-0`}>
              <p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider`}>Canvas ({composerBlocks.length} blocks)</p>
              <div className="flex gap-2">
                {composerBlocks.length > 0 && <>
                  <button onClick={() => copy(composedPrompt, 'Composed prompt copied!')} className={`flex items-center gap-1 text-xs ${m.btn} ${m.textAlt} px-2 py-1 rounded-lg transition-colors`}><Ic n="Copy" size={11} />Copy All</button>
                  <button onClick={() => { setRaw(composedPrompt); setTab('editor'); notify('Loaded into editor!'); }} className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white px-2 py-1 rounded-lg transition-colors"><Ic n="ArrowRight" size={11} />Send to Editor</button>
                  <button onClick={() => setComposerBlocks([])} className={`flex items-center gap-1 text-xs ${m.dangerBtn} px-2 py-1 rounded-lg transition-colors`}><Ic n="Trash2" size={11} />Clear</button>
                </>}
              </div>
            </div>
            <div className="flex flex-1 overflow-hidden gap-3 p-3">
              <div
                onDragOver={e => { e.preventDefault(); setDragOverComposer(true); }}
                onDragLeave={() => setDragOverComposer(false)}
                onDrop={e => { e.preventDefault(); setDragOverComposer(false); const id = e.dataTransfer.getData('entryId'); const entry = library.find(x => x.id === id); if (entry) addToComposer(entry); }}
                className={`flex-1 rounded-xl border-2 transition-colors overflow-y-auto flex flex-col gap-2 p-3 ${dragOverComposer ? m.dropOver : m.dropZone}`}>
                {composerBlocks.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 pointer-events-none">
                    <Ic n="Layers" size={28} className={m.textMuted} />
                    <p className={`text-sm ${m.textSub}`}>Drop prompts here</p>
                  </div>
                )}
                {composerBlocks.map((block, idx) => (
                  <div key={block.id} draggable
                    onDragStart={e => e.dataTransfer.setData('blockIdx', String(idx))}
                    onDragOver={e => { e.preventDefault(); setDragOverBlockIdx(idx); }}
                    onDragLeave={() => setDragOverBlockIdx(null)}
                    onDrop={e => { e.stopPropagation(); const from = parseInt(e.dataTransfer.getData('blockIdx')); if (!isNaN(from) && from !== idx) { setComposerBlocks(prev => { const a = [...prev]; const [mv] = a.splice(from, 1); a.splice(idx, 0, mv); return a; }); } setDragOverBlockIdx(null); }}
                    className={`border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-colors ${m.composedBlock} ${m.border} ${dragOverBlockIdx === idx ? 'border-violet-500' : ''}`}>
                    <div className="flex items-start gap-2">
                      <Ic n="GripVertical" size={11} className={`${m.textMuted} mt-0.5 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-violet-400">{block.label}</span>
                          <button onClick={() => setComposerBlocks(prev => prev.filter((_, i) => i !== idx))} className={`${m.textMuted} hover:text-red-400 transition-colors`}><Ic n="X" size={11} /></button>
                        </div>
                        <p className={`text-xs ${m.textBody} leading-relaxed line-clamp-3`}>{block.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {composerBlocks.length > 0 && (
                <div className="w-2/5 flex flex-col">
                  <p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider mb-2`}>Preview</p>
                  <div className={`flex-1 ${m.codeBlock} border ${m.border} rounded-xl p-3 overflow-y-auto`}>
                    <pre className={`text-xs ${m.textBody} whitespace-pre-wrap leading-relaxed font-mono`}>{composedPrompt}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ A/B TEST TAB ══ */}
      {tab === 'abtest' && (
        <div className="flex flex-1 flex-col overflow-hidden" style={{ height: 'calc(100vh - 44px)' }}>
          <div className={`px-4 py-2 border-b ${m.border} flex items-center justify-between shrink-0`}>
            <p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider`}>A/B Prompt Testing</p>
            <div className="flex items-center gap-3">
              {abWinner && <span className="text-xs font-bold text-green-400 flex items-center gap-1"><Ic n="Check" size={11} />Winner: {abWinner}</span>}
              <button onClick={() => { runAB('a'); runAB('b'); }} disabled={abA.loading || abB.loading}
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                <Ic n="FlaskConical" size={12} />Run Both
              </button>
              <button onClick={() => { setAbA({ prompt: '', response: '', loading: false, error: null }); setAbB({ prompt: '', response: '', loading: false, error: null }); setAbWinner(null); }}
                className={`px-2 py-1.5 ${m.btn} rounded-lg text-xs ${m.textAlt} transition-colors`}>Reset</button>
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            {([['A', abA, setAbA], ['B', abB, setAbB]]).map(([side, state, setter]) => (
              <div key={side} className={`flex-1 flex flex-col border-r last:border-r-0 ${m.border} overflow-hidden`}>
                <div className={`px-3 py-2 border-b ${m.border} flex items-center justify-between shrink-0`}>
                  <span className="text-xs font-bold text-violet-400 uppercase">Variant {side}</span>
                  <div className="flex gap-2">
                    <button onClick={() => runAB(side.toLowerCase())} disabled={state.loading || !state.prompt.trim()}
                      className="flex items-center gap-1 text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-2 py-1 rounded-lg transition-colors">
                      {state.loading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Ic n="Wand2" size={10} />}Run {side}
                    </button>
                    {state.response && !abWinner && (
                      <button
                        onClick={() => {
                          const picked = `Variant ${side}`;
                          setAbWinner(picked);
                          winnerSelectionRef.current = picked;
                          setWinnerNote('');
                          setShowWinnerNoteModal(true);
                        }}
                        className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded-lg transition-colors"
                      >
                        <Ic n="Check" size={10} />Pick {side}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-3 flex-1 overflow-y-auto">
                  <div>
                    <span className={`text-xs ${m.textSub} font-semibold uppercase tracking-wider block mb-1.5`}>Prompt</span>
                    <textarea rows={5} className={inp} placeholder={`Prompt variant ${side}…`} value={state.prompt} onChange={e => setter(p => ({ ...p, prompt: e.target.value }))} />
                  </div>
                  {(state.response || state.loading || state.error) && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider">Response</span>
                        {state.response && <span className={`text-xs ${m.textMuted}`}>~{Math.round(state.response.length / 4)} tokens</span>}
                      </div>
                      {state.loading
                        ? <div className={`${m.codeBlock} border ${m.border} rounded-lg p-3 flex items-center gap-2`}><span className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" /><span className={`text-xs ${m.textSub}`}>Generating…</span></div>
                        : state.error
                          ? <ErrorPanel error={state.error} onAction={onErrorAction} m={m} />
                          : <div className={`${m.codeBlock} border ${m.border} rounded-lg p-3 text-xs ${m.textBody} leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto`}>{state.response}</div>
                      }
                      {state.response && <button onClick={() => copy(state.response)} className={`flex items-center gap-1 text-xs ${m.textSub} hover:text-white transition-colors mt-1`}><Ic n="Copy" size={10} />Copy response</button>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ HISTORY TAB ══ */}
      {tab === 'history' && (
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 44px)' }}>
          <div className={`w-2/5 border-r ${m.border} flex flex-col`}>
            <div className={`p-3 border-b ${m.border} flex flex-col gap-2`}>
              <input
                className={`${m.input} border rounded-lg px-3 py-1.5 text-xs ${m.text} focus:outline-none focus:border-violet-500`}
                placeholder="Search label or notes…"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={historyDateFrom}
                  onChange={(e) => setHistoryDateFrom(e.target.value)}
                  className={`${m.input} border rounded-lg px-2 py-1.5 text-xs ${m.text} focus:outline-none focus:border-violet-500 flex-1`}
                />
                <input
                  type="date"
                  value={historyDateTo}
                  onChange={(e) => setHistoryDateTo(e.target.value)}
                  className={`${m.input} border rounded-lg px-2 py-1.5 text-xs ${m.text} focus:outline-none focus:border-violet-500 flex-1`}
                />
                <button onClick={refreshHistory} className={`px-2 py-1.5 ${m.btn} ${m.textAlt} rounded-lg text-xs transition-colors`}>↻</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
              {historyLoading && <p className={`text-xs ${m.textMuted} p-2`}>Loading experiments…</p>}
              {!historyLoading && historyItems.length === 0 && <p className={`text-xs ${m.textMuted} p-2`}>No experiments yet.</p>}
              {historyItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setHistorySelectedId(item.id)}
                  className={`text-left border rounded-lg px-3 py-2 transition-colors ${historySelectedId === item.id ? 'border-violet-500 bg-violet-500/10' : `${m.border} ${m.surface}`}`}
                >
                  <p className={`text-xs font-semibold ${m.text}`}>{item.label}</p>
                  <p className={`text-[11px] ${m.textMuted}`}>
                    {new Date(item.createdAt).toLocaleString()} · Winner: {(item?.outcome?.winnerVariantId || '').toUpperCase() || 'n/a'}
                  </p>
                  {item.notes && <p className={`text-[11px] ${m.textAlt} line-clamp-2 mt-1`}>{item.notes}</p>}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedHistory && <p className={`text-sm ${m.textMuted}`}>Select an experiment to view details.</p>}
            {selectedHistory && (
              <div className="flex flex-col gap-3">
                <div className={`${m.surface} border ${m.border} rounded-lg p-3`}>
                  <p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider`}>Experiment</p>
                  <p className={`text-sm ${m.text} mt-1`}>{selectedHistory.label}</p>
                  <p className={`text-[11px] ${m.textMuted}`}>{new Date(selectedHistory.createdAt).toLocaleString()}</p>
                  <p className={`text-xs ${m.textAlt} mt-2`}>Winner variant: {(selectedHistory?.outcome?.winnerVariantId || '').toUpperCase() || 'n/a'}</p>
                  {winningHistoryVariant && (
                    <button
                      onClick={() => {
                        setRaw(winningHistoryVariant.promptText || '');
                        setTab('editor');
                        setDismissedLintRules([]);
                        notify('Loaded winning variant into editor.');
                      }}
                      className="mt-2 text-xs text-violet-300 hover:text-violet-200 transition-colors"
                    >
                      Load winning variant
                    </button>
                  )}
                  {selectedHistory.notes && <p className={`text-xs ${m.textBody} mt-2`}>Notes: {selectedHistory.notes}</p>}
                </div>
                {selectedHistory.keyInputSnapshot && (
                  <div className={`${m.surface} border ${m.border} rounded-lg p-3`}>
                    <p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider mb-2`}>Key input snapshot</p>
                    <p className={`text-xs ${m.textBody} whitespace-pre-wrap`}>{selectedHistory.keyInputSnapshot}</p>
                  </div>
                )}
                <div className={`${m.surface} border ${m.border} rounded-lg p-3`}>
                  <p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider mb-2`}>Variants</p>
                  <div className="flex flex-col gap-2">
                    {(selectedHistory.variants || []).map((variant) => (
                      <div key={`${selectedHistory.id}-${variant.id}`} className={`${m.codeBlock} border ${m.border} rounded-lg p-2`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs text-violet-400 font-semibold">
                            {variant.name || variant.id?.toUpperCase()}
                          </p>
                          <button
                            onClick={() => {
                              setRaw(variant.promptText || '');
                              setTab('editor');
                              setDismissedLintRules([]);
                              notify('Loaded variant into editor.');
                            }}
                            className="text-xs text-violet-300 hover:text-violet-200 transition-colors"
                          >
                            Replay
                          </button>
                        </div>
                        <p className={`text-[11px] ${m.textMuted} mb-1`}>
                          {variant.provider || 'provider'} · {variant.model || 'model'} · {variant.promptHash || 'n/a'}
                        </p>
                        <p className={`text-xs ${m.textBody} whitespace-pre-wrap line-clamp-4`}>{variant.promptText || 'No prompt saved.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ PAD TAB ══ */}
      {tab === 'pad' && <PadTab m={m} notify={notify} />}

      {/* ══ MODALS ══ */}
      {showVarForm && pendingTemplate && (
        <div className={`fixed inset-0 ${m.modalBg} flex items-center justify-center z-40 p-4`}>
          <div className={`${m.modal} border rounded-xl p-5 w-full max-w-md flex flex-col gap-4`}>
            <div className="flex justify-between items-center">
              <h2 className={`font-bold text-sm ${m.text}`}>Fill Template Variables</h2>
              <button onClick={() => setShowVarForm(false)} className={`${m.textSub} hover:text-white`}><Ic n="X" size={15} /></button>
            </div>
            <p className={`text-xs ${m.textAlt}`}>"{pendingTemplate.title}" contains template variables:</p>
            <div className="flex flex-col gap-2">
              {Object.keys(varVals).map(k => (
                <div key={k}>
                  <label className="text-xs font-mono font-semibold text-violet-400 block mb-1">{`{{${k}}}`}</label>
                  <input className={`w-full ${m.input} border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500 ${m.text}`}
                    placeholder={`Value for ${k}…`} value={varVals[k]} onChange={e => setVarVals(p => ({ ...p, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={applyTemplate} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-sm font-semibold transition-colors">Apply Template</button>
              <button onClick={() => { applyEntry(pendingTemplate); setShowVarForm(false); setPendingTemplate(null); }} className={`px-4 ${m.btn} rounded-lg text-sm ${m.textBody} transition-colors`}>Skip</button>
            </div>
          </div>
        </div>
      )}

      {redactionModal && (
        <div className={`fixed inset-0 ${m.modalBg} flex items-center justify-center z-50 p-4`}>
          <div className={`${m.modal} border rounded-xl p-5 w-full max-w-lg flex flex-col gap-3`}>
            <div className="flex items-center justify-between">
              <h2 className={`font-bold text-sm ${m.text}`}>Sensitive data detected</h2>
              <button
                onClick={() => redactionResolveRef.current?.('edit')}
                className={`${m.textSub} hover:text-white transition-colors`}
              >
                <Ic n="X" size={15} />
              </button>
            </div>
            <p className={`text-xs ${m.textAlt}`}>Review detected snippets before sending this request.</p>
            <div className="max-h-56 overflow-y-auto flex flex-col gap-1.5">
              {redactionModal.matches.map((match) => (
                <div key={match.id} className={`${m.codeBlock} border ${m.border} rounded-lg p-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-violet-300 font-semibold">{match.type}</span>
                    <span className={`text-[11px] ${m.textMuted}`}>Line {match.line || 1}</span>
                  </div>
                  <p className={`text-xs ${m.textBody} mt-1`}>{match.preview}</p>
                  <p className={`text-[11px] ${m.textMuted} mt-1`}>{match.description}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => redactionResolveRef.current?.('redact')}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
              >
                Redact and send
              </button>
              <button
                onClick={() => redactionResolveRef.current?.('send')}
                className={`flex-1 ${m.btn} ${m.textBody} rounded-lg py-2 text-sm font-semibold transition-colors`}
              >
                Send as-is
              </button>
              <button
                onClick={() => redactionResolveRef.current?.('edit')}
                className={`px-3 ${m.btn} ${m.textAlt} rounded-lg py-2 text-sm transition-colors`}
              >
                Edit prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {showWinnerNoteModal && (
        <div className={`fixed inset-0 ${m.modalBg} flex items-center justify-center z-50 p-4`}>
          <div className={`${m.modal} border rounded-xl p-5 w-full max-w-md flex flex-col gap-3`}>
            <h2 className={`font-bold text-sm ${m.text}`}>Save experiment rationale</h2>
            <p className={`text-xs ${m.textAlt}`}>
              Winner selected: <span className="text-green-400 font-semibold">{winnerSelectionRef.current || abWinner}</span>
            </p>
            <textarea
              rows={4}
              className={`${m.input} border rounded-lg p-3 text-xs ${m.text} focus:outline-none focus:border-violet-500`}
              placeholder="Optional: Why did this variant win?"
              value={winnerNote}
              onChange={(e) => setWinnerNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => finalizeWinnerSelection(winnerNote)}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
              >
                Save experiment
              </button>
              <button
                onClick={() => finalizeWinnerSelection('')}
                className={`px-3 ${m.btn} ${m.textAlt} rounded-lg py-2 text-sm transition-colors`}
              >
                Skip note
              </button>
            </div>
          </div>
        </div>
      )}

      {showWizard && (
        <div className={`fixed inset-0 ${m.modalBg} z-50 p-4 flex items-center justify-center`}>
          <div className={`${m.modal} border rounded-xl w-full max-w-2xl p-5 flex flex-col gap-4`}>
            <div className="flex items-center justify-between">
              <h2 className={`font-bold text-base ${m.text}`}>Getting Started</h2>
              <span className={`text-xs ${m.textMuted}`}>Step {wizardStep + 1} / 4</span>
            </div>
            {wizardStep === 0 && (
              <div className="flex flex-col gap-3">
                <p className={`text-sm ${m.textBody}`}>Pick a provider/model and validate connectivity.</p>
                <select
                  value={wizardModel}
                  onChange={(e) => setWizardModel(e.target.value)}
                  className={`${m.input} border rounded-lg px-3 py-2 text-sm ${m.text}`}
                >
                  {MODEL_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <button
                  onClick={runWizardConnectivityTest}
                  className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-sm font-semibold"
                >
                  Test connection
                </button>
                <button
                  onClick={openProviderSettings}
                  className={`${m.btn} ${m.textBody} rounded-lg py-2 text-sm font-semibold transition-colors`}
                >
                  Add or update API key
                </button>
                {wizardConnectivity.status !== 'idle' && (
                  <p className={`text-xs ${wizardConnectivity.status === 'ok' ? 'text-green-400' : wizardConnectivity.status === 'error' ? 'text-red-400' : m.textMuted}`}>
                    {wizardConnectivity.message}
                  </p>
                )}
              </div>
            )}
            {wizardStep === 1 && (
              <div className="flex flex-col gap-3">
                <p className={`text-sm ${m.textBody}`}>Choose a starter template.</p>
                <div className="grid grid-cols-2 gap-2">
                  {STARTER_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setWizardTemplateId(template.id)}
                      className={`border rounded-lg px-3 py-2 text-sm text-left transition-colors ${wizardTemplateId === template.id ? 'border-violet-500 bg-violet-500/10 text-violet-300' : `${m.border} ${m.textBody}`}`}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {wizardStep === 2 && (
              <div className="flex flex-col gap-3">
                <p className={`text-sm ${m.textBody}`}>Run your first prompt.</p>
                <textarea
                  rows={6}
                  className={`${m.input} border rounded-lg p-3 text-sm ${m.text} focus:outline-none focus:border-violet-500`}
                  value={wizardDraft}
                  onChange={(e) => setWizardDraft(e.target.value)}
                />
                <button onClick={runWizardFirstPrompt} className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-sm font-semibold">Run</button>
                {wizardRunOutput && <div className={`${m.codeBlock} border ${m.border} rounded-lg p-3 text-xs ${m.textBody} whitespace-pre-wrap max-h-48 overflow-y-auto`}>{wizardRunOutput}</div>}
              </div>
            )}
            {wizardStep === 3 && (
              <div className="flex flex-col gap-3">
                <p className={`text-sm ${m.textBody}`}>Optional: try A/B with pre-made variants.</p>
                <button
                  onClick={() => {
                    setAbA({ prompt: `${wizardDraft}\n\nStyle: concise`, response: '', loading: false, error: null });
                    setAbB({ prompt: `${wizardDraft}\n\nStyle: detailed with bullet points`, response: '', loading: false, error: null });
                    setTab('abtest');
                    notify('A/B demo loaded.');
                  }}
                  className={`${m.btn} ${m.textBody} rounded-lg py-2 text-sm font-semibold transition-colors`}
                >
                  Load A/B demo
                </button>
                <p className={`text-xs ${m.textMuted}`}>You can skip this and run A/B later from the main tab.</p>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-gray-700">
              <div className="flex gap-2">
                <button onClick={() => setShowWizard(false)} className={`text-xs ${m.textSub} hover:text-white`}>Skip for now</button>
                <button
                  onClick={() => {
                    try { localStorage.setItem(STORAGE_KEYS.ONBOARDING_HIDE, 'true'); } catch {}
                    completeWizard(true);
                  }}
                  className={`text-xs ${m.textSub} hover:text-white`}
                >
                  Don’t show again
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setWizardStep((prev) => Math.max(0, prev - 1))}
                  disabled={wizardStep === 0}
                  className={`px-3 py-1.5 ${m.btn} ${m.textAlt} rounded-lg text-xs disabled:opacity-40`}
                >
                  Back
                </button>
                {wizardStep < 3 ? (
                  <button
                    onClick={() => setWizardStep((prev) => Math.min(3, prev + 1))}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => completeWizard(false)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Finish
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className={`fixed inset-0 ${m.modalBg} flex items-center justify-center z-40 p-4`}>
          <div className={`${m.modal} border rounded-xl p-5 w-full max-w-sm flex flex-col gap-4`}>
            <div className="flex justify-between items-center">
              <h2 className={`font-bold text-base ${m.text}`}>Settings</h2>
              <button onClick={() => setShowSettings(false)} className={`${m.textSub} hover:text-white`}><Ic n="X" size={15} /></button>
            </div>
            <label className={`flex items-center justify-between text-sm ${m.textBody} cursor-pointer`}>
              <span>Show enhancement notes</span>
              <input type="checkbox" checked={showNotes} onChange={e => setShowNotes(e.target.checked)} className="accent-violet-500" />
            </label>
            <div className={`border ${m.border} rounded-lg p-3 flex flex-col gap-2`}>
              <div className="flex items-center justify-between">
                <p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider`}>Sensitive Data Redaction</p>
                <label className="text-xs flex items-center gap-2">
                  <span className={m.textAlt}>Enabled</span>
                  <input
                    type="checkbox"
                    checked={redactionSettings.enabled}
                    onChange={(e) => setRedactionSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                    className="accent-violet-500"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.keys(redactionSettings.types).map((type) => (
                  <label key={`redaction-${type}`} className={`text-xs flex items-center gap-1.5 ${m.textBody}`}>
                    <input
                      type="checkbox"
                      checked={!!redactionSettings.types[type]}
                      onChange={(e) => setRedactionSettings((prev) => ({ ...prev, types: { ...prev.types, [type]: e.target.checked } }))}
                      className="accent-violet-500"
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
              <textarea
                rows={2}
                className={`${m.input} border rounded-lg px-2 py-1.5 text-xs ${m.text} focus:outline-none focus:border-violet-500`}
                placeholder="Custom regex patterns (one per line)"
                value={redactionSettings.customPatterns.join('\n')}
                onChange={(e) => setRedactionSettings((prev) => ({
                  ...prev,
                  customPatterns: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean),
                }))}
              />
            </div>
            {collections.length > 0 && (
              <div>
                <p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider mb-2`}>Collections</p>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                  {collections.map(c => (
                    <div key={c} className="flex items-center justify-between">
                      <span className={`text-xs ${m.textAlt} flex items-center gap-1`}><Ic n="FolderOpen" size={9} />{c}</span>
                      <button onClick={() => setCollections(p => p.filter(x => x !== c))} className={`text-xs ${m.textMuted} hover:text-red-400 transition-colors`}><Ic n="Trash2" size={11} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={openProviderSettings} className={`flex items-center gap-2 text-sm ${m.btn} rounded-lg px-3 py-2 text-violet-400 font-semibold transition-colors`}>
              🔑 Manage API Key (Options)
            </button>
            <button
              onClick={() => {
                setShowSettings(false);
                setShowWizard(true);
                setWizardStep(0);
              }}
              className={`flex items-center gap-2 text-sm ${m.btn} rounded-lg px-3 py-2 ${m.textBody} transition-colors`}
            >
              ✨ Getting started
            </button>
            <div className={`border-t ${m.border} pt-3 flex flex-col gap-2`}>
              <button onClick={exportLib} className={`flex items-center gap-2 text-sm ${m.btn} rounded-lg px-3 py-2 ${m.textBody} transition-colors`}><Ic n="Download" size={12} />Export Library</button>
              <label className={`flex items-center gap-2 text-sm ${m.btn} rounded-lg px-3 py-2 ${m.textBody} cursor-pointer transition-colors`}><Ic n="Upload" size={12} />Import Library<input type="file" accept=".json" onChange={importLib} className="hidden" /></label>
              <button onClick={() => { setLibrary([]); notify('Library cleared.'); }} className={`flex items-center gap-2 text-sm ${m.dangerBtn} rounded-lg px-3 py-2 transition-colors`}><Ic n="Trash2" size={12} />Clear All Prompts</button>
            </div>
          </div>
        </div>
      )}

      {showCmdPalette && (
        <div className={`fixed inset-0 ${m.modalBg} flex items-start justify-center z-50 pt-20 p-4`} onClick={() => setShowCmdPalette(false)}>
          <div className={`${m.modal} border rounded-xl w-full max-w-md overflow-hidden shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center gap-2 px-4 py-3 border-b ${m.border}`}>
              <Ic n="Search" size={13} className={m.textSub} />
              <input autoFocus className={`flex-1 bg-transparent text-sm ${m.text} focus:outline-none placeholder-gray-500`}
                placeholder="Search commands…" value={cmdQuery} onChange={e => setCmdQuery(e.target.value)} />
              <span className={`text-xs ${m.textMuted} font-mono`}>ESC</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {filteredCmds.map((a, i) => (
                <button key={i} onClick={a.action}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm ${m.textBody} hover:bg-violet-600 hover:text-white transition-colors text-left`}>
                  <span>{a.label}</span>
                  {a.hint && <kbd className={`text-xs font-mono px-1.5 py-0.5 ${m.pill} rounded`}>{a.hint}</kbd>}
                </button>
              ))}
              {filteredCmds.length === 0 && <p className={`text-xs ${m.textMuted} p-4 text-center`}>No commands found</p>}
            </div>
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className={`fixed inset-0 ${m.modalBg} flex items-center justify-center z-50 p-4`} onClick={() => setShowShortcuts(false)}>
          <div className={`${m.modal} border rounded-xl p-5 w-full max-w-xs`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`font-bold text-sm ${m.text}`}>Keyboard Shortcuts</h2>
              <button onClick={() => setShowShortcuts(false)} className={m.textSub}><Ic n="X" size={14} /></button>
            </div>
            <div className="flex flex-col gap-2.5">
              {[['⌘ ↵', 'Enhance prompt'], ['⌘ S', 'Save prompt'], ['⌘ K', 'Command palette'], ['?', 'Show shortcuts'], ['Esc', 'Close modals']].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={`text-sm ${m.textBody}`}>{label}</span>
                  <kbd className={`text-xs font-mono px-2 py-1 ${m.pill} rounded-md`}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
