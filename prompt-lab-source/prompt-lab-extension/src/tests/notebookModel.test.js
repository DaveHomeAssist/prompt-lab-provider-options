import { describe, expect, it } from 'vitest';
import {
  buildDefaultNotebookPayload,
  convertLegacyPadsPayload,
  filterNotebookEntries,
  formatNotebookTimestamp,
  getNotebookEntryStats,
  migrateNotebookStorage,
  NOTEBOOK_KEY,
  NOTEBOOK_SCHEMA_VERSION,
  NOTEBOOK_SCHEMA_VERSION_KEY,
} from '../lib/notebookModel.js';

function createStorage(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

describe('notebookModel', () => {
  it('migrates legacy multi-pad payloads into structured notebook entries', () => {
    const legacy = {
      pads: [
        { id: 'one', name: 'Brainstorm', content: 'alpha beta', timestamp: 1000 },
        { id: 'two', name: 'Ready to test', content: 'gamma delta', timestamp: 2000 },
      ],
      activePadId: 'two',
    };
    const converted = convertLegacyPadsPayload(legacy);
    expect(converted.selectedEntryId).toBe('two');
    expect(converted.entries).toHaveLength(2);
    expect(converted.entries[0]).toMatchObject({
      id: 'one',
      title: 'Brainstorm',
      body: 'alpha beta',
      project: 'Prompt Lab Project',
      status: 'draft',
    });
  });

  it('migrates storage in place and stamps the new schema version', () => {
    const storage = createStorage({
      [NOTEBOOK_KEY]: JSON.stringify({
        pads: [{ id: 'legacy', name: 'Scratchpad', content: 'old note', timestamp: 1234 }],
        activePadId: 'legacy',
      }),
      [NOTEBOOK_SCHEMA_VERSION_KEY]: '2',
    });
    const result = migrateNotebookStorage(storage);
    expect(result.payload.entries[0]).toMatchObject({
      id: 'legacy',
      title: 'Scratchpad',
      body: 'old note',
    });
    expect(storage.getItem(NOTEBOOK_SCHEMA_VERSION_KEY)).toBe(NOTEBOOK_SCHEMA_VERSION);
  });

  it('filters notebook entries by query, status, and project', () => {
    const payload = buildDefaultNotebookPayload('alpha prompt', 1000);
    payload.entries.push({
      id: 'two',
      title: 'Regression',
      body: 'beta test case',
      project: 'Client Project',
      status: 'in_test',
      createdAt: 2000,
      updatedAt: 2000,
      lastSentAt: null,
      promptLabLink: '',
    });
    payload.entries.push({
      id: 'three',
      title: 'Archive me',
      body: 'gamma notes',
      project: 'Prompt Lab Project',
      status: 'archived',
      createdAt: 3000,
      updatedAt: 3000,
      lastSentAt: null,
      promptLabLink: '',
    });

    expect(filterNotebookEntries(payload.entries, { query: 'beta' }).map((entry) => entry.id)).toEqual(['two']);
    expect(filterNotebookEntries(payload.entries, { status: 'archived' }).map((entry) => entry.id)).toEqual(['three']);
    expect(filterNotebookEntries(payload.entries, { project: 'client project' }).map((entry) => entry.id)).toEqual(['two']);
  });

  it('calculates notebook stats and relative timestamps', () => {
    expect(getNotebookEntryStats('one two three')).toEqual({
      words: 3,
      chars: 13,
      tokens: 4,
    });
    expect(formatNotebookTimestamp(29 * 60 * 1000, 30 * 60 * 1000)).toBe('1 min ago');
  });
});
