/**
 * Utility to convert array of objects into CSV format and trigger download
 */
export function csvCell(value: unknown): string {
  let text = value == null
    ? ''
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

  if (/^[\s\uFEFF]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  headers?: { key: keyof T; label: string }[]
): boolean {
  if (!rows || !rows.length) {
    return false;
  }

  let columnKeys: (keyof T)[];
  let headerLabels: string[];

  if (headers && headers.length) {
    columnKeys = headers.map((h) => h.key);
    headerLabels = headers.map((h) => h.label);
  } else {
    columnKeys = Object.keys(rows[0]) as (keyof T)[];
    headerLabels = columnKeys as string[];
  }

  const csvContent = [
    headerLabels.map(csvCell).join(','),
    ...rows.map((row) =>
      columnKeys
        .map((key) => csvCell(row[key]))
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
