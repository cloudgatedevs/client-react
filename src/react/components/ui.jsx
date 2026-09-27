// Small shared UI primitives for the admin console.
import { isValidElement, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Search } from 'lucide-react';
import { TableExport } from '../widgets/TableExport.jsx';

/** Tiny async-fetch hook: const { data, loading, error, reload } = useAsync(fn, [deps]) */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

export const Spinner = () => (
  <div role="status" aria-label="Loading" className="flex items-center justify-center py-12">
    <div className="loading-orbit"><span /></div>
  </div>
);

export const ErrorNote = ({ error }) =>
  error ? (
    <div role="alert" className="feedback-note flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3.5 text-sm text-red-700 dark:text-red-300">
      <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{String(error?.message ?? error)}</span>
    </div>
  ) : null;

export const StatCard = ({ label, value, sub, icon: Icon }) => (
  <div className="card stat-card relative overflow-hidden p-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-medium text-mist-muted">{label}</p>
      {Icon && <span className="stat-icon"><Icon size={17} strokeWidth={1.7} aria-hidden="true" /></span>}
    </div>
    <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums text-mist">{value ?? '—'}</p>
    {sub ? <p className="mt-2 text-xs text-mist-dim">{sub}</p> : null}
  </div>
);

const badgeTones = {
  green: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-400/25',
  red: 'bg-red-500/12 text-red-700 dark:text-red-300 ring-red-400/25',
  amber: 'bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-400/25',
  gray: 'bg-ink-700/60 text-mist-muted ring-ink-500/40',
  blue: 'bg-accent/12 text-accent-400 ring-accent/30',
  violet: 'bg-violet-500/12 text-violet-700 dark:text-violet-300 ring-violet-400/25',
};

export const Badge = ({ tone = 'gray', children }) => (
  <span
    className={`status-badge inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${badgeTones[tone] ?? badgeTones.gray}`}
  >
    {children}
  </span>
);

const cellValue = (column, row) => (column.render ? column.render(row) : row[column.key] ?? '—');
const cellText = value => Array.isArray(value) ? value.map(cellText).join(' ') : isValidElement(value)
  ? cellText(value.props.children) : value == null || typeof value === 'boolean' ? '' : String(value);

const IconChevron = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Responsive data table.
 *
 * columns = [{ key, label, render?, mobile? }] where `mobile` tunes the
 * narrow-screen layout, on which each row becomes a stacked card instead of a
 * horizontally scrolling table row:
 *   'title'   — the card's headline (rendered without a label)
 *   'meta'    — sits under the headline as supporting text, no label
 *   'actions' — pinned to the card footer, no label
 *   'hide'    — omitted on mobile (for detail that doesn't earn the space)
 * Columns without a hint render as a label/value pair.
 *
 * `rowHref(row)` makes the whole mobile card tappable — a phone card is one
 * record, so the entire thing should be the target rather than just the name.
 * Nested links stop propagation, so they still win.
 */
export const Table = ({ columns, rows, empty = 'Nothing here yet.', rowHref, label = 'Records', exportable = true }) => {
  const navigate = useNavigate();
  const titleCols = columns.filter((c) => c.mobile === 'title');
  const metaCols = columns.filter((c) => c.mobile === 'meta');
  const actionCols = columns.filter((c) => c.mobile === 'actions');
  const pairCols = columns.filter((c) => !c.mobile || !['title', 'meta', 'actions', 'hide'].includes(c.mobile));

  return (
    <>
      {exportable && <div className="cgw-export-toolbar"><TableExport label={label} getRows={() => rows || []}
        columns={columns.filter(column => column.mobile !== 'actions' && column.key !== 'actions' && column.exportable !== false)
          .map(column => ({ ...column, exportValue: column.exportValue || (row => row[column.key] ?? cellText(cellValue(column, row))) }))} /></div>}
      {/* Mobile: one card per row — no sideways scrolling to read a record. */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows?.length ? (
          rows.map((r, i) => {
            const href = rowHref?.(r) || null;
            return (
            <div
              key={r.Id ?? r.id ?? i}
              {...(href
                ? {
                    role: 'link',
                    tabIndex: 0,
                    onClick: () => navigate(href),
                    onKeyDown: (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(href);
                      }
                    },
                  }
                : {})}
              className={`card flex flex-col gap-2.5 p-4 ${
                href
                  ? 'cursor-pointer transition active:border-accent/40 active:bg-ink-800/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/70'
                  : ''
              }`}
            >
              {titleCols.length > 0 && (
                <div className="flex items-center gap-2 text-[15px] font-medium text-mist">
                  <div className="flex min-w-0 grow flex-wrap items-center gap-2">
                    {titleCols.map((c) => (
                      <div key={c.key} className="min-w-0">{cellValue(c, r)}</div>
                    ))}
                  </div>
                  {href && <IconChevron className="h-4 w-4 shrink-0 text-mist-dim" aria-hidden="true" />}
                </div>
              )}
              {metaCols.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mist-muted">
                  {metaCols.map((c) => (
                    <div key={c.key} className="min-w-0">{cellValue(c, r)}</div>
                  ))}
                </div>
              )}
              {pairCols.length > 0 && (
                <dl className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-x-3 gap-y-2">
                  {pairCols.map((c) => (
                    <div key={c.key} className="contents">
                      <dt className="self-center text-[11px] font-semibold uppercase tracking-[0.1em] text-mist-dim">
                        {c.label}
                      </dt>
                      <dd className="min-w-0 self-center break-words text-sm text-mist-muted">{cellValue(c, r)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {actionCols.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 border-t border-ink-700/60 pt-3">
                  {actionCols.map((c) => (
                    <div key={c.key}>{cellValue(c, r)}</div>
                  ))}
                </div>
              )}
            </div>
            );
          })
        ) : (
          <div className="card px-4 py-10 text-center text-sm text-mist-dim">{empty}</div>
        )}
      </div>

      {/* Desktop: the full table, still scrollable if the columns are wide. */}
      <div className="card data-table hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-ink-700/60 text-sm">
          <thead>
            <tr className="border-b border-ink-700/60">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-mist-dim">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700/40">
            {rows?.length ? (
              rows.map((r, i) => (
                <tr key={r.Id ?? r.id ?? i} className="transition-colors hover:bg-ink-800/50">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-mist-muted">
                      {cellValue(c, r)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-mist-dim">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

/**
 * Shared pagination control. Stacks the summary above the buttons on narrow
 * screens and drops the first/last jumps there to keep touch targets large.
 */
export const Pager = ({ page, pages, total, from, to, noun = 'rows', onPage, children }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <span className="text-sm text-mist-muted">
      {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} {noun}
      {children}
    </span>
    <div className="flex items-center justify-between gap-1.5 sm:justify-end">
      <button
        onClick={() => onPage(0)}
        disabled={page === 0}
        aria-label="First page"
        className="btn-ghost hidden px-2.5 py-1.5 disabled:opacity-40 sm:block"
      >
        «
      </button>
      <button
        onClick={() => onPage(Math.max(0, page - 1))}
        disabled={page === 0}
        className="btn-ghost px-3 py-2 disabled:opacity-40 sm:px-2.5 sm:py-1.5"
      >
        ‹ Prev
      </button>
      <span className="px-2 text-sm tabular-nums text-mist-muted">
        {page + 1} / {pages}
      </span>
      <button
        onClick={() => onPage(Math.min(pages - 1, page + 1))}
        disabled={page >= pages - 1}
        className="btn-ghost px-3 py-2 disabled:opacity-40 sm:px-2.5 sm:py-1.5"
      >
        Next ›
      </button>
      <button
        onClick={() => onPage(pages - 1)}
        disabled={page >= pages - 1}
        aria-label="Last page"
        className="btn-ghost hidden px-2.5 py-1.5 disabled:opacity-40 sm:block"
      >
        »
      </button>
    </div>
  </div>
);

/**
 * Search field + submit/clear buttons that stay usable at 360px: the input
 * takes the full width and the buttons sit beneath it on one row.
 */
export const SearchBar = ({ value, onChange, onSubmit, onClear, placeholder, mono = false, children }) => (
  <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
    <div className="search-field relative w-full sm:max-w-md">
    <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-dim" />
    <input
      value={value}
      onChange={onChange}
      aria-label={placeholder || 'Search'}
      placeholder={placeholder}
      className={`input w-full pl-10 ${mono ? 'font-mono' : ''}`}
    />
    </div>
    <div className="flex items-center gap-2">
      <button className="btn-primary grow sm:grow-0">Search</button>
      {onClear ? (
        <button type="button" onClick={onClear} className="btn-ghost grow sm:grow-0">
          Clear
        </button>
      ) : null}
      {children}
    </div>
  </form>
);

/**
 * Page heading with optional actions on the right. The mobile top bar already
 * shows the page name, so the big title is desktop-only — the subtitle stays
 * as the page's orientation text and the actions move above it.
 */
export const PageHead = ({ title, subtitle, children }) => (
  <div className="page-head flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
    <div className="min-w-0">
      <h1 className="hidden text-3xl font-semibold tracking-tight text-mist lg:block">{title}</h1>
      {subtitle ? <p className="text-sm text-mist-muted lg:mt-1">{subtitle}</p> : null}
    </div>
    {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
  </div>
);

// Server timestamps are UTC but serialized without a timezone suffix; append
// 'Z' so JS doesn't misparse them as local time.
export const utcDate = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim().replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T');
  return new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(s) || !s.includes('T') ? s : s + 'Z');
};

export const fmtDate = (v) => {
  const d = utcDate(v);
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString() : '—';
};

export const fmtCurrency = (v, currency = 'USD') =>
  (v ?? 0).toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 2 });
