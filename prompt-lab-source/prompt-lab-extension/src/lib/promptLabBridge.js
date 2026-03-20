export const PROMPT_LAB_APP_URL = 'https://promptlab.tools/app';
export const MAX_INLINE_PROMPT_URL_LENGTH = 3500;

function resolveBaseUrl(baseUrl = PROMPT_LAB_APP_URL) {
  try {
    return new URL(baseUrl);
  } catch {
    return new URL(PROMPT_LAB_APP_URL);
  }
}

export function buildPromptLabUrl({
  draft = '',
  title = '',
  source = 'notebook',
  tab = 'editor',
  clipboard = false,
  baseUrl = PROMPT_LAB_APP_URL,
} = {}) {
  const url = resolveBaseUrl(baseUrl);
  if (tab) url.searchParams.set('tab', tab);
  if (source) url.searchParams.set('source', source);
  if (title) url.searchParams.set('title', title);
  if (clipboard) {
    url.searchParams.set('clipboard', '1');
  } else if (draft) {
    url.searchParams.set('draft', draft);
  }
  return url.toString();
}

export function buildPromptLabHandoff({
  draft = '',
  title = '',
  source = 'notebook',
  tab = 'editor',
  baseUrl = PROMPT_LAB_APP_URL,
  maxUrlLength = MAX_INLINE_PROMPT_URL_LENGTH,
} = {}) {
  const text = String(draft || '').trim();
  if (!text) {
    return { ok: false, error: 'empty-draft' };
  }

  const inlineUrl = buildPromptLabUrl({ draft: text, title, source, tab, baseUrl });
  if (inlineUrl.length <= maxUrlLength) {
    return {
      ok: true,
      url: inlineUrl,
      clipboard: false,
      draft: text,
      promptLabLink: inlineUrl,
    };
  }

  const clipboardUrl = buildPromptLabUrl({ title, source, tab, clipboard: true, baseUrl });
  return {
    ok: true,
    url: clipboardUrl,
    clipboard: true,
    draft: text,
    promptLabLink: clipboardUrl,
  };
}

async function defaultClipboardWriter(text) {
  if (!navigator?.clipboard?.writeText) {
    throw new Error('clipboard-unavailable');
  }
  await navigator.clipboard.writeText(text);
}

export async function preparePromptLabHandoff(options = {}) {
  const handoff = buildPromptLabHandoff(options);
  if (!handoff.ok || !handoff.clipboard) {
    return handoff;
  }

  const writeClipboard = options.writeClipboard || defaultClipboardWriter;
  try {
    await writeClipboard(handoff.draft);
    return {
      ...handoff,
      copiedToClipboard: true,
    };
  } catch (error) {
    return {
      ok: false,
      error: 'clipboard-write-failed',
      cause: error,
      url: handoff.url,
      promptLabLink: handoff.promptLabLink,
    };
  }
}

export function parsePromptLabDraftParams(input = globalThis.location?.href) {
  if (!input) return null;
  const url = input instanceof URL ? new URL(input.toString()) : new URL(String(input));
  const draft = url.searchParams.get('draft') || '';
  const title = url.searchParams.get('title') || '';
  const source = url.searchParams.get('source') || '';
  const tab = url.searchParams.get('tab') || '';
  const clipboard = url.searchParams.get('clipboard') === '1';

  if (!draft && !clipboard) return null;

  return {
    draft,
    title,
    source,
    tab,
    clipboard,
  };
}

export function stripPromptLabDraftParams(input = globalThis.location?.href) {
  if (!input) return '';
  const url = input instanceof URL ? new URL(input.toString()) : new URL(String(input));
  ['draft', 'title', 'source', 'tab', 'clipboard'].forEach((key) => url.searchParams.delete(key));
  return `${url.pathname}${url.search}${url.hash}`;
}
