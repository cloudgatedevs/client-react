import { useEffect, useMemo, useRef, useState } from 'react';
import { icons, Check, ChevronLeft, ChevronRight, Copy, Search, SearchX } from 'lucide-react';
import { Button, EmptyState, Input, Select } from './primitives.jsx';
import { CodeEditor } from './CodeEditor.jsx';
import { createIconIndex, iconCategories, iconSnippet, searchIcons } from './icon-model.js';

const index = createIconIndex(icons);
const pageSize = 60;
const categories = [{value:'all', label:`All icons · ${index.length}`},
  ...iconCategories.map(category => ({value:category.id, label:`${category.label} · ${searchIcons(index, '', category.id).length}`})),
  {value:'other', label:`Other · ${searchIcons(index, '', 'other').length}`}];

export default function IconLibraryContent({ initialSearch = '', defaultIcon = 'Sparkles', onSelect, className = '' }) {
  const [search, setSearch] = useState(initialSearch), [category, setCategory] = useState('all');
  const [page, setPage] = useState(1), [selected, setSelected] = useState(() => Object.hasOwn(icons, defaultIcon) ? defaultIcon : 'Sparkles');
  const [size, setSize] = useState(24), [stroke, setStroke] = useState(2), [tone, setTone] = useState('default');
  const [copyStatus, setCopyStatus] = useState('');
  const copyRevision = useRef(0), resultsRef = useRef(null), inspectorRef = useRef(null);
  const matches = useMemo(() => searchIcons(index, search, category), [search, category]);
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pages), start = (currentPage - 1) * pageSize;
  const displayed = matches.slice(start, start + pageSize);
  const SelectedIcon = icons[selected];
  const snippet = iconSnippet(selected, size, stroke, tone);
  useEffect(() => { setCopyStatus(''); copyRevision.current += 1; }, [snippet]);
  useEffect(() => { if (!copyStatus) return; const timer = setTimeout(() => setCopyStatus(''), 2500); return () => clearTimeout(timer); }, [copyStatus]);
  useEffect(() => () => { copyRevision.current += 1; }, []);
  async function copy(text, message) {
    const revision = ++copyRevision.current;
    try { await navigator.clipboard.writeText(text); if (revision === copyRevision.current) setCopyStatus(message); }
    catch { if (revision === copyRevision.current) setCopyStatus('Open Usage code to select and copy manually.'); }
  }
  function select(name) {
    setSelected(name); onSelect?.({name, icon:icons[name]});
    // On narrow layouts the inspector is above the results, so bring the choice
    // back into view and put keyboard focus beside the copy/customize controls.
    if (window.matchMedia('(max-width: 1000px)').matches) {
      inspectorRef.current?.focus({preventScroll:true});
      inspectorRef.current?.scrollIntoView({block:'nearest', behavior:'instant'});
    }
  }
  function changePage(next) {
    setPage(next);
    resultsRef.current?.focus({preventScroll:true});
    resultsRef.current?.scrollIntoView({block:'start', behavior:'instant'});
  }
  return <section className={`cgw-icon-library ${className}`} aria-label="Icon library">
    <div className="cgw-icon-toolbar">
      <Input label="Search icons" placeholder="Search names or keywords…" icon={Search} value={search} onChange={event => {setSearch(event.target.value); setPage(1);}} />
      <Select label="Category" value={category} onChange={event => {setCategory(event.target.value); setPage(1);}} options={categories} />
    </div>
    <div className="cgw-icon-layout">
      <div className="cgw-icon-results" ref={resultsRef} tabIndex={-1}>
        <div className="cgw-icon-results-head"><span role="status">{matches.length.toLocaleString()} {matches.length === 1 ? 'icon' : 'icons'}{search ? ` matching “${search}”` : ' to explore'}</span><span>Lucide</span></div>
        {displayed.length ? <ul className="cgw-icon-grid" aria-label="Available icons">
          {displayed.map(({name,label}) => {
            const Symbol = icons[name];
            return <li key={name}><button type="button" className="cgw-icon-tile" aria-label={`Select ${name}`} aria-pressed={selected === name} title={name} onClick={() => select(name)}>
              <span className={`cgw-icon-symbol${tone === 'accent' ? ' cgw-icon-symbol--accent' : ''}`}><Symbol size={size} strokeWidth={stroke} aria-hidden="true" /></span>
              <span className="cgw-icon-name">{label}</span>
              {selected === name && <Check size={12} className="cgw-icon-selected" aria-hidden="true" />}
            </button></li>;
          })}
        </ul> : <EmptyState title="No icons found" description="Try another name, keyword or category." icon={SearchX}
          action={<Button variant="secondary" onClick={() => {setSearch(''); setCategory('all'); setPage(1);}}>Clear filters</Button>} />}
        {!!matches.length && <div className="cgw-icon-pagination">
          <span>{start + 1}–{Math.min(start + pageSize, matches.length)} of {matches.length.toLocaleString()}</span>
          <div className="cgw-row"><Button variant="secondary" size="sm" icon={ChevronLeft} aria-label="Previous icons" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)} />
            <span>Page {currentPage} of {pages}</span>
            <Button variant="secondary" size="sm" icon={ChevronRight} aria-label="Next icons" disabled={currentPage === pages} onClick={() => changePage(currentPage + 1)} /></div>
        </div>}
      </div>
      <aside className="cgw-icon-inspector" aria-label="Selected icon" ref={inspectorRef} tabIndex={-1}>
        <div className="cgw-icon-inspector-head">
          <span className={`cgw-icon-large${tone === 'accent' ? ' cgw-icon-symbol--accent' : ''}`}><SelectedIcon size={size} strokeWidth={stroke} aria-hidden="true" /></span>
          <div><span className="cgw-eyebrow">Selected icon</span><h3 aria-live="polite">{selected}</h3><span className="cgw-muted">{size} × {size} · {stroke}px stroke</span></div>
        </div>
        <div className="cgw-icon-controls">
          <Select label="Icon size" value={size} onChange={event => setSize(Number(event.target.value))} options={[16,20,24,32,40,48].map(value => ({value,label:`${value}px`}))} />
          <Select label="Stroke width" value={stroke} onChange={event => setStroke(Number(event.target.value))} options={[1,1.5,2,2.5,3].map(value => ({value,label:`${value}px`}))} />
          <Select label="Icon color" value={tone} onChange={event => setTone(event.target.value)} options={[{value:'default',label:'Text color'},{value:'accent',label:'Theme accent'}]} />
        </div>
        <div className="cgw-icon-copy"><Button size="sm" icon={Copy} onClick={() => copy(snippet, 'React code copied')}>Copy React code</Button>
          <Button size="sm" variant="secondary" onClick={() => copy(selected, 'Icon name copied')}>Copy name</Button></div>
        <p className="cgw-icon-copy-status" role="status">{copyStatus || 'Select an icon to preview and use it.'}</p>
        <details className="cgw-icon-code"><summary>Usage code</summary><CodeEditor label={`${selected} usage`} value={snippet} minHeight="160px" maxHeight="260px" copyable={false} /></details>
        <p className="cgw-icon-hint">Use icons with a text label, or give icon-only buttons an accessible name. Colors follow your app’s theme.</p>
      </aside>
    </div>
  </section>;
}
