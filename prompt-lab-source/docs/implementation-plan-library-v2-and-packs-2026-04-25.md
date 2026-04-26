# PromptLab — Multi-Track Design Implementation Plan

**Source bundle:** claude.ai/design hash `327NHn16Wwm_WJNt6zfohA` (fetched 2026-04-25)
**Target codebase:** `/Users/daverobertson/Desktop/Code/10-projects/active/prompt-lab/prompt-lab-source`
**Working preview already shipped:** `prompt-lab/html pages/prompt-library-v2.html`

---

## 1. PROJECT SUMMARY

### Objective

Implement three coordinated design tracks from the Claude Design handoff bundle into the shipping PromptLab codebase: **(A)** Library v2 visual refresh with user-selectable tweak axes, **(B)** Prompt Packs distribution feature with a v1 JSON schema and full import/update/uninstall lifecycle, **(C)** Mobile design exploration to inform a future native/PWA decision.

### Key outcomes

- Library v2 visual presets ship as user preferences across extension, desktop, and web shells; the Library reads density/accent/signature from new `pl2-*` keys and falls back to the v2 defaults (`gallery / ink / ticket`) on first run.
- Compact-shell density fallback: when the extension side-panel renders, force `density=default` regardless of the user's saved choice.
- Prompt Packs v1 ships behind a feature flag with: schema validator, importer with labeled error codes, `pl2-loaded-packs` store, Library merge, per-pack enable/disable, manual + URL-based update flow, and uninstall.
- One canonical pack (`promptlab.starter`) authored and dogfooded internally for ≥ 2 weeks before public surfacing.
- Mobile track delivered as a hi-fi clickable prototype + decision memo only. No native build, no shipped surfaces.
- A tested, telemetry-instrumented Library v2 + Packs that does **not** touch the existing `pl2-library` user prompts during pack lifecycle operations.

### Assumptions (resolved without explicit user confirmation)

- Tweaks are user-facing, **free** (not Pro-gated), and persisted to **three separate** storage keys (`pl2-density`, `pl2-accent`, `pl2-signature`). User confirmed user-facing + fallback on 2026-04-25; Pro-gating and key-shape are still open in memory but defaulted free + granular here for forward motion.
- The implementation lives in `prompt-lab-source/prompt-lab-extension/src` (the shared React tree consumed by all three shells).
- Mobile is "Exploratory" per `ROADMAP.md` (confirmed in `chat2.md`). It is **not** a shipping deliverable in this plan; it produces a decision artifact only.
- Telemetry events are PROPOSED names; the analytics owner gets final naming rights before they hit the warehouse.
- Branch off `main` in `prompt-lab-source`. The existing `canonical-tools-restore` branch holds unrelated WIP and is not reused.
- Cross-shell pack sync (Prompt Packs spec §7 open question) is **out of scope** for v1 — packs are per-shell at launch; sync is a follow-up.
- Pack signing (minisign / authorship) is **out of scope** for v1 — checksum integrity only.

---

## 2. PHASED IMPLEMENTATION PLAN

### Phase 0 — Decision lock & branch setup

**Goal:** Resolve two open questions, create the working branch, snapshot the chosen defaults so subsequent phases never re-debate them.

**Key milestones**
- Confirm Library v2 defaults (`gallery / ink / ticket`) by opening `prompt-lab/html pages/prompt-library-v2.html` and toggling.
- Confirm: tweaks ship **free** (not Pro-gated) + **three** storage keys (`pl2-density`, `pl2-accent`, `pl2-signature`).
- Confirm: Prompt Packs ships behind feature flag `prompt-packs-v1`.
- Create branch `feat/library-v2-and-packs` off `main` in `prompt-lab-source`.
- Open a tracking doc at `prompt-lab-source/docs/library-v2-decisions-2026-04.md` with the locked defaults and assumption list.

**Dependencies:** Access to `prompt-lab-source` repo with `main` checked out cleanly.
**Required resources:** `prompt-lab-source` repo, browser to open the preview HTML.
**Estimated timeline:** 0.5 day.
**Owner:** Lead engineer (likely Dave).
**Risks / failure points:** Skipping the Pro-gate / storage-shape decision now creates rework in Phase 2. *Mitigation:* do not start Phase 2 until both are answered in writing.

---

### Phase 1 — Library v2 storage & hook plumbing

**Goal:** Persist tweak prefs and surface them through `usePromptLibrary` so the panel can consume them without changing visuals yet.

**Key milestones**
- Add `pl2-density`, `pl2-accent`, `pl2-signature` keys to the storage layer used by `prompt-lab-extension/src/hooks/usePromptLibrary.js`.
- Hydrate on mount, persist on change, validate against the preset key allowlist (silently discard unknown values for forward-compat).
- Extract `DENSITY` / `ACCENT` / `SIGNATURE` preset tables from the prototype's `tweaks.jsx` into a shared module: `prompt-lab-extension/src/lib/library-tweaks.js`.
- Export `resolveLibraryTweaks(values)` and `DEFAULT_LIBRARY_TWEAKS` from that file.
- Extend tests: `usePromptLibrary.test.jsx` — hydrate-from-storage, ignore-invalid-key, persist-on-change.

**Dependencies:** Phase 0 decisions locked.
**Required resources:** `prompt-lab-source` repo. No new npm deps.
**Estimated timeline:** 1 day.
**Owner:** Lead engineer.
**Risks / failure points:** Storage migration — if `pl2-*` writes are debounced/buffered elsewhere, three new keys may land out-of-order. *Mitigation:* re-use the same write primitive as `pl2-sort-by`; don't invent a new path.

---

### Phase 2 — Library v2 visual port into LibraryPanel.jsx

**Goal:** Replace the hard-coded class strings in the live `LibraryPanel` with references threaded from the resolved tweak bundle, plus the structural additions (gallery grid + inline preview + row-signature wrapper).

**Key milestones**
- `LibraryPanel` accepts a `tw` prop (shape from `resolveLibraryTweaks`).
- Replace hard-coded classes with `tw.density.X` / `tw.accent.X` / `tw.signature.X` references throughout (mechanical sweep).
- Add the gallery branch: `listLayoutClass` switches between flex stack and `grid grid-cols-2` when `d.grid` is true.
- Add inline preview: when `d.showInlinePreview && previewText && !isExpanded`, render the body snippet with `WebkitLineClamp = d.previewLines`.
- Add `rowFrame` wrapper: replace the existing `m.surface + border + rounded-lg` pattern with `s.rowFrame(m, a)`.
- Compact-shell fallback: at the top of `LibraryPanel`, if `compact && tw.density.grid`, call `resolveLibraryTweaks({ ...raw, density: 'default' })` and use that.
- Re-bless any failing snapshot tests; verify behavior tests (`LibraryPanel.test.jsx`, `LibraryPanel.organizing.test.jsx`) still pass green.

**Dependencies:** Phase 1 complete (tw bundle available from the hook).
**Required resources:** `prompt-lab-source` repo, full local test runner.
**Estimated timeline:** 2 days.
**Owner:** Lead engineer (port + tests).
**Risks / failure points:**
- Tag truncation in gallery mode (`entry.tags.slice(0, 3)`) may surprise users with many tags. *Mitigation:* surface "+N more" pill (already in design source at `library-panel.jsx:283`).
- Drag-and-drop interactions in gallery grid mode are untested in the prototype. *Mitigation:* explicitly disable manual sort in gallery; the design source already conditions arrow buttons on `!d.grid`.

---

### Phase 3 — Library v2 settings UI in three shells

**Goal:** Give users a way to change the three tweak axes from each shell's settings surface.

**Key milestones**
- Identify settings entry point per shell (likely the same React tree but different mounts; theme toggle is the closest analog control to mirror).
- Build a "Library appearance" section with three segmented controls (Layout / Palette / Grammar) using the existing settings primitive — **not** the prototype's `twk-seg` styling.
- Web shell: wired via the existing settings page.
- Desktop shell: shares the React tree; verify mount.
- Extension shell: add the section to `options.html` (`prompt-lab-source/prompt-lab-extension/public/options.html`). Side-panel itself is too cramped for the controls.
- Light-theme contrast pass on the Ink accent (slate-on-white risks low contrast for the active-state pill).

**Dependencies:** Phase 2 visuals merged (so the controls have something to mutate).
**Required resources:** `prompt-lab-source` repo. Settings primitives that already exist.
**Estimated timeline:** 2-3 days.
**Owner:** Frontend engineer.
**Risks / failure points:**
- Three shells = three regression surfaces. *Mitigation:* factor the new section as one shared component, render it from each shell's settings shell.
- Discoverability: tweaks live in settings, so first-run users only see the new defaults. Acceptable per Phase 0; reconsider only if telemetry shows zero adoption.

---

### Phase 4 — Library v2 telemetry

**Goal:** Instrument tweak usage so the team can prune unpopular presets later.

**Key milestones**
- Emit (PROPOSED names; rename per analytics owner before warehouse landing):
  - `library_tweak_density_changed   { from, to }`
  - `library_tweak_accent_changed    { from, to }`
  - `library_tweak_signature_changed { from, to }`
- Bump the existing `library_panel_viewed` event (if present) with current `density / accent / signature` properties for steady-state distribution.
- Document the events in `prompt-lab-source/docs/telemetry-events.md` (or wherever the existing event registry lives).

**Dependencies:** Phases 1-3 merged. Settings UI must exist before `_changed` events make sense.
**Required resources:** Existing telemetry pipeline / SDK in PromptLab.
**Estimated timeline:** 0.5 day.
**Owner:** Frontend engineer + analytics owner for naming sign-off.
**Risks / failure points:** Analytics owner renames events post-merge → schema drift. *Mitigation:* get naming sign-off in PR review, not after merge.

---

### Phase 5 — Library v2 QA matrix & ship

**Goal:** Confirm the visual refresh works across all shells, themes, and Pro states without exploding the QA budget.

**Key milestones**
- 6 baseline screens: 3 shells × 2 themes on the chosen defaults.
- 12 density screens: 3 shells × 4 densities (verify the gallery→default fallback fires in extension).
- Accent variants: chosen default only, both themes (Ink in light mode is the highest-risk contrast combo).
- Signature edge cases: ticket in light mode (dashed + mono); manuscript with long titles.
- Pro-locked states: collections off, export off, defaults applied.
- Single PR off `main`, with feature flag `library-visual-v2` if the release process supports it (instant rollback insurance).

**Dependencies:** Phases 1-4 complete.
**Required resources:** All three shells runnable locally (extension dev profile, desktop binary, web dev server).
**Estimated timeline:** 1 day.
**Owner:** Lead engineer + QA.
**Risks / failure points:** A shell-specific layout regression slips past the matrix. *Mitigation:* keep `prompt-lab/html pages/prompt-library-v2.html` as the visual-spec record so any future visual change reproduces in one file before the live port.

---

### Phase 6 — Prompt Packs schema + validator (greenfield, parallel-safe)

**Goal:** Land the v1 pack JSON schema and a strict validator behind a feature flag so authors can begin producing packs against a stable contract.

**Key milestones**
- Add `prompt-lab-source/prompt-lab-extension/src/lib/packs/schema.ts` with the full v1 schema (fields per `Prompt Packs Implementation Pack §2`).
- Add validator returning labeled error codes per §6 of the spec (`E_PACK_NOT_JSON`, `E_PACK_KIND`, `E_PACK_SCHEMA_TOO_NEW`, `E_PACK_COMPAT_TOO_NEW`, `E_PACK_MIN_APP_VERSION`, `E_PACK_MISSING_FIELD`, `E_PACK_BAD_ID`, `E_PACK_BAD_VERSION`, `E_PACK_NO_CATEGORIES`, `E_PACK_NO_PROMPTS`, `E_PACK_BAD_CATEGORY_REF`, `E_PACK_BAD_VARIABLE`; warnings `W_PACK_CHECKSUM`, `W_PACK_UNUSED_VARIABLE`, `W_PACK_UNDECLARED_VARIABLE`).
- Add SHA-256 checksum verification (warn-only, do not block on mismatch).
- Add unit tests covering: every error code, two valid packs (minimal + rich), checksum match/mismatch, undeclared/unused variables.
- Gate runtime behind feature flag `prompt-packs-v1`; default OFF in production, ON for dev.

**Dependencies:** None (greenfield). Can run in parallel with any Library v2 phase.
**Required resources:** `prompt-lab-source` repo. Possibly a small JSON-schema runtime if the project doesn't already have one (Zod / Ajv / hand-rolled — pick what's already in the dep tree, do not add a new one).
**Estimated timeline:** 1.5 days.
**Owner:** Lead engineer or backend-leaning frontend engineer.
**Risks / failure points:** Validator divergence from the spec → packs that pass locally fail when surfaced via update poll. *Mitigation:* spec §6 is the test fixture catalog; treat it as the contract.

---

### Phase 7 — Prompt Packs storage & Library merge

**Goal:** Persist packs to `pl2-loaded-packs` and merge enabled packs' prompts into the Library view without touching `pl2-library`.

**Key milestones**
- Add `pl2-loaded-packs` storage with the `LoadedPacksState` shape from spec §5.1 (`{ schema: 1, packs: { [packId]: { manifest, enabled, installedAt, updatedAt, source, sourceRef?, pinnedVersion?, lastCheckedAt?, lastError? } }, order: string[] }`).
- Extend `usePromptLibrary` so `filtered` prompts include enabled-pack prompts, flagged read-only.
- Composer "Use prompt" path forks a pack prompt into `pl2-library` on first edit (copy-on-write); the source pack remains clean.
- `LibraryPanel` renders pack prompts with a small "from <packName>" hint and a read-only badge. No drag/drop on pack prompts (manual sort applies to the user's own only).
- Soft "also in pack" indicator in the merged view when a user prompt and a pack prompt share a display name.
- Tests: hydrate, enable/disable filter, copy-on-write fork, no-mutation invariant on `pl2-library` during pack lifecycle.

**Dependencies:** Phase 6 (schema + validator).
**Required resources:** `prompt-lab-source` repo.
**Estimated timeline:** 2 days.
**Owner:** Lead engineer.
**Risks / failure points:** Library performance with hundreds of pack prompts. *Mitigation:* derive pack-prompt list memoized on `(pack manifest, enabled)`. Re-evaluate if benchmark exceeds 16ms render at 500 prompts.

---

### Phase 8 — Prompt Packs lifecycle UI (import / enable / update / uninstall)

**Goal:** Surface every lifecycle operation defined in spec §5 with an honest UI.

**Key milestones**
- Import dialog from §5.2: file picker (`.pl2pack.json` / `.json`) + drag-drop onto Library + URL paste / `pl://import?url=…` handler.
- Install dialog showing name, version, author, license, prompt count, category list. Conflict resolution per §5.5 (same / newer / older version).
- Per-pack settings row: enable/disable toggle, "Check for updates", pin to version, uninstall (with the explicit "forked prompts kept" message).
- Update flow: manual + 24h-gated automatic poll on `manifest.updateUrl`. Diff preview (added / removed / renamed / variables changed). MAJOR updates use destructive styling.
- Telemetry (PROPOSED): `pack.imported { packId, version, source }`, `pack.enabled` / `pack.disabled` / `pack.updated` / `pack.uninstalled` `{ packId, version }`.
- Tests: import every error code, enable/disable round-trip, downgrade warning fires, MAJOR vs MINOR update styling.

**Dependencies:** Phase 7 (storage + merge).
**Required resources:** `prompt-lab-source` repo. Existing modal/dialog primitives.
**Estimated timeline:** 2.5 days.
**Owner:** Frontend engineer.
**Risks / failure points:** URL import in extension shell may face Manifest V3 `host_permissions` issues. *Mitigation:* restrict URL import to web/desktop in v1; extension users use file picker only. Document as a known limitation.

---

### Phase 9 — Author canonical promptlab.starter pack & internal dogfood

**Goal:** Validate the schema and lifecycle against a real, shipped pack before public exposure.

**Key milestones**
- Author `promptlab.starter@1.0.0` covering: review, refactor, docs, analysis categories with 8-12 prompts total.
- Host the pack JSON at a stable URL (GitHub Pages, the existing `distribution/` folder, or an internal CDN — reuse what exists, do not add infra).
- Internal team imports the pack via all three shells.
- Two-week soak: collect feedback, file issues against schema gaps or UX issues, do not ship publicly until the soak ends clean.
- Update spec §7 open questions with what the soak revealed about cross-shell sync and signing needs.

**Dependencies:** Phase 8 complete (lifecycle UI usable end-to-end).
**Required resources:** A hosted JSON file. Internal dogfood team (≥ 3 people).
**Estimated timeline:** 2 days authoring + 2 weeks soak (soak is wall-clock, not engineer-effort).
**Owner:** Product / lead engineer.
**Risks / failure points:** Soak surfaces a schema gap that requires `schema=2`. *Mitigation:* this is the whole point of the soak; budget for one schema revision before public GA.

---

### Phase 10 — Mobile design exploration → decision memo

**Goal:** Produce a single decision artifact informing whether/when to invest in a native or PWA PromptLab. **No shipping code in this phase.**

**Key milestones**
- Stand up the prototype as-is from the bundle: `PromptLab Mobile.html` + `prompt-labs-mobile/*.jsx` under `prompt-lab/html pages/` (mirroring how Library v2 was preserved).
- Open the preview, walk all 7 screens (Library, prompt detail, Composer, Streaming, Voice, Pad list, Pad detail) on iOS + Android frames.
- Walk the Tweaks: theme dark/light, accent (violet/teal/amber/mono), type (compact/default/large), cards (flat/outlined/elevated).
- Write decision memo at `prompt-lab-source/docs/mobile-decision-2026-04.md` covering: which screens carry over to native, which don't (Voice / Pad / share-sheet flows are platform-specific), PWA-vs-native cost estimate, go/no-go recommendation, target date for re-evaluation.
- Roadmap status of Mobile remains "Exploratory" unless the memo recommends promotion.

**Dependencies:** None. Can run fully in parallel with all other phases.
**Required resources:** `prompt-lab` repo, browser to open the prototype.
**Estimated timeline:** 1 day.
**Owner:** Product / design.
**Risks / failure points:** Stakeholders read the memo as a commitment to ship. *Mitigation:* header the memo with "Status: PRE-SCOPING" per the `chat2.md` framing.

---

## 3. EXECUTION NOTES

### Critical sequencing constraints

- Phase 0 **must** complete before Phase 1 starts. Do not begin storage work until Pro-gate and key-shape are answered.
- Phases 1 → 2 → 3 → 4 → 5 are strictly sequential within the **Library v2 track** (storage → visuals → settings → telemetry → ship).
- Phases 6 → 7 → 8 → 9 are strictly sequential within the **Prompt Packs track** (schema → storage → UI → dogfood).
- Phase 10 (Mobile) has no dependencies on any other phase.

### Parallelizable work

- Library v2 (Phases 1-5) and Prompt Packs (Phases 6-9) are independent and can run in parallel by two engineers, sharing only the `LibraryPanel` render path. If one engineer is doing both, do Library v2 **first** — it's smaller and de-risks the file before adding pack-prompt rendering.
- Phase 10 (Mobile) is fully parallel; one designer/PM can run it any time.
- Within Prompt Packs: Phase 8 can begin as soon as Phase 7's merge contract is stable; the lifecycle UI does not need full storage internals.

### Quick wins (≤ 1 day each, low risk)

- Phase 0 — decision lock + branch creation.
- Phase 1 — storage + hook plumbing.
- Phase 4 — telemetry events (mechanical wiring once UI exists).
- Phase 10 — mobile decision memo (zero implementation risk).

### Long-lead tasks (multi-day, blocking, or wall-clock-bound)

- Phase 2 — visual port (mechanical but error-prone; touches a 407-line file).
- Phase 8 — lifecycle UI (largest greenfield surface; multiple flows).
- Phase 9 — dogfood soak (2 weeks wall-clock; cannot be compressed).

### Total effort

- Library v2 (Phases 0-5): **~7-9 engineer-days**
- Prompt Packs (Phases 6-9): **~8 engineer-days + 2 wks dogfood soak**
- Mobile (Phase 10): **~1 engineer-day**
- Combined, parallel: **~3 weeks of calendar time** with two engineers.
- Combined, single engineer: **~5-6 weeks of calendar time**.

---

## 4. NEXT ACTIONS

The first 5 concrete, atomic actions to begin execution immediately.

1. Open `prompt-lab/html pages/prompt-library-v2.html` in a browser; spend 15 minutes flipping density/accent/signature combos with real screen height in mind. Write the chosen defaults into a one-paragraph note at `prompt-lab-source/docs/library-v2-decisions-2026-04.md` (create the file).

2. Answer in writing in that same decisions doc: "Are tweaks Pro-gated or free?" (recommended: free) and "One `pl2-tweaks` JSON blob or three keys?" (recommended: three).

3. From inside `/Users/daverobertson/Desktop/Code/10-projects/active/prompt-lab/prompt-lab-source`, run:
   ```
   git checkout main && git pull && git checkout -b feat/library-v2-and-packs
   ```

4. Create `prompt-lab-extension/src/lib/library-tweaks.js` by copy-pasting the `DENSITY`, `ACCENT`, `SIGNATURE` constants and `resolveLibraryTweaks` function from `prompt-lab/html pages/prompt-library-v2.html` (lines defining `const DENSITY` through `function resolveTweaks`). Export them as ESM.

5. Add the three storage keys (`pl2-density`, `pl2-accent`, `pl2-signature`) and a new `useLibraryTweaks()` hook to `prompt-lab-extension/src/hooks/usePromptLibrary.js`. Hydrate on mount, persist on change, validate against the preset key allowlist. Run the existing test suite to confirm no regressions; this is the green-bar checkpoint that opens Phase 2.
