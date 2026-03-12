const HISTORY_KEY = 'pl2-experiment-history';
const MAX_RECORDS = 500;

function ensureString(v) {
  return typeof v === 'string' ? v : '';
}

function toIso(value) {
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

function tinyHash(text) {
  const value = ensureString(text);
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) {
    h = ((h << 5) + h) ^ value.charCodeAt(i);
  }
  return `h${(h >>> 0).toString(16)}`;
}

export function normalizeExperimentRecord(record) {
  if (!record || typeof record !== 'object') return null;
  const variants = Array.isArray(record.variantMetadata)
    ? record.variantMetadata
      .map(v => ({
        id: ensureString(v?.id),
        name: ensureString(v?.name) || ensureString(v?.id),
        provider: ensureString(v?.provider) || 'anthropic',
        model: ensureString(v?.model) || 'unknown',
        promptHash: ensureString(v?.promptHash),
        promptText: ensureString(v?.promptText),
      }))
      .filter(v => v.id)
    : [];

  if (!variants.length) return null;

  return {
    id: ensureString(record.id) || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `exp-${Date.now()}`),
    createdAt: toIso(record.createdAt),
    label: ensureString(record.label) || 'Untitled experiment',
    variantMetadata: variants,
    keyInputSnapshot: ensureString(record.keyInputSnapshot).slice(0, 1200),
    outcome: ensureString(record.outcome),
    notes: ensureString(record.notes).slice(0, 400),
  };
}

export function loadExperimentHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeExperimentRecord).filter(Boolean)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  } catch {
    return [];
  }
}

export function saveExperimentHistory(records) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {}
}

export function addExperimentRecord(record) {
  const normalized = normalizeExperimentRecord(record);
  if (!normalized) return null;
  const current = loadExperimentHistory();
  const next = [normalized, ...current].slice(0, MAX_RECORDS);
  saveExperimentHistory(next);
  return normalized;
}

export function createExperimentRecord({
  label,
  variantA,
  variantB,
  winnerId,
  notes,
  provider = 'anthropic',
  model = 'claude-sonnet-4-20250514',
}) {
  const aPrompt = ensureString(variantA?.prompt);
  const bPrompt = ensureString(variantB?.prompt);
  const aResp = ensureString(variantA?.response);
  const bResp = ensureString(variantB?.response);

  return {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `exp-${Date.now()}`,
    createdAt: new Date().toISOString(),
    label: ensureString(label) || 'A/B experiment',
    variantMetadata: [
      {
        id: 'A',
        name: ensureString(variantA?.name) || 'Variant A',
        provider,
        model,
        promptHash: tinyHash(aPrompt),
        promptText: aPrompt,
      },
      {
        id: 'B',
        name: ensureString(variantB?.name) || 'Variant B',
        provider,
        model,
        promptHash: tinyHash(bPrompt),
        promptText: bPrompt,
      },
    ],
    keyInputSnapshot: JSON.stringify({
      aPrompt: aPrompt.slice(0, 280),
      bPrompt: bPrompt.slice(0, 280),
      aResponse: aResp.slice(0, 180),
      bResponse: bResp.slice(0, 180),
    }),
    outcome: ensureString(winnerId),
    notes: ensureString(notes),
  };
}

export function filterExperimentHistory(records, filters = {}) {
  const q = ensureString(filters.query).toLowerCase();
  const from = filters.from ? Date.parse(filters.from) : null;
  const to = filters.to ? Date.parse(filters.to) : null;

  return (Array.isArray(records) ? records : []).filter((record) => {
    const ts = Date.parse(record.createdAt);
    if (Number.isFinite(from) && ts < from) return false;
    if (Number.isFinite(to) && ts > to + (24 * 60 * 60 * 1000)) return false;
    if (!q) return true;
    const blob = [
      record.label,
      record.notes,
      record.outcome,
      ...(record.variantMetadata || []).map(v => `${v.name} ${v.id} ${v.promptHash}`),
    ].join(' ').toLowerCase();
    return blob.includes(q);
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
