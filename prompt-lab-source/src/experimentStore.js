const DB_NAME = 'prompt_lab_local';
const STORE_NAME = 'experiments';
const VERSION = 1;
const LS_KEY = 'pl2-experiment-fallback';

let dbPromise;

function openDb() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('label', 'label');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function readFallback() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFallback(records) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(records));
  } catch {
    // no-op
  }
}

function txRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

function normalizeRecord(record) {
  return {
    id: record.id || crypto.randomUUID(),
    createdAt: record.createdAt || new Date().toISOString(),
    label: String(record.label || 'Untitled experiment').trim(),
    variants: Array.isArray(record.variants) ? record.variants : [],
    keyInputSnapshot: String(record.keyInputSnapshot || '').slice(0, 1200),
    outcome: record.outcome || { winnerVariantId: null },
    notes: String(record.notes || ''),
  };
}

export function hashText(text) {
  const input = String(text || '');
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return `h_${(hash >>> 0).toString(16)}`;
}

export async function saveExperiment(record) {
  const normalized = normalizeRecord(record);
  const db = await openDb().catch(() => null);
  if (!db) {
    const next = [normalized, ...readFallback()].slice(0, 500);
    writeFallback(next);
    return normalized;
  }
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(normalized);
  await txDone(tx);
  return normalized;
}

export async function listExperiments(filters = {}) {
  const {
    search = '',
    dateFrom = '',
    dateTo = '',
  } = filters;
  const q = String(search || '').trim().toLowerCase();
  const db = await openDb().catch(() => null);
  let records = [];
  if (!db) {
    records = readFallback();
  } else {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    records = (await txRequest(store.getAll())) || [];
  }
  return records
    .filter((row) => {
      const rowDate = row.createdAt ? new Date(row.createdAt).getTime() : 0;
      if (dateFrom && rowDate < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
      if (dateTo && rowDate > new Date(`${dateTo}T23:59:59`).getTime()) return false;
      if (q) {
        const hay = `${row.label} ${row.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getExperimentById(id) {
  if (!id) return null;
  const db = await openDb().catch(() => null);
  if (!db) {
    return readFallback().find((entry) => entry.id === id) || null;
  }
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return txRequest(store.get(id));
}
