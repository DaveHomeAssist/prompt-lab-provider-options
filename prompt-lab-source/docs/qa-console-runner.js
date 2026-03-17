/**
 * Prompt Lab — QA Console Runner (read-only diagnostic)
 *
 * Usage:
 *   1. Open Prompt Lab in your browser.
 *   2. Open DevTools (Cmd+Option+I / Ctrl+Shift+I).
 *   3. Paste this entire script into the Console tab and press Enter.
 *   4. Review the console.table output for pass/fail results.
 *
 * This script DOES NOT modify any localStorage data. It is purely diagnostic.
 */

(function promptLabQA() {
  'use strict';

  const results = [];

  function pass(test, details) {
    results.push({ test, result: 'PASS', details: details || '' });
  }
  function fail(test, details) {
    results.push({ test, result: 'FAIL', details: details || '' });
  }
  function skip(test, details) {
    results.push({ test, result: 'SKIP', details: details || '' });
  }

  /** Safely read and parse a localStorage key. Returns { raw, parsed, error }. */
  function readKey(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return { raw: null, parsed: null, error: 'key missing' };
    try {
      return { raw, parsed: JSON.parse(raw), error: null };
    } catch (e) {
      return { raw, parsed: null, error: 'invalid JSON: ' + e.message };
    }
  }

  // ─── 1. localStorage key existence and validity ──────────────────────

  // pl2-library → array
  const lib = readKey('pl2-library');
  if (lib.error) {
    fail('pl2-library exists & parses', lib.error);
  } else if (!Array.isArray(lib.parsed)) {
    fail('pl2-library is array', 'got ' + typeof lib.parsed);
  } else {
    pass('pl2-library is array', lib.parsed.length + ' entries');
  }

  // pl2-collections → array
  const cols = readKey('pl2-collections');
  if (cols.error) {
    fail('pl2-collections exists & parses', cols.error);
  } else if (!Array.isArray(cols.parsed)) {
    fail('pl2-collections is array', 'got ' + typeof cols.parsed);
  } else {
    pass('pl2-collections is array', cols.parsed.length + ' collections');
  }

  // pl2-loaded-packs → array
  const packs = readKey('pl2-loaded-packs');
  if (packs.raw === null) {
    skip('pl2-loaded-packs exists', 'key absent (no packs loaded yet)');
  } else if (packs.error) {
    fail('pl2-loaded-packs exists & parses', packs.error);
  } else if (!Array.isArray(packs.parsed)) {
    fail('pl2-loaded-packs is array', 'got ' + typeof packs.parsed);
  } else {
    pass('pl2-loaded-packs is array', packs.parsed.length + ' pack(s)');
  }

  // pl2-pads → object with pads array
  const pads = readKey('pl2-pads');
  if (pads.raw === null) {
    skip('pl2-pads exists', 'key absent (pads not initialized)');
  } else if (pads.error) {
    fail('pl2-pads exists & parses', pads.error);
  } else if (typeof pads.parsed !== 'object' || pads.parsed === null || Array.isArray(pads.parsed)) {
    fail('pl2-pads is object', 'got ' + (Array.isArray(pads.parsed) ? 'array' : typeof pads.parsed));
  } else if (!Array.isArray(pads.parsed.pads)) {
    fail('pl2-pads.pads is array', 'missing or non-array .pads property');
  } else {
    pass('pl2-pads is object with pads[]', pads.parsed.pads.length + ' pad(s)');
  }

  // pl2-pads-schema-version === '2'
  const schemaVer = localStorage.getItem('pl2-pads-schema-version');
  if (schemaVer === null) {
    skip('pl2-pads-schema-version', 'key absent');
  } else if (schemaVer === '2') {
    pass('pl2-pads-schema-version === "2"', '');
  } else {
    fail('pl2-pads-schema-version === "2"', 'got "' + schemaVer + '"');
  }

  // ─── 2. Starter pack integrity ──────────────────────────────────────

  const library = Array.isArray(lib.parsed) ? lib.parsed : [];
  const collections = Array.isArray(cols.parsed) ? cols.parsed : [];
  const collectionsSet = new Set(collections);

  const starterEntries = library.filter(
    e => e.metadata && e.metadata.source === 'starter-library'
  );

  if (starterEntries.length === 0) {
    skip('Starter pack integrity', 'no starter-library entries in library');
  } else {
    // Every starter entry must have packId, packName, seedPromptId
    const missingFields = starterEntries.filter(e => {
      const m = e.metadata;
      return !m.packId || !m.packName || !m.seedPromptId;
    });
    if (missingFields.length === 0) {
      pass('Starter entries have packId/packName/seedPromptId', starterEntries.length + ' checked');
    } else {
      fail(
        'Starter entries have packId/packName/seedPromptId',
        missingFields.length + ' missing fields (ids: ' +
          missingFields.slice(0, 5).map(e => e.id).join(', ') + ')'
      );
    }

    // No duplicate seedPromptId within the same packId
    const seedMap = new Map(); // packId → Set<seedPromptId>
    const dupes = [];
    for (const e of starterEntries) {
      const pid = e.metadata.packId;
      const sid = e.metadata.seedPromptId;
      if (!pid || !sid) continue;
      if (!seedMap.has(pid)) seedMap.set(pid, new Set());
      const seen = seedMap.get(pid);
      if (seen.has(sid)) {
        dupes.push(pid + '/' + sid);
      } else {
        seen.add(sid);
      }
    }
    if (dupes.length === 0) {
      pass('No duplicate seedPromptId per pack', seedMap.size + ' pack(s) checked');
    } else {
      fail('No duplicate seedPromptId per pack', dupes.length + ' dupes: ' + dupes.slice(0, 5).join(', '));
    }

    // Collection exists for each unique packName
    const packNames = [...new Set(starterEntries.map(e => e.metadata.packName).filter(Boolean))];
    const missingCollections = packNames.filter(name => !collectionsSet.has(name));
    if (missingCollections.length === 0) {
      pass('Collection exists for each packName', packNames.length + ' pack name(s) verified');
    } else {
      fail('Collection exists for each packName', 'missing: ' + missingCollections.join(', '));
    }
  }

  // ─── 3. Library entry integrity ─────────────────────────────────────

  if (library.length === 0) {
    skip('Library entry integrity', 'library is empty');
  } else {
    // Every entry has id, title, original, createdAt
    const missingRequired = library.filter(
      e => !e.id || typeof e.title !== 'string' || typeof e.original !== 'string' || !e.createdAt
    );
    if (missingRequired.length === 0) {
      pass('Every entry has id/title/original/createdAt', library.length + ' entries checked');
    } else {
      fail(
        'Every entry has id/title/original/createdAt',
        missingRequired.length + ' incomplete (ids: ' +
          missingRequired.slice(0, 5).map(e => e.id || '(no id)').join(', ') + ')'
      );
    }

    // No duplicate IDs
    const idCounts = new Map();
    for (const e of library) {
      if (e.id) idCounts.set(e.id, (idCounts.get(e.id) || 0) + 1);
    }
    const dupeIds = [...idCounts.entries()].filter(([, c]) => c > 1).map(([id]) => id);
    if (dupeIds.length === 0) {
      pass('No duplicate entry IDs', library.length + ' IDs unique');
    } else {
      fail('No duplicate entry IDs', dupeIds.length + ' duped: ' + dupeIds.slice(0, 5).join(', '));
    }

    // useCount is a number >= 0
    const badUseCount = library.filter(
      e => typeof e.useCount !== 'number' || e.useCount < 0 || Number.isNaN(e.useCount)
    );
    if (badUseCount.length === 0) {
      pass('useCount is number >= 0', library.length + ' entries checked');
    } else {
      fail(
        'useCount is number >= 0',
        badUseCount.length + ' invalid (ids: ' +
          badUseCount.slice(0, 5).map(e => e.id).join(', ') + ')'
      );
    }
  }

  // ─── Output ─────────────────────────────────────────────────────────

  console.log('%c Prompt Lab QA — ' + results.length + ' checks', 'font-weight:bold; font-size:14px;');
  console.table(results);

  const failCount = results.filter(r => r.result === 'FAIL').length;
  if (failCount === 0) {
    console.log('%c All checks passed.', 'color:green; font-weight:bold;');
  } else {
    console.log('%c ' + failCount + ' check(s) failed.', 'color:red; font-weight:bold;');
  }
})();
