# Current Menu System

## Scope

This document describes the current Prompt Lab in-app menu and navigation system as implemented in the shared application shell.

It is an internal source-of-truth document for:

- top-level workspace navigation
- secondary view switching
- utility buttons
- command palette actions
- keyboard entry points into the menu system

It is based on the current code, not on older product plans or older guide copy.

## Source of Truth

Primary implementation files:

- `prompt-lab-extension/src/App.jsx`
- `prompt-lab-extension/src/hooks/useUiState.js`
- `prompt-lab-extension/src/lib/navigationRegistry.js`

Related user-facing docs:

- `prompt-lab-web/public/guide.html`

## High-Level Structure

The current in-app menu system is a three-layer header/navigation model:

1. top utility bar
2. top-level workspace selector
3. contextual secondary controls

This is not a simple one-row tab bar.

## State Model

The menu system is driven by three pieces of view state:

- `primaryView`
  - `create`
  - `runs`
  - `notebook`
- `workspaceView`
  - `editor`
  - `library`
  - `composer`
  - `split`
- `runsView`
  - `history`
  - `compare`

Important nuance:

- `Library` is not a `primaryView`
- it is derived from `primaryView=create` plus `workspaceView=library`
- `Compose` is also not a separate primary view
- it is `primaryView=create` plus `workspaceView=composer`
- `Notebook` is the only non-create/non-runs primary view

## Canonical Tab Mapping

The app still derives a canonical legacy `tab` value from state:

| State | Canonical tab |
|---|---|
| `primaryView=notebook` | `pad` |
| `primaryView=runs` + `runsView=compare` | `abtest` |
| `primaryView=runs` + `runsView=history` | `history` |
| `workspaceView=composer` | `composer` |
| otherwise | `editor` |

This matters because some panels and behaviors still key off `tab`.

## Header Layer 1: Utility Bar

The top utility bar contains:

- Prompt Lab wordmark
- app version
- saved prompt count
- command palette button
- theme toggle button
- keyboard shortcuts button
- settings button

Current behavior:

- command palette button opens the command palette modal
- theme toggle flips dark/light mode
- keyboard button opens the shortcuts modal
- settings button opens the settings modal

## Header Layer 2: Workspace Selector

The next row presents the main visible workspace choices:

| Visible label | What it actually does |
|---|---|
| `Create` | sets `primaryView=create` and `workspaceView=editor` |
| `Library` | sets `primaryView=create` and `workspaceView=library` |
| `Evaluate` | sets `primaryView=runs` and defaults `runsView=compare` |

Important nuance:

- these are the main visible workspaces
- but they do not map 1:1 to `PRIMARY_VIEWS` in `navigationRegistry.js`
- the visible header includes `Library`, while `PRIMARY_VIEWS` only includes:
  - `create`
  - `runs`
  - `notebook`

## Header Layer 3: Utility Workspace Buttons

On the same visual row, but separate from the main workspace selector, the app exposes:

| Visible label | What it actually does |
|---|---|
| `Notebook` | sets `primaryView=notebook` |

This means `Notebook` remains a utility-style destination, while `Compose` now lives inside the Create secondary controls instead of the utility-button cluster.

## Contextual Secondary Controls

The third row changes depending on the active area.

### When active section is Create

The row becomes a mixed mode/layout strip:

- `Write`
- `Compose`
- optional layout controls like `Dual Pane`

These map to `workspaceView` plus `editorLayout` / `effectiveEditorLayout`.

Important behavior:

- on compact viewports, create layout options are hidden
- if the layout is `split` on compact viewports, `effectiveEditorLayout` falls back to `editor`

### When active section is Library

There is no sub-tab bar.

The row shows descriptive status text:

- `Browse, filter, and reuse saved prompts`

### When active section is Evaluate

The row becomes a subview switcher:

- `History`
- `Compare`

These map directly to `runsView`.

### When primary view is Notebook

There is no sub-tab bar.

The row shows descriptive status text:

- `Multi-pad notes with library handoff`

## Command Palette

The command palette is driven by `buildCommandActions()` in `navigationRegistry.js`.

Current actions:

- Enhance Prompt
- Save Prompt
- Clear Editor
- Go to Create
- Go to Library
- Go to Evaluate
- Open Compare View
- Open Compose Mode
- Open Notebook
- Toggle Light / Dark
- Export Library
- Open Settings
- Extension Options (API Key)
- Show Keyboard Shortcuts

Important nuance:

- command palette labels do not fully mirror the visible header labels
- for example:
  - visible header says `Evaluate`
  - command palette includes both `Go to Evaluate` and `Open Compare View`
  - visible create secondary controls say `Write` / `Compose`
  - command palette says `Open Compose Mode`

## Keyboard Entry Points Into the Menu System

Global menu/navigation-adjacent shortcuts currently defined in `navigationRegistry.js`:

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + Enter` | Enhance prompt |
| `Cmd/Ctrl + S` | Save prompt |
| `Cmd/Ctrl + K` | Toggle command palette |
| `?` | Toggle shortcuts modal |
| `Escape` | Close open modal/panel surfaces |

`Escape` currently closes:

- command palette
- shortcuts modal
- settings modal
- save panel
- shared link panel
- version history modal

## Settings as a Menu Surface

The settings modal functions as a secondary menu surface rather than a simple toggle panel.

It currently exposes:

- show enhancement notes
- density:
  - compact
  - comfortable
  - spacious
- collection management
- API key/options entry point
- library import/export/clear actions

## Current Design Characteristics

The menu system is:

- compact
- keyboard-aware
- modal-assisted
- state-driven rather than route-driven
- shared across extension, web, and desktop shells

The menu system is not:

- URL-routed
- sidebar-driven
- one-label-to-one-state

## Current Implementation Quirks

These are important for future edits:

1. `Library` is visible as a top-level menu item, but it is implemented as `workspaceView=library` under `primaryView=create`.
2. `Compose` is visible as a create sub-mode, but it is still implemented as `workspaceView=composer`.
3. `Notebook` is a true `primaryView`, but it is still visually grouped with utility buttons rather than with the main workspace trio.
4. `PRIMARY_VIEWS` and the actual visible header model are related but not identical.
5. Compact mode suppresses layout controls and silently normalizes `split` back to `editor`.

## Recommended Usage of This Doc

Use this file before changing:

- header labels
- tab order
- command palette actions
- secondary row behavior
- menu-related keyboard shortcuts
- any attempt to unify or simplify the Create / Library / Compose / Notebook model

If the menu system changes, update this file together with:

- `App.jsx`
- `navigationRegistry.js`
- `guide.html`
