import { describe, expect, it } from 'vitest';
import { formatPluralCollection, formatSingularCollection } from './formatCollection';

describe('managed collection labels', () => {
  it('formats existing approval collections for notifications and review cards', () => {
    expect(formatSingularCollection('clients')).toBe('Client');
    expect(formatSingularCollection('cameramen')).toBe('Cameraman');
    expect(formatSingularCollection('shoots')).toBe('Shoot');
    expect(formatSingularCollection('expenses')).toBe('Expense');
    expect(formatPluralCollection('clients')).toBe('Clients');
    expect(formatPluralCollection('shoots')).toBe('Shoots');
  });
});
