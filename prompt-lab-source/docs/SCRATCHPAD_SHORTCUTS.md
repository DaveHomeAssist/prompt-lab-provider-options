# Scratchpad Shortcuts

## Scope

This document defines the current keyboard behavior for the Prompt Lab scratchpad (`PadTab`).

It applies to shared app surfaces where the scratchpad is available:

- extension
- hosted web app
- desktop shell

## Current Supported Shortcuts

These shortcuts are intentionally supported in the scratchpad:

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + E` | Export / download the active pad |
| `Cmd/Ctrl + Shift + D` | Insert date separator |
| `Cmd/Ctrl + Shift + C` | Copy all pad content |
| `Cmd/Ctrl + Shift + X` | Clear the active pad |

## Intentionally Unsupported Shortcuts

These shortcuts are intentionally **not** handled by Prompt Lab scratchpad code:

| Shortcut | Why it is not captured |
|---|---|
| `Cmd/Ctrl + T` | Browser new-tab shortcut |
| `Cmd/Ctrl + W` | Browser close-tab shortcut |
| `Cmd/Ctrl + [` | Browser back navigation in many contexts |
| `Cmd/Ctrl + ]` | Browser forward navigation in many contexts |

Prompt Lab should not override browser-reserved navigation and tab-management shortcuts for scratchpad-only actions.

## Current Non-Shortcut Pad Actions

These actions remain available through the scratchpad UI rather than keyboard shortcuts:

- create new pad
- rename active pad
- delete active pad
- switch between pads using the sidebar list
- save pad content into Prompt Library

## Rationale

The scratchpad is a secondary work surface inside a larger application. It should support high-value text operations without hijacking expected browser behavior.

The current policy is:

- keep text-operation shortcuts that are local to the scratchpad
- avoid shortcuts that conflict with browser tab and history controls
- prefer visible buttons for pad lifecycle actions unless a non-conflicting shortcut scheme is introduced later

## Source of Truth

Implementation:

- `prompt-lab-extension/src/PadTab.jsx`
- `prompt-lab-extension/src/lib/padShortcuts.js`

Tests:

- `prompt-lab-extension/src/tests/padShortcuts.test.js`

User-facing guide:

- `prompt-lab-web/public/guide.html`

## If Shortcuts Change Later

If new scratchpad shortcuts are introduced:

1. update `padShortcuts.js`
2. update `padShortcuts.test.js`
3. update `guide.html`
4. re-check for collisions with browser-reserved shortcuts before shipping
