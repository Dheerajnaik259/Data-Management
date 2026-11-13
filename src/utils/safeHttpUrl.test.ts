import { describe, expect, it } from 'vitest';
import { safeHttpUrl } from './safeHttpUrl';

describe('safeHttpUrl', () => {
  it('allows HTTPS links', () => {
    expect(safeHttpUrl('https://example.com/path')).toBe('https://example.com/path');
  });

  it.each(['javascript:alert(1)', 'data:text/html,test', 'http://example.com', 'not a URL'])(
    'rejects unsafe links: %s',
    value => {
      expect(safeHttpUrl(value)).toBeNull();
    },
  );
});
