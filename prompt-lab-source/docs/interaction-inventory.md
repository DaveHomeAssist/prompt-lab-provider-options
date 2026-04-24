# Prompt Lab interaction inventory

## Status

- `active`
- Last verified: `2026-04-22`

## Scope

- Covers user-triggered interactions in the shared frontend under `prompt-lab-extension/src/`.
- Includes routes, keyboard shortcuts, drag and drop, modal flows, feature gates, confirm dialogs, and workflow branches that change user-visible state.
- Excludes passive display-only wrappers unless they expose a control or state transition.

## Source of truth

- App shell and modal orchestration: `prompt-lab-extension/src/App.jsx`
- Navigation, routes, shortcuts, and command palette: `prompt-lab-extension/src/lib/navigationRegistry.js`
- View-state wrappers: `prompt-lab-extension/src/hooks/useNavigation.js`, `prompt-lab-extension/src/hooks/useUiState.js`
- Create workflows: `prompt-lab-extension/src/CreateEditorPane.jsx`, `prompt-lab-extension/src/EditorActions.jsx`, `prompt-lab-extension/src/hooks/useExecutionFlow.js`, `prompt-lab-extension/src/hooks/usePersistenceFlow.js`, `prompt-lab-extension/src/hooks/useEditorState.js`
- Library workflows: `prompt-lab-extension/src/LibraryPanel.jsx`, `prompt-lab-extension/src/PresetImportPanel.jsx`, `prompt-lab-extension/src/TestCasesPanel.jsx`, `prompt-lab-extension/src/VersionDiffModal.jsx`, `prompt-lab-extension/src/hooks/usePromptLibrary.js`
- Evaluate workflows: `prompt-lab-extension/src/RunTimelinePanel.jsx`, `prompt-lab-extension/src/ABTestTab.jsx`, `prompt-lab-extension/src/DiffPane.jsx`, `prompt-lab-extension/src/hooks/useEvalRuns.js`, `prompt-lab-extension/src/hooks/useABTest.js`
- Notebook workflows: `prompt-lab-extension/src/PadTab.jsx`, `prompt-lab-extension/src/lib/padShortcuts.js`
- Billing, settings, and secondary dialogs: `prompt-lab-extension/src/modals/*.jsx`, `prompt-lab-extension/src/BugReportModal.jsx`, `prompt-lab-extension/src/DesktopSettingsModal.jsx`, `prompt-lab-extension/src/ErrorBoundary.jsx`

## Global interaction model

### Views and routes

| UI surface | State mapping | Canonical route | Entry points |
|---|---|---|---|
| Create / Write | `primaryView=create`, `workspaceView=editor`, `tab=editor` | `/` | Header, command palette, route sync, quick start |
| Create / Library | `primaryView=create`, `workspaceView=library`, `tab=editor` | `/library` | Header, command palette, route sync |
| Create / Compose | `primaryView=create`, `workspaceView=composer`, `tab=composer` | `/composer` | Header, command palette, route sync |
| Evaluate / History | `primaryView=runs`, `runsView=history`, `tab=history` | `/evaluate` | Header, command palette, route sync |
| Evaluate / Compare | `primaryView=runs`, `runsView=compare`, `tab=abtest` | `/compare` | Header, command palette, route sync, empty-state CTA |
| Notebook | `primaryView=notebook`, `tab=pad` | `/pad` | Header button, command palette, route sync |

### Global shortcuts

| Shortcut | Action | Notes |
|---|---|---|
| `Cmd/Ctrl+Enter` | Enhance prompt | Available from the app shell when input exists and enhance is not already running |
| `Cmd/Ctrl+S` | Save | Opens the save panel when closed, commits save when the panel is already open |
| `Cmd/Ctrl+K` | Toggle command palette | Clears the current command query when opened |
| `?` | Toggle shortcuts modal | Disabled while focus is in `input` or `textarea` |
| `Escape` | Close shell-level overlays | Closes command palette, shortcuts, settings, bug report, save panel, share link strip, and version history |
| `Cmd/Ctrl+E` | Export scratchpad | Scratchpad only |
| `Cmd/Ctrl+Shift+D` | Insert date separator | Scratchpad only |
| `Cmd/Ctrl+Shift+C` | Copy scratchpad contents | Scratchpad only |
| `Cmd/Ctrl+Shift+X` | Clear scratchpad | Scratchpad only |

### Cross-surface mechanics

- Overlay click closes `CommandPaletteModal`, `ShortcutsModal`, `SettingsModal`, `BillingModal`, `BugReportModal`, `VersionDiffModal`, and `DesktopSettingsModal`.
- `VersionDiffModal` and `DiffPane` also listen for `Escape` directly.
- `TagChip` supports click and keyboard activation with `Enter` or `Space` when used as a filter or selector.
- Confirm dialogs guard destructive or sensitive actions:
  - delete prompt
  - delete test case
  - delete pad
  - clear pad
  - clear library
  - restore old prompt version
  - export potentially sensitive library data
  - create a share link for potentially sensitive prompt data
- Clipboard flows exist for prompt text, run output, diff markdown, share URLs, composed prompts, and scratchpad contents.
- File I/O flows exist for library export/import, preset-pack import, and scratchpad export.
- Local persistence exists for library state, collections, sort mode, billing state, UI preferences, scratchpad state, and last session editor state.
- Feature gates can interrupt normal workflows and open the billing modal for `collections`, `export`, `batchRuns`, `diffView`, and `abTesting`.

## Component inventory

### Global shell and shared dialogs

- `AppHeader`: open billing; open command palette; toggle theme; open shortcuts; open settings; switch top-level sections (`Create`, `Library`, `Evaluate`); open `Notebook`; switch Evaluate subviews (`History`, `Compare`); switch Create subviews (`Write`, `Compose`); switch editor layout options when exposed.
- `CommandPaletteModal`: type a query; filter commands live; execute any visible action; close by overlay or `Escape`.
- `ShortcutsModal`: review shortcuts; close by overlay or close button.
- `SettingsModal`: toggle enhancement notes; change density; open billing; toggle telemetry; edit contact email; save telemetry preferences; delete collections; open provider/options settings; open bug report; export library or trigger export gate; import library JSON; clear all prompts after confirmation; close by overlay or close button.
- `BillingModal`: start monthly checkout; start annual checkout; open purchase-management portal; edit billing/access email; sync purchase or device access; refresh billing status; clear local access; close by overlay or close button.
- `SavePanel`: edit title; choose collection; open new-collection flow; type new collection name; commit new collection with button or `Enter`; cancel new collection with `Escape`; toggle tags; add change note when versioning; save current prompt; save as new prompt; request collections upgrade when gated; close by button or global `Escape`.
- `TemplateVariablesModal`: edit freeform variable values; choose select-backed variable values; apply the resolved template; skip variable substitution; close with explicit close button.
- `PiiWarningModal`: review detected sensitive snippets; redact and send; send anyway; cancel or close.
- `BugReportModal`: close by overlay or close button; edit title, severity, contact, steps, expected result, actual result; toggle inclusion of current prompt context; submit bug report to Notion; silently populate a honeypot field if abused.
- `DesktopSettingsModal`: select provider; edit provider-specific API keys and model fields; refresh Ollama models; select an Ollama model from the discovered list; test provider connection; save provider settings; close by overlay or close button.
- `VersionDiffModal`: close by overlay, button, or `Escape`; select a saved snapshot; inspect selected snapshot vs current snapshot; restore the selected version after confirmation.
- `DiffPane`: close by overlay, button, or `Escape`; toggle scroll lock between panes; copy the diff as Markdown.
- `ErrorBoundary`: reload the entire panel; open the GitHub issues page; expand error details.

### Create surface

- `CreateEditorPane`: open library section from the context breadcrumb; open library details from the context breadcrumb; load a recent prompt chip; copy a quick-inject entry; load a quick-inject entry; switch raw prompt input between `Write` and `Preview`; type/edit the raw prompt; update cursor state on selection, click, and key-up; toggle the lint panel; run lint quick fixes; choose an enhance mode; enhance; cancel enhancement; run all test cases; open the save panel; reset the draft; retry after execution error; open provider settings from execution error; switch result tabs (`Improved`, `Diff`, `Variants`, `Notes`); toggle improved-output preview vs editable text; pin the current output as the golden response; copy the current output; open billing to unlock diff; edit the inline save title; quick-save from the inline save bar; open the full save panel from the inline save bar; edit the enhanced result manually; use a generated variant as the active enhanced result; copy a generated variant; toggle run-history visibility; copy an older run output; pin an older run output as the golden response.
- `EditorActions`: choose the enhancement mode; enhance; cancel enhancement; run test cases; save to library; clear the draft.
- `GoldenBenchmark` inside `CreateEditorPane`: collapse or expand the benchmark panel; clear the pinned golden response; adjust the pass threshold slider; inspect the live similarity bar; inspect the word diff against the current enhanced output or latest run output.

### Library surface

- `LibraryPanel`: type in search; clear search by deleting text; change sort mode; export library or open billing when gated; recover legacy web library; open and close the preset-pack import panel; toggle collection filters; toggle tag filters; clear filters from the empty state; load starter packs from empty state or starter-pack cards; drag and drop prompt cards to reorder in manual mode; move cards up or down with arrow buttons in manual mode; open inline rename mode; save or cancel a rename; load a prompt into the editor; copy a prompt; expand or collapse the prompt card details; generate and reveal a share URL after sensitivity confirmation; copy a share URL; open save details for an entry; add an entry to Compose; send an entry to A/B side `A`; send an entry to A/B side `B`; open version history; delete a prompt after confirmation; inspect original, enhanced, notes, and variants in the expanded card; view saved draft status metadata.
- `PresetImportPanel`: choose a JSON file; close and clear the current draft import; drag-enter, drag-over, drag-leave, and drop a preset pack; paste or type JSON manually; review parse errors; review validation errors and warnings; inspect duplicate and empty-prompt summaries; review preview cards; start the import when validation passes.
- `TestCasesPanel`: open the case form; cancel the case form; edit case title; edit representative input; edit expected traits; edit expected exclusions; edit case notes; save a new case; update an existing case; edit an existing case; load a case into the editor; run a single case; delete a case after confirmation.
- `TagChip` in the library: toggle a tag filter with click; toggle a tag filter with `Enter` or `Space`.

### Compose surface

- `ComposerTab`: search the library; clear the library search query; add a library entry to the canvas; drag a library entry into the canvas; switch compact/mobile subviews between `Library`, `Canvas`, and `Preview`; drag and drop composer blocks to reorder them; move blocks up and down with explicit buttons; remove a block; copy the composed prompt; send the composed prompt to the editor; clear the entire canvas; inspect the live combined preview.

### Evaluate history surface

- `RunTimelinePanel`: filter runs by mode, provider, model, status, date range, and search term; toggle model comparison; reset filters; retry loading after an error; select and deselect runs for side-by-side compare; expand and collapse long run output; cycle verdict state through `unrated`, `pass`, `fail`, and `mixed`; copy run output; open note editing; save notes on blur or `Enter`; close the compare panel; copy the compare summary; quick-start into Create from the empty state; open Compare from the empty state; reset all filters from the no-match state; load more runs.
- `RunCard` inside `RunTimelinePanel`: toggle full output expansion; cycle verdict; toggle compare selection; copy output; open note editing; save notes on blur or `Enter`.
- `ComparePanel` inside `RunTimelinePanel`: close the panel; inspect output, latency, and golden deltas; copy a text summary of both runs.

### Evaluate compare surface

- `ABTestTab`: run both variants at once; open the sync diff view when both variants succeed; reset the entire A/B state; switch active side in compact mode; edit variant `A` prompt text; edit variant `B` prompt text; run one side only; pick the winning side; retry a failed side; copy a successful response; toggle recent A/B runs; toggle saved experiment history.
- `DiffPane` from A/B compare: toggle scroll lock; copy the diff as Markdown; close by overlay, button, or `Escape`.

### Notebook surface

- `PadTab`: create a new pad; switch pads; rename the active pad; delete the active pad after confirmation; type and autosave; promote the current pad into the editor/library flow; insert a date separator; export pad text; copy all pad text; clear the active pad after confirmation; insert a heading; insert a bullet list prefix; insert a numbered-list prefix; insert a fenced code block; insert a quote prefix.
- `PadTab` keyboard-only flows: export with `Cmd/Ctrl+E`; insert date with `Cmd/Ctrl+Shift+D`; copy all with `Cmd/Ctrl+Shift+C`; clear with `Cmd/Ctrl+Shift+X`.
- `PadTab` background persistence flows: migrate legacy pad storage on first load; flush pending writes on inactivity, on tab hide, on window unload, and on component unmount.

### Layout-only or passive components

- `MainWorkspace`: no direct interaction, only conditional two-pane layout.
- `MarkdownPreview`: passive render only.
- `Toast`: passive notification only.
- `DraftBadge`, `GoldenTrendBar`, and `ModelComparisonView`: passive indicators only.

## Workflow inventory

### 1. App boot, restore, and route resolution

1. Initialize UI preferences, billing state, telemetry state, library state, and editor/session state.
2. Derive the active tab from `primaryView`, `workspaceView`, and `runsView`.
3. Sync the URL hash route into navigation state and sync navigation state back into the canonical route.
4. Load a shared prompt when `#share=` is present, normalize it, place it in the editor state, and open the save flow.
5. On hosted web, optionally attempt legacy-library recovery when the current library is empty or seed-only.
6. Revalidate billing in the background when a stored billing identity is old enough to require refresh.

### 2. Navigate between primary surfaces

1. User navigates by header tabs, notebook toggle, command palette, route change, or workflow CTA.
2. `useNavigation` maps the request to `primaryView`, `workspaceView`, and `runsView`.
3. The derived `tab` selects the rendered surface:
   - `editor`
   - `composer`
   - `history`
   - `abtest`
   - `pad`
4. In compact mode, the Create split layout collapses back to the editor pane.

### 3. Create, enhance, and post-run handling

1. User enters raw prompt text directly, loads a library entry, loads a recent prompt, or sends a composed prompt into Create.
2. User starts enhance from the main button, keyboard shortcut, or command palette.
3. Prompt Lab builds a model payload from the active mode.
4. If sensitive data is detected before send, the run is blocked and `PiiWarningModal` offers:
   - cancel
   - redact and send
   - send anyway
5. During execution, the UI shows loading and optionally streaming preview.
6. On success, Prompt Lab:
   - parses enhanced output, variants, notes, assumptions, and tags
   - suggests a title
   - saves an eval run
   - reveals save actions
7. On failure, the error panel offers retry and, when relevant, provider settings.
8. User can then edit the output, switch result tabs, pin a golden response, or save to the library.

### 4. Save, version, and duplicate

1. Save can start from inline save, the full save panel, `Cmd/Ctrl+S`, or the command palette.
2. If the current prompt already exists in the library, the default save path creates a new version.
3. `SavePanel` lets the user change title, tags, collection, and version change note.
4. Users can create a new collection inline when collections are allowed.
5. If collections are gated, the panel preserves the save but strips the collection and offers an upgrade path.
6. `Save as New Prompt` writes a separate library entry instead of a new version.

### 5. Load prompts, share links, and template variable resolution

1. A prompt can be loaded from the library, recent chips, quick inject, or a share URL.
2. `usePersistenceFlow` normalizes the entry and checks for template variables.
3. Ghost variables are auto-resolved first.
4. If manual template variables remain, `TemplateVariablesModal` interrupts the load.
5. The user can fill variables and apply the resolved prompt, or skip substitution and load the raw template.
6. Loaded entries can target:
   - the editor
   - A/B side `A`
   - A/B side `B`

### 6. Library organization, import, export, and recovery

1. User filters and sorts the library with search, tags, collections, and sort mode.
2. In manual mode, users reorder entries by drag and drop or arrow controls.
3. Entries can be renamed inline, deleted, expanded for details, or routed into Create, Compose, and A/B compare.
4. Version history opens a full diff modal where a past snapshot can be restored.
5. Library export produces JSON and warns before exporting sensitive content.
6. Library import merges prompt JSON into the current library.
7. Preset-pack import provides a second import path with JSON validation, duplicate detection, and preview.
8. Hosted web can explicitly recover a legacy library through the bridge flow.

### 7. Test case authoring and execution

1. User opens the case form on a library entry.
2. User creates or edits a case with representative input plus optional expected traits, exclusions, and notes.
3. Single-case execution runs immediately and records an eval run.
4. Batch execution runs every saved case for the current prompt.
5. Batch execution is gated behind the `batchRuns` billing feature.
6. Test-case results feed back into:
   - run history
   - case verdict badges
   - per-prompt Evaluate history

### 8. Golden response benchmarking

1. User pins a golden response from the current enhanced output or from a historical run.
2. Prompt Lab compares the pinned golden text against the current enhanced output or latest run output.
3. User can adjust the pass threshold slider.
4. Verdict and similarity appear both in Create and in run history.
5. User can clear the pinned golden response at any time.

### 9. Compose workflow

1. User browses filtered library entries in Compose.
2. User adds entries to the canvas by click or drag and drop.
3. User reorders or removes blocks until the combined prompt is correct.
4. The preview pane shows the stitched prompt continuously.
5. User can copy the full composed prompt or send it directly back to Create.

### 10. Evaluate timeline and run comparison

1. User opens Evaluate with either all runs or the currently selected prompt scoped into history.
2. User filters runs by mode, provider, model, status, date range, and search.
3. User can rate runs, annotate them, compare two runs, and copy summaries.
4. Empty states route users back into Create or into Compare.
5. If the timeline is filtered down to zero results, reset actions are exposed inline.

### 11. A/B compare workflow

1. User opens Compare directly, or routes prompts into side `A` or `B` from the library.
2. User edits both prompts and runs one side or both sides.
3. Each side is sent as a single isolated user message with no extra context.
4. User can inspect outputs, retry failures, open a diff, and choose a winner.
5. Choosing a winner saves an experiment record into comparison history.
6. A/B compare is gated behind the `abTesting` billing feature.

### 12. Notebook multi-pad workflow

1. On first load, Prompt Lab migrates legacy single-pad storage into the multi-pad schema when needed.
2. User creates, switches, renames, and deletes pads.
3. Text autosaves after a short idle delay and flushes again on unload or visibility loss.
4. User can format the pad with insert helpers or keyboard shortcuts.
5. User can promote the current pad into Create, then continue through the normal library save flow.

### 13. Billing and feature gates

1. Billing can open from the header, settings, feature-blocked actions, or empty-state upgrade CTAs.
2. Free-tier users can still start the action that led to the gate, but gated features reroute into the billing modal.
3. Billing modal supports checkout, portal access, local activation, status refresh, and local deactivation.
4. Successful billing refresh changes downstream behavior immediately for:
   - collections
   - export
   - batch runs
   - diff view
   - A/B compare

### 14. Settings, telemetry, provider configuration, and bug reporting

1. Settings controls presentation preferences and library-management utilities.
2. Telemetry preferences are editable separately from billing and prompt content.
3. Desktop/provider settings manage provider choice, keys, models, and connection tests.
4. Bug reporting captures structured reproduction info plus optional prompt context and posts it to the Notion-backed bug pipeline.

## Platform deltas

- Extension:
  - uses the shared frontend
  - does not render `DesktopSettingsModal`
  - routes provider-key management through extension options
- Hosted web app:
  - renders the shared frontend with page scrolling enabled
  - exposes legacy-library recovery
  - locks hosted provider settings to Anthropic, with an optional personal key override
  - can use Clerk identity to simplify billing sync
- Desktop shell:
  - renders `DesktopSettingsModal`
  - listens for the `pl:open-settings` custom event to open provider settings

## Verification

- Reviewed the app shell and navigation registry directly.
- Reviewed the interaction-heavy hooks that add non-obvious workflow branches:
  - persistence
  - execution
  - billing
  - library
  - A/B compare
  - eval runs
  - test cases
- Reviewed the main interactive components for Create, Library, Compose, Evaluate, Notebook, and all app-level dialogs.
- Cross-checked the inventory with an event-handler search across `prompt-lab-extension/src` to avoid missing `onClick`, `onChange`, `onSubmit`, `onKeyDown`, drag-and-drop, and other direct interaction handlers.
