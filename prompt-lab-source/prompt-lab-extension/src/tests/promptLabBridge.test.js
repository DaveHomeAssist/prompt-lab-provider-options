import { describe, expect, it, vi } from 'vitest';
import {
  buildPromptLabHandoff,
  buildPromptLabUrl,
  parsePromptLabDraftParams,
  preparePromptLabHandoff,
  stripPromptLabDraftParams,
} from '../lib/promptLabBridge.js';

describe('promptLabBridge', () => {
  it('builds inline Prompt Lab URLs for normal-sized drafts', () => {
    const url = buildPromptLabUrl({
      draft: 'hello world',
      title: 'Notebook Draft',
      source: 'notebook',
      tab: 'editor',
    });
    expect(url).toContain('draft=hello+world');
    expect(url).toContain('title=Notebook+Draft');
    expect(url).toContain('source=notebook');
    expect(url).toContain('tab=editor');
  });

  it('switches to clipboard fallback when the URL would be too long', () => {
    const handoff = buildPromptLabHandoff({
      draft: 'x'.repeat(5000),
      title: 'Long Draft',
    });
    expect(handoff.ok).toBe(true);
    expect(handoff.clipboard).toBe(true);
    expect(handoff.url).toContain('clipboard=1');
  });

  it('writes to the clipboard for long drafts before handing off', async () => {
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    const handoff = await preparePromptLabHandoff({
      draft: 'x'.repeat(5000),
      title: 'Long Draft',
      writeClipboard,
    });
    expect(writeClipboard).toHaveBeenCalledTimes(1);
    expect(handoff.copiedToClipboard).toBe(true);
    expect(handoff.url).toContain('clipboard=1');
  });

  it('parses and strips incoming draft params', () => {
    const href = 'https://promptlab.tools/app?tab=editor&source=notebook&title=Draft&draft=hello#section';
    expect(parsePromptLabDraftParams(href)).toEqual({
      draft: 'hello',
      title: 'Draft',
      source: 'notebook',
      tab: 'editor',
      clipboard: false,
    });
    expect(stripPromptLabDraftParams(href)).toBe('/app#section');
  });
});
