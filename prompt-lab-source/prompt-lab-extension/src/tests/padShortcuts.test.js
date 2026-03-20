import { describe, expect, it } from 'vitest';
import { matchPadShortcut } from '../lib/padShortcuts.js';

function fakeKeyEvent(key, { meta = false, ctrl = false, shift = false, alt = false } = {}) {
  return {
    key,
    metaKey: meta,
    ctrlKey: ctrl,
    shiftKey: shift,
    altKey: alt,
  };
}

describe('padShortcuts', () => {
  it('matches the supported scratchpad shortcuts', () => {
    expect(matchPadShortcut(fakeKeyEvent('e', { meta: true }))?.id).toBe('export');
    expect(matchPadShortcut(fakeKeyEvent('d', { meta: true, shift: true }))?.id).toBe('insertDate');
    expect(matchPadShortcut(fakeKeyEvent('c', { meta: true, shift: true }))?.id).toBe('copyAll');
    expect(matchPadShortcut(fakeKeyEvent('x', { meta: true, shift: true }))?.id).toBe('clear');
  });

  it('does not match the removed browser-reserved pad shortcuts', () => {
    expect(matchPadShortcut(fakeKeyEvent('t', { meta: true }))).toBe(null);
    expect(matchPadShortcut(fakeKeyEvent('w', { meta: true }))).toBe(null);
    expect(matchPadShortcut(fakeKeyEvent('[', { meta: true }))).toBe(null);
    expect(matchPadShortcut(fakeKeyEvent(']', { meta: true }))).toBe(null);
  });

  it('does not match when modifier shape is wrong', () => {
    expect(matchPadShortcut(fakeKeyEvent('e'))).toBe(null);
    expect(matchPadShortcut(fakeKeyEvent('d', { meta: true }))).toBe(null);
    expect(matchPadShortcut(fakeKeyEvent('x', { meta: true, shift: true, alt: true }))).toBe(null);
  });
});
