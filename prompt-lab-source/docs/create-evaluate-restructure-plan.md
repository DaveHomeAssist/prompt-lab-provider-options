# Create and Evaluate restructure plan

Status: active

## Scope

This document is the Phase 0 implementation brief for the two active Prompt Lab product issues still marked in progress:

- `002` Create workflow remains too vertically stacked
- `003` Experiments and run history are still split

It defines the accepted target interaction model, the implementation acceptance criteria, and the initial refactor boundary for the shared frontend.

This is an implementation-facing support doc. It does not replace:

- `ARCHITECTURE.md` for runtime architecture
- `ROADMAP.md` for broader release sequencing
- `docs/CURRENT_MENU_SYSTEM.md` for the current live state model

## Source of truth

This brief is grounded in:

- `../ARCHITECTURE.md`
- `../../AGENTS.md`
- `../../CURRENT_PROJECT_REPORT.md`
- `UX_AUDIT_2026-03-17.md`
- `CURRENT_MENU_SYSTEM.md`

If this file conflicts with the live code, the code wins until the implementation is updated.

## Current behavior summary

The current shared shell already exposes a partial three-section model, but the implementation and visible labels are still mismatched:

- visible header uses `Create`, `Library`, and `Experiments`
- `Build` and `Notebook` still sit outside the main cluster as utility-mode actions
- `Library` is still represented as `primaryView=create` plus `workspaceView=library`
- `Experiments` still maps to `primaryView=runs` with `runsView=compare` or `runsView=history`
- several behaviors still key off the legacy `tab` derivation in `App.jsx`

This creates two problems:

1. Create still feels like multiple stacked tools rather than one compressed work surface.
2. Compare and history still feel like separate destinations even though they are part of the same evaluation workflow.

## Target interaction model

The accepted target model for the next implementation phase is:

- `Create`
  - primary authoring surface
  - keeps editor as the default sub-mode
  - keeps composer available, but as a create-adjacent mode rather than a disconnected utility
- `Library`
  - remains a first-class destination for saved prompts and reuse
  - should not be visually or behaviorally treated as a secondary sidebar-only escape hatch
- `Evaluate`
  - replaces the current user-facing `Experiments` label
  - contains both compare and history as sub-views
  - becomes the single top-level destination for A/B and run review
- `Notebook`
  - remains available, but does not block the Create/Library/Evaluate cleanup

Implementation note:

- existing internal state names can remain temporarily where that reduces risk
- visible product labels should move toward `Create`, `Library`, and `Evaluate`
- legacy `tab`-based branching should be reduced over time, not expanded

## Phase 0 decisions

### Decision 1: compress Create before deeper IA changes

The first implementation work should reduce friction inside the Create loop before attempting the broader Evaluate refactor.

Accepted sequence:

1. make the active editing context obvious
2. move save affordances closer to the output/result area
3. reduce repeated helper copy and stacked actions
4. keep re-run and mode-switch actions in the same visible work zone

### Decision 2: unify evaluation under one top-level destination

The product should stop asking users to mentally separate A/B comparison from run review.

Accepted sequence:

1. keep one top-level evaluation destination
2. keep compare and history as sub-views
3. persist filters and sub-view state when switching within evaluation
4. preserve stored run data and existing diff behavior

### Decision 3: prefer state-composition refactors over schema changes

The first pass should favor:

- navigation cleanup
- view composition cleanup
- empty-state and labeling improvements
- persistence of existing UI state

It should avoid unnecessary storage-schema churn unless the code proves it is required.

## Acceptance criteria

### Create acceptance criteria

- A user can tell whether they are editing an existing prompt or creating a new one without reading hidden metadata.
- The primary save action is reachable from the main result area without scrolling through a separate save-heavy section.
- The main enhance, re-run, and save loop fits into a tighter visible zone in both full and compact layouts.
- The active Create sub-mode is visually clear in the header/navigation model.
- Existing create-related workflows still work:
  - enhance
  - save
  - copy
  - send library item into A/B
  - composer access

### Evaluate acceptance criteria

- A user reaches compare and run history from one top-level destination.
- Switching between evaluation sub-views does not reset filters unless the user explicitly resets them.
- Existing A/B saved records and run history entries remain visible and usable.
- Existing diff and comparison behaviors remain available after the navigation change.
- Empty states explain how to generate runs or comparisons instead of showing a blank surface.

### Regression acceptance criteria

- Shared-shell navigation still works in web, extension, and desktop-linked surfaces.
- Keyboard navigation still lands in predictable places after section changes.
- No new narrow-width overflow is introduced in Create or Evaluate.
- Existing targeted Vitest coverage is updated where view labels or routing assumptions change.

## Initial refactor boundary

These files are the approved first-pass touch set for the restructure work.

### Primary implementation files

- `prompt-lab-extension/src/App.jsx`
- `prompt-lab-extension/src/AppHeader.jsx`
- `prompt-lab-extension/src/hooks/useNavigation.js`
- `prompt-lab-extension/src/hooks/useUiState.js`
- `prompt-lab-extension/src/lib/navigationRegistry.js`
- `prompt-lab-extension/src/ABTestTab.jsx`
- `prompt-lab-extension/src/RunTimelinePanel.jsx`

### Likely supporting files

- `prompt-lab-extension/src/hooks/useABTest.js`
- `prompt-lab-extension/src/hooks/useEvalRuns.js`
- `prompt-lab-extension/src/tests/App.test.jsx`
- `prompt-lab-extension/src/tests/LibraryPanel.test.jsx`
- `prompt-lab-extension/src/__tests__/useABTest.test.jsx`
- `prompt-lab-extension/src/__tests__/useEvalRuns.test.jsx`

### Files explicitly out of scope for the first pass

- provider adapters and execution flows not needed for UI restructuring
- persistence schema rewrites unless required by implementation evidence
- public landing page copy beyond navigation label drift caused by shipped UI changes
- desktop packaging or extension manifest changes

## Implementation checkpoints

### Checkpoint A: Create compression ready

Required before moving to Evaluate unification:

- active editing context is visible
- inline or near-result save affordance is in place
- create-related action stacking is reduced

### Checkpoint B: Evaluate destination ready

Required before accessibility hardening:

- visible header/navigation uses a single evaluation destination
- compare/history switching works inside it
- filters persist across evaluation sub-views

### Checkpoint C: stabilization ready

Required before release:

- test coverage updated for changed navigation assumptions
- manual smoke pass completed in web and extension contexts
- no known blocker remains for issues `002` and `003`

## Verification

Code review and QA for the next implementation phase should verify at minimum:

```bash
sed -n '1,260p' prompt-lab-source/docs/create-evaluate-restructure-plan.md
sed -n '1,260p' prompt-lab-source/docs/CURRENT_MENU_SYSTEM.md
sed -n '1,260p' prompt-lab-source/prompt-lab-extension/src/hooks/useNavigation.js
sed -n '1,320p' prompt-lab-source/prompt-lab-extension/src/AppHeader.jsx
sed -n '1,260p' prompt-lab-source/prompt-lab-extension/src/RunTimelinePanel.jsx
```
