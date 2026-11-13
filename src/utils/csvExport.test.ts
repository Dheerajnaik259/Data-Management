import { describe, expect, it } from 'vitest';
import { csvCell } from './csvExport';

describe('csvCell', () => {
  it.each(['=1+1', '+1+1', '-1+1', '@SUM(A1:A2)', '\t=1+1', '\r=1+1', ' \uFEFF=1+1'])(
    'neutralizes formula-like values: %s',
    value => {
      expect(csvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
    },
  );

  it('quotes values and escapes embedded quotes', () => {
    expect(csvCell('A "quoted" value')).toBe('"A ""quoted"" value"');
  });

  it('converts nullish values to empty cells', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });
});
