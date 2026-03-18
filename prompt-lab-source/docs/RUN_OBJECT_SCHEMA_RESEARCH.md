# Run Object Schema Research & Design

> **Source:** "Architecting a Local-First Observability Primitive" (PDF, 12 pages, 37 citations)
> **Date:** 2026-03-17
> **Status:** Research complete — ready for implementation spec
> **Applies to:** `eval_runs` store in `prompt_lab_local` IndexedDB (currently v3)

---

## Summary

Technical specification for upgrading Prompt Lab's Run Object from the current flat `eval_runs` record to a full observability primitive. Synthesizes schemas from W&B Weave, LangSmith, PromptLayer, and Helicone, mapped to Prompt Lab's browser-extension-first architecture.

---

## Current State (eval_runs schema)

```js
{
  id, createdAt, promptId, promptVersionId, promptTitle,
  mode,          // 'enhance' | 'ab' | 'test-case'
  provider, model, variantLabel,
  input, output, latencyMs,
  verdict,       // 'pass' | 'fail' | 'mixed' | null
  notes, status, testCaseId, goldenScore
}
```

Indices: `createdAt`, `promptId`, `mode`, `provider`. Capacity: 1000 records (FIFO).

---

## Proposed v1 Run Object Schema

### 1. Identity & Trace Hierarchy

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID v7 | Yes | Primary key, chronologically sortable |
| `trace_id` | UUID v7 | Yes | Root operation identifier |
| `parent_id` | string | No | Parent span ID |
| `dotted_order` | string | Yes | LangSmith-style hierarchical path for tree reconstruction |
| `session_id` | string | No | Helicone-style conversation grouping |
| `name` | string | Yes | Descriptive operation name |

### 2. Execution Classification

| Field | Type | Required | Notes |
|---|---|---|---|
| `kind` | enum | Yes | LLM, AGENT, CHAIN, TOOL, RETRIEVER, EMBEDDING, PROMPT (OpenInference) |
| `provider` | string | Yes | openai, anthropic, ollama, google, openrouter |
| `model` | string | Yes | Specific model ID |
| `api_type` | string | No | chat-completions, embeddings, etc. |

### 3. Content Payload (Prompt Blueprint)

```js
input: {
  messages: [{ role, content: [{ type, data }] }],  // multimodal blocks
  tools: [],          // optional tool definitions
  tool_choice: null    // optional constraints
}

output: {
  messages: [],        // same block structure as input
  thinking: null,      // reasoning/thought blocks (observability only)
  tool_calls: []       // tools the model invoked
}
```

### 4. Versioning & Metadata Context

| Field | Type | Required | Notes |
|---|---|---|---|
| `prompt_id` | string/int | No | Links to Prompt Lab registry |
| `prompt_version` | integer | No | Specific template version |
| `commit_hash` | string | No | Prompt code state at execution |
| `input_variables` | object | No | KV map of template variables |
| `tags` | string[] | No | Categorical labels |
| `metadata` | object | No | Environmental data (browser_version, extension_mode) |

### 5. Performance & Usage Metrics

| Field | Type | Required | Notes |
|---|---|---|---|
| `start_time` | ISO 8601 | Yes | Request initiated |
| `end_time` | ISO 8601 | No | Final response received |
| `latency_ms` | integer | Yes | end - start |
| `ttft_ms` | integer | No | Time to First Token (streaming) |
| `usage.prompt_tokens` | integer | No | Input tokens |
| `usage.completion_tokens` | integer | No | Output tokens |
| `usage.total_tokens` | integer | No | Sum |
| `cost` | number | No | Estimated monetary cost |

### 6. Status & Diagnostics

| Field | Type | Required | Notes |
|---|---|---|---|
| `status` | enum | Yes | SUCCESS, WARNING, ERROR, RUNNING |
| `error.type` | enum | No | PROVIDER_ERROR, TIMEOUT, RATE_LIMIT, VALIDATION_FAILED |
| `error.message` | string | No | Human-readable description |
| `score` | number | No | 0-100 evaluation score |

---

## Vendor Comparison Matrix

| Category | W&B Weave | LangSmith | PromptLayer | Helicone |
|---|---|---|---|---|
| Identity | UUID | UUID v7 | pl_id | Header-based |
| Hierarchy | trace_id + parent_id | dotted_order | Spans Bulk API | Session-Path |
| Classification | op_name | run_type | api_type | _type |
| Payload | Dict | KVMap | Blueprint | JSON |
| Status | SUCCESS/ERROR/RUNNING | OK/ERROR/UNSET | SUCCESS/WARNING/ERROR | boolean |
| Performance | latency_ms | start/end_time | request_start_time | TTFT + latency |
| Versioning | op_name ref | prompt_id + commit_hash | prompt_id + version | Prompt-Id header |

---

## Storage Architecture Decision

**Recommendation: IndexedDB via Dexie.js** (current approach is correct)

| Metric | IndexedDB (Dexie) | SQLite WASM (OPFS) | localStorage |
|---|---|---|---|
| Write latency | ~0.17ms/record | ~3.0ms single | ~0.017ms/record |
| Capacity | ~80% disk | Same | 5-10 MB |
| Query flexibility | Range/Index | SQL JOINs | Key-only |
| JSON support | Native objects | JSON column | Stringified |
| Complexity | Moderate | High (WASM+OPFS+Workers) | Very low |
| Browser support | Universal | Chrome 109+, Firefox 111+ | Universal |

**Key implementation notes:**
- Use Dexie `bulkAdd`/`bulkPut` to minimize transaction overhead
- Write-behind cache: update in-memory Map, flush to Dexie in batches of 50-100
- MV3 service workers terminate after 30s idle — init runs in IndexedDB immediately
- Consider `chrome.offscreen` API for long-running tasks

---

## OpenInference / OpenTelemetry Alignment

The schema follows OpenInference semantic conventions (built on OTEL):
- Attribute namespaces: `llm.input_messages`, `llm.token_count.prompt`
- Span Kinds: LLM, AGENT, CHAIN, TOOL, RETRIEVER, RERANKER, EMBEDDING, GUARDRAIL, EVALUATOR, PROMPT
- Privacy-by-design: masking/redaction before export
- Export-compatible with Langfuse, Arize Phoenix, Comet Opik

---

## Migration Path

Current `eval_runs` → v1 Run Object:

| Current field | Maps to | Notes |
|---|---|---|
| `id` | `id` | Keep as UUID, upgrade to v7 for new records |
| `createdAt` | `start_time` | Direct mapping |
| `promptId` | `prompt_id` | Direct mapping |
| `promptVersionId` | `prompt_version` | Direct mapping |
| `mode` | `kind` | enhance→PROMPT, ab→PROMPT, test-case→EVALUATOR |
| `provider` | `provider` | Direct mapping |
| `model` | `model` | Direct mapping |
| `input` | `input.messages` | Wrap in message block structure |
| `output` | `output.messages` | Wrap in message block structure |
| `latencyMs` | `latency_ms` | Direct mapping |
| `status` | `status` | 'success'→SUCCESS, 'error'→ERROR |
| `verdict` | `score` | Convert pass/fail/mixed to numeric |
| `goldenScore` | `score` | Already numeric |
| `notes` | `metadata.notes` | Move to metadata bag |

**Strategy:** Write a `migrateRunV0toV1()` function (same pattern as Garden OS workspace migration). Old records coexist — read path normalizes on load.

---

## References

37 citations in source PDF covering W&B Weave, LangSmith, PromptLayer, Helicone, OpenInference spec, IndexedDB/Dexie.js benchmarks, SQLite WASM/OPFS, MV3 service worker lifecycle, and Chrome offscreen API.
