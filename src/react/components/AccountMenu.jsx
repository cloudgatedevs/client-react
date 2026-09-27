import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Info, LogOut, Settings2, UserRound } from 'lucide-react';
import { getProfileDisplayName, useAuthContext } from '../auth/index.js';
import { useCloudgate } from '../context.jsx';

export function AccountMenu() {
  const { backofficePath } = useCloudgate();
  const { currentUser, logout } = useAuthContext();
  const user = currentUser?.user;
  const name = getProfileDisplayName({ name: user?.name, surname: user?.surname, email: user?.emailAddress });
  const role = user?.role?.trim();
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [user?.id, user?.photoUrl]);
  const avatar = user?.photoUrl && !imageFailed
    ? <img src={user.photoUrl} alt="" onError={() => setImageFailed(true)} />
    : name.slice(0, 1).toUpperCase();
  const root = useRef(null), trigger = useRef(null), menu = useRef(null);
  const id = useId(), location = useLocation();
  const close = (restore = false) => { setOpen(false); if (restore) trigger.current?.focus(); };
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    (menu.current?.querySelector('[aria-current="page"]') || menu.current?.querySelector('[role="menuitem"]'))?.focus();
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); };
  }, [open]);
  const keyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = [...menu.current.querySelectorAll('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };
  return <div className="account-menu" ref={root}>
    <button ref={trigger} type="button" className="account-trigger" aria-label={`My account: ${name}${role ? `, ${role}` : ''}`}
      aria-haspopup="menu" aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
      }}>
      <span className="account-avatar" aria-hidden="true">{avatar}</span>
      <span className="account-trigger-copy"><span className="account-name">{name}</span>{role && <span className="account-role">{role}</span>}</span>
      <ChevronDown size={13} className="account-chevron" aria-hidden="true" />
    </button>
    <div id={id} ref={menu} role="menu" aria-label="My account" className="account-dropdown"
      data-state={open ? 'open' : 'closed'} aria-hidden={!open} inert={open ? undefined : ''} onKeyDown={keyDown}>
      <div className="account-dropdown-heading" role="presentation">
        <span className="account-avatar account-dropdown-avatar" aria-hidden="true">{avatar}</span>
        <div className="account-dropdown-identity"><strong>{name}</strong><span>{user?.emailAddress}</span>{role && <span className="user-role">{role}</span>}</div>
      </div>
      <NavLink role="menuitem" tabIndex={-1} to={backofficePath('/profile')} end onClick={() => close()}><UserRound size={16} />Profile</NavLink>
      <NavLink role="menuitem" tabIndex={-1} to={backofficePath('/account/settings')} end onClick={() => close()}><Settings2 size={16} />Settings</NavLink>
      <NavLink role="menuitem" tabIndex={-1} to={backofficePath('/about')} end onClick={() => close()}><Info size={16} />About</NavLink>
      <div role="separator" className="account-menu-separator" />
      <button role="menuitem" tabIndex={-1} type="button" onClick={() => { close(); logout(true); }}><LogOut size={16} />Log out</button>
    </div>
  </div>;
}
