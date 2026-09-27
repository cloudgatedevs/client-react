import { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Alert, Button, Dialog, Input, Select } from './primitives.jsx';
import { createExcelBlob, downloadExcel } from './table-export.js';

const DEFAULT_SCOPES = [{ value: 'page', label: 'Rows currently shown' }];

/** Shared export control for SDK data tables and read-only table views. */
export function TableExport({ label = 'Records', columns, getRows, scopes = DEFAULT_SCOPES, fileName = label, disabled = false, hasSubtables = false }) {
  const [open, setOpen] = useState(false), [scope, setScope] = useState(scopes[0]?.value),
    [name, setName] = useState(fileName), [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(''), [error, setError] = useState('');
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  function close() { request.current?.abort(); request.current = null; setBusy(false); setOpen(false); }
  async function exportFile() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(''); setProgress('Preparing records…');
    try {
      const rows = await getRows({ scope, signal: controller.signal, onProgress: (count, total) => {
        if (!controller.signal.aborted) setProgress(`Preparing ${count.toLocaleString()} of ${total.toLocaleString()} rows…`);
      } });
      if (controller.signal.aborted) return;
      setProgress('Creating Excel file…');
      const blob = await createExcelBlob(rows, columns, label);
      if (controller.signal.aborted) return;
      downloadExcel(blob, name);
      close();
    } catch (error) {
      if (!controller.signal.aborted) setError(error?.message || 'Could not create the Excel file. Please try again.');
    } finally {
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }
  return <>
    <Button variant="secondary" size="sm" icon={FileSpreadsheet} disabled={disabled || !columns.some(column => column.exportable !== false)}
      aria-label={`Export ${label} to Excel`} onClick={() => { setScope(scopes[0]?.value); setName(fileName); setError(''); setOpen(true); }}>
      Excel
    </Button>
    <Dialog open={open} onClose={close} title="Export to Excel" size="sm" description={label}
      footer={<><Button variant="secondary" onClick={close}>{busy ? 'Cancel export' : 'Cancel'}</Button>
        <Button icon={FileSpreadsheet} loading={busy} disabled={!name.trim()} onClick={exportFile}>Download Excel</Button></>}>
      <div className="cgw-stack">
        <Select label="Rows to export" options={scopes} value={scope} disabled={busy} onChange={event => setScope(event.target.value)} />
        <Input label="File name" value={name} disabled={busy} onChange={event => setName(event.target.value)} hint="Saved as an .xlsx workbook." />
        <p className="cgw-muted">Exports {columns.filter(column => column.exportable !== false).length} visible data columns.{hasSubtables && ' Subtables are exported separately using their own Excel button.'}</p>
        {busy && <p role="status" aria-live="polite" className="cgw-muted">{progress}</p>}
        {error && <Alert tone="danger" title="Export failed">{error}</Alert>}
      </div>
    </Dialog>
  </>;
}
