#!/usr/bin/env node
/**
 * Notion Dashboard Updater — keeps the @Mar 24 Code Dashboard page summary
 * in sync by reading the inline database and writing a grouped status summary.
 *
 * Usage:
 *   NOTION_TOKEN=secret_xxx node scripts/notionDashboardUpdate.mjs
 *   npm run dashboard:update
 *
 * Environment:
 *   NOTION_TOKEN       — (required) Notion integration token
 *   NOTION_API_BASE    — (default: https://api.notion.com)
 *   NOTION_VERSION     — (default: 2022-06-28)
 *   DASHBOARD_PAGE_ID  — (default: 32e255fc8f4480cdb7ffedb98636b765)
 */

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const API_BASE = process.env.NOTION_API_BASE || 'https://api.notion.com';
const API_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const PAGE_ID = (process.env.DASHBOARD_PAGE_ID || '32e255fc8f4480cdb7ffedb98636b765').replace(/-/g, '');
const DATA_SOURCE_ID = '32e255fc-8f44-80da-a2ba-000bb21bf3ed';

if (!NOTION_TOKEN) {
  console.error('NOTION_TOKEN is required');
  process.exit(1);
}

// ── Notion API helpers ──────────────────────────────────────────────────────

async function notionFetch(path, options = {}) {
  const url = `${API_BASE}/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': API_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion API ${res.status}: ${body}`);
  }
  return res.json();
}

async function getPageBlocks(pageId) {
  const blocks = [];
  let cursor;
  do {
    const params = cursor ? `?start_cursor=${cursor}` : '';
    const data = await notionFetch(`/blocks/${pageId}/children${params}`);
    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return blocks;
}

async function queryDatabase() {
  const rows = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${DATA_SOURCE_ID}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    rows.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return rows;
}

async function deleteBlock(blockId) {
  await notionFetch(`/blocks/${blockId}`, { method: 'DELETE' });
}

async function appendBlocks(parentId, children) {
  await notionFetch(`/blocks/${parentId}/children`, {
    method: 'PATCH',
    body: JSON.stringify({ children }),
  });
}

// ── Property extraction ─────────────────────────────────────────────────────

function getProp(page, name) {
  const prop = page.properties?.[name];
  if (!prop) return '';
  switch (prop.type) {
    case 'title': return prop.title?.map(t => t.plain_text).join('') || '';
    case 'rich_text': return prop.rich_text?.map(t => t.plain_text).join('') || '';
    case 'select': return prop.select?.name || '';
    case 'status': return prop.status?.name || '';
    case 'checkbox': return prop.checkbox ? 'Yes' : 'No';
    case 'created_time': return prop.created_time || '';
    default: return '';
  }
}

// ── Render summary ──────────────────────────────────────────────────────────

function renderSummary(rows) {
  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Group by status
  const byStatus = {};
  for (const row of rows) {
    const status = getProp(row, 'Status') || 'Unknown';
    const priority = getProp(row, 'Priority') || 'Unset';
    const title = getProp(row, 'Title');
    const projectTag = getProp(row, 'Project Tag');
    const followUp = getProp(row, 'Follow Up Needed');
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push({ title, priority, projectTag, followUp });
  }

  // Sort statuses in logical order
  const statusOrder = ['In Progress', 'Blocked', 'Logged', 'Closed'];
  const sortedStatuses = Object.keys(byStatus).sort((a, b) => {
    const ai = statusOrder.indexOf(a);
    const bi = statusOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Priority sort within each group
  const priorityOrder = { High: 0, Med: 1, Low: 2, Unset: 3 };
  for (const status of sortedStatuses) {
    byStatus[status].sort((a, b) =>
      (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
    );
  }

  // Build Notion blocks
  const blocks = [];

  // Last updated callout
  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      icon: { type: 'emoji', emoji: '🕐' },
      rich_text: [{ type: 'text', text: { content: `Last updated: ${now}` } }],
      color: 'gray_background',
    },
  });

  // Summary counts
  const total = rows.length;
  const open = rows.filter(r => getProp(r, 'Status') !== 'Closed').length;
  const followUps = rows.filter(r => getProp(r, 'Follow Up Needed') === 'Yes' && getProp(r, 'Status') !== 'Closed').length;

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        { type: 'text', text: { content: `${total} total items · ${open} open · ${followUps} follow-ups needed` }, annotations: { bold: true } },
      ],
    },
  });

  // Per-status sections
  for (const status of sortedStatuses) {
    const items = byStatus[status];
    const emoji = status === 'Closed' ? '✅' : status === 'In Progress' ? '🔄' : status === 'Blocked' ? '🚫' : '📋';

    blocks.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: `${emoji} ${status} (${items.length})` } }],
      },
    });

    // Group by priority within status
    const byPriority = {};
    for (const item of items) {
      const p = item.priority || 'Unset';
      if (!byPriority[p]) byPriority[p] = [];
      byPriority[p].push(item);
    }

    for (const [priority, pItems] of Object.entries(byPriority)) {
      const pLabel = priority === 'High' ? '🔴' : priority === 'Med' ? '🟡' : priority === 'Low' ? '⚪' : '·';
      for (const item of pItems) {
        const tag = item.projectTag ? ` [${item.projectTag}]` : '';
        const fu = item.followUp === 'Yes' ? ' ⚠️' : '';
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              { type: 'text', text: { content: `${pLabel} ` } },
              { type: 'text', text: { content: item.title }, annotations: { bold: priority === 'High' } },
              { type: 'text', text: { content: `${tag}${fu}` }, annotations: { color: 'gray' } },
            ],
          },
        });
      }
    }
  }

  return blocks;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching dashboard page blocks...');
  const blocks = await getPageBlocks(PAGE_ID);

  // Find marker blocks or the inline database block
  let startIdx = -1;
  let endIdx = -1;
  let dbBlockIdx = -1;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    // Check for HTML comment markers in paragraph blocks
    if (b.type === 'paragraph') {
      const text = b.paragraph?.rich_text?.map(t => t.plain_text).join('') || '';
      if (text.includes('DASHBOARD_SUMMARY:START')) startIdx = i;
      if (text.includes('DASHBOARD_SUMMARY:END')) endIdx = i;
    }
    // Find the inline database block
    if (b.type === 'child_database') {
      dbBlockIdx = i;
    }
  }

  console.log('Querying database rows...');
  const rows = await queryDatabase();
  console.log(`Found ${rows.length} rows`);

  const summaryBlocks = renderSummary(rows);

  // Strategy: delete old summary blocks between markers, insert new ones
  if (startIdx >= 0 && endIdx >= 0 && endIdx > startIdx) {
    // Delete blocks between markers (exclusive of markers themselves)
    const toDelete = blocks.slice(startIdx + 1, endIdx).map(b => b.id);
    console.log(`Deleting ${toDelete.length} old summary blocks...`);
    for (const id of toDelete) {
      await deleteBlock(id);
    }

    // Insert new summary blocks after the START marker
    console.log('Inserting updated summary...');
    await appendBlocks(PAGE_ID, summaryBlocks);

  } else {
    // No markers found — create them above the database block
    console.log('No markers found. Creating summary section...');

    const markerStart = {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: '<!-- DASHBOARD_SUMMARY:START -->' }, annotations: { color: 'gray' } }],
      },
    };
    const markerEnd = {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: '<!-- DASHBOARD_SUMMARY:END -->' }, annotations: { color: 'gray' } }],
      },
    };

    const allBlocks = [markerStart, ...summaryBlocks, markerEnd];
    await appendBlocks(PAGE_ID, allBlocks);
  }

  console.log('Dashboard updated successfully.');
}

main().catch((err) => {
  console.error('Dashboard update failed:', err.message);
  process.exit(1);
});
