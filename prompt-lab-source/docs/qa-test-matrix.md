# Prompt Lab QA test matrix

## Status

- `active`
- Last updated: `2026-04-22`

## Scope

- Converts `interaction-inventory.md` into an executable QA matrix for the shared frontend.
- Covers shared flows across extension, hosted web app, and desktop, plus platform-specific deltas where behavior diverges.
- Tracks current automation coverage so manual QA effort can focus on the highest-risk unautomated paths.

## Source of truth

- `docs/interaction-inventory.md`
- `docs/CURRENT_MENU_SYSTEM.md`
- `prompt-lab-extension/src/App.jsx`
- `prompt-lab-extension/src/lib/navigationRegistry.js`
- Existing automation references in:
  - `prompt-lab-extension/e2e/extension-smoke.spec.js`
  - `prompt-lab-extension/e2e/responsive-smoke.spec.js`
  - `prompt-lab-extension/tests/desktop-smoke.test.mjs`
  - `prompt-lab-extension/src/tests/*`
  - `prompt-lab-extension/src/__tests__/*`

## Priority and coverage legend

### Priority

- `P0`: ship-blocking core path or data-loss risk
- `P1`: high-value regression risk
- `P2`: secondary workflow, admin flow, or polish

### Coverage

- `Smoke + component`: at least one smoke/E2E path exists plus component, hook, or logic coverage
- `Component / hook`: component, hook, or unit-level automation exists, but no broad smoke path is confirmed
- `Logic only`: low-level utility coverage exists, but the user-visible path still needs manual validation
- `Manual only`: no current automated reference was found during this audit pass

## Matrix

### App shell and navigation

| ID | Scenario | Platforms | Expected result | Priority | Coverage | Automation refs |
|---|---|---|---|---|---|---|
| `QA-NAV-001` | App boot restores view state and resolves canonical route | All | App opens in the expected surface, preserves stored state, and keeps route and nav state aligned | `P0` | `Component / hook` | `navigationRegistry.test.js`, `useNavigation.test.jsx`, `useUiState.test.jsx`, `App.test.jsx` |
| `QA-NAV-002` | Header navigation switches between Create, Library, Evaluate, and Notebook | All | Active section, view content, and contextual controls change without stale state leaking across surfaces | `P0` | `Smoke + component` | `AppHeader.test.jsx`, `App.test.jsx`, `responsive-smoke.spec.js` |
| `QA-NAV-003` | Command palette query, execute, and close flow | All | Query filters commands correctly, action executes, palette closes cleanly, and target state is updated | `P1` | `Component / hook` | `navigationRegistry.test.js`, `App.test.jsx` |
| `QA-NAV-004` | Global shortcuts for enhance, save, command palette, shortcuts, and `Escape` | All | Registered shortcuts fire only in the allowed contexts and `Escape` closes shell-level overlays | `P0` | `Component / hook` | `navigationRegistry.test.js`, `App.test.jsx` |
| `QA-NAV-005` | Theme toggle, density change, and toast feedback survive normal navigation | All | Preferences persist and the shell remains readable across transitions and refreshes | `P1` | `Component / hook` | `useUiState.test.jsx`, `AppHeader.test.jsx` |

### Create, save, and result handling

| ID | Scenario | Platforms | Expected result | Priority | Coverage | Automation refs |
|---|---|---|---|---|---|---|
| `QA-CRT-001` | Raw prompt editing with write/preview switch and lint quick-fix flow | All | Raw text stays intact across preview toggles, lint issues are surfaced, and quick fixes update text and cursor safely | `P1` | `Component / hook` | `EditorActions.test.jsx`, `useExecutionFlow.test.jsx` |
| `QA-CRT-002` | Enhance success path from raw input to parsed result | All | Enhance request starts, loading state appears, result populates, tags and notes parse, and save affordances unlock | `P0` | `Smoke + component` | `extension-smoke.spec.js`, `responsive-smoke.spec.js`, `useExecutionFlow.test.jsx` |
| `QA-CRT-003` | Enhance cancel path during in-flight generation | All | Cancel stops the request, clears transient loading state, and leaves the app usable for the next run | `P0` | `Component / hook` | `useExecutionFlow.test.jsx` |
| `QA-CRT-004` | Enhance error recovery including retry and provider-settings entry point | All | Error UI shows actionable recovery options and retry or settings flow can be started without full reset | `P1` | `Component / hook` | `useExecutionFlow.test.jsx`, `errorTaxonomy.test.mjs` |
| `QA-CRT-005` | PII preflight modal branches: cancel, redact, send anyway | All | Sensitive data gate blocks the unsafe send, exposes all branches, and resumes the correct path afterward | `P0` | `Logic only` | `piiEngine.test.js`, `piiScanner.test.js`, `piiScanner.test.mjs` |
| `QA-CRT-006` | Inline save, full save panel, save-new-version, and save-as-new | All | Save writes the correct library record, versioning behavior is correct, and duplicate save creates a separate prompt | `P0` | `Component / hook` | `usePersistenceFlow.test.jsx`, `usePromptLibrary.test.jsx` |
| `QA-CRT-007` | Result tabs, diff gate, variant use, variant copy, and enhanced-output editing | All | Each result view is reachable when eligible, gated diff opens billing, and variant actions mutate the active result correctly | `P1` | `Component / hook` | `useExecutionFlow.test.jsx`, `App.test.jsx` |
| `QA-CRT-008` | Golden-response pinning, threshold adjustment, and clear flow | All | Golden response pins from current output or run history, threshold updates verdict, and clear removes benchmark state cleanly | `P1` | `Manual only` | `-` |
| `QA-CRT-009` | Inline run-history actions inside Create | All | Create-side run history can expand, copy output, and pin a historical run as the golden response | `P1` | `Manual only` | `-` |

### Library, import/export, and test cases

| ID | Scenario | Platforms | Expected result | Priority | Coverage | Automation refs |
|---|---|---|---|---|---|---|
| `QA-LIB-001` | Search, sort, tag filtering, and collection filtering | All | Filtered library view matches the chosen query and chips, with clear empty-state messaging | `P0` | `Component / hook` | `LibraryPanel.test.jsx`, `libraryMatching.test.js`, `usePromptLibrary.test.jsx` |
| `QA-LIB-002` | Starter-pack loading from empty state or starter cards | All | Starter prompts merge into the library once, report duplicates safely, and update collections | `P1` | `Component / hook` | `usePromptLibrary.test.jsx`, `seedTransform.dedupe.test.js` |
| `QA-LIB-003` | Manual reordering by drag-and-drop and arrow controls | All | Manual sort allows stable reorder operations without losing entries or breaking filters | `P1` | `Component / hook` | `LibraryPanel.organizing.test.jsx`, `usePromptLibrary.test.jsx` |
| `QA-LIB-004` | Inline rename and destructive delete flow | All | Rename persists immediately, delete requires confirmation, and current editor state remains coherent afterward | `P0` | `Component / hook` | `LibraryPanel.test.jsx`, `usePromptLibrary.test.jsx` |
| `QA-LIB-005` | Share-link generation and copy with sensitive-content confirmation | All | Sensitive prompts warn before sharing, share URL copies correctly, and hash-based load can reconstruct the prompt | `P1` | `Component / hook` | `usePersistenceFlow.share.test.jsx`, `usePersistenceFlow.test.jsx` |
| `QA-LIB-006` | Version-history modal selection, diff inspection, and restore | All | Snapshot selection updates the compare panes and restore writes the chosen version after confirmation | `P1` | `Manual only` | `-` |
| `QA-LIB-007` | Library export and library JSON import | All | Exported file is usable, import merges valid entries, and duplicate handling does not corrupt the library | `P0` | `Component / hook` | `usePromptLibrary.test.jsx`, `exportRuns.test.js` |
| `QA-LIB-008` | Preset-pack preview and import workflow | All | JSON validation, duplicate detection, preview, and final merge all behave predictably | `P1` | `Component / hook` | `PresetImportPanel.test.jsx`, `presetImport.test.js` |
| `QA-LIB-009` | Legacy web-library recovery | Hosted web | Recovery bridge imports legacy prompts only when appropriate and reports no-op or failure states clearly | `P1` | `Logic only` | `legacyLibraryMigration.test.js` |
| `QA-LIB-010` | Expanded-card routing into Create, Compose, and A/B Compare | All | Load, add-to-composer, and send-to-A/B actions route the correct prompt text into the target surface | `P0` | `Component / hook` | `usePersistenceFlow.test.jsx`, `ComposerTab.test.jsx`, `useABTest.test.jsx` |
| `QA-TST-001` | Test-case CRUD from library entry cards | All | Add, edit, cancel, and delete case flows keep the correct prompt association and form state | `P1` | `Component / hook` | `useTestCases.test.jsx`, `LibraryPanel.test.jsx` |
| `QA-TST-002` | Single test-case run and verdict badge update | All | Single-case execution records a run, refreshes history, and updates verdict badge state | `P1` | `Component / hook` | `useExecutionFlow.test.jsx`, `useEvalRuns.test.jsx`, `useTestCases.test.jsx` |
| `QA-TST-003` | Batch run-all flow and Pro gate | All | Pro users can run all cases in sequence, free users are routed into billing without broken state | `P0` | `Component / hook` | `useExecutionFlow.test.jsx`, `useBillingState.test.jsx` |

### Compose and Evaluate history

| ID | Scenario | Platforms | Expected result | Priority | Coverage | Automation refs |
|---|---|---|---|---|---|---|
| `QA-CMP-001` | Composer library search, add-block actions, and live preview | All | Filtered blocks remain usable, recommended blocks add correctly, and preview updates immediately | `P1` | `Component / hook` | `ComposerTab.test.jsx` |
| `QA-CMP-002` | Composer reordering, block removal, and clear-all | All | Order changes stay stable, individual removal works, and clear resets the canvas without affecting library data | `P1` | `Component / hook` | `ComposerTab.test.jsx` |
| `QA-CMP-003` | Copy composed prompt and send to editor | All | Combined prompt copies as expected and Create receives the stitched prompt as raw input | `P0` | `Component / hook` | `ComposerTab.test.jsx` |
| `QA-EVL-001` | Evaluate empty-state entry points into Create and Compare | All | Empty-state CTAs open the intended surface and preload the documented starter state when applicable | `P1` | `Component / hook` | `RunTimelinePanel.test.jsx`, `App.test.jsx` |
| `QA-EVL-002` | Timeline filters, reset actions, and load-more flow | All | Timeline filters narrow correctly, reset returns to default, and pagination reveals more runs without duplication | `P1` | `Component / hook` | `RunTimelinePanel.test.jsx`, `useEvalRuns.test.jsx` |
| `QA-EVL-003` | Run-card expansion, output copy, verdict cycling, and notes editing | All | Run-card actions persist through refresh and never mutate the wrong run | `P1` | `Component / hook` | `RunTimelinePanel.test.jsx`, `useEvalRuns.test.jsx` |
| `QA-EVL-004` | Side-by-side compare panel and copy-summary flow | All | Compare selection enforces two-run compare, summary deltas are correct, and copy exports both runs in order | `P1` | `Component / hook` | `RunTimelinePanel.test.jsx` |
| `QA-EVL-005` | Model-comparison toggle and summary blocks | All | Model comparison appears only when supported by current data and shows the latest run per model | `P2` | `Manual only` | `-` |

### A/B Compare

| ID | Scenario | Platforms | Expected result | Priority | Coverage | Automation refs |
|---|---|---|---|---|---|---|
| `QA-AB-001` | Populate variants, run both, and inspect successful outputs | All | Both variants execute independently, successful outputs render, and compact mode keeps side switching usable | `P0` | `Component / hook` | `useABTest.test.jsx`, `responsive-smoke.spec.js` |
| `QA-AB-002` | Run a single side and retry a failed side | All | Single-side runs do not corrupt the opposite side and retry only affects the failing side | `P1` | `Component / hook` | `useABTest.test.jsx` |
| `QA-AB-003` | Pick winner and persist experiment history | All | Winning selection records an experiment and the history panel reflects the saved outcome | `P1` | `Component / hook` | `useABTest.test.jsx`, `experimentHistory.test.mjs` |
| `QA-AB-004` | Sync diff modal open, inspect, copy, and close | All | Diff opens only when both outputs are ready, copy exports markdown diff, and close paths all work | `P1` | `Manual only` | `-` |
| `QA-AB-005` | Compare-view Pro gate from navigation and empty-state entry points | All | Free users are routed into billing and Pro users reach the Compare surface directly | `P0` | `Component / hook` | `useBillingState.test.jsx`, `App.test.jsx` |

### Notebook, settings, billing, and utilities

| ID | Scenario | Platforms | Expected result | Priority | Coverage | Automation refs |
|---|---|---|---|---|---|---|
| `QA-PAD-001` | Pad migration and autosave lifecycle | All | Legacy data migrates safely, autosave updates timestamps, and unload/visibility flushes prevent data loss | `P0` | `Component / hook` | `padShortcuts.test.js`, `responsive-smoke.spec.js` |
| `QA-PAD-002` | Create, switch, rename, and delete multi-pad records | All | Pad list stays consistent, active-pad changes are respected, and delete requires confirmation | `P1` | `Manual only` | `-` |
| `QA-PAD-003` | Formatting helpers and scratchpad shortcuts | All | Toolbar helpers insert the correct text fragments and keyboard shortcuts invoke the expected actions | `P1` | `Component / hook` | `padShortcuts.test.js` |
| `QA-PAD-004` | Export, copy, clear, and promote pad to editor | All | Pad can be downloaded, copied, cleared, and routed into Create without losing content prematurely | `P1` | `Manual only` | `-` |
| `QA-SET-001` | Settings modal for notes, density, telemetry, collection management, import/export, and clear-all | All | Settings mutate the intended state only, destructive actions confirm first, and gated actions route correctly | `P1` | `Component / hook` | `useBillingState.test.jsx`, `usePromptLibrary.test.jsx` |
| `QA-BILL-001` | Billing modal for checkout, portal, sync, refresh, and local deactivation | All | Billing modal preserves local state correctly across success and failure paths and exposes meaningful error feedback | `P0` | `Component / hook` | `useBillingState.test.jsx`, `billing.test.js` |
| `QA-BUG-001` | Bug-report submission with and without prompt context | All | Bug report payload includes environment context, honors the prompt-context checkbox, and handles submit failure cleanly | `P1` | `Logic only` | `bugReporter.test.js` |
| `QA-PRV-001` | Provider settings for desktop and hosted-web provider constraints | Desktop, hosted web | Desktop provider settings save and test correctly, Ollama model refresh works, and hosted web remains locked to Anthropic semantics | `P1` | `Component / hook` | `providerSettings.test.jsx`, `providers.test.js`, `desktop-smoke.test.mjs` |
| `QA-ERR-001` | Error boundary recovery path | All | Uncaught failure shows fallback UI, reload is available, and error details expand without crashing again | `P2` | `Manual only` | `-` |

### Platform-specific smoke and delta checks

| ID | Scenario | Platforms | Expected result | Priority | Coverage | Automation refs |
|---|---|---|---|---|---|---|
| `QA-PLT-001` | Extension smoke flow across supported viewports | Extension, compact | Core editor, library, notebook, and A/B surfaces remain usable in desktop and mobile-like viewport sizes | `P0` | `Smoke + component` | `responsive-smoke.spec.js`, `extension-smoke.spec.js` |
| `QA-PLT-002` | Hosted web delta checks for legacy recovery, hosted scrolling, and billing-linked restrictions | Hosted web | Hosted web exposes only the intended web-only actions and preserves web-specific provider and recovery rules | `P1` | `Manual only` | `-` |
| `QA-PLT-003` | Desktop-only local persistence and `pl:open-settings` event path | Desktop | Desktop shell uses local persistence and opens provider settings in response to the platform event | `P1` | `Smoke + component` | `desktop-smoke.test.mjs`, `providerSettings.test.jsx` |

## Recommended execution order

1. Run every `P0` row on the target release surface.
2. Run `P1` rows that match the changed area, plus all `P1` rows still marked `Manual only`.
3. Run platform-specific rows for any surface included in the release.
4. If a regression touches routing, billing gates, or persistence, rerun the full `App shell`, `Create`, `Library`, and `Notebook` suites.

## Current automation coverage gaps

- `Manual only` gaps are concentrated in:
  - golden benchmark UI
  - version-history restore UI
  - A/B diff modal
  - multi-pad management UI
  - bug-report modal UX
  - hosted-web-only delta checks
  - error-boundary recovery
- `Logic only` rows still need user-visible end-to-end coverage for:
  - PII gate behavior
  - legacy-library recovery
  - bug-report submission flow
- Highest-value next automation candidates:
  - save/version/golden workflow
  - version-history restore
  - A/B diff modal
  - hosted web billing gates and legacy recovery

## Verification

- Built directly from `docs/interaction-inventory.md`.
- Cross-checked against the current smoke, component, hook, and unit test files under `prompt-lab-extension/`.
- Coverage labels reflect only automation references confirmed during this pass.
