#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const DEFAULT_API_BASE = 'https://api.notion.com';
const DEFAULT_API_VERSION = '2022-06-28';
const DEFAULT_DASHBOARD_PAGE_ID = 'fd9255fc8f448343899e817c22804e09';
const DEFAULT_DASHBOARD_DATABASE_ID = '79bd524b05634d1986962c706a55a704';
const DEFAULT_DASHBOARD_DATA_SOURCE_ID = '68e6506d68934d61b74f2e8234d03a1e';
const DEFAULT_TIMEZONE = 'America/New_York';
const MAX_APPEND_CHILDREN = 100;
const SUMMARY_START_MARKER = 'DASHBOARD_SUMMARY:START';
const SUMMARY_END_MARKER = 'DASHBOARD_SUMMARY:END';
const STATUS_ORDER = ['In Progress', 'Blocked', 'Logged', 'Closed'];
const PRIORITY_ORDER = ['High', 'Med', 'Low', 'Unset'];
const TEXTUAL_BLOCK_TYPES = new Set([
  'paragraph',
  'heading_1',
  'heading_2',
  'heading_3',
  'bulleted_list_item',
  'numbered_list_item',
  'callout',
  'quote',
  'to_do',
  'toggle',
]);

function normalizeNotionId(value, label = 'Notion ID') {
  if (!value) {
    throw new Error(`${label} is required`);
  }

  let raw = String(value).trim();

  if (raw.startsWith('collection://')) {
    raw = raw.slice('collection://'.length);
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const url = new URL(raw);
    const matches = url.pathname.match(/[0-9a-f]{32}/gi);
    raw = matches?.at(-1) || raw;
  }

  const flat = raw.replace(/-/g, '').match(/[0-9a-f]{32}/i)?.[0];
  if (!flat) {
    throw new Error(`${label} must contain a valid Notion UUID`);
  }

  return flat.toLowerCase();
}

function dashedNotionId(value) {
  const id = normalizeNotionId(value);
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

function buildConfig(env = process.env) {
  return {
    token: env.NOTION_TOKEN || '',
    apiBase: env.NOTION_API_BASE || DEFAULT_API_BASE,
    apiVersion: env.NOTION_VERSION || DEFAULT_API_VERSION,
    pageId: normalizeNotionId(env.DASHBOARD_PAGE_ID || DEFAULT_DASHBOARD_PAGE_ID, 'DASHBOARD_PAGE_ID'),
    databaseId: normalizeNotionId(
      env.DASHBOARD_DATABASE_ID || DEFAULT_DASHBOARD_DATABASE_ID,
      'DASHBOARD_DATABASE_ID'
    ),
    dataSourceId: normalizeNotionId(
      env.DASHBOARD_DATA_SOURCE_ID || DEFAULT_DASHBOARD_DATA_SOURCE_ID,
      'DASHBOARD_DATA_SOURCE_ID'
    ),
    timezone: env.DASHBOARD_TIMEZONE || DEFAULT_TIMEZONE,
  };
}

function versionAtLeast(current, target) {
  return String(current).localeCompare(String(target)) >= 0;
}

function baseAnnotations(overrides = {}) {
  return {
    bold: false,
    italic: false,
    strikethrough: false,
    underline: false,
    code: false,
    color: 'default',
    ...overrides,
  };
}

function textFragment(content, annotations = {}) {
  return {
    type: 'text',
    text: { content },
    annotations: baseAnnotations(annotations),
  };
}

function paragraphBlock(parts) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: parts,
      color: 'default',
    },
  };
}

function heading3Block(text) {
  return {
    object: 'block',
    type: 'heading_3',
    heading_3: {
      rich_text: [textFragment(text)],
      color: 'default',
      is_toggleable: false,
    },
  };
}

function calloutBlock(text, emoji = '🕐', color = 'gray_background') {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [textFragment(text)],
      icon: { type: 'emoji', emoji },
      color,
    },
  };
}

function bulletedItemBlock(parts) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: parts,
      color: 'default',
    },
  };
}

function markerBlock(markerName) {
  return paragraphBlock([textFragment(`<!-- ${markerName} -->`, { color: 'gray' })]);
}

class NotionClient {
  constructor(config) {
    this.config = config;
  }

  async request(pathname, { method = 'GET', body } = {}) {
    const response = await fetch(`${this.config.apiBase}/v1${pathname}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        'Notion-Version': this.config.apiVersion,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Notion API ${response.status}: ${await response.text()}`);
    }

    if (response.status === 204) {
      return {};
    }

    return response.json();
  }

  async listBlockChildren(blockId) {
    const results = [];
    let nextCursor;

    do {
      const query = new URLSearchParams({ page_size: '100' });
      if (nextCursor) {
        query.set('start_cursor', nextCursor);
      }

      const data = await this.request(`/blocks/${blockId}/children?${query.toString()}`);
      results.push(...(data.results || []));
      nextCursor = data.has_more ? data.next_cursor : undefined;
    } while (nextCursor);

    return results;
  }

  async retrieveDatabase(databaseId) {
    return this.request(`/databases/${databaseId}`);
  }

  async queryDatabase(databaseId, titlePropertyName) {
    const results = [];
    let nextCursor;

    do {
      const body = {
        page_size: 100,
        sorts: [
          { timestamp: 'created_time', direction: 'ascending' },
          { property: titlePropertyName, direction: 'ascending' },
        ],
      };

      if (nextCursor) {
        body.start_cursor = nextCursor;
      }

      const data = await this.request(`/databases/${databaseId}/query`, {
        method: 'POST',
        body,
      });

      results.push(...(data.results || []));
      nextCursor = data.has_more ? data.next_cursor : undefined;
    } while (nextCursor);

    return results;
  }

  async appendChildren(parentId, children, placement = { type: 'end' }) {
    for (let index = 0; index < children.length; index += MAX_APPEND_CHILDREN) {
      const chunk = children.slice(index, index + MAX_APPEND_CHILDREN);
      const body = { children: chunk };

      if (index === 0 && placement.type === 'after') {
        if (versionAtLeast(this.config.apiVersion, '2026-03-11')) {
          body.position = {
            type: 'after_block',
            after_block: { id: placement.afterBlockId },
          };
        } else {
          body.after = placement.afterBlockId;
        }
      }

      if (index === 0 && placement.type === 'start') {
        if (!versionAtLeast(this.config.apiVersion, '2026-03-11')) {
          throw new Error(
            'Inserting at the start of a block requires Notion-Version 2026-03-11 or newer'
          );
        }
        body.position = { type: 'start' };
      }

      await this.request(`/blocks/${parentId}/children`, {
        method: 'PATCH',
        body,
      });
    }
  }

  async archiveBlock(blockId) {
    const fieldName = versionAtLeast(this.config.apiVersion, '2026-03-11') ? 'in_trash' : 'archived';
    await this.request(`/blocks/${blockId}`, {
      method: 'PATCH',
      body: { [fieldName]: true },
    });
  }
}

function getBlockPlainText(block) {
  if (!block || !TEXTUAL_BLOCK_TYPES.has(block.type)) {
    return '';
  }

  const payload = block[block.type];
  const richText = payload?.rich_text || payload?.text || [];
  return richText.map(item => item.plain_text ?? item.text?.content ?? '').join('');
}

function findTopLevelDatabaseBlock(children, targetDatabaseId) {
  return (
    children.find(
      block =>
        block.type === 'child_database' &&
        normalizeNotionId(block.id, 'working database block') === targetDatabaseId
    ) || null
  );
}

async function collectMarkerContexts(client, parentId, contexts = []) {
  const children = await client.listBlockChildren(parentId);
  const startIndices = [];
  const endIndices = [];

  children.forEach((child, index) => {
    const text = getBlockPlainText(child);
    if (text.includes(SUMMARY_START_MARKER)) {
      startIndices.push(index);
    }
    if (text.includes(SUMMARY_END_MARKER)) {
      endIndices.push(index);
    }
  });

  if (startIndices.length || endIndices.length) {
    contexts.push({ parentId, children, startIndices, endIndices });
  }

  for (const child of children) {
    if (child.has_children && child.type !== 'child_database' && child.type !== 'child_page') {
      await collectMarkerContexts(client, child.id, contexts);
    }
  }

  return contexts;
}

function selectMarkerContext(contexts) {
  const malformed = contexts.filter(
    context =>
      context.startIndices.length !== 1 ||
      context.endIndices.length !== 1 ||
      context.endIndices[0] <= context.startIndices[0]
  );

  if (malformed.length) {
    throw new Error('Found malformed dashboard summary markers; refusing to overwrite the page');
  }

  if (contexts.length > 1) {
    throw new Error('Found multiple dashboard summary marker ranges; refusing to overwrite the page');
  }

  if (!contexts.length) {
    return null;
  }

  const [context] = contexts;
  return {
    parentId: context.parentId,
    children: context.children,
    startIndex: context.startIndices[0],
    endIndex: context.endIndices[0],
  };
}

function getTitlePropertyName(database) {
  for (const [name, property] of Object.entries(database.properties || {})) {
    if (property.type === 'title') {
      return name;
    }
  }

  return null;
}

function validateDatabase(database, config) {
  const titlePropertyName = getTitlePropertyName(database);
  if (!titlePropertyName) {
    throw new Error('Working database is missing a title property');
  }

  const statusProperty = database.properties?.Status;
  const priorityProperty = database.properties?.Priority;

  if (!statusProperty) {
    throw new Error('Working database is missing the Status property');
  }
  if (!priorityProperty) {
    throw new Error('Working database is missing the Priority property');
  }
  if (!['select', 'status'].includes(statusProperty.type)) {
    throw new Error(`Status must be a select or status property, found ${statusProperty.type}`);
  }
  if (!['select', 'status'].includes(priorityProperty.type)) {
    throw new Error(`Priority must be a select or status property, found ${priorityProperty.type}`);
  }

  if (
    versionAtLeast(config.apiVersion, '2025-09-03') &&
    Array.isArray(database.data_sources) &&
    database.data_sources.length > 0
  ) {
    const matchesExpectedSource = database.data_sources.some(
      dataSource => normalizeNotionId(dataSource.id, 'database data source') === config.dataSourceId
    );

    if (!matchesExpectedSource) {
      throw new Error('Working database does not expose the expected data source ID');
    }
  }

  return { titlePropertyName };
}

function getPropertyText(page, propertyName) {
  const property = page.properties?.[propertyName];
  if (!property) {
    return '';
  }

  switch (property.type) {
    case 'title':
      return property.title?.map(item => item.plain_text).join('').trim() || '';
    case 'rich_text':
      return property.rich_text?.map(item => item.plain_text).join('').trim() || '';
    case 'select':
      return property.select?.name || '';
    case 'status':
      return property.status?.name || '';
    case 'checkbox':
      return property.checkbox ? 'Yes' : 'No';
    case 'created_time':
      return property.created_time || '';
    default:
      return '';
  }
}

function statusOrderIndex(status) {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? STATUS_ORDER.length : index;
}

function priorityOrderIndex(priority) {
  const index = PRIORITY_ORDER.indexOf(priority);
  return index === -1 ? PRIORITY_ORDER.length : index;
}

function compareSummaryRows(a, b) {
  const tupleA = [
    statusOrderIndex(a.status),
    priorityOrderIndex(a.priority),
    a.projectTag.toLowerCase(),
    a.title.toLowerCase(),
    a.createdTime,
    a.id,
  ];
  const tupleB = [
    statusOrderIndex(b.status),
    priorityOrderIndex(b.priority),
    b.projectTag.toLowerCase(),
    b.title.toLowerCase(),
    b.createdTime,
    b.id,
  ];

  for (let index = 0; index < tupleA.length; index += 1) {
    if (tupleA[index] < tupleB[index]) {
      return -1;
    }
    if (tupleA[index] > tupleB[index]) {
      return 1;
    }
  }

  return 0;
}

function buildSummaryRows(pages, titlePropertyName) {
  return pages
    .map(page => ({
      id: normalizeNotionId(page.id, 'database row'),
      title: getPropertyText(page, titlePropertyName) || '(Untitled)',
      status: getPropertyText(page, 'Status') || 'Logged',
      priority: getPropertyText(page, 'Priority') || 'Unset',
      projectTag: getPropertyText(page, 'Project Tag'),
      followUpNeeded: getPropertyText(page, 'Follow Up Needed') === 'Yes',
      createdTime: page.created_time || getPropertyText(page, 'Date') || '',
    }))
    .sort(compareSummaryRows);
}

function formatTimestamp(timezone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(new Date());
}

function renderSummary(rows, timezone = DEFAULT_TIMEZONE) {
  const blocks = [];
  const totalCount = rows.length;
  const openCount = rows.filter(row => row.status !== 'Closed').length;
  const followUpCount = rows.filter(row => row.followUpNeeded && row.status !== 'Closed').length;

  blocks.push(calloutBlock(`Last updated: ${formatTimestamp(timezone)}`, '🕐', 'gray_background'));
  blocks.push(
    paragraphBlock([
      textFragment(`${totalCount} total items`, { bold: true }),
      textFragment(` · ${openCount} open · ${followUpCount} follow-ups needed`),
    ])
  );

  if (!rows.length) {
    blocks.push(paragraphBlock([textFragment('No rows are currently present in the working dashboard database.')]));
    return blocks;
  }

  const statuses = [...new Set(rows.map(row => row.status))].sort(
    (left, right) => statusOrderIndex(left) - statusOrderIndex(right) || left.localeCompare(right)
  );

  for (const status of statuses) {
    const statusRows = rows.filter(row => row.status === status);
    blocks.push(heading3Block(`${status} (${statusRows.length})`));

    const priorities = [...new Set(statusRows.map(row => row.priority))].sort(
      (left, right) => priorityOrderIndex(left) - priorityOrderIndex(right) || left.localeCompare(right)
    );

    for (const priority of priorities) {
      const priorityRows = statusRows.filter(row => row.priority === priority);
      blocks.push(paragraphBlock([textFragment(`${priority} Priority (${priorityRows.length})`, { bold: true })]));

      for (const row of priorityRows) {
        const suffix = [];
        if (row.projectTag) {
          suffix.push(row.projectTag);
        }
        if (row.followUpNeeded) {
          suffix.push('Follow up needed');
        }

        const parts = [
          textFragment(row.title, {
            bold: priority === 'High' && status !== 'Closed',
          }),
        ];

        if (suffix.length) {
          parts.push(textFragment(` — ${suffix.join(' · ')}`, { color: 'gray' }));
        }

        blocks.push(bulletedItemBlock(parts));
      }
    }
  }

  return blocks;
}

function buildInsertionPlacement(config, topLevelChildren, databaseBlock) {
  const databaseIndex = topLevelChildren.findIndex(child => child.id === databaseBlock.id);
  if (databaseIndex === -1) {
    throw new Error('Working database block is not a direct child of the dashboard page');
  }

  if (databaseIndex === 0) {
    if (versionAtLeast(config.apiVersion, '2026-03-11')) {
      return { type: 'start' };
    }

    throw new Error(
      'The working database block is the first child on the page. Insert-at-start requires Notion-Version 2026-03-11 or newer.'
    );
  }

  return { type: 'after', afterBlockId: topLevelChildren[databaseIndex - 1].id };
}

async function replaceSummaryInMarkerRange(client, markerContext, summaryBlocks) {
  const existingSummaryBlockIds = markerContext.children
    .slice(markerContext.startIndex + 1, markerContext.endIndex)
    .map(block => block.id);

  await client.appendChildren(markerContext.parentId, summaryBlocks, {
    type: 'after',
    afterBlockId: markerContext.children[markerContext.startIndex].id,
  });

  for (const blockId of existingSummaryBlockIds) {
    await client.archiveBlock(blockId);
  }
}

async function insertSummarySection(client, config, topLevelChildren, databaseBlock, summaryBlocks) {
  const placement = buildInsertionPlacement(config, topLevelChildren, databaseBlock);
  const sectionBlocks = [
    markerBlock(SUMMARY_START_MARKER),
    ...summaryBlocks,
    markerBlock(SUMMARY_END_MARKER),
  ];

  await client.appendChildren(config.pageId, sectionBlocks, placement);
}

export async function main(env = process.env) {
  const config = buildConfig(env);
  if (!config.token) {
    throw new Error('NOTION_TOKEN is required');
  }

  const client = new NotionClient(config);

  console.log(`Reading dashboard page ${dashedNotionId(config.pageId)}...`);
  const topLevelChildren = await client.listBlockChildren(config.pageId);

  const databaseBlock = findTopLevelDatabaseBlock(topLevelChildren, config.databaseId);
  if (!databaseBlock) {
    throw new Error(
      `Could not find the working database block ${dashedNotionId(config.databaseId)} on the dashboard page`
    );
  }

  console.log(`Reading working database ${dashedNotionId(config.databaseId)}...`);
  const database = await client.retrieveDatabase(config.databaseId);
  const { titlePropertyName } = validateDatabase(database, config);

  console.log('Querying working database rows...');
  const pages = await client.queryDatabase(config.databaseId, titlePropertyName);
  const rows = buildSummaryRows(pages, titlePropertyName);
  console.log(`Rendering summary from ${rows.length} rows...`);
  const summaryBlocks = renderSummary(rows, config.timezone);

  console.log('Locating dashboard summary markers...');
  const markerContexts = await collectMarkerContexts(client, config.pageId);
  const markerContext = selectMarkerContext(markerContexts);

  if (markerContext) {
    console.log(`Updating existing marker range under block ${dashedNotionId(markerContext.parentId)}...`);
    await replaceSummaryInMarkerRange(client, markerContext, summaryBlocks);
  } else {
    console.log('No marker range found. Inserting a new summary section above the working database block...');
    await insertSummarySection(client, config, topLevelChildren, databaseBlock, summaryBlocks);
  }

  console.log('Dashboard summary updated successfully.');
}

const isDirectExecution =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch(error => {
    console.error(`Dashboard update failed: ${error.message}`);
    process.exit(1);
  });
}
