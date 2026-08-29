/**
 * Utility to convert array of objects into CSV format and trigger download
 */
export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  headers?: { key: keyof T; label: string }[]
): void {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
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
    // Header row
    headerLabels.map((label) => `"${String(label).replace(/"/g, '""')}"`).join(','),
    // Data rows
    ...rows.map((row) =>
      columnKeys
        .map((key) => {
          const rawVal = row[key];
          let formatted = '';
          if (rawVal !== null && rawVal !== undefined) {
            if (typeof rawVal === 'object') {
              formatted = JSON.stringify(rawVal);
            } else {
              formatted = String(rawVal);
            }
          }
          const str = formatted.replace(/"/g, '""');
          return `"${str}"`;
        })
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
}
