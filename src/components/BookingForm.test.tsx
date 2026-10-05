// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BookingForm from '@/components/BookingForm';
import { requestPrefill } from '@/lib/formBridge';

const PREFILL = {
  name: 'Sam Ellis',
  email: 'sam@example.com',
  town: 'Bramley',
  service: 'tune-up',
  notes: 'Gears slip.',
};

beforeEach(() => {
  /* jsdom has no matchMedia or scrollTo, and the fill uses both. */
  window.matchMedia = vi.fn(() => ({ matches: true }) as unknown as MediaQueryList);
  window.scrollTo = vi.fn();
});

describe('BookingForm', () => {
  it('fills from a tool', () => {
    render(<BookingForm />);
    act(() => {
      requestPrefill(PREFILL);
    });
    expect(screen.getByLabelText('Your name')).toHaveValue('Sam Ellis');
    expect(screen.getByLabelText('Town')).toHaveValue('Bramley');
    expect(screen.getByLabelText('Service')).toHaveValue('tune-up');
  });

  it('sends the filled values', async () => {
    const send = vi.fn(async () => {});
    render(<BookingForm send={send} />);
    act(() => {
      requestPrefill(PREFILL);
    });
    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: 'Send request' }).closest('form')!);
    });
    expect(send).toHaveBeenCalledWith(PREFILL);
    expect(screen.getByText('Request sent.')).toBeInTheDocument();
  });
});
