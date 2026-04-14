# Prompt Lab Next Roadmap Implementation Plan

Updated: 2026-04-14

## Purpose

This plan turns the next roadmap items into an executable sequence.

It covers:

- Horizon 0 release hardening and patch shipment
- Horizon 1 Evaluate workflow cohesion
- Horizon 1 billing validation
- Horizon 1 hosted web reliability
- Horizon 1 bug report and support loop

It does not cover Horizon 2 distribution work except for small prep items that
reduce risk during Horizon 0 and Horizon 1.

## Boundary

Inside this plan:

- shipping the current patch branch safely
- making hosted bug reporting operational
- verifying the hosted auth and billing path that already exists
- closing the remaining quality gap on Evaluate tracked in `AGENTS.md` issue `003`
- defining the metrics and review cadence required to exit Horizon 1 cleanly

Outside this plan:

- Chrome Web Store asset production
- desktop public release packaging beyond current smoke validation
- Prompt Lab Server implementation
- mobile shell work

## Current state

Verified baseline:

- patch branch: `patch/2026-04-stability-bugreport`
- local builds green under `Node 20.19+` or `22.12+`
- hosted preview exists and is ready
- hosted billing path is Clerk aware on web and still supports local device sync
- bug report code path is implemented and unit tested

Current blockers:

- `NOTION_TOKEN` is missing in Vercel for `prompt-lab`
- `NOTION_BUG_REPORT_PARENT_PAGE_ID` is missing in Vercel for `prompt-lab`
- preview QA still needs authenticated access
- production has not been promoted from the verified patch branch
- Evaluate issue `003` still needs broader QA and closeout

## Sequencing summary

| Phase | Focus | Owner | Dependency | Exit gate |
|---|---|---|---|---|
| 0 | Release hardening and production shipment | Dave | Vercel access, supported Node runtime | Production matches verified patch build |
| 1 | Evaluate workflow QA and polish | Dave | Phase 0 complete | `AGENTS.md` issue `003` can move to resolved |
| 2 | Clerk Billing and Pro flow validation | Dave | Phase 0 complete, hosted auth available | Checkout, portal, and subscription sync verified |
| 3 | Hosted web reliability and support loop | Dave | Phases 0 and 2 in progress | `/api` reliability and bug report intake are operational |
| 4 | Metrics baseline and horizon exit review | Dave | Phases 1 through 3 complete enough to measure | Horizon 1 success signals have baselines and owners |

## Phase 0: Release hardening and production shipment

### Objective

Ship the verified patch branch to production without introducing drift between
local, preview, and production.

### Deliverables

- production deploy from the patch branch
- operational hosted bug report flow
- rollback ready release notes
- cleaned PR and branch hygiene around the shipped patch set

### Work items

1. Confirm the working tree is intentional and commit ready.
2. Verify the patch branch includes the roadmap, billing copy, bug report, and runtime work that should ship together.
3. Add `NOTION_TOKEN` and `NOTION_BUG_REPORT_PARENT_PAGE_ID` to the linked Vercel project.
4. Run authenticated preview QA on `/app/`.
5. Run authenticated preview QA on the bug report modal and `/api/bug-report`.
6. Submit one real bug report and confirm the Notion write.
7. Validate failure UX for missing or invalid bug report configuration.
8. Identify the rollback commit before production promotion.
9. Promote the verified preview or deploy the patch branch to production from the supported runtime.
10. Re compare production `https://promptlab.tools/app/` against a fresh local build.
11. Resolve PR `#4` and PR `#5` as merged, superseded, or obsolete.
12. Update release facing docs if production behavior changed during QA.

### Verification

- `Node 20.19+` or `22.12+` only
- local targeted tests for billing and bug report paths
- hosted preview QA with signed in flow
- live production asset comparison after promote

### Exit criteria

- production deploy is live
- hosted bug report flow works end to end
- rollback path is documented
- patch branch can be merged or closed cleanly

### Risks and controls

- Risk: preview auth blocks unauthenticated smoke checks
  Control: use authenticated browser QA or a Vercel share link
- Risk: unsupported Node produces false negatives
  Control: run all release commands from the verified runtime only
- Risk: production differs from preview due to env drift
  Control: re compare live assets after promote

## Phase 1: Evaluate workflow QA and polish

### Objective

Finish the remaining Evaluate quality work so the product's clearest core flow
is stable enough to close issue `003`.

### Deliverables

- completed QA pass for the unified Evaluate and run history flow
- any required small fixes for filters, compare state, and retry states
- updated issue status in `AGENTS.md`

### Work items

1. Re read the current Evaluate issue notes in `AGENTS.md` and the existing Evaluate plan doc.
2. Define the QA matrix for Evaluate:
   - new run
   - rerun
   - filtered timeline
   - compare model toggle
   - test case batch flow
   - empty state
   - no match state
   - retryable error state
3. Run the QA matrix on extension and hosted web where behavior should match.
4. Patch any regressions found in timeline filters, compare state, pagination, or run patch updates.
5. Add or update tests around any new failure case discovered during QA.
6. Update `AGENTS.md` issue `003` once the evidence supports moving it to resolved.

### Candidate file touch points

- `prompt-lab-extension/src/hooks/`
- `prompt-lab-extension/src/RunTimelinePanel.jsx`
- `prompt-lab-extension/src/__tests__/useTestCases.test.jsx`
- `prompt-lab-extension/src/tests/`
- `AGENTS.md`

### Verification

- targeted Vitest coverage for changed hooks and panels
- manual QA matrix recorded in working notes
- regression check that compare state is stable under filtered timelines

### Exit criteria

- no open Evaluate regression remains from the QA matrix
- issue `003` is either resolved or narrowed to a smaller follow up with explicit scope

### Gaps to watch

- The most dangerous gap is missing baseline measurement for the success signal
  around completed run comparisons. Capture that at the end of Phase 1 or
  Horizon 1 cannot be evaluated cleanly.

## Phase 2: Clerk Billing and Pro flow validation

### Objective

Verify the hosted auth and billing path as it actually exists: Clerk for hosted
identity, Stripe underneath for payment processing, local state cached in the
shared app.

### Deliverables

- verified hosted sign in and sign out behavior
- verified checkout flow
- verified billing portal flow
- verified subscription sync and local unlock behavior
- cleaned billing copy where product claims still lag implementation

### Work items

1. Verify Clerk sign in and sign out behavior on the hosted web shell.
2. Verify checkout from the billing modal with a signed in user.
3. Verify portal access from the billing modal.
4. Verify post checkout subscription sync through the hosted billing endpoints.
5. Verify fallback local activation flow still works when billing email sync is used.
6. Verify extension and desktop copy does not imply hosted auth where it does not exist.
7. Audit the remaining docs and UI copy that still say "Stripe only" when the real model is "Clerk identity plus Stripe processing".
8. Record any missing envs, webhook requirements, or support steps discovered during validation.

### Candidate file touch points

- `prompt-lab-web/app/main-web.jsx`
- `prompt-lab-extension/src/hooks/useBillingState.js`
- `prompt-lab-extension/src/modals/BillingModal.jsx`
- `api/billing/`
- hosted web and privacy docs

### Verification

- targeted Vitest coverage for billing state and copy
- hosted manual QA with a signed in test account
- confirmation that local Pro unlock state survives reload correctly

### Exit criteria

- checkout, portal, and subscription sync work in a real hosted session
- local fallback activation still works where intended
- docs and product copy match the actual billing architecture

### Risks and controls

- Risk: hosted auth works but local fallback copy becomes misleading
  Control: keep web specific copy conditional on Clerk identity
- Risk: webhook or pricing env drift blocks sync
  Control: verify env requirements and document them during the pass

## Phase 3: Hosted web reliability and support loop

### Objective

Make the hosted web app reliable enough for demo and evaluation use, and make
bug reports a real support intake path instead of a coded but unproven feature.

### Deliverables

- stable `/api/proxy` behavior for supported hosted flows
- stable `/api/bug-report` behavior with clear error handling
- support intake checklist for triage

### Work items

1. Re test Anthropic hosted requests for normal completion, streamed completion, and provider failure cases.
2. Confirm provider error normalization still preserves HTTP status and actionable user feedback.
3. Validate the bug report payload shape and required fields for triage quality.
4. Decide whether support reports need additional metadata:
   - app surface
   - route
   - provider
   - plan
   - user contact
   - reproducibility notes
5. Add any low risk bug report payload fields that materially improve triage.
6. Document the fallback intake path required by the roadmap incident posture.
7. Record the initial support triage workflow for incoming reports.

### Candidate file touch points

- `api/proxy.js`
- `api/bug-report.js`
- `prompt-lab-extension/src/lib/bugReporter.js`
- `README.md`
- incident and support docs as needed

### Verification

- manual hosted request tests
- one successful bug report submission
- one intentional failure path validation

### Exit criteria

- hosted requests are reliable enough for normal demo use
- bug reports reach Notion with complete enough metadata for triage
- fallback support intake path is documented

## Phase 4: Metrics baseline and Horizon 1 review

### Objective

Set the baselines and operating rhythm required to know whether Horizon 1 is
actually complete.

### Deliverables

- baseline values for each Horizon 1 success signal
- explicit owner for each metric collection path
- horizon review checklist

### Work items

1. Define where each success signal will be measured:
   - Evaluate completion rate
   - checkout to active subscription transitions
   - portal visits without support follow up
   - `/api/` error rate
   - SSE completion rate without client retry
   - median bug report submission to Notion ingestion time
   - percentage of reports with complete metadata
2. Determine which metrics already exist and which still need instrumentation.
3. Capture the Horizon 0 exit baseline for every metric that is currently measurable.
4. Create a short horizon review checklist:
   - roadmap updated
   - issue tracker updated
   - release status documented
   - metrics captured
   - unresolved follow ups explicitly moved to Horizon 2 or backlog

### Exit criteria

- every Horizon 1 success signal has a measurement source or an explicit instrumentation task
- the Horizon 1 exit review can be executed without inventing new process at the end

## Shared verification matrix

| Area | Minimum check | Stretch check |
|---|---|---|
| Runtime | run from `Node 20.19+` or `22.12+` | add guard in CI and local scripts |
| Hosted release | authenticated preview QA and production compare | scripted live asset compare |
| Evaluate | targeted tests plus manual matrix | broader cross surface QA notes |
| Billing | hosted signed in manual flow | end to end subscription lifecycle check |
| Bug report | real Notion write plus failure path | richer metadata and triage checklist |

## Open dependencies

### External access dependencies

- Vercel project env access
- authenticated preview access
- hosted billing test account
- Notion destination for bug reports

### Code and repo dependencies

- supported Node runtime
- current patch branch remains the release branch until shipped
- docs stay aligned as implementation changes land

## Recommended execution order

1. Finish Phase 0 and ship the patch branch.
2. Start Phase 2 billing validation immediately after Phase 0 because it depends on real hosted behavior.
3. Run Phase 1 Evaluate QA in parallel with the later half of Phase 2 where the work does not overlap.
4. Run Phase 3 once hosted release and billing validation have proven the deployed environment is stable.
5. Close with Phase 4 baselining and horizon review.

## Stop conditions

Pause and reassess if any of the following happens:

- production behavior diverges from preview after promotion
- hosted billing cannot complete a real checkout and sync cycle
- Evaluate QA reveals a structural state bug that requires a broader refactor
- bug reports cannot be delivered reliably even after env setup

## Summary

The next roadmap items should be executed as one near term program, not as
isolated tickets. The critical path is:

1. ship the patch branch
2. validate hosted auth and billing
3. close the remaining Evaluate quality gap
4. make the hosted support loop operational
5. capture the metrics needed to exit Horizon 1 with evidence
