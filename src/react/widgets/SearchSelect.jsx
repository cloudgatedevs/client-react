import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, LoaderCircle, Search, X } from 'lucide-react';
import { Button, Input } from './primitives.jsx';
import { useFormValue } from './Form.jsx';
import { useSearchOptions } from './useSearchOptions.js';

const EMPTY = [];
const same = (a, b) => String(a ?? '') === String(b ?? '');
// A body portal avoids clipping inside cards/dialogs; copy the field's scoped theme.
function usePopupAppearance(reference, open) {
  const [style, setStyle] = useState({});
  useEffect(() => {
    if (!open || !reference.current) return;
    const element = reference.current;
    const update = () => {
      const computed = getComputedStyle(element);
      const tokens = {};
      for (let i = 0; i < computed.length; i++) {
        const name = computed[i];
        if (/^--(ink-|mist|accent|secondary|cgw-|cg-|surface-)/.test(name)) tokens[name] = computed.getPropertyValue(name);
      }
      setStyle({ ...tokens, fontFamily: computed.fontFamily, colorScheme: computed.colorScheme });
    };
    update();
    const observer = new MutationObserver(update);
    for (let node = element; node; node = node.parentElement) observer.observe(node, { attributes: true, attributeFilter: ['style', 'class', 'data-theme', 'data-density'] });
    return () => observer.disconnect();
  }, [reference, open]);
  return style;
}

export const SearchSelect = forwardRef(function SearchSelect({
  options = EMPTY, loadOptions, value, defaultValue = '', selectedOption, onChange,
  label, hint, error, name, id: suppliedId, placeholder = 'Search and select…',
  required = false, disabled = false, readOnly = false, clearable = true,
  debounceMs = 300, minSearchLength = 0, limit = 50, reloadKey,
  validate, validationMessages, className = '', 'aria-label': ariaLabel,
}, forwardedRef) {
  const uid = useId(), id = suppliedId || uid, listId = `${id}-options`;
  const [internal, setInternal] = useState(defaultValue);
  const current = value !== undefined ? value : internal;
  const hasValue = current !== null && current !== undefined && String(current) !== '';
  const [chosen, setChosen] = useState(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(null);
  const [active, setActive] = useState(-1);
  const input = useRef(null), wrapper = useRef(null), popup = useRef(null);
  const results = useSearchOptions({ options, loadOptions, search: search || '', open, debounceMs, minSearchLength, limit, reloadKey });
  const selected = [selectedOption, ...options, ...results.options, chosen].find(option => option && same(option.value, current));
  const display = hasValue ? (selected?.label ?? String(current)) : '';
  const locked = disabled || readOnly;
  const visible = open && !locked;
  const popupStyle = usePopupAppearance(input, visible);
  useFormValue(current);
  const setRef = useCallback(node => {
    input.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  function close() { setOpen(false); setSearch(null); setActive(-1); }
  function choose(option) {
    if (locked || option?.disabled) return;
    const next = option?.value ?? '';
    if (value === undefined) setInternal(next);
    setChosen(option || null);
    onChange?.(next, option || null);
    close();
    input.current?.focus();
  }
  useEffect(() => { setActive(-1); }, [search, results.options]);
  useEffect(() => { if (locked) close(); }, [locked]);
  useEffect(() => {
    const form = input.current?.form;
    const reset = event => queueMicrotask(() => {
      if (event.defaultPrevented) return;
      if (value === undefined) setInternal(defaultValue);
      close();
    });
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, [defaultValue, value]);
  useEffect(() => {
    if (visible && active >= 0) popup.current?.querySelector(`[data-option-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [visible, active]);
  function keyboard(event) {
    if (locked || event.nativeEvent.isComposing) return;
    if (event.key === 'Escape' && visible) { event.preventDefault(); event.stopPropagation(); close(); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const start = active < 0 ? (step === 1 ? -1 : results.options.length) : active;
      for (let index = start + step; index >= 0 && index < results.options.length; index += step) {
        if (!results.options[index].disabled) { setActive(index); break; }
      }
    } else if (event.key === 'Enter' && visible) {
      event.preventDefault();
      if (results.error) results.retry();
      else if (active >= 0 && results.options[active]) choose(results.options[active]);
    } else if (event.key === 'Tab') close();
  }
  const fieldLabel = required && label ? <>{label}<span className="cgw-required" aria-hidden="true"> *</span></> : label;
  const status = !results.enough ? `Type at least ${minSearchLength} characters to search.`
    : results.loading ? 'Searching…' : results.error ? 'Could not load options. Press Enter to retry.'
      : !results.options.length ? 'No matches found.' : `${results.options.length} ${results.options.length === 1 ? 'option' : 'options'} available.`;
  return <Popover.Root open={visible} onOpenChange={next => { if (!next) close(); else if (!locked) setOpen(true); }}>
    <div className={`cgw-search-select ${className}`} ref={wrapper}>
      <Popover.Anchor virtualRef={input} />
      <Input ref={setRef} id={id} label={fieldLabel} hint={hint} error={error} icon={Search}
        value={search === null ? display : search} disabled={disabled} readOnly={readOnly}
        placeholder={placeholder} autoComplete="off" role="combobox" aria-label={ariaLabel}
        aria-autocomplete="list" aria-expanded={visible} aria-controls={visible ? listId : undefined}
        aria-required={required || undefined} aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        validationMessages={validationMessages}
        validate={(_, data) => {
          if (required && !hasValue) return validationMessages?.required || 'Choose an option.';
          return validate?.(hasValue ? String(current) : '', data);
        }}
        onFocus={event => { if (!locked) { setOpen(true); event.currentTarget.select(); } }}
        onClick={() => { if (!locked) setOpen(true); }}
        onChange={event => { setSearch(event.target.value); setOpen(true); }}
        onBlur={event => { if (!popup.current?.contains(event.relatedTarget)) close(); }}
        onKeyDown={keyboard} endAdornment={<span className="cgw-search-tools">
        {results.loading ? <LoaderCircle size={15} className="cgw-spin" aria-label="Searching" /> : null}
        {clearable && hasValue && !locked && <button type="button" aria-label="Clear selection" onMouseDown={event => event.preventDefault()} onClick={() => choose(null)}><X size={14} /></button>}
        <button type="button" tabIndex={-1} aria-label={visible ? 'Close options' : 'Show options'} disabled={locked}
          onMouseDown={event => event.preventDefault()} onClick={() => { if (visible) close(); else { input.current?.focus(); setOpen(true); } }}><ChevronDown size={15} /></button>
      </span>} />
      {name && <input type="hidden" name={name} value={hasValue ? current : ''} disabled={disabled} />}
    </div>
    <Popover.Portal>
      <Popover.Content ref={popup} role="presentation" className="cgw-search-popover" style={popupStyle} sideOffset={5} align="start" collisionPadding={10} hideWhenDetached
        onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()}
        onInteractOutside={event => { if (wrapper.current?.contains(event.target)) event.preventDefault(); }}>
        <div className="cgw-search-status" role="status">{status}</div>
        <ul id={listId} role="listbox" aria-label={typeof label === 'string' ? label : ariaLabel || 'Search options'} aria-busy={results.loading}>
          {results.options.map((option, index) => <li key={String(option.value)} id={`${listId}-${index}`} role="option"
            aria-selected={same(option.value, current)} aria-disabled={option.disabled || undefined} data-active={active === index || undefined} data-option-index={index}
            onMouseDown={event => event.preventDefault()} onPointerMove={() => { if (!option.disabled) setActive(index); }} onClick={() => choose(option)}>
            <span><span className="cgw-search-option-label">{option.label}</span>{option.description && <small>{option.description}</small>}</span>
            {same(option.value, current) && <Check size={15} aria-hidden="true" />}
          </li>)}
        </ul>
        {results.error && <div className="cgw-search-footer"><Button size="sm" variant="secondary" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={results.retry}>Try again</Button></div>}
        {!!loadOptions && !results.loading && results.options.length >= limit && <div className="cgw-search-footer">Keep typing to narrow the results.</div>}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
});
