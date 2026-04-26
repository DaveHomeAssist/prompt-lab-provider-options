# Library v2 — Ship Readiness

**Branch:** `feat/library-v2-and-packs`
**Commits (in order):** `7103e56` → `20124b5` → `f564bdb` → `d7e5d4b` (+ test re-bless)
**Status:** Code complete for Phases 0-5 (Library v2). Phase 6+ (Prompt Packs, Mobile) tracked separately.

---

## What ships

A user-facing visual refresh of the Library with three orthogonal preset axes:

- **Density** (`compact` / `default` / `expanded` / `gallery`) — reshapes padding, typography, metadata visibility, and toggles the 2-up grid.
- **Accent** (`violet` / `ink` / `citrus` / `sunset` / `forest`) — retints active states, focus rings, primary buttons, and brand chip.
- **Row signature** (`cards` / `rail` / `ticket` / `manuscript`) — changes the visual grammar of each library row (border style, title font, metadata typography).

First-run defaults: **gallery / ink / ticket**. Persisted to `pl2-density`, `pl2-accent`, `pl2-signature`. User-facing controls live in `SettingsModal` under "Library appearance."

## What changed (file-level)

| File | Phase | Purpose |
|---|---|---|
| `prompt-lab-extension/src/lib/libraryTweaks.js` | 1 | Preset tables (`DENSITY` / `ACCENT` / `SIGNATURE`), validators, `resolveLibraryTweaks`. |
| `prompt-lab-extension/src/lib/storage.js` | 1 | Three new keys: `libraryDensity`, `libraryAccent`, `librarySignature`. |
| `prompt-lab-extension/src/hooks/useLibraryTweaks.js` | 1, 4 | Hook persists each axis independently, optional `onChange(axis, from, to)` for telemetry. |
| `prompt-lab-extension/src/LibraryPanel.jsx` | 2 | Threaded `tw` prop through every visual class. Added gallery grid, inline preview, row-signature wrapper, compact-shell density fallback. |
| `prompt-lab-extension/src/App.jsx` | 2, 4 | Calls `useLibraryTweaks`, passes `tw` to `LibraryPanel`, wires telemetry bridge, bumps `library.prompt_loaded` with axis properties. |
| `prompt-lab-extension/src/modals/SettingsModal.jsx` | 3 | New "Library appearance" section + `TweakSegment` helper. Mirrors the existing density button idiom. |
| `prompt-lab-extension/src/tests/useLibraryTweaks.test.jsx` | 1, 4 | Coverage: defaults, hydrate, ignore-unknown, persist-on-change, onChange contract. |
| `prompt-lab-extension/src/tests/LibraryPanel.test.jsx` | 5 | Re-blessed: passes a baseline `tw` (default/violet/cards) so behavior queries still resolve. |
| `prompt-lab-extension/src/tests/LibraryPanel.organizing.test.jsx` | 5 | Same re-bless. |
| `docs/library-v2-decisions-2026-04.md` | 0 | Locked decisions: free, three keys, fallback. |
| `docs/implementation-plan-library-v2-and-packs-2026-04-25.md` | 0 | Master plan. |
| `docs/telemetry-events-library-v2.md` | 4 | Event reference + warehouse queries + rename protocol. |
| `html pages/prompt-library-v2.html` | 0 | Standalone interactive preview (single-file, all combos). |

## Manual QA matrix (to run before ship)

The automated tests cover behavior on the `default` baseline. The visual matrix below is the human-only verification — the Phase 5 budget is **one engineer-day** for these.

### 1. Three-shell baseline (gallery / ink / ticket on dark)

- [ ] **Web shell** (`promptlab.tools/app/#/library` or local dev) — list renders 2-up, ink slate-900 active states read correctly against gray-900 surface, ticket dashed borders + mono meta visible.
- [ ] **Desktop shell** — same as web (shares React tree). Verify the 1120 px window renders the 2-up grid without overflow.
- [ ] **Extension shell** (Chrome dev profile, side-panel open) — gallery → default fallback fires automatically because `compact=true`. Confirm: stack layout (not grid), default density paddings, ink accent still applied to active chips.

### 2. Theme inversion (light mode)

- [ ] **Web + desktop, light theme** — open settings, flip theme toggle. **Highest-risk combo: ink + light.** Slate-900 active pill on white surface should still read; if contrast is borderline, file a follow-up to add a dedicated light-mode ink variant.
- [ ] **Web + desktop, light theme, ticket signature** — confirm dashed borders are visible (slate-300 on white can disappear; if so, ticket needs a light-mode adjustment).

### 3. Density alternates

- [ ] **Compact** — toolbar collapses to single row, action buttons shrink, tag wall hidden, no toolbar manual-sort hint.
- [ ] **Default** — pre-v2 baseline shape, all metadata visible.
- [ ] **Expanded** — bigger paddings, inline body preview clamped to 2 lines.
- [ ] **Gallery** — 2-up grid with 3-line preview. Tags truncated to 3 + "+N more" pill.

### 4. Accent variants (sample one each, dark + light)

- [ ] Violet, citrus, sunset, forest — verify focus rings, brand chip, primary button, "Use" link color all switch coherently.

### 5. Signature edge cases

- [ ] **Manuscript with long titles** — serif font + truncate behavior intact.
- [ ] **Rail** — accent stripe appears on hover only, dotted dividers hairline.

### 6. Pro-locked states

- [ ] `canUseCollections=false` — collection filter section replaced with the upgrade copy; Unlock link uses the active accent color.
- [ ] `canExportLibrary=false` — Export button shows "Export Pro" with the active subtle accent treatment.

### 7. Settings UI

- [ ] Open Settings, see "Library appearance" section below density.
- [ ] Click each Layout / Palette / Grammar option — Library updates live, no remount, no flicker.
- [ ] Reload — selection persists.
- [ ] DevTools `localStorage` shows the three `pl2-*` keys updating independently.

### 8. Telemetry sanity

- [ ] DevTools network tab: change a tweak axis, observe a `library.tweak_changed` event payload with `axis`, `from`, `to`.
- [ ] No-op (re-click the active option) — no event.
- [ ] Open a saved prompt, observe `library.prompt_loaded` payload now carries `density / accent / signature`.

## Known caveats

1. **Tests not run locally** — pre-existing broken `pathe` install (`node_modules/pathe/dist/` missing) blocks `vitest` startup. CI is the source of truth for green. To repair locally: `cd prompt-lab-source/prompt-lab-extension && npm install` (or just `npm rebuild pathe`). Not done in-band because it changes the dep tree.
2. **`options.html` (extension MV3 settings page) not modified.** Tweak controls live in the runtime `SettingsModal`. If a use case appears for setting tweaks before opening the side-panel, mirror the controls in `options.html` + `options.js` (372 lines, vanilla JS, separate storage IO path).
3. **Telemetry event names are PROPOSED.** Coordinate with the analytics owner before merge per the rename protocol in `docs/telemetry-events-library-v2.md`.
4. **One unrelated 1-line change rode along** in commit `7103e56`: `prompt-lab-source/docs/create-evaluate-restructure-plan.md`. Already-staged before this branch began.

## Rollback plan

If something breaks in production, two reversible levers:

1. **Single-axis revert:** users can change their tweaks in Settings to anything they like. The fallback / FALLBACK_TW path means a buggy preset can be locked off by removing it from the preset table and shipping a hotfix — invalid stored values silently coerce to the default.
2. **Full revert:** `git revert d7e5d4b f564bdb 20124b5 7103e56` rolls all four phases back. The hook stays callable (no consumers if `App.jsx` revert lands), and `LibraryPanel` returns to pre-v2 visuals. Storage keys persist but become orphaned — harmless, will be cleared on next user-driven Settings change.

A feature flag (`library-visual-v2`) was considered but **not** added: the diff is mechanical class-string substitution + additive structural changes, all bounded to one component. Adding a flag would have doubled the render surface area without bounded benefit. Reconsider only if Phase 5 manual QA surfaces shell-specific regressions.

## Sequencing — what's next

- **Phase 5 manual QA** (this doc) — required before merge.
- **Phase 6 (Prompt Packs schema + validator)** — greenfield, parallel-safe with merge of this branch. Can be authored on the same branch or a new one off `main`. The plan recommends same branch since both are "Library distribution" coherent.
- **Phase 10 (Mobile decision memo)** — fully parallel. No dependency on this branch.
