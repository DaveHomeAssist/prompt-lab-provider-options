// Library v2 tweak presets — three orthogonal axes (density × accent × signature).
// Source of truth for the visual variants the LibraryPanel consumes.
// Mirror of prompt-lab/html pages/prompt-library-v2.html — keep in sync.

export const DENSITY = Object.freeze({
  compact: {
    label: 'Compact',
    toolbarPad: 'px-2.5 py-2',
    toolbarGap: 'gap-1.5',
    listPad: 'p-2',
    listGap: 'gap-1',
    rowPad: 'px-2.5 py-1.5',
    titleSize: 'text-[12.5px]',
    metaSize: 'text-[10.5px]',
    actionSize: 'text-[10.5px] px-2 py-0.5',
    metaVisible: { collection: false, date: true, useCount: true, versions: false, vars: true },
    showToolbarHint: false,
    showTagFilters: false,
    grid: false,
  },
  default: {
    label: 'Default',
    toolbarPad: 'p-3',
    toolbarGap: 'gap-2',
    listPad: 'p-3',
    listGap: 'gap-2',
    rowPad: 'px-3 py-2.5',
    titleSize: 'text-sm',
    metaSize: 'text-xs',
    actionSize: 'text-xs px-2.5 py-1',
    metaVisible: { collection: true, date: true, useCount: true, versions: true, vars: true },
    showToolbarHint: true,
    showTagFilters: true,
    grid: false,
  },
  expanded: {
    label: 'Expanded',
    toolbarPad: 'p-4',
    toolbarGap: 'gap-3',
    listPad: 'p-4',
    listGap: 'gap-3',
    rowPad: 'px-4 py-3.5',
    titleSize: 'text-[15px]',
    metaSize: 'text-[12px]',
    actionSize: 'text-xs px-3 py-1.5',
    metaVisible: { collection: true, date: true, useCount: true, versions: true, vars: true },
    showToolbarHint: true,
    showTagFilters: true,
    showInlinePreview: true,
    grid: false,
  },
  gallery: {
    label: 'Gallery',
    toolbarPad: 'p-4',
    toolbarGap: 'gap-3',
    listPad: 'p-3',
    listGap: 'gap-2',
    rowPad: 'p-3',
    titleSize: 'text-sm',
    metaSize: 'text-[11px]',
    actionSize: 'text-[11px] px-2 py-1',
    metaVisible: { collection: true, date: false, useCount: true, versions: true, vars: false },
    showToolbarHint: true,
    showTagFilters: true,
    showInlinePreview: true,
    previewLines: 3,
    grid: true,
  },
});

export const ACCENT = Object.freeze({
  violet: {
    label: 'Violet',
    swatch: '#7c3aed',
    solid: 'bg-violet-600 hover:bg-violet-500',
    solidText: 'text-white',
    subtle: 'bg-violet-500/12 border-violet-500/40 text-violet-200',
    text: 'text-violet-400',
    textSoft: 'text-violet-300',
    ring: 'ring-violet-500/30',
    focusBorder: 'focus:border-violet-500',
    active: 'bg-violet-600 text-white',
    brandBg: 'bg-violet-600',
    brandShadow: 'shadow-violet-900/40',
    stripe: 'bg-violet-500',
  },
  ink: {
    label: 'Ink',
    swatch: '#0f172a',
    solid: 'bg-slate-900 hover:bg-slate-800',
    solidText: 'text-white',
    subtle: 'bg-slate-500/12 border-slate-500/40 text-slate-200',
    text: 'text-slate-300',
    textSoft: 'text-slate-400',
    ring: 'ring-slate-500/30',
    focusBorder: 'focus:border-slate-500',
    active: 'bg-slate-900 text-white',
    brandBg: 'bg-slate-900',
    brandShadow: 'shadow-black/60',
    stripe: 'bg-slate-400',
  },
  citrus: {
    label: 'Citrus',
    swatch: '#eab308',
    solid: 'bg-yellow-500 hover:bg-yellow-400',
    solidText: 'text-yellow-950',
    subtle: 'bg-yellow-500/12 border-yellow-500/40 text-yellow-200',
    text: 'text-yellow-400',
    textSoft: 'text-yellow-300',
    ring: 'ring-yellow-500/30',
    focusBorder: 'focus:border-yellow-500',
    active: 'bg-yellow-500 text-yellow-950',
    brandBg: 'bg-yellow-500',
    brandShadow: 'shadow-yellow-900/40',
    stripe: 'bg-yellow-400',
  },
  sunset: {
    label: 'Sunset',
    swatch: '#f97316',
    solid: 'bg-orange-600 hover:bg-orange-500',
    solidText: 'text-white',
    subtle: 'bg-orange-500/12 border-orange-500/40 text-orange-200',
    text: 'text-orange-400',
    textSoft: 'text-orange-300',
    ring: 'ring-orange-500/30',
    focusBorder: 'focus:border-orange-500',
    active: 'bg-orange-600 text-white',
    brandBg: 'bg-orange-600',
    brandShadow: 'shadow-orange-900/40',
    stripe: 'bg-orange-500',
  },
  forest: {
    label: 'Forest',
    swatch: '#059669',
    solid: 'bg-emerald-600 hover:bg-emerald-500',
    solidText: 'text-white',
    subtle: 'bg-emerald-500/12 border-emerald-500/40 text-emerald-200',
    text: 'text-emerald-400',
    textSoft: 'text-emerald-300',
    ring: 'ring-emerald-500/30',
    focusBorder: 'focus:border-emerald-500',
    active: 'bg-emerald-600 text-white',
    brandBg: 'bg-emerald-600',
    brandShadow: 'shadow-emerald-900/40',
    stripe: 'bg-emerald-500',
  },
});

export const SIGNATURE = Object.freeze({
  cards: {
    label: 'Cards',
    rowFrame: (m) =>
      `${m.surface} border ${m.border} ${m.borderHov} rounded-lg overflow-hidden`,
    stripe: false,
    titleFont: '',
    titleWeight: 'font-semibold',
    metaFont: '',
    metaTracking: '',
    divider: (m) => `border-t ${m.border}`,
    uppercaseMeta: false,
  },
  rail: {
    label: 'Rail',
    rowFrame: (m, accent) =>
      `${m.surface}/60 rounded-none border-l-2 border-y-0 border-r-0 ${accent.stripe} border-opacity-0 hover:border-opacity-100 transition-colors`,
    stripe: true,
    titleFont: '',
    titleWeight: 'font-semibold',
    metaFont: '',
    metaTracking: '',
    divider: (m) => `border-t ${m.border}`,
    uppercaseMeta: false,
  },
  ticket: {
    label: 'Ticket',
    rowFrame: (m) =>
      `${m.surface} border border-dashed ${m.border} rounded-md overflow-hidden`,
    stripe: false,
    titleFont: '',
    titleWeight: 'font-bold',
    metaFont: 'font-mono',
    metaTracking: 'tracking-wide',
    divider: (m) => `border-t border-dashed ${m.border}`,
    uppercaseMeta: true,
  },
  manuscript: {
    label: 'Manuscript',
    rowFrame: (m) =>
      `${m.surface}/40 border-0 rounded-none`,
    stripe: false,
    titleFont: 'font-serif',
    titleWeight: 'font-medium',
    metaFont: 'italic',
    metaTracking: '',
    divider: (m) => `border-t ${m.border}`,
    uppercaseMeta: false,
  },
});

export const DEFAULT_LIBRARY_TWEAKS = Object.freeze({
  density: 'gallery',
  accent: 'ink',
  signature: 'ticket',
});

export const VALID_DENSITY = Object.freeze(Object.keys(DENSITY));
export const VALID_ACCENT = Object.freeze(Object.keys(ACCENT));
export const VALID_SIGNATURE = Object.freeze(Object.keys(SIGNATURE));

// Coerce arbitrary input to a known preset key, falling back to default.
// Used at hydrate time to silently ignore unknown values written by future versions.
export function validateDensity(value) {
  return VALID_DENSITY.includes(value) ? value : DEFAULT_LIBRARY_TWEAKS.density;
}
export function validateAccent(value) {
  return VALID_ACCENT.includes(value) ? value : DEFAULT_LIBRARY_TWEAKS.accent;
}
export function validateSignature(value) {
  return VALID_SIGNATURE.includes(value) ? value : DEFAULT_LIBRARY_TWEAKS.signature;
}

// Resolve the three keys into the bundle the LibraryPanel consumes.
export function resolveLibraryTweaks(values) {
  const t = values || DEFAULT_LIBRARY_TWEAKS;
  return {
    density: DENSITY[t.density] || DENSITY[DEFAULT_LIBRARY_TWEAKS.density],
    accent: ACCENT[t.accent] || ACCENT[DEFAULT_LIBRARY_TWEAKS.accent],
    signature: SIGNATURE[t.signature] || SIGNATURE[DEFAULT_LIBRARY_TWEAKS.signature],
    raw: t,
  };
}
