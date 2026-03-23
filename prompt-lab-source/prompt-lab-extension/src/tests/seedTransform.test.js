import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLoadJson = vi.fn();
const mockSaveJson = vi.fn();

vi.mock('../lib/storage.js', () => ({
  loadJson: (...args) => mockLoadJson(...args),
  saveJson: (...args) => mockSaveJson(...args),
}));

import { getStarterLibraries, loadStarterPack } from '../lib/seedTransform.js';

describe('seedTransform starter pack loading', () => {
  beforeEach(() => {
    mockLoadJson.mockReset();
    mockSaveJson.mockReset();
    mockLoadJson.mockReturnValue([]);
  });

  it('marks starter libraries as loaded from explicit pack ids', () => {
    const libraries = getStarterLibraries(['lib_data_toolkit']);
    const loadedPack = libraries.find((lib) => lib.id === 'lib_data_toolkit');
    const unloadedPack = libraries.find((lib) => lib.id === 'lib_notion_formatter');

    expect(loadedPack?.loaded).toBe(true);
    expect(unloadedPack?.loaded).toBe(false);
  });

  it('returns a merged library payload with loaded pack metadata', () => {
    const result = loadStarterPack('lib_data_toolkit', [], []);

    expect(result).not.toBeNull();
    expect(result?.count).toBeGreaterThan(0);
    expect(result?.collection).toBe('Data & Table Toolkit');
    expect(result?.collections).toEqual(['Data & Table Toolkit']);
    expect(result?.loadedPackIds).toEqual(['lib_data_toolkit']);
    expect(result?.library).toHaveLength(result.count);
    expect(result?.library[0].metadata.packId).toBe('lib_data_toolkit');
    expect(result?.library.every((entry) => entry.metadata.packLoadedAt === result?.library[0].metadata.packLoadedAt)).toBe(true);
    expect(mockSaveJson).not.toHaveBeenCalled();
  });

  it('moves the loaded starter pack collection to the front', () => {
    const result = loadStarterPack('lib_data_toolkit', [], ['Handoff Templates', 'Research']);

    expect(result).not.toBeNull();
    expect(result?.collections).toEqual(['Data & Table Toolkit', 'Handoff Templates', 'Research']);
  });

  it('skips packs that were already marked as loaded', () => {
    mockLoadJson.mockReturnValue(['lib_data_toolkit']);

    const result = loadStarterPack('lib_data_toolkit', [], []);

    expect(result).toBeNull();
    expect(mockSaveJson).not.toHaveBeenCalled();
  });
});
