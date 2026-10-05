// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WebMcpPanel from '@/components/WebMcpPanel';
import { createCallLog } from '@/lib/callLog';

const TOOL: WebMCP.Tool = {
  name: 'get_quote',
  title: 'Price a job',
  description: 'Adds up a job.',
  inputSchema: {
    type: 'object',
    properties: {
      service: { type: 'string', enum: ['tune-up', 'wheel-build'], description: 'Which service.' },
      collection: { type: 'boolean', description: 'Adds a flat fee.' },
    },
    required: ['service'],
  },
  execute: () => ({ content: [] }),
};

function renderPanel() {
  sessionStorage.clear();
  const log = createCallLog('panel-test');
  const onTry = vi.fn();
  render(
    <>
      <main>
        <input aria-label="Page field" />
      </main>
      <WebMcpPanel tools={[TOOL]} log={log} onTry={onTry} />
    </>,
  );
  const pill = screen.getByRole('button', { name: /webmcp tools/i });
  return { log, onTry, pill };
}

describe('WebMcpPanel', () => {
  it('opens from the pill and says WebMCP is off in this browser', () => {
    const { pill } = renderPanel();
    fireEvent.click(pill);
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/not available in this browser/)).toBeVisible();
  });

  it('closes on Escape from inside the panel and returns focus to the pill', () => {
    const { pill } = renderPanel();
    fireEvent.click(pill);
    const select = screen.getByLabelText(/service/);
    select.focus();
    fireEvent.keyDown(select, { key: 'Escape' });
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    expect(pill).toHaveFocus();
  });

  it('ignores Escape pressed in the page', () => {
    const { pill } = renderPanel();
    fireEvent.click(pill);
    const pageField = screen.getByLabelText('Page field');
    pageField.focus();
    fireEvent.keyDown(pageField, { key: 'Escape' });
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    expect(pageField).toHaveFocus();
  });

  it('shows each parameter description as hint text tied to its control', () => {
    const { pill } = renderPanel();
    fireEvent.click(pill);
    expect(screen.getByLabelText(/collection/)).toHaveAccessibleDescription('Adds a flat fee.');
    expect(screen.getByLabelText(/service/)).toHaveAccessibleDescription('Which service.');
  });

  it('Run sends the typed input, with the checkbox off unless ticked', () => {
    const { pill, onTry } = renderPanel();
    fireEvent.click(pill);
    fireEvent.change(screen.getByLabelText(/service/), { target: { value: 'wheel-build' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(onTry).toHaveBeenCalledWith('get_quote', { service: 'wheel-build', collection: false });
  });
});
