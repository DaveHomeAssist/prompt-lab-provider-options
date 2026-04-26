import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import useLibraryTweaks from '../hooks/useLibraryTweaks.js';
import {
  DEFAULT_LIBRARY_TWEAKS,
  resolveLibraryTweaks,
  validateAccent,
  validateDensity,
  validateSignature,
} from '../lib/libraryTweaks.js';
import { storageKeys } from '../lib/storage.js';

describe('libraryTweaks presets', () => {
  it('exposes the expected default keys', () => {
    expect(DEFAULT_LIBRARY_TWEAKS.density).toBe('gallery');
    expect(DEFAULT_LIBRARY_TWEAKS.accent).toBe('ink');
    expect(DEFAULT_LIBRARY_TWEAKS.signature).toBe('ticket');
  });

  it('validates known preset keys and falls back to defaults for unknowns', () => {
    expect(validateDensity('compact')).toBe('compact');
    expect(validateDensity('not-a-density')).toBe(DEFAULT_LIBRARY_TWEAKS.density);
    expect(validateAccent('forest')).toBe('forest');
    expect(validateAccent(undefined)).toBe(DEFAULT_LIBRARY_TWEAKS.accent);
    expect(validateSignature('manuscript')).toBe('manuscript');
    expect(validateSignature(null)).toBe(DEFAULT_LIBRARY_TWEAKS.signature);
  });

  it('resolveLibraryTweaks returns the bundle the LibraryPanel consumes', () => {
    const tw = resolveLibraryTweaks(DEFAULT_LIBRARY_TWEAKS);
    expect(tw.density.label).toBe('Gallery');
    expect(tw.accent.label).toBe('Ink');
    expect(tw.signature.label).toBe('Ticket');
    expect(typeof tw.signature.rowFrame).toBe('function');
    expect(tw.density.grid).toBe(true);
  });

  it('resolveLibraryTweaks tolerates a missing values argument', () => {
    const tw = resolveLibraryTweaks(undefined);
    expect(tw.density.label).toBe('Gallery');
    expect(tw.accent.label).toBe('Ink');
  });
});

describe('useLibraryTweaks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates to the locked v2 defaults when storage is empty', () => {
    const { result } = renderHook(() => useLibraryTweaks());
    expect(result.current.values).toEqual(DEFAULT_LIBRARY_TWEAKS);
    expect(result.current.tw.density.label).toBe('Gallery');
  });

  it('hydrates from previously persisted values', () => {
    localStorage.setItem(storageKeys.libraryDensity, JSON.stringify('compact'));
    localStorage.setItem(storageKeys.libraryAccent, JSON.stringify('forest'));
    localStorage.setItem(storageKeys.librarySignature, JSON.stringify('manuscript'));

    const { result } = renderHook(() => useLibraryTweaks());
    expect(result.current.values).toEqual({
      density: 'compact',
      accent: 'forest',
      signature: 'manuscript',
    });
    expect(result.current.tw.density.grid).toBe(false);
    expect(result.current.tw.signature.titleFont).toBe('font-serif');
  });

  it('silently ignores unknown stored values and falls back to defaults', () => {
    localStorage.setItem(storageKeys.libraryDensity, JSON.stringify('shadowrealm'));
    localStorage.setItem(storageKeys.libraryAccent, JSON.stringify(42));
    localStorage.setItem(storageKeys.librarySignature, JSON.stringify(null));

    const { result } = renderHook(() => useLibraryTweaks());
    expect(result.current.values).toEqual(DEFAULT_LIBRARY_TWEAKS);
  });

  it('persists each axis to its own key on change', () => {
    const { result } = renderHook(() => useLibraryTweaks());

    act(() => result.current.setDensity('expanded'));
    act(() => result.current.setAccent('citrus'));
    act(() => result.current.setSignature('rail'));

    expect(JSON.parse(localStorage.getItem(storageKeys.libraryDensity))).toBe('expanded');
    expect(JSON.parse(localStorage.getItem(storageKeys.libraryAccent))).toBe('citrus');
    expect(JSON.parse(localStorage.getItem(storageKeys.librarySignature))).toBe('rail');

    expect(result.current.values).toEqual({
      density: 'expanded',
      accent: 'citrus',
      signature: 'rail',
    });
    expect(result.current.tw.accent.label).toBe('Citrus');
  });

  it('writes the validated value, not the raw input, when an unknown value is set', () => {
    const { result } = renderHook(() => useLibraryTweaks());

    act(() => result.current.setDensity('shadowrealm'));

    expect(result.current.values.density).toBe(DEFAULT_LIBRARY_TWEAKS.density);
    expect(JSON.parse(localStorage.getItem(storageKeys.libraryDensity)))
      .toBe(DEFAULT_LIBRARY_TWEAKS.density);
  });
});
