# Prompt Lab Roadmap

Updated: April 14, 2026

This is the canonical forward looking product and runtime roadmap for Prompt Lab.
It is written for contributors, operators, and stakeholders who need one current
view of scope, priorities, and sequencing across the extension, desktop, hosted
web, and public site surfaces.

## Roadmap posture

Prompt Lab is already a real multi surface product. The current roadmap is not
"build a product from scratch." It is:

1. ship the verified patch and release hardening work safely
2. tighten the core prompt evaluation workflow so the product feels more cohesive
3. improve distribution and monetization readiness without abandoning the local first model
4. expand to new shells only after the current shells are operationally stable

The next business outcome is a clean release of the verified patch work, followed
by stronger Evaluate workflow cohesion, validated Clerk Billing and support
flows, and better distribution posture.

Roadmap items below are grouped by horizon:

- `Now` means currently active or immediately next
- `Next` means the following committed focus after `Now`
- `Later` means planned but dependency bound
- `Exploratory` means intentionally not committed yet

## Product boundary

Prompt Lab is a prompt engineering workbench delivered through multiple shells
that share one frontend codebase.

### In scope

- Chrome / Vivaldi extension
- Tauri desktop app
- Hosted web app at `https://promptlab.tools/app/`
- Public landing and docs site at `https://promptlab.tools/`

### Current product capabilities

- Prompt authoring and enhancement
- Prompt scoring and linting
- PII scanning and redaction
- Prompt library with tags, search, collections, import/export, and sharing
- Variable templates
- A B testing and diffing
- Eval runs, run history, and test cases
- Multi provider execution on extension and desktop
- Hosted Anthropic first web flow through Vercel
- BYOK credential storage with local encryption on extension and desktop

### Provider scope

- Anthropic
- OpenAI
- Google Gemini
- OpenRouter
- Ollama

Note: DaveLLM Router is supported as an optional local provider on extension and
desktop at `localhost:8000`. The hosted web app does not target DaveLLM Router.

### Product principles

1. Keep the shared React app as the center of gravity.
2. Prefer local first behavior where the product can work without a public backend.
3. Use public backend dependencies only where they unlock a real user facing capability.
4. Keep provider integration abstracted so the UI is not coupled to a single vendor.
5. Treat the extension and desktop surfaces as primary; treat the hosted web app as a convenience surface unless that strategy changes deliberately.
6. Keep credentials local. BYOK is the canonical credential model. Provider keys live in the local Dexie store on extension and desktop. The hosted web app uses server side provider access only for the Anthropic proxy path.

## Current baseline as of April 14, 2026

### Shipped baseline

- Shared frontend running across extension, desktop, and hosted web
- Public landing page and hosted app on `promptlab.tools`
- `v1.7.0` runtime and navigation cleanup shipped
- Clerk Billing (Stripe backed) path integrated in the shared shell
- Evaluate, run history, diffing, PII, and provider abstractions are already live
- Shared UI architecture is decomposed beyond `App.jsx` into focused hooks, registries, adapters, and feature modules

### Current release state

- Patch branch exists locally with runtime, security, and bug report work
- Local builds are green for web, extension, and desktop under supported Node
- Extension suite passes locally
- Preview deployment exists and is ready
- Production promotion has not happened yet for the current patch set
- Chrome Web Store submission materials and review support docs are still incomplete

### Immediate operational blockers

- Hosted bug reporting still needs Vercel env configuration:
  - `NOTION_TOKEN`
  - `NOTION_BUG_REPORT_PARENT_PAGE_ID`
- Preview needs authenticated smoke verification before promotion
- Production still needs a formal release pass from the verified patch branch

## Strategic goals

### Goal 1: Make Prompt Lab reliably shippable

Prompt Lab needs a repeatable release posture across extension, desktop, and hosted
web. The product is already feature rich enough that release hygiene now matters as
much as new features.

### Goal 2: Make evaluation the clearest core workflow

The strongest user value is not just "generate text." It is the ability to compare,
test, score, refine, and reuse prompts across providers. The roadmap should keep
moving the product toward a tighter Evaluate centered workflow.

### Goal 3: Improve distribution without creating a backend heavy SaaS by accident

The hosted web app, Clerk Billing (Stripe backed), and operational tooling should
support adoption, but should not quietly turn Prompt Lab into a fully account
centric web product without an explicit architectural decision.

### Goal 4: Expand surfaces only after the current ones are stable

Mobile and self hosted server modes are valid future directions, but only after the
extension, desktop, and hosted web surfaces have a stable release and support model.

## Horizon 0: Release Hardening And Patch Shipment

Target window: April 2026
Status: `Now`

This horizon is about finishing the current patch cleanly and making the product
safe to ship from a supported runtime.

### Outcomes

- Production runs on the verified patch set
- Hosted bug reporting works end to end
- Runtime parity is enforced locally and in release operations
- Core docs reflect the current architecture and URLs

### Horizon 0 ordered checklist

1. Keep Node support pinned to `20.19+` or `22.12+` and run release work only from a supported runtime.
2. Add or keep guards that make unsupported installs harder to run accidentally.
3. Add `NOTION_TOKEN` and `NOTION_BUG_REPORT_PARENT_PAGE_ID` to Vercel.
4. Run authenticated preview QA of `/app/`.
5. Run authenticated preview QA of the bug report modal and `/api/bug-report`.
6. Verify a real Notion write from the hosted bug report flow.
7. Validate both success UX and failure UX for hosted bug reporting.
8. Merge or otherwise land the current patch branch into `main`.
9. Promote the verified build to production.
10. Re compare production `https://promptlab.tools/app/` against a fresh local build after promotion.
11. Resolve stale PRs `#4` and `#5`.
12. Keep the canonical docs consistent with the current deploy shape and confirm the preview deployment path and production promotion sequence remain documented.

### Exit criteria

- Patch branch is landed
- Production deploy is live
- Hosted bug report submits successfully
- Web, extension, and desktop builds are green from a supported runtime
- Canonical docs no longer disagree on current product state

## Horizon 1: Workflow Cohesion And Commercial Hardening

Target window: late April to June 2026
Status: `Next`

This horizon improves the core workflow and stabilizes the business facing parts of
the product that are already partly implemented.

### Outcomes

- Evaluate becomes the most coherent and obviously valuable workflow in the product
- Monetization is real operationally, not just coded
- Hosted web reliability improves without expanding backend scope unnecessarily

### Workstreams

#### 1. Evaluate workflow refinement

- Finish QA and polish for the unified Evaluate and run history flow
- Close the remaining quality gap tracked in `AGENTS.md` issue `003`
- Tighten empty states, retry states, filter behavior, and cross run comparisons where needed

#### 2. Clerk Billing and Pro flow validation

- Validate Clerk auth, session handling, and subscription state sync in real environments
- Validate Clerk checkout and billing portal flows with Stripe handling payment processing underneath
- Confirm gated features behave correctly against Clerk subscription state across extension, desktop, and hosted web where applicable
- Make upgrade and plan state legible in product copy

#### 3. Hosted web reliability

- Keep the Anthropic hosted flow stable
- Continue hardening SSE, provider error normalization, and provider field filtering
- Clarify what the hosted web app is and is not compared with the primary extension and desktop surfaces

#### 4. Bug report and support loop

- Use the hosted bug report flow as the first lightweight support intake path
- Confirm payload quality is sufficient for triage
- Decide whether support intake needs richer metadata or attachments later

### Exit criteria

- Evaluate QA is complete enough to remove issue `003` from in progress state
- Clerk Billing flows (Stripe backed) are verified end to end across checkout, portal, and subscription state sync
- Hosted web app is operationally reliable for demo and evaluation use
- Bug reports are reaching the intended Notion destination consistently

### Success signals

Targets to be set at Horizon 0 exit.

- Evaluate workflow: percentage of active sessions that reach a completed run comparison, tracked against a baseline captured at Horizon 0 exit
- Clerk Billing: count of successful checkout to active subscription transitions, and count of portal visits with no support ticket follow up
- Hosted web reliability: 7 day rolling error rate on `/api/` routes, and percentage of SSE streams that complete without client side retry
- Bug report loop: median time from submission to Notion ingestion, and percentage of reports with complete payload metadata

## Horizon 2: Distribution, Packaging, And Product Maturity

Target window: June to August 2026
Status: `Later`

This horizon focuses on making Prompt Lab easier to distribute, install, and trust.

### Outcomes

- Chrome Web Store release posture is complete
- Desktop packaging is more than "local build works"
- Product documentation and release materials support real adoption

### Workstreams

#### 1. Chrome Web Store readiness

- Finish store listing copy and screenshots
- Finish promo assets and permissions review
- Reconcile current extension behavior with privacy and permission docs
- Land the final CWS submission checklist items

#### 2. Desktop release posture

- Decide whether desktop remains an internal or development oriented artifact or becomes a public downloadable app
- Improve packaging validation across macOS, Windows, and Linux
- Document the support posture for desktop releases

#### 3. Public facing product clarity

- Keep the landing page aligned with the actual hosted app and supported workflows
- Refresh demo assets and distribution posts only after the product narrative matches the real current product
- Make the distinction between extension, desktop, and hosted web clear to new users

#### 4. Performance and maintainability

- Reduce bundle size warnings across web, extension, and desktop
- Keep documentation debt from regrowing
- Continue eliminating stale or duplicate planning material that confuses contributors

### Exit criteria

- Chrome Web Store materials are complete
- Desktop packaging has a clear public or internal posture
- Public product docs and landing page reflect reality
- Bundle size warnings have an explicit mitigation plan or are reduced materially

## Horizon 3: Platform Expansion

Target window: late 2026 and beyond

This horizon covers later and exploratory expansion work after the current
surfaces are stable.

### Priority order

1. Prompt Lab Server experiment
2. Mobile shell
3. Broader hosted web ambitions

### 1. Prompt Lab Server

Status: `Later`

Goal:
- provide a self hosted path for browser access without making a public backend the center of the product

Why it matters:
- preserves the local first philosophy better than expanding the public proxy model
- creates a possible bridge for browser access to providers that do not fit cleanly in hosted web mode

Preconditions:

- hosted web scope is stable
- current release operations are dependable
- product value of a self hosted runtime is clearer than "just another shell"

### 2. Mobile shell

Status: `Exploratory`

Goal:
- ship Prompt Lab on iOS and Android without forking the shared frontend unless necessary

Preconditions from `MOBILE_DEPLOYMENT_ROADMAP.md`:

- desktop CI and packaging posture are stable
- platform boundaries remain clean
- mobile provider call architecture is explicitly decided
- mobile secret storage strategy is chosen

Important current stance:

- mobile is a real roadmap item, but not an active delivery priority right now
- do not begin mobile release work before the current shells have a stronger operational baseline

### 3. Broader hosted web ambitions

Status: `Exploratory`

Goal:
- revisit whether the public web app should become a larger part of the product

Guardrail:

- do not expand Prompt Lab into a backend heavy SaaS by drift
- any move toward a truly primary web product requires an explicit architecture and business decision

## Cross cutting enablers

These are not standalone features, but they determine whether the roadmap succeeds.

### Engineering quality

- Supported Node runtime enforcement
- Stable test execution under supported runtimes
- Surface by surface release verification

Owner: Dave. Review cadence: end of each horizon.

### Documentation quality

- Keep `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, and surface READMEs aligned
- Treat public URLs and deploy shape as high priority documentation drift

Owner: Dave. Review cadence: end of each horizon.

### Product clarity

- Make surface differences obvious:
  - extension and desktop are primary
  - hosted web is narrower and proxy backed
- Keep public claims constrained to verified product behavior

Owner: Dave. Review cadence: end of each horizon.

### Provider architecture

- Maintain provider abstraction modules instead of surface specific provider logic
- Avoid coupling monetization or runtime shells to one provider's contract

Owner: Dave. Review cadence: end of each horizon.

### Incident and rollback posture

- Production promotion requires a rollback commit identified before promote
- Vercel production deploys must remain reversible to the previous deployment through the dashboard within 5 minutes
- Clerk Billing incidents require a documented path to pause new checkouts without breaking existing subscriptions
- Hosted bug report outage requires a fallback intake documented in `README.md`
- Incident log lives in Notion under `DB | Logs and Notes Tracker` with open loops routed into canonical task DBs

Owner: Dave. Review cadence: after every production incident and at each horizon exit.

## Decision points to revisit

### Desktop public download

Decision: Decide whether the desktop app becomes a public download channel or remains secondary to the extension.
Owner: Dave.
Trigger: Horizon 2 exit.

### Prompt Lab Server priority

Decision: Decide whether Prompt Lab Server should be prioritized ahead of broader hosted web expansion.
Owner: Dave.
Trigger: when hosted web reaches 30 day stable operational baseline.

### Hosted web acquisition path

Decision: Decide whether the hosted web app stays a convenience surface or becomes a larger acquisition path.
Owner: Dave.
Trigger: on first paid Pro conversion through hosted web.

### Mobile timing

Decision: Decide whether mobile should follow desktop maturity immediately or wait for stronger product pull.
Owner: Dave.
Trigger: when desktop packaging posture reaches stable public release or explicit internal only designation.

## Non goals for the current roadmap

These are explicitly not the current focus:

- rebuilding Prompt Lab around a mandatory account system
- making the hosted public web app the primary product by default
- starting mobile release work before current shell stability is proven
- adding a public backend for feature parity unless a core capability truly requires it
