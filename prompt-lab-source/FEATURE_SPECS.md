# Prompt Lab — Feature Specifications v2

Corrected specs based on codebase audit. Versioning removed (already shipped).
Each spec reflects actual architecture constraints discovered during review.

---

## Table of Contents

1. [Ghost Variables (Context-Aware Auto-Fill)](#1-ghost-variables)
2. [Golden Response Benchmark](#2-golden-response-benchmark)
3. [Provider-Agnostic Chaining (2-Step Pipe)](#3-provider-agnostic-chaining) — deferred
4. [Team Playbooks (Export/Import Bundles)](#4-team-playbooks) — deferred

**Removed:** Prompt Versioning — already fully shipped. `appendVersionSnapshot()`,
`restorePromptVersion()`, FIFO eviction, and the version timeline UI with
expand/collapse/restore are all live in `promptSchema.js` and `App.jsx`.

---

## 1. Ghost Variables

**Priority:** 1st — Highest ROI, extends existing system
**Scope:** ~100–140 lines across 3 files
**Risk:** Medium — clipboard needs user gesture; extension resolvers need message bridge

### Problem

Users manually fill every `{{variable}}` via the var form each time they load a template.
Repetitive context (current date, clipboard contents) requires copy-paste on every use.

### Existing Architecture

```
promptUtils.js:46   extractVars(text)     → parses {{varName}} → string[]
usePromptEditor.js:63  varVals           → { [varName]: string }
usePromptEditor.js:64  showVarForm       → boolean
usePromptEditor.js:294 loadEntry()       → checks for vars, shows form if found
usePromptEditor.js:310 applyTemplate()   → .replaceAll() each varVal into template
```

The variable form appears when `extractVars()` finds `{{placeholders}}` in a loaded
template. `varVals` is initialized with empty strings. After the user fills them,
`applyTemplate()` substitutes via `.replaceAll()`.

### Design

#### 1.1 Ghost Resolver Registry (UI-side only)

All resolvers run in the React page context, NOT in the background service worker.
The background and page do not share in-memory module state.

Add to `promptUtils.js`:

```javascript
const GHOST_RESOLVERS = {
  date:      () => new Date().toLocaleDateString(),
  time:      () => new Date().toLocaleTimeString(),
  datetime:  () => new Date().toLocaleString(),
  timestamp: () => new Date().toISOString(),
  year:      () => String(new Date().getFullYear()),
  clipboard: async () => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return ''; // graceful fallback — user denied or API unavailable
    }
  },
};

export function isGhostVar(name) {
  return name.toLowerCase().trim() in GHOST_RESOLVERS;
}

export async function resolveGhostVars(varNames) {
  const resolved = {};
  for (const name of varNames) {
    const key = name.toLowerCase().trim();
    const resolver = GHOST_RESOLVERS[key];
    if (resolver) {
      try { resolved[name] = await resolver(); }
      catch { resolved[name] = ''; }
    }
  }
  return resolved;
}

export const GHOST_VAR_NAMES = Object.keys(GHOST_RESOLVERS);
```

**Why no `registerGhostResolver()` for extensions?** The original spec proposed
importing `registerGhostResolver` into `background.js`, but the service worker
and the React panel are separate JS contexts — they don't share module state.
Extension-specific resolvers (selection, tab_url) would need `chrome.runtime.sendMessage`
bridges and manifest permission changes (`scripting` is not currently granted —
manifest only has `storage` + `sidePanel`). That's a separate, larger change.

For v1, ship the 6 universal resolvers that work everywhere: date, time, datetime,
timestamp, year, clipboard.

#### 1.2 Auto-Fill in Variable Form

Modify `loadEntry()` in `usePromptEditor.js` (line 294):

```javascript
const loadEntry = async (entry) => {
  const vars = extractVars(entry?.enhanced);
  if (vars.length > 0) {
    setPendingTemplate(entry);
    const ghostNames = vars.filter(isGhostVar);
    const manualNames = vars.filter(v => !isGhostVar(v));
    const ghostVals = await resolveGhostVars(ghostNames);

    if (manualNames.length === 0) {
      // All vars are ghost — apply immediately, skip form
      let text = ensureString(entry.enhanced);
      Object.entries(ghostVals).forEach(([k, v]) => {
        text = text.replaceAll(`{{${k}}}`, v);
      });
      applyEntry({ ...entry, enhanced: text });
      setPendingTemplate(null);
    } else {
      // Mix of ghost + manual — show form with ghost vars pre-filled
      setVarVals({
        ...Object.fromEntries(manualNames.map(v => [v, ''])),
        ...ghostVals,
      });
      setShowVarForm(true);
    }
  } else {
    applyEntry(entry);
  }
};
```

Note: `loadEntry` becomes async. Callers already use it in event handlers
(`onClick={() => loadEntry(entry)}`), so this is safe — no return value is consumed.

#### 1.3 UI Indicators

In the variable form in `App.jsx`, mark auto-filled ghost vars:

- Ghost vars: show a muted `(auto)` badge next to the label and the pre-filled value
- Ghost vars remain editable — user can override the auto-fill
- Manual vars: empty input, no badge

#### 1.4 Clipboard Permission Handling

`navigator.clipboard.readText()` requires:
- **Secure context** (HTTPS or localhost) — already satisfied by Vercel and local dev
- **User gesture** — the `onClick` handler that triggers `loadEntry()` serves as the gesture
- **Permissions API grant** — browser prompts on first use; if denied, resolver returns `''`

On the extension side panel, clipboard access works without extra permissions because
the side panel runs in a secure extension context.

#### 1.5 Future: Extension-Specific Resolvers

Deferred to a follow-up. Would require:
1. Adding `scripting` to `manifest.json` permissions (CWS review friction)
2. A message bridge: page sends `chrome.runtime.sendMessage({ type: 'resolve-ghost', name: 'selection' })`,
   background responds with the resolved value
3. The resolver registry in `promptUtils.js` would accept a `platformResolve` fallback
   function injected from `platform.js`

Not needed for v1 — the universal resolvers cover the highest-value use cases.

### Files Modified

| File | Changes |
|------|---------|
| `promptUtils.js` | Add `GHOST_RESOLVERS`, `isGhostVar()`, `resolveGhostVars()`, `GHOST_VAR_NAMES` |
| `usePromptEditor.js` | Modify `loadEntry()` to resolve ghost vars, make async |
| `App.jsx` | Add `(auto)` badge on ghost vars in variable form |

### Test Plan

- [ ] Template with only `{{date}}` — auto-applies without showing form
- [ ] Template with `{{date}}` + `{{topic}}` — form shows, date pre-filled, topic empty
- [ ] Template with `{{clipboard}}` on web — permission prompt, then auto-fill
- [ ] Clipboard permission denied — ghost var resolves to empty string, form still works
- [ ] User overrides pre-filled ghost var — override value used in substitution
- [ ] Unknown var name — treated as manual (no resolver match)
- [ ] All 6 built-in resolvers return correct values
- [ ] Existing tests still pass (`npm test` — 49 tests)

---

## 2. Golden Response Benchmark

**Priority:** 2nd — Professional QA positioning
**Scope:** ~150–180 lines across 4 files
**Risk:** Medium — schema addition affects normalization, import/export, and share

### Problem

Users iteratively refine prompts but have no systematic way to track whether output
quality is improving or drifting. The app has eval history and word diff, but no way
to pin a "known good" output as a comparison baseline.

### Existing Architecture

```
promptUtils.js:3       wordDiff(a, b)     → [{t:'eq'|'add'|'del', v:word}]
useEvalRuns.js          evalRuns           → stored enhancement results per prompt
evalSchema.js           normalizeEvalRunRecord() → has output, verdict, notes
promptSchema.js:204     normalizeEntry()   → no goldenResponse field currently
usePromptLibrary.js:139 exportLib()        → JSON.stringify(library) — serializes all fields
promptUtils.js:51       encodeShare()      → whitelists specific fields for URL sharing
```

### Design

#### 2.1 Schema Addition

Add `goldenResponse` to `normalizeEntry()` in `promptSchema.js`:

```javascript
// Inside normalizeEntry(), after metadata:
goldenResponse: entry.goldenResponse ? {
  text: ensureString(entry.goldenResponse.text).slice(0, 20000),
  pinnedAt: entry.goldenResponse.pinnedAt || fallbackTs,
  pinnedFromRunId: ensureString(entry.goldenResponse.pinnedFromRunId) || null,
  provider: ensureString(entry.goldenResponse.provider),
  model: ensureString(entry.goldenResponse.model),
} : null,
```

**Follow-on concerns the original spec missed:**

1. **Import/export:** `exportLib()` serializes the full library array via `JSON.stringify`.
   Since `goldenResponse` is part of `normalizeEntry()`, it will be included in exports
   and correctly restored on import — no additional export code needed. However, the
   golden text could be large (up to 20KB). This is acceptable for file export but means
   library size in localStorage grows. The 20KB cap per response mitigates this.

2. **Share URLs:** `encodeShare()` in `promptUtils.js` whitelists specific fields
   (title, original, enhanced, variants, tags, notes). `goldenResponse` is NOT included
   in shares — this is correct. Sharing a prompt should share the prompt, not the
   benchmark. No changes needed to `encodeShare()`.

3. **Version history:** `getPromptSnapshot()` captures original, enhanced, variants,
   notes. It does NOT capture goldenResponse. This is correct — the golden response
   is a prompt-level annotation, not a version-level one. Restoring a version should
   not change the golden response.

#### 2.2 Pin and Clear Actions

Add to `usePromptLibrary.js`:

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

Return both from the hook's returned object.

#### 2.3 Similarity Score

N-gram Jaccard — no dependencies, client-side only:

```javascript
// promptUtils.js — new export

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

#### 2.4 UI — Pin Trigger Points

Two places to pin a golden response (both require `editingId` to be set):

1. **Eval History panel** (App.jsx ~line 340) — add a ★ button on each eval run row
2. **Enhancement result** (App.jsx editor section) — add "Pin as Golden ★" next to
   the enhanced output when `editingId` is set

#### 2.5 UI — Comparison Panel

When `editingId` is set and the library entry has a `goldenResponse`, show a
comparison section below the enhanced output:

- Word-level diff using existing `wordDiff()` between current enhanced and golden text
- Similarity percentage using `ngramSimilarity()`
- Metadata: "Pinned [date] · [provider] [model]"
- "Clear Golden" button

This is NOT a separate modal or tab — it's an inline collapsible section in the
editor, toggled by a ★ icon button.

### Files Modified

| File | Changes |
|------|---------|
| `promptSchema.js` | Add `goldenResponse` to `normalizeEntry()` |
| `usePromptLibrary.js` | Add `pinGoldenResponse()`, `clearGoldenResponse()`, expose from hook |
| `promptUtils.js` | Add `ngramSimilarity()` |
| `App.jsx` | Pin buttons on eval rows + enhanced output; comparison panel with diff + similarity |

### Test Plan

- [ ] `normalizeEntry()` with no goldenResponse — defaults to null
- [ ] `normalizeEntry()` with goldenResponse object — normalized correctly, text capped at 20K
- [ ] Pin from eval history — entry's goldenResponse populated
- [ ] Pin from enhancement result — same
- [ ] Clear golden response — goldenResponse set to null
- [ ] Comparison panel shows word diff + similarity % when golden exists
- [ ] Comparison panel hidden when no golden response
- [ ] Export library with golden responses — included in JSON
- [ ] Import library with golden responses — preserved through normalization
- [ ] Share URL does NOT include golden response
- [ ] Version restore does NOT alter golden response
- [ ] Existing tests still pass (`npm test`)

---

## 3. Provider-Agnostic Chaining (2-Step Pipe) — DEFERRED

**Priority:** Deferred — requires settings architecture decision first
**Scope:** ~300+ lines across 5+ files
**Risk:** High — crosses the platform abstraction boundary

### Problem

Power users want to pipe output from one provider into another without manual copy-paste.

### Why This Is Deferred

The original spec proposed touching only `usePromptEditor.js`, `platform.js`, and
`App.jsx`. That understates the real scope because **provider settings (API keys, model
selection) are shell-specific and not accessible to the editor hook.**

Current settings architecture:
```
Extension: chrome.runtime.sendMessage → background.js → chrome.storage.local
Desktop:   desktopApi.loadSettings()  → localStorage (pl2-provider-settings)
Web:       desktopApi.loadSettings()  → localStorage (pl2-provider-settings)

platform.js:73   extLoadProviderSettings()  → rejects with "managed through options page"
platform.js:102  desktopLoadProviderSettings() → await loadSettings()
platform.js:158  loadProviderSettings = IS_EXTENSION ? ext... : desktop...
```

To chain across providers, the editor would need to:

1. **Know which providers are configured** — currently, the editor doesn't have
   direct access to provider settings. It calls `callModel(payload)` and the platform
   layer handles routing based on whatever settings are active. There's no API to say
   "call this specific provider with these specific settings."

2. **Override the active provider for step 2** — the `_providerOverride` approach in
   the original spec is too simple. `callModel` dispatches through `platform.js` which
   reads settings from the current shell's storage. A provider override needs the
   platform layer to load the alternate provider's API key and construct the right
   request — not just swap a string.

3. **Expose multi-provider readiness to the UI** — the pipe toggle needs to know
   which providers have valid API keys configured, so it can show available options
   and disable unavailable ones. This requires a new platform API.

### Prerequisite: Shared Settings Query API

Before chaining can work, add to `platform.js`:

```javascript
// New export: returns list of configured providers with their model preferences
export const getConfiguredProviders = IS_EXTENSION
  ? extGetConfiguredProviders   // chrome.runtime.sendMessage query
  : desktopGetConfiguredProviders;  // read from localStorage

// Returns: [{ provider: 'anthropic', model: 'claude-sonnet-4-20250514', hasKey: true }, ...]
```

This API would also benefit the Playbooks feature.

### Minimal Implementation (If Proceeding)

If the settings query API is built, the chaining implementation is:

1. Add `pipeConfig` state to `usePromptEditor.js`
2. After step 1 completes, call `callModel()` with `_providerOverride` + `_modelOverride`
3. Platform layer loads the override provider's settings and dispatches
4. UI shows pipe toggle only when 2+ providers are configured
5. Dual result display in the editor

**Estimated scope with prerequisites:** ~300 lines across `platform.js`, `desktopApi.js`,
`usePromptEditor.js`, `App.jsx`, and potentially `background.js` (extension settings query).

### Do Not Build Until

- [ ] Decision: should settings remain shell-specific, or should a shared settings
  abstraction be created?
- [ ] `getConfiguredProviders()` API implemented in platform.js
- [ ] At least 2 providers configured and tested in the target shell

---

## 4. Team Playbooks (Export/Import Bundles) — DEFERRED

**Priority:** Deferred — depends on Golden Response schema and settings decisions
**Scope:** ~120–160 lines across 3 files (without provider config)
**Risk:** Medium — security model and duplicate detection need redesign

### Problem

Users can't share their prompt setups with teammates. Each person must manually
recreate the same variables, model settings, and prompt structures.

### Why This Is Deferred

**1. Provider config requires the same settings API as Chaining.**
The original spec proposed including provider preferences in playbooks and applying
them on import. But provider settings are shell-specific (see Feature 3 analysis).
Without `getConfiguredProviders()`, the playbook can't meaningfully capture or
apply provider config.

**2. The security validation will false-positive on legitimate content.**
The original spec fails export if the serialized JSON contains `sk-ant-`, `api_key`,
etc. But prompts about security, API integration, or credential management
legitimately contain these strings as content. A prompt titled "How to rotate API
keys" would be blocked from export.

**Fix:** Replace string scanning with structural validation. The whitelist-based
`createPlaybook()` already ensures API keys are never copied (they're simply not
in the field list). The additional string scan is redundant and harmful. Remove it.

**3. Duplicate detection by title alone is too weak.**
Title collisions are common in team contexts ("Code Review", "Summarize"). Better
approach: hash the enhanced content and compare `title + contentHash`. If both match,
it's a true duplicate. If only title matches, prompt the user.

### Minimal Implementation (Without Provider Config)

Ship playbooks without provider config first:

```javascript
export function createPlaybook({ title, description, entries, composerBlocks }) {
  return {
    _format: 'prompt-lab-playbook',
    _version: 1,
    title: title || 'Untitled Playbook',
    description: description || '',
    createdAt: new Date().toISOString(),
    entries: (entries || []).map(entry => ({
      title: entry.title,
      original: entry.original,
      enhanced: entry.enhanced,
      variants: entry.variants || [],
      notes: entry.notes || '',
      tags: entry.tags || [],
      collection: entry.collection || '',
      // No goldenResponse — that's user-specific
    })),
    composerBlocks: (composerBlocks || []).map(block => ({
      label: block.label,
      content: block.content,
    })),
    // No providerConfig until settings API exists
  };
}
```

### Do Not Build Until

- [ ] Golden Response schema is stable (affects what fields to include/exclude)
- [ ] Decision: include provider config in playbooks or not?
- [ ] If yes: `getConfiguredProviders()` API from Feature 3 prerequisite
- [ ] Duplicate detection strategy finalized (title + contentHash)

---

## Implementation Order

```
Sprint 1: Ghost Variables          ← ready now, no blockers
Sprint 2: Golden Response          ← ready after Ghost Variables ships
Sprint 3: Playbooks (minimal)      ← ready after Golden Response schema stabilizes
Sprint 4: Chaining                 ← requires settings API decision first
```

### What's Already Shipped (Do Not Re-implement)

- **Prompt Versioning**: `appendVersionSnapshot()`, `restorePromptVersion()`,
  `getPromptSnapshot()`, FIFO eviction (MAX_PROMPT_VERSIONS), version timeline
  UI with expand/collapse/restore — all live in `promptSchema.js` + `App.jsx`
- **Word Diff**: `wordDiff()` with `showDiff` toggle
- **Eval History**: `evalRuns`, `showEvalHistory`, eval run persistence in IndexedDB
- **Library Import/Export**: JSON blob download + FileReader import + merge
- **URL Sharing**: `encodeShare()` / `decodeShare()` with base64 encoding

### Codex Constraints

When writing Codex prompts for this codebase:

1. All shared frontend code lives in `prompt-lab-extension/src/` — not web, not desktop
2. Platform abstraction via `platform.js` — never inline platform-specific checks
3. Provider logic is in `providers.js` + `providerRegistry.js` — never put provider code in hooks
4. Storage keys are prefixed `pl2-` — follow existing convention
5. 49 tests must pass after changes (`npm test`)
6. Extension manifest has only `storage` + `sidePanel` permissions — no `scripting`
7. Background service worker and React page do NOT share module state
8. `normalizeEntry()` is the single source of truth for prompt schema
