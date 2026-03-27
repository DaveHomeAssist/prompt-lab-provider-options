import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RunTimelinePanel from '../RunTimelinePanel.jsx';

const useEvalRunsMock = vi.fn();

vi.mock('../hooks/useEvalRuns.js', () => ({
  default: (...args) => useEvalRunsMock(...args),
}));

vi.mock('../icons.jsx', () => ({
  default: () => null,
}));

const theme = {
  surface: 'bg-slate-900',
  border: 'border-slate-700',
  text: 'text-slate-100',
  textMuted: 'text-slate-400',
  textSub: 'text-slate-300',
  textBody: 'text-slate-100',
  codeBlock: 'bg-slate-800',
  input: 'bg-slate-950 text-slate-100 border-slate-700',
  btn: 'bg-slate-800',
  textAlt: 'text-slate-100',
  diffAdd: 'bg-emerald-500/20 text-emerald-100',
  diffDel: 'bg-red-500/20 text-red-100',
  diffEq: 'bg-slate-700 text-slate-100',
};

function renderPanel(overrides = {}) {
  return render(
    <RunTimelinePanel
      m={theme}
      prompt={null}
      copy={vi.fn()}
      compact={false}
      pageScroll={false}
      {...overrides}
    />
  );
}

describe('RunTimelinePanel', () => {
  beforeEach(() => {
    localStorage.clear();
    useEvalRunsMock.mockReset();
    useEvalRunsMock.mockReturnValue({
      evalRuns: [
        {
          id: 'run-1',
          provider: 'openai',
          model: 'gpt-4.1',
          mode: 'enhance',
          status: 'success',
          createdAt: '2026-03-24T10:00:00.000Z',
          output: 'First output',
          latencyMs: 420,
        },
        {
          id: 'run-2',
          provider: 'anthropic',
          model: 'claude-3.7-sonnet',
          mode: 'ab',
          status: 'error',
          createdAt: '2026-03-24T11:00:00.000Z',
          output: 'Second output',
          latencyMs: 560,
        },
      ],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      updateRun: vi.fn(),
    });
  });

  it('rehydrates persisted Evaluate filters on mount', () => {
    localStorage.setItem('pl2-evaluate-timeline-filters', JSON.stringify({
      mode: 'ab',
      provider: 'openai',
      model: 'gpt-4.1',
      status: 'success',
      dateRange: '90d',
      search: 'latency',
      showModelCompare: true,
    }));

    renderPanel();

    expect(screen.getByLabelText('Filter by mode')).toHaveValue('ab');
    expect(screen.getByLabelText('Filter by provider')).toHaveValue('openai');
    expect(screen.getByLabelText('Filter by model')).toHaveValue('gpt-4.1');
    expect(screen.getByLabelText('Filter by status')).toHaveValue('success');
    expect(screen.getByLabelText('Filter by date range')).toHaveValue('90d');
    expect(screen.getByPlaceholderText('Search runs…')).toHaveValue('latency');
    expect(screen.getByText('Model Comparison (latest per model)')).toBeInTheDocument();
  });

  it('persists filter edits and supports resetting them', async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText('Filter by mode'), { target: { value: 'ab' } });
    fireEvent.change(screen.getByPlaceholderText('Search runs…'), { target: { value: 'regression' } });

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('pl2-evaluate-timeline-filters'))).toMatchObject({
        mode: 'ab',
        search: 'regression',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset Filters' }));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('pl2-evaluate-timeline-filters'))).toEqual({
        mode: '',
        provider: '',
        model: '',
        status: '',
        dateRange: '30d',
        search: '',
        showModelCompare: false,
      });
    });

    expect(screen.getByLabelText('Filter by mode')).toHaveValue('');
    expect(screen.getByPlaceholderText('Search runs…')).toHaveValue('');
  });
});
