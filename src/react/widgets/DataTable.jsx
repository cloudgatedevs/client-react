import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Circle,
  CircleDot,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  IconButton,
  Input,
  Select,
  Skeleton,
} from "./primitives.jsx";
import {
  clampPage,
  mergeRows,
  pageNumbers,
  queryRows,
  tableValue,
  validatePage,
} from "./table-model.js";
import { TableExport } from './TableExport.jsx';
import { collectExportRows } from './table-export.js';
import { FilterChips, TableFilters } from './TableFilters.jsx';
import { EMPTY_ADVANCED_FILTERS } from './filter-model.js';

const EMPTY_ROWS = [],
  EMPTY_FILTERS = {};
const defaultRowId = (row) => row.id;
/** Remote loading stays page-sized; the loader owns authorization and server-side filtering. */
export function DataTable({
  columns,
  rows = EMPTY_ROWS,
  loadRows,
  getRowId = defaultRowId,
  label = "Records",
  pageSize: initialPageSize = 10,
  pageSizes = [10, 25, 50],
  initialSort = null,
  searchPlaceholder = "Search records…",
  searchable = true,
  debounceMs = 300,
  filters = EMPTY_FILTERS,
  filterFields = EMPTY_ROWS,
  advancedFilters: controlledAdvancedFilters,
  defaultAdvancedFilters = EMPTY_ADVANCED_FILTERS,
  onAdvancedFiltersChange,
  reloadKey,
  pagination = "pages",
  selectable = false,
  selectedIds,
  onSelectionChange,
  rowSelectable = false,
  activeRowId: controlledActiveRowId,
  defaultActiveRowId = null,
  onActiveRowChange,
  getRowCanActivate,
  bulkActions = EMPTY_ROWS,
  exportable = true,
  exportFileName,
  loadExportRows,
  renderExpandedRow,
  getRowCanExpand,
  getRowLabel = getRowId,
  expandedIds,
  onExpandedChange,
  toolbar,
  rowActions,
  emptyTitle = "No records found",
  emptyDescription = "Try a different search or adjust your filters.",
  loading: externalLoading = false,
  error: externalError,
  onRetry,
  onQueryChange,
  className = "",
}) {
  const [query, setQuery] = useState({
    page: 1,
    pageSize: Math.max(1, initialPageSize),
    search: "",
    sort: initialSort,
  });
  const [search, setSearch] = useState(""),
    [internalAdvancedFilters, setInternalAdvancedFilters] = useState(defaultAdvancedFilters),
    [revision, setRevision] = useState(0),
    [hidden, setHidden] = useState([]),
    [selection, setSelection] = useState([]),
    [internalActiveRowId, setInternalActiveRowId] = useState(defaultActiveRowId),
    [expansion, setExpansion] = useState([]),
    [pendingAction, setPendingAction] = useState(null),
    [actionError, setActionError] = useState(null),
    [actionNotice, setActionNotice] = useState("");
  const tableId = useId();
  const rowButtons = useRef(new Map());
  const activeRowId = controlledActiveRowId === undefined ? internalActiveRowId : controlledActiveRowId;
  const actionRun = useRef(null),
    activeIdsRef = useRef([]),
    selectedRowsRef = useRef(new Map()),
    selectionChangeRef = useRef(onSelectionChange);
  selectionChangeRef.current = onSelectionChange;
  useEffect(() => () => {
    actionRun.current = null;
  }, []);
  const [remote, setRemote] = useState({
    rows: [],
    total: 0,
    loading: !!loadRows,
    error: null,
  });
  const loaderRef = useRef(loadRows),
    rowIdRef = useRef(getRowId),
    queryChangeRef = useRef(onQueryChange),
    sequence = useRef(0),
    sentinel = useRef(null),
    scrollRoot = useRef(null);
  loaderRef.current = loadRows;
  rowIdRef.current = getRowId;
  queryChangeRef.current = onQueryChange;
  const isRemote = !!loadRows,
    cumulative = pagination !== "pages",
    filtersKey = JSON.stringify(filters),
    previousFilters = useRef(filtersKey),
    previousReload = useRef(reloadKey),
    previousMode = useRef(pagination);
  const advancedFilters = controlledAdvancedFilters ?? internalAdvancedFilters;
  const advancedKey = JSON.stringify(advancedFilters), previousAdvanced = useRef(advancedKey);
  function changeAdvancedFilters(next) { setInternalAdvancedFilters(next); onAdvancedFiltersChange?.(next); }
  const activeIds = selectedIds ?? selection;
  activeIdsRef.current = activeIds;
  const activeExpandedIds = expandedIds ?? expansion;
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setQuery((previous) =>
          previous.search === search
            ? previous
            : { ...previous, page: 1, search },
        ),
      debounceMs,
    );
    return () => clearTimeout(timer);
  }, [search, debounceMs]);
  // Filter changes reset before fetching, so page N is never appended to a new query.
  useEffect(() => {
    if (
      previousFilters.current !== filtersKey ||
      previousAdvanced.current !== advancedKey ||
      previousReload.current !== reloadKey ||
      previousMode.current !== pagination
    ) {
      previousFilters.current = filtersKey;
      previousAdvanced.current = advancedKey;
      previousReload.current = reloadKey;
      previousMode.current = pagination;
      if (query.page !== 1) {
        setQuery((previous) => ({ ...previous, page: 1 }));
        return;
      }
    }
    const controller = new AbortController(),
      request = ++sequence.current;
    const args = {
      ...query,
      filters: JSON.parse(filtersKey),
      advancedFilters: JSON.parse(advancedKey),
      signal: controller.signal,
    };
    queryChangeRef.current?.(args);
    if (!isRemote) return () => controller.abort();
    setRemote((previous) => ({
      ...previous,
      rows: cumulative && query.page > 1 ? previous.rows : [],
      loading: true,
      error: null,
    }));
    Promise.resolve()
      .then(() => loaderRef.current(args))
      .then(validatePage)
      .then((result) => {
        if (controller.signal.aborted || request !== sequence.current) return;
        const page = clampPage(query.page, result.total, query.pageSize);
        if (page !== query.page) {
          setQuery((previous) => ({
            ...previous,
            page: cumulative ? 1 : page,
          }));
          return;
        }
        setRemote((previous) => ({
          rows:
            cumulative && query.page > 1
              ? mergeRows(previous.rows, result.rows, rowIdRef.current)
              : result.rows,
          total: result.total,
          loading: false,
          error: null,
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted || request !== sequence.current) return;
        setRemote((previous) => ({ ...previous, loading: false, error }));
      });
    return () => controller.abort();
  }, [
    query,
    filtersKey,
    advancedKey,
    reloadKey,
    revision,
    isRemote,
    cumulative,
    pagination,
  ]);
  const local = useMemo(
    () =>
      queryRows(rows, columns, {
        ...query,
        filters,
        advancedFilters,
        ...(cumulative
          ? { page: 1, pageSize: query.page * query.pageSize }
          : {}),
      }),
    [rows, columns, query, filtersKey, advancedKey, cumulative],
  );
  useEffect(() => {
    if (!isRemote && !cumulative && local.page !== query.page)
      setQuery((previous) => ({ ...previous, page: local.page }));
  }, [isRemote, cumulative, local.page, query.page]);
  const result = isRemote ? remote : local,
    loading = externalLoading || (isRemote && remote.loading),
    error = externalError || (isRemote && remote.error);
  const pages = Math.max(1, Math.ceil(result.total / query.pageSize)),
    canLoadMore = query.page < pages;
  useEffect(() => {
    if (
      pagination !== "infinite" ||
      loading ||
      error ||
      !canLoadMore ||
      !sentinel.current ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          setQuery((previous) => ({ ...previous, page: previous.page + 1 }));
        }
      },
      { root: scrollRoot.current, rootMargin: "80px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [pagination, loading, error, canLoadMore, query.page]);
  const visibleColumns = columns.filter(
    (column) => !hidden.includes(column.key),
  );
  const ids = result.rows.map(getRowId),
    allSelected = ids.length > 0 && ids.every((id) => activeIds.includes(id)),
    someSelected = ids.some((id) => activeIds.includes(id));
  const canActivate = row => rowSelectable && !loading && !error && pendingAction === null && (getRowCanActivate?.(row) ?? true);
  const activatableRows = result.rows.filter(canActivate);
  const tabStopRowId = activatableRows.some(row => getRowId(row) === activeRowId)
    ? activeRowId : activatableRows.length ? getRowId(activatableRows[0]) : null;
  function activateRow(row) {
    const id = getRowId(row);
    if (!canActivate(row) || id === activeRowId) return;
    setInternalActiveRowId(id);
    onActiveRowChange?.(id, row);
  }
  function clickRow(event, row) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    // Embedded controls own their interactions, including expandable/nested content.
    const control = event.target.closest('a, button, input, select, textarea, label, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="radio"], [role="combobox"], [role="menuitem"], [tabindex], [data-row-selection-ignore]');
    if (control && event.currentTarget.contains(control)) return;
    const selection = event.currentTarget.ownerDocument.getSelection?.();
    if (selection?.toString() && event.currentTarget.contains(selection.anchorNode)) return;
    activateRow(row);
    if (canActivate(row)) rowButtons.current.get(getRowId(row))?.focus({preventScroll:true});
  }
  function moveActiveRow(event, row) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !canActivate(row)) return;
    const index = activatableRows.findIndex(item => getRowId(item) === getRowId(row));
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? activatableRows.length - 1
      : event.key === 'ArrowDown' ? Math.min(index + 1, activatableRows.length - 1)
      : event.key === 'ArrowUp' ? Math.max(index - 1, 0) : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const next = activatableRows[nextIndex];
    rowButtons.current.get(getRowId(next))?.focus();
    activateRow(next);
  }
  useEffect(() => {
    const cache = new Map([...selectedRowsRef.current].filter(([id]) => activeIds.includes(id)));
    for (const row of result.rows) if (activeIds.includes(getRowId(row))) cache.set(getRowId(row), row);
    selectedRowsRef.current = cache;
  }, [result.rows, activeIds, getRowId]);
  function getExportRows({ scope, signal, onProgress }) {
    return collectExportRows({ scope, signal, onProgress, rows, visibleRows: result.rows,
      selectedIds: [...activeIds], selectedRows: new Map(selectedRowsRef.current), columns,
      query: { ...query, filters: JSON.parse(filtersKey), advancedFilters: JSON.parse(advancedKey) }, loadRows, loadExportRows, getRowId });
  }
  function select(next) {
    if (actionRun.current) return;
    setActionError(null);
    setActionNotice("");
    setSelection(next);
    onSelectionChange?.(next);
  }
  function toggleExpanded(id) {
    const next = activeExpandedIds.includes(id)
      ? activeExpandedIds.filter((value) => value !== id)
      : [...activeExpandedIds, id];
    setExpansion(next);
    onExpandedChange?.(next);
  }
  async function runBulkAction(action) {
    if (actionRun.current || !activeIds.length || action.disabled) return;
    const run = {},
      submittedIds = [...activeIds];
    actionRun.current = run;
    setPendingAction(action.id);
    setActionError(null);
    setActionNotice("");
    try {
      await action.onAction(submittedIds);
      if (actionRun.current !== run) return;
      if (action.clearSelectionOnSuccess !== false) {
        // A controlled selection may change while the request is pending.
        const next = activeIdsRef.current.filter((id) => !submittedIds.includes(id));
        setSelection(next);
        selectionChangeRef.current?.(next);
      }
      setActionNotice(`${action.label} completed for ${submittedIds.length} selected ${submittedIds.length === 1 ? "row" : "rows"}.`);
      if (action.refreshOnSuccess !== false) refresh();
    } catch (error) {
      if (actionRun.current === run) setActionError(error?.message || String(error));
    } finally {
      if (actionRun.current === run) {
        actionRun.current = null;
        setPendingAction(null);
      }
    }
  }
  function refresh() {
    if (cumulative && query.page > 1)
      setQuery((previous) => ({ ...previous, page: 1 }));
    else setRevision((value) => value + 1);
    onRetry?.();
  }
  function sortBy(column) {
    setQuery((previous) => ({
      ...previous,
      page: 1,
      sort:
        previous.sort?.key !== column.key
          ? { key: column.key, direction: "asc" }
          : previous.sort.direction === "asc"
            ? { key: column.key, direction: "desc" }
            : null,
    }));
  }
  const columnCount =
    visibleColumns.length + Number(selectable) + Number(rowSelectable) + Number(!!rowActions) + Number(!!renderExpandedRow);
  return (
    <section
      className={`cgw-table ${className}`}
      aria-label={label}
      aria-busy={loading}
    >
      <div className="cgw-table-toolbar">
        <div className="cgw-table-tools">
          {searchable && (
            <Input
              type="search"
              aria-label={`Search ${label}`}
              icon={Search}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          {toolbar}
          {filterFields.length > 0 && <TableFilters fields={filterFields} value={advancedFilters} onChange={changeAdvancedFilters} />}
        </div>
        <div className="cgw-row">
          {exportable && <TableExport label={label} columns={visibleColumns} fileName={exportFileName}
            hasSubtables={!!renderExpandedRow}
            disabled={loading || !!error || pendingAction !== null} getRows={getExportRows}
            scopes={[
              ...(selectable && activeIds.length ? [{ value: 'selected', label: `Selected rows (${activeIds.length})` }] : []),
              { value: 'all', label: `All filtered results (${result.total.toLocaleString()})` },
              { value: 'page', label: `${cumulative ? 'Loaded rows' : 'Current page'} (${result.rows.length})` },
            ]} />}
          <details className="cgw-columns">
            <summary title="Choose columns">
              <Columns3 size={16} />
              <span>Columns</span>
            </summary>
            <div>
              {columns.map((column) => (
                <Checkbox
                  key={column.key}
                  label={column.label}
                  checked={!hidden.includes(column.key)}
                  disabled={
                    !hidden.includes(column.key) && visibleColumns.length === 1
                  }
                  onChange={() =>
                    setHidden((previous) =>
                      previous.includes(column.key)
                        ? previous.filter((key) => key !== column.key)
                        : [...previous, column.key],
                    )
                  }
                />
              ))}
            </div>
          </details>
          {isRemote && (
            <IconButton
              label="Refresh records"
              icon={RefreshCw}
              onClick={refresh}
              loading={loading}
            />
          )}
        </div>
      </div>
      <div className="cgw-table-loading-track" data-loading={loading || undefined} aria-hidden="true"><span /></div>
      <FilterChips fields={filterFields} value={advancedFilters} onChange={changeAdvancedFilters} />
      {selectable && activeIds.length > 0 && (
        <div className="cgw-selection-bar">
          <span className="cgw-selection-count" role="status">
            <strong>{activeIds.length} selected</strong>
            {activeIds.some((id) => !ids.includes(id)) && <span className="cgw-muted">Includes rows outside this view</span>}
          </span>
          <div className="cgw-selection-actions" role="group" aria-label="Actions for selected rows" aria-busy={pendingAction !== null}>
            {bulkActions.map((action) => <Button key={action.id} size="sm" variant={action.variant || "secondary"}
              icon={action.icon} disabled={pendingAction !== null || action.disabled}
              loading={pendingAction === action.id} onClick={() => runBulkAction(action)}>
              {action.label}
            </Button>)}
            <Button size="sm" variant="ghost" icon={X} disabled={pendingAction !== null} onClick={() => select([])}>
              Clear selection
            </Button>
          </div>
        </div>
      )}
      {actionError && <div className="cgw-table-feedback"><Alert tone="danger" title="Action could not be completed">{actionError} Your selection is kept; you can try the action again.</Alert></div>}
      <div className={actionNotice ? "cgw-table-notice" : "cgw-sr-only"} role="status">{actionNotice}</div>
      {error && (
        <div className="cgw-table-feedback">
          <Alert
            tone="danger"
            title="Could not load records"
            action={
              <Button variant="secondary" size="sm" onClick={refresh}>
                Try again
              </Button>
            }
          >
            {error.message || String(error)}
          </Alert>
        </div>
      )}
      <div
        className="cgw-table-scroll"
        ref={scrollRoot}
        tabIndex={0}
        role="region"
        aria-label={`${label} table`}
      >
        <table>
          <caption className="cgw-sr-only">{label}</caption>
          <thead>
            <tr>
              {rowSelectable && <th scope="col" className="cgw-table-activate"><span className="cgw-sr-only">Active row</span></th>}
              {renderExpandedRow && <th scope="col" className="cgw-table-expand"><span className="cgw-sr-only">Expand row</span></th>}
              {selectable && (
                <th className="cgw-table-check">
                  <Checkbox
                    label={
                      <span className="cgw-sr-only">Select visible rows</span>
                    }
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    disabled={!ids.length || loading || pendingAction !== null}
                    onChange={() =>
                      select(
                        allSelected
                          ? activeIds.filter((id) => !ids.includes(id))
                          : [...new Set([...activeIds, ...ids])],
                      )
                    }
                  />
                </th>
              )}
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={{ width: column.width, textAlign: column.align }}
                  aria-sort={
                    query.sort?.key === column.key
                      ? query.sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : column.sortable !== false
                        ? "none"
                        : undefined
                  }
                >
                  {column.sortable !== false ? (
                    <button
                      type="button"
                      className="cgw-sort"
                      onClick={() => sortBy(column)}
                    >
                      {column.label}
                      {query.sort?.key === column.key ? (
                        query.sort.direction === "asc" ? (
                          <ArrowUp size={13} />
                        ) : (
                          <ArrowDown size={13} />
                        )
                      ) : (
                        <ArrowUpDown size={13} />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              {rowActions && (
                <th scope="col">
                  <span className="cgw-sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => {
              const id = getRowId(row), rowLabel = String(getRowLabel(row));
              const canExpand = !!renderExpandedRow && (getRowCanExpand?.(row) ?? true);
              const expanded = canExpand && activeExpandedIds.includes(id);
              const isActive = rowSelectable && id === activeRowId;
              const detailId = `${tableId}-detail-${encodeURIComponent(`${typeof id}:${id}`)}`;
              return <Fragment key={`${typeof id}:${id}`}>
              <tr
                data-selected={activeIds.includes(id) || undefined}
                data-active={isActive || undefined}
                data-activatable={canActivate(row) || undefined}
                aria-current={isActive ? 'true' : undefined}
                onClick={rowSelectable ? event => clickRow(event, row) : undefined}
                data-expanded={expanded || undefined}
              >
                {rowSelectable && <td className="cgw-table-activate">
                  <button type="button" className="cgw-table-active-button"
                    ref={node => { if (node) rowButtons.current.set(id, node); else rowButtons.current.delete(id); }}
                    aria-label={`Activate row ${rowLabel}`} aria-pressed={isActive}
                    title={`Show ${rowLabel} in connected widgets`} disabled={!canActivate(row)}
                    tabIndex={id === tabStopRowId ? 0 : -1}
                    onClick={() => activateRow(row)} onKeyDown={event => moveActiveRow(event, row)}>
                    {isActive ? <CircleDot size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
                  </button>
                </td>}
                {renderExpandedRow && <td className="cgw-table-expand">
                  {canExpand && <IconButton className="cgw-table-expand-button" variant="ghost"
                    label={`${expanded ? "Collapse" : "Expand"} ${rowLabel}`} icon={ChevronRight}
                    aria-expanded={expanded} aria-controls={expanded ? detailId : undefined}
                    onClick={() => toggleExpanded(id)} />}
                </td>}
                {selectable && (
                  <td>
                    <Checkbox
                      label={
                        <span className="cgw-sr-only">
                          Select row {rowLabel}
                        </span>
                      }
                      checked={activeIds.includes(getRowId(row))}
                      disabled={pendingAction !== null || loading}
                      onChange={() =>
                        select(
                          activeIds.includes(getRowId(row))
                            ? activeIds.filter((id) => id !== getRowId(row))
                            : [...activeIds, getRowId(row)],
                        )
                      }
                    />
                  </td>
                )}
                {visibleColumns.map((column) => (
                  <td key={column.key} style={{ textAlign: column.align }}>
                    {column.render
                      ? column.render(tableValue(row, column), row)
                      : String(tableValue(row, column) ?? "—")}
                  </td>
                ))}
                {rowActions && (
                  <td className="cgw-table-actions">{rowActions(row)}</td>
                )}
              </tr>
              {expanded && <tr className="cgw-table-detail-row"><td colSpan={columnCount}>
                <div id={detailId} className="cgw-table-detail" role="region" aria-label={`Details for ${rowLabel}`}>
                  {renderExpandedRow(row)}
                </div>
              </td></tr>}
              </Fragment>;
            })}
            {loading &&
              (!result.rows.length || cumulative) &&
              Array.from(
                {
                  length: result.rows.length ? 2 : Math.min(query.pageSize, 5),
                },
                (_, index) => (
                  <tr key={`loading-${index}`} aria-hidden="true">
                    {Array.from({ length: columnCount }, (_, col) => (
                      <td key={col}>
                        <div className="cgw-table-skeleton-cell" style={{ minHeight: rowActions ? 'var(--cgw-control-height)' : '1.25rem' }}>
                          <Skeleton width={col === 0 ? "70%" : "85%"} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ),
              )}
            {!loading && !error && !result.rows.length && (
              <tr>
                <td colSpan={columnCount}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={
                      search && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSearch("");
                            setQuery((previous) => ({
                              ...previous,
                              search: "",
                              page: 1,
                            }));
                          }}
                        >
                          Clear search
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {pagination === "infinite" && (
          <div ref={sentinel} className="cgw-table-sentinel" />
        )}
      </div>
      <footer className="cgw-table-footer">
        <div className="cgw-row">
          <Select
            aria-label="Rows per page"
            value={query.pageSize}
            options={[...new Set([query.pageSize, ...pageSizes])]
              .sort((a, b) => a - b)
              .map((value) => ({ value, label: `${value} / page` }))}
            onChange={(e) =>
              setQuery((previous) => ({
                ...previous,
                page: 1,
                pageSize: Number(e.target.value),
              }))
            }
          />
          <span className="cgw-table-status" role="status" aria-live="polite">
            {loading && <LoaderCircle size={14} className="cgw-spin" aria-hidden="true" />}
            {error
              ? "Unable to load records"
              : loading
                ? "Loading…"
                : result.total
                  ? `${cumulative ? 1 : (query.page - 1) * query.pageSize + 1}–${cumulative ? result.rows.length : Math.min(query.page * query.pageSize, result.total)} of ${result.total.toLocaleString()}`
                  : "0 records"}
          </span>
        </div>
        {cumulative ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setQuery((previous) => ({ ...previous, page: previous.page + 1 }))
            }
            disabled={!canLoadMore || loading || !!error}
            loading={loading}
          >
            {loading
              ? "Loading…"
              : canLoadMore
                ? "Load more"
                : "All records loaded"}
          </Button>
        ) : (
          <nav className="cgw-row" aria-label={`${label} pagination`}>
            <IconButton
              label="Previous page"
              icon={ChevronLeft}
              disabled={query.page <= 1 || loading}
              onClick={() =>
                setQuery((previous) => ({
                  ...previous,
                  page: previous.page - 1,
                }))
              }
            />
            {pageNumbers(query.page, pages).map((page, index, values) => (
              <span key={page} className="cgw-row">
                {index > 0 && page - values[index - 1] > 1 && (
                  <span className="cgw-ellipsis">…</span>
                )}
                <button
                  type="button"
                  className="cgw-page"
                  aria-label={`Page ${page}`}
                  aria-current={page === query.page ? "page" : undefined}
                  disabled={loading}
                  onClick={() =>
                    setQuery((previous) => ({ ...previous, page }))
                  }
                >
                  {page}
                </button>
              </span>
            ))}
            <IconButton
              label="Next page"
              icon={ChevronRight}
              disabled={query.page >= pages || loading}
              onClick={() =>
                setQuery((previous) => ({
                  ...previous,
                  page: previous.page + 1,
                }))
              }
            />
          </nav>
        )}
      </footer>
    </section>
  );
}
