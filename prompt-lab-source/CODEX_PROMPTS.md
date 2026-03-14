# Codex Prompts — Prompt Lab v1.6

---

## Prompt 1: Ghost Variables (Logic Layer)

**Target files (modify only these):**
- `prompt-lab-extension/src/promptUtils.js`
- `prompt-lab-extension/src/hooks/usePromptEditor.js`

**Do NOT modify:** `App.jsx`, `background.js`, `manifest.json`, `platform.js`, or any other file.

### Context

Prompt Lab has a template variable system. When a user loads a saved prompt containing
`{{varName}}` placeholders, the app extracts the variable names, shows a form for the
user to fill in values, then substitutes them into the prompt text.

Current flow in `usePromptEditor.js` (line 294):
```javascript
const loadEntry = entry => {
  const vars = extractVars(entry?.enhanced);
  if (vars.length > 0) {
    setPendingTemplate(entry);
    setVarVals(Object.fromEntries(vars.map(v => [v, ''])));
    setShowVarForm(true);
  } else {
    applyEntry(entry);
  }
};
```

`extractVars` is in `promptUtils.js` (line 46):
```javascript
export function extractVars(text) {
  if (typeof text !== 'string') return [];
  return [...new Set([...text.matchAll(/\{\{(\w[\w ]*)\}\}/g)].map(m => m[1]))];
}
```

`applyTemplate` is in `usePromptEditor.js` (line 310):
```javascript
const applyTemplate = () => {
  if (!pendingTemplate) return;
  let text = ensureString(pendingTemplate.enhanced);
  Object.entries(varVals).forEach(([k, v]) => { text = text.replaceAll(`{{${k}}}`, v); });
  applyEntry({ ...pendingTemplate, enhanced: text });
  setShowVarForm(false); setPendingTemplate(null);
};
```

### Task

Add "ghost variables" — built-in variable names that auto-resolve to dynamic values
without requiring manual input. When a template contains only ghost variables, skip the
form entirely and apply immediately. When it contains a mix, show the form with ghost
vars pre-filled and manual vars empty.

### Requirements

**1. Add to `promptUtils.js` — new exports after `extractVars`:**

Add a resolver map with these 6 built-in ghost variables:

| Name | Resolver |
|------|----------|
| `date` | `new Date().toLocaleDateString()` |
| `time` | `new Date().toLocaleTimeString()` |
| `datetime` | `new Date().toLocaleString()` |
| `timestamp` | `new Date().toISOString()` |
| `year` | `String(new Date().getFullYear())` |
| `clipboard` | `navigator.clipboard.readText()` with try/catch returning `''` on failure |

Export three new functions:

- `isGhostVar(name)` — returns `true` if `name.toLowerCase().trim()` is a key in the resolver map
- `resolveGhostVars(varNames)` — takes a `string[]`, returns `Promise<Record<string, string>>` with resolved values for each ghost var found. Non-ghost vars are skipped. Each resolver is individually try/caught (failure → empty string).
- `GHOST_VAR_NAMES` — a constant array of the 6 resolver keys (for UI use)

The clipboard resolver must be `async` and use `navigator.clipboard.readText()`.
If the clipboard API throws or is unavailable, return `''` (empty string, not an error message).

**2. Modify `loadEntry` in `usePromptEditor.js`:**

Make `loadEntry` async. Split extracted vars into ghost vs manual:

```
const ghostNames = vars.filter(isGhostVar);
const manualNames = vars.filter(v => !isGhostVar(v));
```

Resolve ghost vars via `resolveGhostVars(ghostNames)`.

- If ALL vars are ghost (`manualNames.length === 0`): apply the template immediately
  using the resolved values — substitute each ghost var's value into the template text
  via `.replaceAll()`, then call `applyEntry()`. Do NOT show the var form.
  Clear `pendingTemplate` after applying.

- If there are manual vars: set `varVals` with ghost vars pre-filled from resolved values
  and manual vars initialized to `''`. Then show the var form as usual.

Import `isGhostVar` and `resolveGhostVars` from `../promptUtils.js`.

**3. Do NOT add a `registerGhostResolver()` function.** The registry is fixed.
Extension-specific resolvers are out of scope.

### Constraints

- `loadEntry` callers use it as `onClick={() => loadEntry(entry)}`. Making it async
  is safe — no caller consumes the return value.
- Do not change the function signature of `applyTemplate()` — it still reads from
  `varVals` state for the mixed (ghost + manual) case.
- Do not modify `extractVars()` — it should still return ALL variable names including
  ghost vars.
- All 49 existing tests must pass after your changes (`npm test`).
- Do not add new test files in this change.
- Do not add console.log statements.
- Use the existing `ensureString` import from `../lib/utils.js` when needed.

### Verification

After your changes, these scenarios should work:

1. A template with `{{date}}` only → `loadEntry` resolves the date and applies
   immediately without showing the var form.
2. A template with `{{date}}` and `{{topic}}` → var form shows with date pre-filled
   (today's date string) and topic empty.
3. A template with `{{clipboard}}` when clipboard is inaccessible → resolves to `''`,
   still applies or shows form normally.
4. A template with no variables → `applyEntry()` called directly (unchanged behavior).
5. A template with only manual vars like `{{context}}` → var form shows with empty
   values (unchanged behavior).

---

## Prompt 2: Golden Response Benchmark (Schema + Logic Layer)

**Target files (modify only these):**
- `prompt-lab-extension/src/lib/promptSchema.js`
- `prompt-lab-extension/src/hooks/usePromptLibrary.js`
- `prompt-lab-extension/src/promptUtils.js`

**Do NOT modify:** `App.jsx`, `platform.js`, `providers.js`, or any other file.

### Context

Prompt Lab saves prompts to a library. Each entry is normalized through
`normalizeEntry()` in `promptSchema.js` (line 204). The library hook
`usePromptLibrary.js` provides CRUD operations. The app already has `wordDiff(a, b)`
in `promptUtils.js` for comparing text.

Users iteratively refine prompts but have no way to pin a "known good" model output
as a benchmark for future comparisons.

Current entry schema (from `normalizeEntry`, line 204):
```javascript
{
  id, title, original, enhanced, variants, notes, tags, collection,
  createdAt, updatedAt, useCount, currentVersionId, versions, testCases, metadata
}
```

There is NO `goldenResponse` field currently.

The library hook (`usePromptLibrary.js`) exposes `updateLibraryEntry(id, updaterFn)`
which takes an entry ID and an updater function that receives the current entry and
returns the updated entry.

`encodeShare()` in `promptUtils.js` (line 51) whitelists specific fields for URL sharing:
```javascript
export function encodeShare(entry) {
  return btoa(unescape(encodeURIComponent(JSON.stringify({
    title: entry.title, original: entry.original, enhanced: entry.enhanced,
    variants: entry.variants, tags: entry.tags, notes: entry.notes,
  }))));
}
```

### Task

Add a `goldenResponse` field to the prompt entry schema and provide library hook
methods to pin and clear golden responses. Also add an n-gram similarity function
for comparing text.

### Requirements

**1. Add `goldenResponse` to `normalizeEntry()` in `promptSchema.js`:**

After the `metadata` field in the return object, add:

```javascript
goldenResponse: entry.goldenResponse ? {
  text: ensureString(entry.goldenResponse.text).slice(0, 20000),
  pinnedAt: entry.goldenResponse.pinnedAt || fallbackTs,
  pinnedFromRunId: ensureString(entry.goldenResponse.pinnedFromRunId) || null,
  provider: ensureString(entry.goldenResponse.provider),
  model: ensureString(entry.goldenResponse.model),
} : null,
```

- If `entry.goldenResponse` is falsy, default to `null`.
- Text is capped at 20,000 characters.
- `pinnedFromRunId` is nullable — it links to an eval run but may not always be set.
- Use the existing `ensureString` helper already imported in that file.

**2. Do NOT modify `getPromptSnapshot()`, `appendVersionSnapshot()`, or `restorePromptVersion()`.**
Golden response is a prompt-level annotation, not a version-level one. Version snapshots
should not capture or restore goldenResponse.

**3. Do NOT modify `encodeShare()`.** Share URLs should not include golden responses.

**4. Add two methods to `usePromptLibrary.js`:**

Inside the `usePromptLibrary` hook, add:

```javascript
const pinGoldenResponse = (entryId, { text, runId, provider, model }) => {
  updateLibraryEntry(entryId, entry => ({
    ...entry,
    goldenResponse: {
      text,
      pinnedAt: new Date().toISOString(),
      pinnedFromRunId: runId || null,
      provider: provider || '',
      model: model || '',
    },
    updatedAt: new Date().toISOString(),
  }));
  notify('Pinned as golden response');
};

const clearGoldenResponse = (entryId) => {
  updateLibraryEntry(entryId, entry => ({
    ...entry,
    goldenResponse: null,
    updatedAt: new Date().toISOString(),
  }));
  notify('Golden response cleared');
};
```

Include both in the hook's return object alongside the existing methods.

**5. Add `ngramSimilarity()` to `promptUtils.js`:**

New exported function:

```javascript
export function ngramSimilarity(a, b, n = 3) {
  if (!a || !b) return 0;
  const ngrams = (str) => {
    const words = str.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length < n) return new Set([words.join(' ')]);
    const set = new Set();
    for (let i = 0; i <= words.length - n; i++) {
      set.add(words.slice(i, i + n).join(' '));
    }
    return set;
  };
  const setA = ngrams(a);
  const setB = ngrams(b);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 1 : intersection.size / union.size;
}
```

Returns a float between 0.0 and 1.0. Identical texts return 1.0.
Either input being empty/falsy returns 0.

### Constraints

- All 49 existing tests must pass after your changes (`npm test`).
- Do not add new test files in this change.
- Do not add console.log statements.
- Do not modify `createPromptEntry()`, `updatePromptEntry()`, `restorePromptVersion()`,
  `getPromptSnapshot()`, `appendVersionSnapshot()`, or `encodeShare()`.
- `normalizeEntry()` is the ONLY place the schema shape is defined — that's where
  `goldenResponse` goes.
- The `updateLibraryEntry` function is already available in the hook scope — do not
  re-implement it.

### Verification

After your changes:

1. `normalizeEntry({})` → returns object with `goldenResponse: null`
2. `normalizeEntry({ goldenResponse: { text: 'good output', provider: 'anthropic', model: 'claude-sonnet-4-20250514' } })` → returns normalized goldenResponse with pinnedAt timestamp
3. `normalizeEntry({ goldenResponse: { text: 'x'.repeat(30000) } })` → text truncated to 20,000 chars
4. `ngramSimilarity('the quick brown fox', 'the quick brown fox')` → `1.0`
5. `ngramSimilarity('the quick brown fox', 'a slow red dog')` → value between 0.0 and 1.0
6. `ngramSimilarity('', 'hello')` → `0`
7. `ngramSimilarity('short', 'short')` → `1.0` (falls back to single-ngram when words < n)
8. Existing library export/import continues to work — golden responses included in export, restored on import
9. Share URLs do NOT include golden response data
10. Version restore does NOT alter the golden response on the entry
