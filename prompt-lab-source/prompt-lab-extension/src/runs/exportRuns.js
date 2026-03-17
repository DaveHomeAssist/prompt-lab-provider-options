import { buildGraphDataset } from './buildGraphDataset.js';

function compareRunsByStart(a, b) {
  const startDelta = Date.parse(a.start_ts || '') - Date.parse(b.start_ts || '');
  if (Number.isFinite(startDelta) && startDelta !== 0) return startDelta;
  return String(a.run_id || '').localeCompare(String(b.run_id || ''));
}

function getRunsTable(db) {
  if (db?.runs) return db.runs;
  if (typeof db?.table === 'function') return db.table('runs');
  throw new Error('exportRuns requires a Dexie-like db with a runs table.');
}

async function queryRunsByTrace(traceId, db) {
  const runsTable = getRunsTable(db);
  if (typeof runsTable.where !== 'function') {
    throw new Error('runs table must support where().');
  }
  const collection = runsTable.where('trace_id').equals(traceId);
  if (typeof collection.sortBy === 'function') {
    return collection.sortBy('start_ts');
  }
  if (typeof collection.toArray === 'function') {
    return collection.toArray();
  }
  throw new Error('runs query must support sortBy() or toArray().');
}

export async function exportRuns(traceId, db) {
  const runs = (await queryRunsByTrace(traceId, db)).slice().sort(compareRunsByStart);
  if (!runs.length) {
    throw new Error(`No runs found for trace "${traceId}".`);
  }

  const rootRun = runs.find((run) => run.parent_run_id == null) || runs[0];
  const variantId = runs[0]?.variant_id || 'main';
  const dataset = buildGraphDataset(runs, {
    traceId,
    rootRunId: rootRun.run_id,
    variantId,
  });

  return {
    ndjson: runs.map((run) => JSON.stringify(run)).join('\n'),
    dataset,
  };
}
