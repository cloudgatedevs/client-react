import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Search, UserRound } from 'lucide-react';
import { Field } from '../components/forms.jsx';
import { ErrorNote } from '../components/ui.jsx';

export function RecipientPicker({ selected, onSelect, expanded, onExpandedChange, filter, onFilterChange, page, onPageChange, users, searching, error, onRetry }) {
  const id = useId(), root = useRef(null), input = useRef(null), change = useRef(null), list = useRef(null);
  const focusAfterSelection = useRef(null);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState({ above: false, height: 300 });
  const items = users?.items || [];
  useEffect(() => { setActive(-1); }, [users, searching, expanded]);
  useLayoutEffect(() => {
    if (focusAfterSelection.current === 'input' && !selected) input.current?.focus();
    if (focusAfterSelection.current === 'change' && selected) change.current?.focus();
    focusAfterSelection.current = null;
  }, [selected]);
  useLayoutEffect(() => {
    if (!expanded || selected) return;
    const place = () => {
      const anchor = root.current?.getBoundingClientRect();
      const dialog = root.current?.closest('[role="dialog"]')?.getBoundingClientRect();
      if (!anchor || !dialog) return;
      const below = Math.min(dialog.bottom, window.innerHeight) - anchor.bottom - 12;
      const above = anchor.top - Math.max(dialog.top, 0) - 12;
      const flip = below < 180 && above > below;
      setPosition({ above: flip, height: Math.max(100, Math.min(300, flip ? above : below)) });
    };
    const outside = event => { if (!root.current?.contains(event.target)) onExpandedChange(false); };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('pointerdown', outside);
    const observer = new ResizeObserver(place);
    observer.observe(root.current.closest('[role="dialog"]'));
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', outside);
      observer.disconnect();
    };
  }, [expanded, selected, onExpandedChange]);
  const choose = user => {
    focusAfterSelection.current = 'change';
    onExpandedChange(false); onSelect(user);
  };
  const move = index => {
    setActive(index);
    list.current?.children[index]?.scrollIntoView({ block: 'nearest' });
  };
  if (selected) return <div className="recipient-selection">
    <UserRound size={17} aria-hidden="true" />
    <span className="recipient-selection-copy"><strong>{[selected.name, selected.surname].filter(Boolean).join(' ') || selected.email}</strong><span>{selected.email}</span></span>
    <button ref={change} type="button" className="btn-ghost btn-sm" onClick={() => {
      focusAfterSelection.current = 'input'; onFilterChange(''); onSelect(null); onExpandedChange(true);
    }}>Change user</button>
  </div>;
  return <div ref={root} className="recipient-picker" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) onExpandedChange(false);
  }}>
    <Field id={`${id}-input`} label="Search app users">
      <div className="recipient-search">
        <Search size={15} aria-hidden="true" />
        <input ref={input} id={`${id}-input`} className="input w-full" role="combobox" autoComplete="off"
          aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={expanded}
          aria-controls={expanded ? `${id}-results` : undefined}
          aria-activedescendant={expanded && !searching && items[active] ? `${id}-user-${items[active].id}` : undefined}
          placeholder="Name or email" maxLength={200} value={filter}
          onFocus={() => onExpandedChange(true)} onClick={() => onExpandedChange(true)}
          onChange={event => { onFilterChange(event.target.value); onExpandedChange(true); }}
          onKeyDown={event => {
            if (event.key === 'Escape' && expanded) {
              event.preventDefault(); event.stopPropagation(); onExpandedChange(false); return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault(); onExpandedChange(true);
              if (!searching && items.length) move(event.key === 'ArrowDown' ? (active + 1) % items.length : (active <= 0 ? items.length : active) - 1);
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              if (expanded && !searching && items[active]) choose(items[active]);
              else onExpandedChange(true);
            }
          }} />
        <ChevronDown size={14} className={expanded ? 'is-expanded' : ''} aria-hidden="true" />
      </div>
    </Field>
    {expanded && <div className={`recipient-dropdown${position.above ? ' is-above' : ''}`} style={{ maxHeight: position.height }}>
      <div className="recipient-search-status" role="status">
        {searching || (!users && !error) ? 'Searching users…' : error ? 'Unable to load users.' : users?.totalCount ? `${(page * 10 + 1).toLocaleString()}–${Math.min((page + 1) * 10, users.totalCount).toLocaleString()} of ${users.totalCount.toLocaleString()} users` : 'No matching app users.'}
      </div>
      {error && <div className="recipient-search-error"><ErrorNote error={error} /><button type="button" className="btn-ghost btn-sm" onClick={onRetry}>Retry search</button></div>}
      <div ref={list} id={`${id}-results`} role="listbox" aria-label="App user results" aria-busy={searching} className="recipient-options">
        {!searching && !error && items.map((user, index) => <button key={user.id} type="button" role="option" tabIndex={-1}
          id={`${id}-user-${user.id}`} aria-selected={index === active} aria-label={`Select ${user.email || user.name}`}
          onMouseDown={event => event.preventDefault()} onClick={() => choose(user)}>
          <span className="recipient-option-avatar" aria-hidden="true">{(user.name || user.email || '?').slice(0, 1).toUpperCase()}{user.surname?.slice(0, 1).toUpperCase()}</span>
          <span className="recipient-option-copy"><strong>{[user.name, user.surname].filter(Boolean).join(' ') || user.email}</strong><span>{user.email}{user.isActive === false ? ' · Inactive' : ''}</span></span>
        </button>)}
      </div>
      {!searching && !error && users?.totalCount > 10 && <div className="recipient-pagination">
        <button type="button" className="btn-ghost btn-sm" disabled={page === 0} onClick={() => { onPageChange(page - 1); input.current?.focus(); }}>Previous users</button>
        <button type="button" className="btn-ghost btn-sm" disabled={(page + 1) * 10 >= users.totalCount} onClick={() => { onPageChange(page + 1); input.current?.focus(); }}>More users</button>
      </div>}
    </div>}
  </div>;
}
