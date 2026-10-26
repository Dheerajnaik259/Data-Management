import { describe, expect, it } from 'vitest';
import { canApprove, canDelete, canHardDelete, canRestore } from './permissions';

describe('role permissions', () => {
  it('allows Admin recycle-bin management but not Founder mutation', () => {
    expect(canDelete('admin')).toBe(true);
    expect(canRestore('admin')).toBe(true);
    expect(canHardDelete('admin')).toBe(true);
    expect(canDelete('founder')).toBe(false);
    expect(canRestore('founder')).toBe(false);
    expect(canHardDelete('founder')).toBe(false);
  });

  it('reserves approval decisions for the Founder', () => {
    expect(canApprove('founder')).toBe(true);
    expect(canApprove('admin')).toBe(false);
  });
});
