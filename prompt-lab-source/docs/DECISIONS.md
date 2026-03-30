# Decisions log

Open and resolved decisions across the PromptLab ecosystem. Format:

```
## [ID] Decision title
Status: open | resolved | deferred
Owner: who needs to decide
Date opened: YYYY-MM-DD
Date resolved: YYYY-MM-DD (if applicable)

Context: why this decision exists
Options: what was considered
Decision: what was chosen (if resolved)
Rationale: why
Consequences: what this unlocks or closes off
```

---

## Open decisions

---

### [D-001] PLB nav strategy — hash mode vs state router

Status: resolved
Owner: Dave
Date opened: 2026-03-25
Date resolved: 2026-03-30

Decision: React Router hash mode
Rationale: Works across all 3 surfaces (extension, web, desktop). Keeps deep links viable for QA and support. Extension context uses hash URLs naturally. Dave confirmed hash mode multiple times across sessions.
Consequences: Unblocks Phase 5+ component work, new tab additions, and CI integration (frontend-review Phase 4). Next step: wire HashRouter into App.jsx.

---

### [D-002] DaveLLM cluster — LLM inference engine

Status: open
Owner: Dave
Date opened: 2026-03-25

Context: The DaveLLM cluster assumes Ollama for local inference across Windows nodes (Duncan, GP66, Katana x2). This has not been confirmed.

Options:
- Ollama — easiest setup, good model support, REST API compatible
- llama-server (llama.cpp) — more control, lower overhead, less tooling

Consequences: Cluster cannot be deployed until this is confirmed and LAN IPs for all three Windows machines are provided.

---

### [D-003] DaveLLM cluster — LAN IPs

Status: open
Owner: Dave
Date opened: 2026-03-25

Context: Orchestrator routing to cluster nodes requires static or known LAN IPs for GP66, Katana x2 (x2), and Duncan.

Action needed: Run `ipconfig` on each Windows machine and record IPs. Assign static IPs via router DHCP reservation to prevent drift.

Consequences: Hard blocker on DaveLLM cluster deployment.

---

### [D-004] Act Two Catering — Notion leads pipeline

Status: open (in progress)
Owner: Dave
Date opened: 2026-03-26

Context: Quote form → Netlify Function → Notion API pipeline is fully architected. Blocked on two external actions.

Blocked on:
- Create the Notion database for quote form submissions
- Share the Notion integration key with the database

Consequences: Leads pipeline cannot be wired until both are complete. P1 priority for Act Two.

---

### [D-005] Act Two Catering — 4 remaining menu photos

Status: open
Owner: Dave / Tom
Date opened: 2026-03-26

Context: 19 of 24 image slots filled with real photography. 4 menu slots still on emoji fallback: 3 croquette variants and the dipping trio.

Action needed: Acquire or shoot the 4 remaining photos. Resize to spec and drop into `act-2-photos/`.

---

### [D-006] Trailkeeper store schema

Status: open
Owner: Dave (Claude-first task)
Date opened: 2026-03-25

Context: Trailkeeper requires a unified `trailkeeper.store` localStorage schema before any independent feature development can begin. This is a hard architectural dependency — Codex cannot implement features without the schema defined first.

Action needed: Schedule a Claude session to define and document the full store schema. Output goes to `trailkeeper/docs/STORE_SCHEMA.md`.

Consequences: All Trailkeeper feature work is blocked until this is done.

---

### [D-007] Garden OS — repo integrity

Status: resolved
Owner: Dave
Date opened: 2026-03-25
Date resolved: 2026-03-26

Context: Garden OS experienced git index corruption. Fresh clone created, two build-breaking bugs fixed (ui-binder.js duplicate declaration, save.test.js teardown order), 324/324 tests pass, build clean, pushed to main.

---

### [D-008] ShieldBox — production URL + brand spelling

Status: open
Owner: Dave / ShieldBox client
Date opened: 2026-03-25

Context: ShieldBox quote form client feedback has been shipped. Two items remain unresolved before the project can be considered closed.

Action needed:
- Confirm production URL
- Lock brand spelling (ShieldBox vs Shieldbox vs SHIELDBOX)

---

### [D-009] PromptLab — untracked files decision

Status: resolved
Owner: Dave
Date opened: 2026-03-25
Date resolved: 2026-03-26

Context: 27 uncommitted files split into 5 clean commits covering docs cleanup, app refactor, persistence flow, build config, and a new test. Remaining untracked items (scratch files, misplaced garden-os-fresh clone) are not worth committing.

---

### [D-010] PLB feature gating strategy — free vs paid tier

Status: open
Owner: Dave
Date opened: 2026-03-27

Context: D-R03 resolved the pricing structure (free / $9 per month / $100 annual) but did not define which features live behind the paywall. This must be decided before any gating logic is implemented.

Options:
- Gate by usage limits (number of prompts, runs per day, library size)
- Gate by feature access (A/B testing, diff viewer, collections, export)
- Gate by provider access (free tier limited to one provider)
- Hybrid (usage + feature gates)

Consequences: Blocks Lemon Squeezy integration and any paywall UI work.

---

## Resolved decisions

---

### [D-R01] PLB data layer — Dexie.js vs SQLite WASM

Status: resolved
Date resolved: 2026-03 (prior sprint)

Decision: Dexie.js
Rationale: SQLite WASM is incompatible with MV3 extension context. Dexie.js provides a clean IndexedDB abstraction that works in service workers and content scripts.
Consequences: All run logging, prompt storage, and library state lives in Dexie/IndexedDB. No file system access.

---

### [D-R02] Monetization platform — Lemon Squeezy vs Gumroad

Status: resolved
Date resolved: 2026-03 (prior sprint)

Decision: Lemon Squeezy
Rationale: Fee structure analysis favored Lemon Squeezy. Better VAT handling for international sales.
Consequences: All PLB product listings, prompt packs, and subscription tiers will be managed through Lemon Squeezy.

---

### [D-R03] PLB pricing structure

Status: resolved
Date resolved: 2026-03-26

Decision: Freemium — free tier / $9 per month / $100 annual
Rationale: Gives users a reason to try without friction, upgrade for real features, and commit annually for a discount.
Consequences: Feature gating strategy needs to be defined — what lives behind the paywall vs free tier.

---

### [D-R04] SAP hosting — GitHub Pages vs Vercel

Status: resolved
Date resolved: 2026-03-25

Decision: Vercel
Rationale: Custom domain support, serverless function support (needed for AI beat generation endpoint), better deploy pipeline.
Consequences: standardacidprocedure.com and www cutover complete. Drum machine AI endpoint running as Vercel serverless function.

---

### [D-R05] System by Dave brand palette

Status: resolved
Date resolved: 2026-03-25

Decision: Rust / sand / charcoal (#c0623a, #e8dece, #1c1917)
Rationale: Hard no on lime green (PromptLab territory). Muted and sophisticated direction selected.
Consequences: All System by Dave Notion Marketplace assets use this palette. Distinct from PLB Acid Lab v1 identity.

---

*Last updated: 2026-03-27*
*Related: CLAUDE.md, PIPELINE.md, PROMPT_SYSTEM.md*
