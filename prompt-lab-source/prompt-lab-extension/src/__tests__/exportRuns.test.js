import { describe, expect, it } from 'vitest';
import { exportRuns } from '../runs/exportRuns.js';

function createMockDb(records) {
  return {
    runs: {
      where(field) {
        expect(field).toBe('trace_id');
        return {
          equals(traceId) {
            return {
              async sortBy(key) {
                expect(key).toBe('start_ts');
                return records
                  .filter((run) => run.trace_id === traceId)
                  .sort((a, b) => Date.parse(a.start_ts) - Date.parse(b.start_ts));
              },
            };
          },
        };
      },
    },
  };
}

describe('exportRuns', () => {
  it('returns NDJSON and a dataset for a Dexie-like runs table', async () => {
    const records = [
      {
        run_id: 'r_child_tool',
        parent_run_id: 'r_root',
        trace_id: 't_export',
        run_type: 'tool',
        name: 'Validate output',
        status: 'success',
        start_ts: '2026-03-17T02:00:00.600Z',
        end_ts: '2026-03-17T02:00:00.900Z',
        inputs: {},
        outputs: {},
        error: null,
        meta: {},
        variant_id: 'main',
      },
      {
        run_id: 'r_root',
        parent_run_id: null,
        trace_id: 't_export',
        run_type: 'trace',
        name: 'Trace root',
        status: 'success',
        start_ts: '2026-03-17T02:00:00.000Z',
        end_ts: '2026-03-17T02:00:01.000Z',
        inputs: {},
        outputs: {},
        error: null,
        meta: { provider: 'promptlab', model: 'router-v1' },
        variant_id: 'main',
      },
      {
        run_id: 'r_child_llm',
        parent_run_id: 'r_root',
        trace_id: 't_export',
        run_type: 'llm',
        name: 'Model call',
        status: 'success',
        start_ts: '2026-03-17T02:00:00.200Z',
        end_ts: '2026-03-17T02:00:00.500Z',
        inputs: {},
        outputs: {},
        error: null,
        meta: { provider: 'openai', model: 'gpt-4.1' },
        variant_id: 'main',
      },
    ];

    const { ndjson, dataset } = await exportRuns('t_export', createMockDb(records));
    const parsed = ndjson.split('\n').map((line) => JSON.parse(line));

    expect(parsed.map((run) => run.run_id)).toEqual(['r_root', 'r_child_llm', 'r_child_tool']);
    expect(dataset.meta.traceId).toBe('t_export');
    expect(dataset.meta.rootRunId).toBe('r_root');
    expect(dataset.meta.variantId).toBe('main');
    expect(dataset.nodes).toHaveLength(3);
    expect(dataset.edges).toEqual([
      { from: 'r_root', to: 'r_child_llm', type: 'calls', meta: { label: 'calls' } },
      { from: 'r_root', to: 'r_child_tool', type: 'calls', meta: { label: 'calls' } },
    ]);
  });
});
