import { queryRows, tableValue, validatePage } from './table-model.js';

export const MAX_EXPORT_ROWS = 50000;
const aborted = signal => { if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError'); };

/** Gather a snapshot without changing the table's query or pagination. */
export async function collectExportRows({ scope, rows = [], visibleRows = [], selectedIds = [], selectedRows = new Map(),
  columns, query, loadRows, loadExportRows, getRowId = row => row.id, signal, onProgress = () => {} }) {
  aborted(signal);
  let result;
  if (loadExportRows) {
    result = await loadExportRows({ ...query, scope, selectedIds: [...selectedIds], signal });
  } else if (scope === 'page') {
    result = [...visibleRows];
  } else if (scope === 'selected') {
    const byId = loadRows ? selectedRows : new Map(rows.map(row => [getRowId(row), row]));
    result = selectedIds.map(id => byId.get(id));
    if (result.some(row => row === undefined)) throw new Error('Some selected rows are no longer loaded. Re-select them or provide a selected-row export loader.');
  } else if (!loadRows) {
    result = queryRows(rows, columns, { ...query, page: 1, pageSize: Math.max(1, rows.length) }).rows;
  } else {
    result = [];
    const seen = new Set();
    let total;
    for (let page = 1; ; page++) {
      aborted(signal);
      const batch = validatePage(await loadRows({ ...query, page, signal }));
      aborted(signal);
      if (batch.total > MAX_EXPORT_ROWS) throw new Error('This export exceeds 50,000 rows. Narrow the filters and try again.');
      if (total !== undefined && batch.total !== total) throw new Error('The records changed during export. Please try again.');
      total = batch.total;
      for (const row of batch.rows) {
        const id = getRowId(row);
        if (seen.has(id)) throw new Error('The server returned overlapping pages. Refresh the table and try again.');
        seen.add(id);
        result.push(row);
      }
      onProgress(result.length, total);
      if (result.length === total) break;
      if (!batch.rows.length || result.length > total || batch.rows.length !== query.pageSize)
        throw new Error('The server returned an incomplete page. Please try again or use a dedicated export loader.');
    }
  }
  aborted(signal);
  if (!Array.isArray(result)) throw new Error('The export loader must return an array of rows.');
  if (result.length > MAX_EXPORT_ROWS) throw new Error('This export exceeds 50,000 rows. Narrow the filters and try again.');
  onProgress(result.length, result.length);
  return result;
}

export function excelFileName(name = 'Records') {
  let safe = String(name).replace(/\.xlsx$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim().replace(/[. ]+$/g, '').slice(0, 120);
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(safe)) safe = `Export-${safe}`;
  return `${safe || 'Records'}.xlsx`;
}

export function excelSheetName(name = 'Records') {
  return String(name).replace(/[\[\]:*?/\\\u0000-\u001f]/g, ' ').trim().slice(0, 31).replace(/^'+|'+$/g, '') || 'Records';
}

function excelCell(value, column) {
  if (value == null) return null;
  let type = String, format = column.exportFormat;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null;
    type = Date;
    format ||= 'yyyy-mm-dd hh:mm';
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    type = Number;
  } else if (typeof value === 'boolean') type = Boolean;
  else {
    value = typeof value === 'object' ? JSON.stringify(value) : String(value);
    // Explicit String cells keep values such as '=SUM(...)' as data, never formulas.
    value = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
    if (value.length > 32767) throw new Error(`A value in “${column.label}” exceeds Excel's cell text limit.`);
  }
  return { value, type, ...(format ? { format } : {}) };
}

export function excelSheetData(rows, columns) {
  if (!Array.isArray(rows)) throw new Error('The export loader must return an array of rows.');
  if (rows.length > MAX_EXPORT_ROWS) throw new Error('This export exceeds 50,000 rows. Narrow the filters and try again.');
  const exportedColumns = columns.filter(column => column.exportable !== false);
  if (!exportedColumns.length) throw new Error('There are no exportable columns.');
  const data = [exportedColumns.map(column => ({ value: String(column.exportLabel ?? column.label), type: String,
    fontWeight: 'bold', backgroundColor: '#242438', textColor: '#FFFFFF', height: 24 }))];
  for (const row of rows) data.push(exportedColumns.map(column =>
    excelCell(column.exportValue ? column.exportValue(row) : tableValue(row, column), column)));
  const widths = exportedColumns.map((column, index) => ({ width: column.exportWidth ?? Math.min(48,
    Math.max(14, ...data.slice(0, 201).map(row => String(row[index]?.value ?? '').length + 2))) }));
  return { data, columns: widths };
}

export async function createExcelBlob(rows, columns, label) {
  const { data, columns: widths } = excelSheetData(rows, columns);
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  return writeExcelFile(data, { sheet: excelSheetName(label), columns: widths, stickyRowsCount: 1 },
    { fontFamily: 'Calibri', fontSize: 11 }).toBlob();
}

export function downloadExcel(blob, fileName) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url;
  link.download = excelFileName(fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Allow the browser to begin reading the Blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
