import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App.jsx';

describe('App smoke', () => {
  beforeEach(() => {
    localStorage.clear();
    window.confirm = vi.fn(() => true);
    window.open = vi.fn();
    window.matchMedia = window.matchMedia || vi.fn(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue(''),
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    if (!globalThis.crypto?.randomUUID) {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        configurable: true,
        value: () => 'test-uuid',
      });
    }
  });

  it('renders the primary shell without crashing', async () => {
    render(<App />);
    expect(await screen.findAllByText('Prompt Lab')).not.toHaveLength(0);
  });

  it('keeps both panes mounted when Dual Pane is selected', async () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Dual Pane' })[0]);

    await waitFor(() => {
      expect(screen.getByLabelText('Prompt editor workspace')).toBeInTheDocument();
      expect(screen.getByLabelText('Prompt library sidebar')).toBeInTheDocument();
    });
  });
});
