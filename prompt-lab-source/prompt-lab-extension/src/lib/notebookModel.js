import { logWarn } from './logger.js';
import { storageKeys } from './storage.js';

export const LEGACY_PAD_KEY = storageKeys.pad;
export const LEGACY_PAD_META_KEY = `${storageKeys.pad}_meta`;
export const NOTEBOOK_KEY = 'pl2-pads';
export const NOTEBOOK_SCHEMA_VERSION_KEY = 'pl2-pads-schema-version';
export const NOTEBOOK_SCHEMA_VERSION = '3';
export const DEFAULT_ENTRY_ID = 'default';
export const DEFAULT_ENTRY_TITLE = 'Scratchpad';
export const DEFAULT_PROJECT = 'Prompt Lab Project';
export const NOTEBOOK_STATUS = Object.freeze([
  { id: 'draft', label: 'Draft' },
  { id: 'in_test', label: 'In Test' },
  { id: 'archived', label: 'Archived' },
]);

const STATUS_IDS = new Set(NOTEBOOK_STATUS.map((status) => status.id));

function nowTs() {
  return Date.now();
}

export function parseSavedTimestamp(raw, fallback = nowTs()) {
  if (!raw) return fallback;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function buildEntryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `note-${nowTs()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function inferEntryTitle(body = '', fallback = DEFAULT_ENTRY_TITLE) {
  const firstContentLine = String(body)
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstContentLine) return fallback;
  return firstContentLine.replace(/^[-#>\d.\s]+/, '').trim().slice(0, 72) || fallback;
}

export function normalizeNotebookStatus(status) {
  return STATUS_IDS.has(status) ? status : 'draft';
}

export function normalizeNotebookProject(project) {
  const value = String(project || '').trim();
  return value || DEFAULT_PROJECT;
}

export function normalizeNotebookTitle(title, body = '') {
  const value = String(title || '').trim();
  return value || inferEntryTitle(body);
}

export function createNotebookEntry(overrides = {}) {
  const createdAt = parseSavedTimestamp(overrides.createdAt);
  const updatedAt = parseSavedTimestamp(overrides.updatedAt, createdAt);
  return {
    id: typeof overrides.id === 'string' && overrides.id ? overrides.id : buildEntryId(),
    title: normalizeNotebookTitle(overrides.title, overrides.body),
    body: typeof overrides.body === 'string' ? overrides.body : '',
    project: normalizeNotebookProject(overrides.project),
    status: normalizeNotebookStatus(overrides.status),
    createdAt,
    updatedAt,
    lastSentAt: overrides.lastSentAt ? parseSavedTimestamp(overrides.lastSentAt, updatedAt) : null,
    promptLabLink: typeof overrides.promptLabLink === 'string' ? overrides.promptLabLink : '',
  };
}

export function buildDefaultNotebookPayload(body = '', timestamp = nowTs()) {
  const entry = createNotebookEntry({
    id: DEFAULT_ENTRY_ID,
    title: DEFAULT_ENTRY_TITLE,
    body,
    project: DEFAULT_PROJECT,
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return {
    entries: [entry],
    selectedEntryId: entry.id,
  };
}

export function isValidNotebookEntry(entry) {
  return Boolean(
    entry &&
      typeof entry.id === 'string' &&
      typeof entry.title === 'string' &&
      typeof entry.body === 'string' &&
      typeof entry.project === 'string' &&
      typeof entry.updatedAt === 'number' &&
      typeof entry.createdAt === 'number'
  );
}

export function isValidNotebookPayload(value) {
  return Boolean(
    value &&
      Array.isArray(value.entries) &&
      value.entries.length > 0 &&
      typeof value.selectedEntryId === 'string' &&
      value.entries.every(isValidNotebookEntry)
  );
}

function isLegacyPadsPayload(value) {
  return Boolean(
    value &&
      Array.isArray(value.pads) &&
      value.pads.length > 0 &&
      typeof value.activePadId === 'string'
  );
}

function convertLegacyPad(pad, index = 0) {
  const timestamp = parseSavedTimestamp(pad?.timestamp, nowTs() + index);
  return createNotebookEntry({
    id: typeof pad?.id === 'string' && pad.id ? pad.id : buildEntryId(),
    title: typeof pad?.name === 'string' && pad.name ? pad.name : inferEntryTitle(pad?.content || '', `Note ${index + 1}`),
    body: typeof pad?.content === 'string' ? pad.content : '',
    project: DEFAULT_PROJECT,
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function convertLegacyPadsPayload(value) {
  if (!isLegacyPadsPayload(value)) return null;
  const entries = value.pads.map(convertLegacyPad);
  const selected = entries.find((entry) => entry.id === value.activePadId) || entries[0];
  return {
    entries,
    selectedEntryId: selected.id,
  };
}

export function readNotebookPayload(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(NOTEBOOK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidNotebookPayload(parsed) ? parsed : null;
  } catch (error) {
    logWarn('read notebook payload', error);
    return null;
  }
}

export function persistNotebookState(nextState, storage = globalThis.localStorage) {
  try {
    storage?.setItem(NOTEBOOK_KEY, JSON.stringify(nextState));
    storage?.setItem(NOTEBOOK_SCHEMA_VERSION_KEY, NOTEBOOK_SCHEMA_VERSION);
    return true;
  } catch (error) {
    logWarn('persist notebook state', error);
    return false;
  }
}

export function migrateNotebookStorage(storage = globalThis.localStorage) {
  try {
    const version = storage?.getItem(NOTEBOOK_SCHEMA_VERSION_KEY);

    if (version === NOTEBOOK_SCHEMA_VERSION) {
      const existing = readNotebookPayload(storage);
      if (existing) return { migrated: false, payload: existing, error: null };
    }

    const raw = storage?.getItem(NOTEBOOK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidNotebookPayload(parsed)) {
        storage?.setItem(NOTEBOOK_SCHEMA_VERSION_KEY, NOTEBOOK_SCHEMA_VERSION);
        return { migrated: true, payload: parsed, error: null };
      }
      const converted = convertLegacyPadsPayload(parsed);
      if (converted) {
        persistNotebookState(converted, storage);
        return { migrated: true, payload: converted, error: null };
      }
    }

    let legacyContent = storage?.getItem(LEGACY_PAD_KEY) || '';
    let legacyMeta = storage?.getItem(LEGACY_PAD_META_KEY) || '';

    if (!legacyContent && storage?.getItem('pl-pad')) {
      legacyContent = storage.getItem('pl-pad') || '';
      legacyMeta = storage.getItem('pl-pad_meta') || '';
    }

    const payload = buildDefaultNotebookPayload(
      legacyContent,
      parseSavedTimestamp(legacyMeta)
    );
    persistNotebookState(payload, storage);
    storage?.removeItem(LEGACY_PAD_KEY);
    storage?.removeItem(LEGACY_PAD_META_KEY);
    storage?.removeItem('pl-pad');
    storage?.removeItem('pl-pad_meta');
    return { migrated: true, payload, error: null };
  } catch (error) {
    logWarn('notebook schema migration', error);
    return {
      migrated: false,
      payload: buildDefaultNotebookPayload(),
      error,
    };
  }
}

export function filterNotebookEntries(entries, filters = {}) {
  const query = String(filters.query || '').trim().toLowerCase();
  const status = String(filters.status || 'all');
  const project = String(filters.project || 'all').trim().toLowerCase();
  return entries.filter((entry) => {
    if (status !== 'all' && entry.status !== status) return false;
    if (project !== 'all' && entry.project.trim().toLowerCase() !== project) return false;
    if (!query) return true;
    const haystack = [entry.title, entry.body, entry.project].join('\n').toLowerCase();
    return haystack.includes(query);
  });
}

export function getNotebookEntryStats(body = '') {
  const text = String(body);
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = text.length;
  const tokens = trimmed ? Math.max(words, Math.ceil(chars / 4)) : 0;
  return { words, chars, tokens };
}

export function formatNotebookTimestamp(timestamp, now = nowTs()) {
  const value = parseSavedTimestamp(timestamp, 0);
  if (!value) return '';
  const diffMs = Math.max(0, now - value);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;

  const date = new Date(value);
  const current = new Date(now);
  const sameDay = date.toDateString() === current.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
