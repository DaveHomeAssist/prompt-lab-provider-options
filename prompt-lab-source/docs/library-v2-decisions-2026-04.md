# Library v2 — Locked Decisions

**Date:** 2026-04-25
**Owner:** Dave Robertson
**Branch:** `feat/library-v2-and-packs`
**Source design:** `prompt-lab/html pages/prompt-library-v2.html` (preview; canonical visual spec)

---

## Locked defaults

| Axis      | Value     | Source |
|-----------|-----------|--------|
| Density   | `gallery` | `Prompt Library v2.html` EDITMODE block |
| Accent    | `ink`     | `Prompt Library v2.html` EDITMODE block |
| Signature | `ticket`  | `Prompt Library v2.html` EDITMODE block |

These are first-run defaults. Users override via the settings UI shipped in Phase 3.

---

## Open questions resolved

### Are tweaks Pro-gated or free?

**Free.** Tweaks are visual chrome with no data leverage. Existing Pro features (`canUseCollections`, `canExportLibrary`) gate things that affect data ownership/portability. Visual presets do not. Easier to add a gate later than to remove one.

### One `pl2-tweaks` JSON blob or three separate keys?

**Three separate keys:** `pl2-density`, `pl2-accent`, `pl2-signature`.

Matches the existing granular convention (`pl2-sort-by`, `pl2-pad`, `pl2-mode`). One key per dimension means one validation pass per axis, no JSON-merge-conflict risk on cross-tab writes, and a simpler reset story (clear one key to reset one axis).

---

## Compact-shell fallback

When the extension side-panel renders (`compact === true`), force `density = 'default'` regardless of the user's stored choice. The `gallery` preset's 2-up grid does not fit in the 420 px side-panel width. User confirmed on 2026-04-25.

Implemented at the top of `LibraryPanel` in Phase 2:

```js
if (compact && tw.density.grid) {
  tw = resolveLibraryTweaks({ ...rawValues, density: 'default' });
}
```

---

## Forward-compat rules

- Storage hydrate path silently discards unknown preset values and falls back to defaults. This protects against rolling back a release that introduced a new preset key.
- `library-tweaks.js` is the single source of truth for preset tables. Adding a new density / accent / signature preset means adding one entry there; the validator allowlist auto-derives.

---

## Out of scope (deferred)

- **Pro-gating revisit.** Reconsider only if the Library v2 UI surfaces noticeable feature creep that warrants paywall positioning.
- **`pl2-tweaks` migration.** No JSON-blob predecessor exists, so no migration is needed.
- **Per-collection theming.** Several presets (e.g. `accent` per `collection`) were considered and rejected as scope creep.
