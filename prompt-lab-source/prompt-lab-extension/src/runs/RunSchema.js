export const RUN_SCHEMA_VERSION = 1;

/**
 * @typedef {Object} RunMeta
 * @property {string=} provider
 * @property {string=} model
 * @property {number=} tokens
 * @property {number=} cost
 * @property {string=} prompt_hash
 */

/**
 * @typedef {"trace"|"chain"|"agent"|"llm"|"tool"|"eval"} RunType
 */

/**
 * @typedef {"running"|"success"|"error"|"canceled"} RunStatus
 */

/**
 * Prompt Lab v1 Run Record.
 *
 * @typedef {Object} RunRecord
 * @property {string} run_id
 * @property {string|null} parent_run_id
 * @property {string} trace_id
 * @property {RunType} run_type
 * @property {string} name
 * @property {RunStatus} status
 * @property {string} start_ts
 * @property {string|null} end_ts
 * @property {Object} inputs
 * @property {Object|null} outputs
 * @property {Object|null} error
 * @property {RunMeta} meta
 * @property {string|null=} fork_of_run_id
 * @property {string=} variant_id
 */
