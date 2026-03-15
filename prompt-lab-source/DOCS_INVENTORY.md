# Prompt Lab Documentation Inventory

Updated: 2026-03-14

## Active docs

| Path | Scope | Status | Notes |
|---|---|---|---|
| `prompt-lab-extension/README.md` | Extension developer quickstart | Active | Source install, testing, and role of the MV3 side-panel shell alongside the web app and desktop shell. |
| `prompt-lab-desktop/README.md` | Desktop developer quickstart | Active | Documents Tauri build, packaging, and the shared frontend relationship to web and extension shells. |
| `prompt-lab-extension/PERMISSIONS_JUSTIFICATION.md` | CWS review support | Active | Mirrors current MV3 permissions and host permissions. |
| `prompt-lab-extension/PRIVACY_POLICY.md` | Store/privacy disclosure | Active | Extension-scoped privacy disclosure describing local storage and provider-only transmission. |
| `prompt-lab-extension/CWS_SUBMISSION_CHECKLIST.md` | Release checklist | Active | Tracks remaining Chrome Web Store submission work. |
| `prompt-lab-extension/CWS_STORE_LISTING.md` | Store listing draft | Active | Extension-specific listing copy that now references the hosted web companion where appropriate. |
| `prompt-lab-extension/VERSION_HISTORY.md` | Release history | Active | Canonical changelog across extension, web, and desktop milestones. |
| `prompt-lab-extension/VERSION_REPORT.md` | Current release snapshot | Active | High-level technical state for v1.5.0 across the shared codebase. |
| `prompt-lab-extension/CHANGELOG_PLAIN_ENGLISH.md` | Non-technical release notes | Active | Product-facing summary of the current release. |
| `NOTION_DOCS_AGENT.md` | Notion automation setup | Active | Documents the GitHub Actions driven Notion docs sync agent, required secrets, and trigger behavior. |
| `prompt-lab-web/README.md` | Web deployment quickstart | Active | Documents the public `promptlab.tools` landing page, the currently public hosted app URL, local dev, and Vercel deploy flow. |
| `vercel.json` | Vercel config | Active | Root build config for the hosted web deployment, including `/app` rewrites and `/api` passthrough. |
| `api/proxy.js` | CORS proxy edge function | Active | Domain-allowlisted pass-through proxy for provider APIs. |
| `.vercelignore` | Vercel upload filter | Active | Excludes local dependencies, build artifacts, and Tauri output from deployments. |
| `ARCHITECTURE.md` | Canonical system architecture | Active | Runtime layout across landing, web app, extension, desktop, proxy, and shared frontend. |
| `ROADMAP.md` | Product and release priorities | Active | Current shipped state and near-term priorities. |
| `MOBILE_DEPLOYMENT_ROADMAP.md` | Future mobile shell plan | Active | Mobile roadmap relative to the shared extension/web/desktop frontend. |

## Historical but retained

| Path | Scope | Status | Notes |
|---|---|---|---|
| `prompt-lab-extension/EXECUTION_PRD_V1.4.md` | Implementation planning | Historical | Keep for design context; not the source of truth for current behavior. |
| `prompt-lab-extension/BUG_PATCH_REPORT.md` | One-off remediation report | Historical | Useful for audit trail, but superseded by version history. |
| `_archive/DEPRECATED.md` | Archive marker | Historical | Indicates archived material under `_archive/`. |
| `_archive/PROPOSAL_V1.3.1.md` | Older proposal | Historical | Snapshot only; do not use for current architecture decisions. |
| `_archive/QA_LANDING_PAGE.md` | Earlier landing-page QA pack | Historical | Checklist from the older standalone marketing-site phase. |

## Legacy / duplicate docs

| Path | Scope | Status | Notes |
|---|---|---|---|
| `../prompt-lab-extension/README.md` | Older unpacked extension bundle | Legacy | Outside the canonical `prompt-lab-source/` tree. Leave untouched unless that duplicate tree is intentionally revived. |

## Maintenance notes

- Prefer updating docs under `prompt-lab-source/`; treat material outside that tree as legacy unless there is an explicit migration task.
- When shared frontend behavior changes, update extension, web, and desktop docs together. The public web deploy is currently split between the landing page on `promptlab.tools/` and the hosted app at `https://prompt-lab-tawny.vercel.app/app/`.
- Keep release docs aligned with the latest verified commands and current deploy shape.
