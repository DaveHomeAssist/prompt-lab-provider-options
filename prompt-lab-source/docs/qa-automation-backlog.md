# Prompt Lab QA automation backlog

## Status

- `active`
- Last updated: `2026-04-22`

## Scope

- Converts the `Manual only` `P0` and `P1` rows from `docs/qa-test-matrix.md` into implementation-ready automation tasks.
- Assigns each backlog item to `Playwright`, `Vitest`, or a staged combination when the fastest path is layered coverage.
- Focuses on the current gaps in the shared frontend under `prompt-lab-extension/`.

## Source of truth

- `docs/qa-test-matrix.md`
- `docs/interaction-inventory.md`
- Existing test structure under:
  - `prompt-lab-extension/e2e/`
  - `prompt-lab-extension/src/tests/`
  - `prompt-lab-extension/src/__tests__/`
  - `prompt-lab-extension/tests/`

## Current behavior

- There are currently **no** `P0` rows in `docs/qa-test-matrix.md` that are still marked `Manual only`.
- This backlog therefore covers the remaining `P1` manual-only scenarios:
  - `QA-CRT-008`
  - `QA-CRT-009`
  - `QA-LIB-006`
  - `QA-AB-004`
  - `QA-PAD-002`
  - `QA-PAD-004`
  - `QA-PLT-002`

## Backlog

| Backlog ID | Source QA row | Harness | Proposed target files | Why this harness | Dependencies |
|---|---|---|---|---|---|
| `AUTO-001` | `QA-CRT-008` | `Playwright` | `prompt-lab-extension/e2e/create-golden-benchmark.spec.js` | Golden pinning and threshold behavior are stateful, gated on saved-prompt context, and easiest to verify as a real UI flow | shared mocked model-response helper; saved-library fixture |
| `AUTO-002` | `QA-CRT-009` | `Playwright` | `prompt-lab-extension/e2e/create-run-history.spec.js` | Create-side run history is a multi-step interaction spanning generate, save, rerender, expand, copy, and pin-from-history | same helper and fixture set as `AUTO-001` |
| `AUTO-003` | `QA-LIB-006` | `Vitest` then `Playwright` | `prompt-lab-extension/src/tests/VersionDiffModal.test.jsx`, `prompt-lab-extension/e2e/library-version-restore.spec.js` | Modal rendering and callback safety are fast in component tests, but actual restore behavior still needs app-level proof | versioned-library seed fixture; `window.confirm` mocking strategy |
| `AUTO-004` | `QA-AB-004` | `Vitest` then `Playwright` | `prompt-lab-extension/src/tests/DiffPane.test.jsx`, `prompt-lab-extension/e2e/ab-diff.spec.js` | Diff rendering and copy are easy to isolate in `Vitest`, while the open gate belongs to the full A/B flow | clipboard spy helper; mocked dual-response helper |
| `AUTO-005` | `QA-PAD-002` | `Vitest` | `prompt-lab-extension/src/tests/PadTab.pads.test.jsx` | Multi-pad CRUD depends heavily on `prompt`, `confirm`, and localStorage semantics that are fast to cover in jsdom | reusable localStorage seed and `window.prompt` / `window.confirm` mocks |
| `AUTO-006` | `QA-PAD-004` | `Vitest` then `Playwright` | `prompt-lab-extension/src/tests/PadTab.actions.test.jsx`, `prompt-lab-extension/e2e/pad-promote-to-editor.spec.js` | Export/copy/clear are isolated browser API behaviors, but promote-to-editor is a cross-surface workflow | clipboard and download stubs; editor handoff helper |
| `AUTO-007` | `QA-PLT-002` | `Playwright` | `prompt-lab-extension/e2e-web/hosted-web-smoke.spec.js`, `prompt-lab-extension/playwright.web.config.js` | Hosted web deltas need a dedicated browser harness rather than the current extension-only Playwright setup | local hosted-web server target; hosted-web mock strategy; billing gate seed state |

## Item details

### `AUTO-001` Create golden benchmark

- Source row: `QA-CRT-008`
- Goal:
  - prove pin-from-current-output works
  - prove threshold changes affect verdict state
  - prove clear removes the benchmark and related UI
- Proposed setup:
  - launch the extension shell with mocked model responses, following the existing smoke-test pattern
  - enter a prompt and run enhance
  - save the prompt to the library so `editingId` exists
- Required assertions:
  - `Pin Golden` appears only when a saved prompt is active
  - clicking `Pin Golden` creates the benchmark panel
  - threshold slider changes the displayed percentage threshold and pass/fail verdict
  - clearing the benchmark removes the panel and action state cleanly
- Suggested implementation notes:
  - reuse the current `chrome.runtime.sendMessage` mock pattern from `extension-smoke.spec.js`
  - keep benchmark text deterministic so similarity thresholds are stable

### `AUTO-002` Create inline run-history actions

- Source row: `QA-CRT-009`
- Goal:
  - cover the Create-side run-history accordion and its per-run actions
- Proposed setup:
  - same core setup as `AUTO-001`
  - generate at least one persisted eval run for the active prompt
- Required assertions:
  - run-history panel expands and collapses
  - copy action is available for a historical run
  - pin-from-history routes the selected run output into the golden benchmark state
  - the pin source reflects the historical run instead of the current output
- Suggested implementation notes:
  - this can share setup helpers with `AUTO-001`
  - if setup cost is high, keep this as a second test in the same spec file rather than a separate harness

### `AUTO-003` Library version-history restore

- Source row: `QA-LIB-006`
- Goal:
  - cover snapshot selection, diff rendering, and actual restore behavior
- Stage 1, `Vitest` component coverage:
  - target file: `prompt-lab-extension/src/tests/VersionDiffModal.test.jsx`
  - assert modal renders selected snapshot and current snapshot content correctly
  - assert snapshot selection changes visible content panes
  - assert restore button calls the expected callback only after confirmation
- Stage 2, `Playwright` flow coverage:
  - target file: `prompt-lab-extension/e2e/library-version-restore.spec.js`
  - seed a versioned entry directly into localStorage
  - open the modal from Library
  - restore an older version
  - confirm the editor or library view reflects the restored snapshot afterward
- Suggested implementation notes:
  - seed version history directly instead of manufacturing versions through many UI saves
  - stub `window.confirm` in Playwright before triggering restore

### `AUTO-004` A/B diff modal

- Source row: `QA-AB-004`
- Goal:
  - prove the diff modal opens only when both responses are ready and that copy/close paths work
- Stage 1, `Vitest` component coverage:
  - target file: `prompt-lab-extension/src/tests/DiffPane.test.jsx`
  - render `DiffPane` with known `textA` and `textB`
  - assert scroll-lock toggle state changes
  - assert markdown-copy callback receives a diff payload
  - assert close button and `Escape` invoke `onClose`
- Stage 2, `Playwright` integration:
  - target file: `prompt-lab-extension/e2e/ab-diff.spec.js`
  - use deterministic A/B mocked responses
  - assert `Sync View` stays disabled until both variants have successful responses
  - assert opening the modal shows both sides and allows close
- Suggested implementation notes:
  - keep copy verification in `Vitest`; verify button visibility and open gating in `Playwright`

### `AUTO-005` Multi-pad CRUD

- Source row: `QA-PAD-002`
- Goal:
  - cover create, switch, rename, and delete flows for multi-pad storage
- Proposed `Vitest` target:
  - `prompt-lab-extension/src/tests/PadTab.pads.test.jsx`
- Required assertions:
  - creating a pad appends a new pad and activates it
  - switching pads updates the visible content
  - renaming updates the active pad label and persisted storage
  - deleting the active pad selects a valid fallback pad and does not delete the final remaining pad
- Suggested implementation notes:
  - mock `window.prompt` and `window.confirm`
  - inspect `pl2-pads` localStorage after each action to confirm persistence, not just UI labels

### `AUTO-006` Pad export/copy/clear/promote

- Source row: `QA-PAD-004`
- Goal:
  - cover scratchpad utility actions and the cross-surface promote flow
- Stage 1, `Vitest` component coverage:
  - target file: `prompt-lab-extension/src/tests/PadTab.actions.test.jsx`
  - assert copy uses clipboard or fallback path
  - assert export creates a download link with the expected filename shape
  - assert clear wipes the active pad after confirmation
- Stage 2, `Playwright` flow coverage:
  - target file: `prompt-lab-extension/e2e/pad-promote-to-editor.spec.js`
  - enter pad content
  - trigger promote-to-library/editor
  - assert Create opens with raw and enhanced content loaded and save affordances visible
- Suggested implementation notes:
  - keep download assertions shallow in browser automation and verify filename construction in `Vitest`
  - reuse extension launch helpers from existing smoke tests

### `AUTO-007` Hosted web delta coverage

- Source row: `QA-PLT-002`
- Goal:
  - cover hosted-web-only behavior that the current extension harness cannot see
- Proposed `Playwright` targets:
  - `prompt-lab-extension/e2e-web/hosted-web-smoke.spec.js`
  - `prompt-lab-extension/playwright.web.config.js`
- Required assertions:
  - hosted web uses scrolling and layout behavior intended for the web surface
  - hosted provider settings remain locked to Anthropic semantics
  - hosted web exposes legacy-library recovery when conditions match
  - gated billing actions route into the billing modal instead of failing silently
- Suggested implementation notes:
  - do not overload the existing extension Playwright config
  - add a separate web config with a `webServer` entry that starts the hosted app target
  - seed billing and library states through localStorage or boot-time fixtures
- Known dependency:
  - this item needs a deliberate decision about which local hosted-web entry point is canonical for Playwright, because the current config is extension-only

## Suggested implementation order

1. `AUTO-001` and `AUTO-002`
   - highest-value Create regressions
   - shared setup reduces total cost
2. `AUTO-003`
   - closes a high-risk restore path with both modal and app-level coverage
3. `AUTO-004`
   - finishes the missing A/B Compare proof path
4. `AUTO-005` and `AUTO-006`
   - rounds out Notebook coverage with a fast `Vitest` layer first
5. `AUTO-007`
   - highest setup cost, because it introduces a hosted-web browser harness

## Known gaps

- `P2` manual-only rows remain intentionally out of scope for this backlog.
- `Logic only` rows from `qa-test-matrix.md` are not included here because they already have some automation and need a different prioritization pass.
- Hosted web automation still needs a canonical local launch target before `AUTO-007` can be implemented cleanly.

## Verification

- Cross-checked against the current `Manual only` rows in `docs/qa-test-matrix.md`.
- Backlog items map only to `P1` rows because there are no remaining `P0` manual-only rows at the time of writing.
- Target file names match the repo’s current `Playwright` and `Vitest` naming patterns.
