import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Check, Code2, Copy, WrapText } from 'lucide-react';
import { Button, IconButton, Skeleton } from './primitives.jsx';

const Editor = lazy(() => import('./CodeEditorContent.jsx'));
const languageNames = {
  jsx: 'React · JSX', tsx: 'React · TSX', javascript: 'JavaScript', typescript: 'TypeScript',
  json: 'JSON', html: 'HTML', css: 'CSS', python: 'Python', sql: 'SQL', text: 'Plain text',
};

/** A lazy CodeMirror editor. Read-only by default; source is always treated as text. */
export function CodeEditor({
  value = '', onChange, language = 'jsx', label = 'Code', readOnly = true,
  lineNumbers = true, lineWrapping = true, copyable = true, loading = false,
  minHeight = '120px', maxHeight = '480px', className = '',
}) {
  const [wrap, setWrap] = useState(lineWrapping);
  const [copyStatus, setCopyStatus] = useState('');
  const copyRevision = useRef(0);
  const text = String(value ?? '');
  useEffect(() => setWrap(lineWrapping), [lineWrapping]);
  useEffect(() => {
    setCopyStatus('');
    return () => { copyRevision.current += 1; };
  }, [text]);
  useEffect(() => {
    if (!copyStatus) return;
    const timer = setTimeout(() => setCopyStatus(''), 2500);
    return () => clearTimeout(timer);
  }, [copyStatus]);
  async function copy() {
    const revision = ++copyRevision.current;
    try {
      await navigator.clipboard.writeText(text);
      if (copyRevision.current === revision) setCopyStatus('Copied');
    } catch {
      if (copyRevision.current === revision) setCopyStatus('Select the code and copy it manually.');
    }
  }
  const placeholder = <div className="cgw-code-loading" role="status" aria-label="Loading code editor" style={{ minHeight }}>
    <Skeleton width="62%" /><Skeleton width="84%" /><Skeleton width="72%" /><Skeleton width="45%" />
  </div>;
  return (
    <section className={`cgw-code-editor ${className}`} aria-label={label} aria-busy={loading || undefined}>
      <div className="cgw-code-toolbar">
        <span className="cgw-code-language"><Code2 size={15} aria-hidden="true" />{languageNames[language] || languageNames.text}</span>
        <div className="cgw-row">
          <IconButton label="Wrap lines" icon={WrapText} variant="ghost" size="sm" aria-pressed={wrap} onClick={() => setWrap(previous => !previous)} />
          {copyable && <Button size="sm" variant="secondary" icon={copyStatus === 'Copied' ? Check : Copy} disabled={loading || !text} onClick={copy}>
            {copyStatus === 'Copied' ? 'Copied' : 'Copy code'}
          </Button>}
        </div>
      </div>
      {loading ? placeholder : <Suspense fallback={placeholder}>
        <Editor value={text} onChange={onChange} language={language} label={label} readOnly={readOnly}
          lineNumbers={lineNumbers} lineWrapping={wrap} minHeight={minHeight} maxHeight={maxHeight} />
      </Suspense>}
      <div className="cgw-code-footer">
        <span role="status">{copyStatus || `${text.split('\n').length} ${text.includes('\n') ? 'lines' : 'line'}`}</span>
        <span>{readOnly ? 'Read only' : 'Editable'}</span>
      </div>
    </section>
  );
}
