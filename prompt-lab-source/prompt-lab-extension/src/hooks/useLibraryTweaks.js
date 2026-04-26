import { useCallback, useMemo, useState } from 'react';
import { loadJson, saveJson, storageKeys } from '../lib/storage.js';
import {
  DEFAULT_LIBRARY_TWEAKS,
  resolveLibraryTweaks,
  validateAccent,
  validateDensity,
  validateSignature,
} from '../lib/libraryTweaks.js';

// Persist three orthogonal axes for the Library v2 visual presets:
// density, accent, signature. Each axis is stored under its own pl2-* key
// so tab-concurrent writes don't merge-conflict and a single-axis reset is
// trivial. Unknown stored values fall back to the spec defaults silently
// (forward-compat with future preset additions).
export default function useLibraryTweaks() {
  const [density, _setDensity] = useState(() =>
    validateDensity(loadJson(storageKeys.libraryDensity, DEFAULT_LIBRARY_TWEAKS.density)));
  const [accent, _setAccent] = useState(() =>
    validateAccent(loadJson(storageKeys.libraryAccent, DEFAULT_LIBRARY_TWEAKS.accent)));
  const [signature, _setSignature] = useState(() =>
    validateSignature(loadJson(storageKeys.librarySignature, DEFAULT_LIBRARY_TWEAKS.signature)));

  const setDensity = useCallback((value) => {
    const next = validateDensity(value);
    _setDensity(next);
    saveJson(storageKeys.libraryDensity, next);
  }, []);

  const setAccent = useCallback((value) => {
    const next = validateAccent(value);
    _setAccent(next);
    saveJson(storageKeys.libraryAccent, next);
  }, []);

  const setSignature = useCallback((value) => {
    const next = validateSignature(value);
    _setSignature(next);
    saveJson(storageKeys.librarySignature, next);
  }, []);

  const values = useMemo(() => ({ density, accent, signature }), [density, accent, signature]);
  const tw = useMemo(() => resolveLibraryTweaks(values), [values]);

  return { values, tw, setDensity, setAccent, setSignature };
}
