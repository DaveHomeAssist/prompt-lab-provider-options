import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import useUiState from '../hooks/useUiState.js';

describe('useUiState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('maps tab changes into the expected primary and sub-view state', () => {
    const { result } = renderHook(() => useUiState());

    expect(result.current.primaryView).toBe('create');
    expect(result.current.workspaceView).toBe('editor');
    expect(result.current.runsView).toBe('history');
    expect(result.current.tab).toBe('editor');

    act(() => {
      result.current.setTab('composer');
    });

    expect(result.current.primaryView).toBe('create');
    expect(result.current.workspaceView).toBe('composer');
    expect(result.current.tab).toBe('composer');

    act(() => {
      result.current.setTab('abtest');
    });

    expect(result.current.primaryView).toBe('runs');
    expect(result.current.runsView).toBe('compare');
    expect(result.current.tab).toBe('abtest');

    act(() => {
      result.current.setTab('history');
    });

    expect(result.current.primaryView).toBe('runs');
    expect(result.current.runsView).toBe('history');
    expect(result.current.tab).toBe('history');

    act(() => {
      result.current.setTab('pad');
    });

    expect(result.current.primaryView).toBe('notebook');
    expect(result.current.tab).toBe('pad');
  });
});
