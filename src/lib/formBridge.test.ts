import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookingPrefill } from '@/lib/formBridge';

const VALUES: BookingPrefill = {
  name: 'Sam Ellis',
  email: 'sam@example.com',
  town: 'Bramley',
  service: 'tune-up',
  notes: '',
};

/* The bridge keeps module state, so each test gets a fresh copy. */
let bridge: typeof import('@/lib/formBridge');
beforeEach(async () => {
  vi.resetModules();
  bridge = await import('@/lib/formBridge');
});

describe('formBridge', () => {
  it('fills straight away when a form is listening', () => {
    const fill = vi.fn();
    bridge.registerFiller(fill);
    expect(bridge.requestPrefill(VALUES)).toBe(true);
    expect(fill).toHaveBeenCalledWith(VALUES);
  });

  it('queues the values until a form mounts', () => {
    expect(bridge.requestPrefill(VALUES)).toBe(false);
    const fill = vi.fn();
    bridge.registerFiller(fill);
    expect(fill).toHaveBeenCalledWith(VALUES);
  });

  it('applies queued values once only', () => {
    bridge.requestPrefill(VALUES);
    bridge.registerFiller(vi.fn())();
    const second = vi.fn();
    bridge.registerFiller(second);
    expect(second).not.toHaveBeenCalled();
  });

  it('does not requeue values when the filler throws', () => {
    bridge.requestPrefill(VALUES);
    expect(() =>
      bridge.registerFiller(() => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    const next = vi.fn();
    bridge.registerFiller(next);
    expect(next).not.toHaveBeenCalled();
  });

  it('an old unsubscribe does not remove a newer filler', () => {
    const unsubscribeFirst = bridge.registerFiller(vi.fn());
    const second = vi.fn();
    bridge.registerFiller(second);
    unsubscribeFirst();
    expect(bridge.requestPrefill(VALUES)).toBe(true);
    expect(second).toHaveBeenCalled();
  });
});
