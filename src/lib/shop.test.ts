import { describe, expect, it } from 'vitest';
import {
  COLLECTION_FEE,
  SERVICES,
  canonicalTown,
  findService,
  listInWords,
  quoteTotal,
} from '@/lib/shop';

describe('canonicalTown', () => {
  it('returns the listed spelling whatever the case and spacing', () => {
    expect(canonicalTown('  bramley ')).toBe('Bramley');
  });

  it('returns undefined for a town not on the list', () => {
    expect(canonicalTown('Springfield')).toBeUndefined();
  });
});

describe('findService', () => {
  it('finds a service by id', () => {
    const [, second] = SERVICES;
    expect(findService(second.id)).toBe(second);
  });

  it('returns undefined for an unknown id', () => {
    expect(findService('moon-landing')).toBeUndefined();
  });
});

describe('quoteTotal', () => {
  const service = SERVICES[0];

  it('adds the collection fee only when collecting', () => {
    expect(quoteTotal(service, false)).toBe(service.price);
    expect(quoteTotal(service, true)).toBe(service.price + COLLECTION_FEE);
  });
});

describe('listInWords', () => {
  it.each([
    [[], ''],
    [['A'], 'A'],
    [['A', 'B'], 'A and B'],
    [['A', 'B', 'C'], 'A, B and C'],
  ])('%j becomes "%s"', (items, expected) => {
    expect(listInWords(items)).toBe(expected);
  });
});
