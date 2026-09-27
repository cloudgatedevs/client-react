import { useEffect, useMemo, useRef, useState } from 'react';
import { filterOptions, validateOptions } from './search-options.js';

const EMPTY = [];
export function useSearchOptions({ options = EMPTY, loadOptions, search, open, debounceMs = 300, minSearchLength = 0, limit = 50, reloadKey }) {
  const loader = useRef(loadOptions);
  loader.current = loadOptions;
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ options: EMPTY, loading: false, error: null, key: null });
  const remote = !!loadOptions;
  const query = search.trim();
  const enough = query.length >= Math.max(0, minSearchLength);
  const key = JSON.stringify([query, reloadKey, limit, revision]);
  useEffect(() => {
    if (!remote || !open || !enough) return;
    const controller = new AbortController();
    setResult({ options: EMPTY, loading: true, error: null, key });
    const timer = setTimeout(() => {
      Promise.resolve().then(() => loader.current({ search: query, limit, signal: controller.signal }))
        .then(validateOptions)
        .then(options => {
          if (!controller.signal.aborted) setResult({ options, loading: false, error: null, key });
        })
        .catch(error => {
          if (!controller.signal.aborted) setResult({ options: EMPTY, loading: false, error, key });
        });
    }, Math.max(0, debounceMs));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, remote, open, enough, query, limit, debounceMs]);
  const local = useMemo(() => filterOptions(options, query), [options, query]);
  const current = result.key === key;
  return {
    options: !enough ? EMPTY : remote ? (current ? result.options : EMPTY) : local,
    loading: remote && open && enough && (!current || result.loading),
    error: remote && current && enough ? result.error : null,
    enough, retry: () => setRevision(previous => previous + 1),
  };
}
