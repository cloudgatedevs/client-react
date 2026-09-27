import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

// Portalling keeps row actions visible outside a horizontally scrolling table.
export function ActionMenu({ label, disabled, items }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const menu = useRef(null);
  const startAtEnd = useRef(false);
  const id = useId();
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  };
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      const panel = menu.current;
      if (!anchor || !panel) return;
      const width = panel.offsetWidth, height = panel.offsetHeight;
      panel.style.left = `${Math.max(8, Math.min(anchor.right - width, window.innerWidth - width - 8))}px`;
      const below = anchor.bottom + 6;
      panel.style.top = `${Math.max(8, below + height <= window.innerHeight - 8 ? below : anchor.top - height - 6)}px`;
    };
    position();
    const enabled = menu.current.querySelectorAll('[role="menuitem"]:not(:disabled)');
    enabled[startAtEnd.current ? enabled.length - 1 : 0]?.focus();
    const outside = event => {
      if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
    };
  }, [open]);
  return <>
    <button ref={trigger} type="button" className="btn-ghost btn-sm row-action-trigger" disabled={disabled}
      aria-label={label} title="More actions" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { startAtEnd.current = false; setOpen(value => !value); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); startAtEnd.current = event.key === 'ArrowUp'; setOpen(true);
        } else if (event.key === 'Escape') close();
      }}><MoreHorizontal size={17} aria-hidden="true" /></button>
    {open && createPortal(<div ref={menu} id={id} role="menu" aria-label={label} className="row-action-menu"
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return; }
        if (event.key === 'Tab') { close(true); return; }
        const enabled = [...menu.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
        const index = enabled.indexOf(document.activeElement);
        const next = { ArrowDown: (index + 1) % enabled.length, ArrowUp: (index - 1 + enabled.length) % enabled.length, Home: 0, End: enabled.length - 1 }[event.key];
        if (next !== undefined) { event.preventDefault(); enabled[next]?.focus(); }
      }}>
      {items.map(({ key, label: text, icon: Icon, disabled: unavailable, danger, onSelect }) => <button key={key}
        type="button" role="menuitem" tabIndex={-1} disabled={unavailable} className={danger ? 'is-danger' : undefined}
        onClick={() => { close(true); onSelect(); }}><Icon size={15} aria-hidden="true" />{text}</button>)}
    </div>, document.body)}
  </>;
}
