import { useWalletAvailability } from '../settings/useWalletAvailability.js';
import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, Info, LayoutDashboard, LogOut, Settings2, UserRound } from 'lucide-react';
import { getProfileDisplayName, useAuthContext } from '../auth/index.js';
import { useCloudgate } from '../context.jsx';
import { canAccessBackoffice } from '../../platform/backoffice-permissions.js';
import { EzarLogo } from './EzarLogo.jsx';
import { UserAvatar } from './UserAvatar.jsx';
import { useUserWallet, walletMoney, walletNumber } from './useUserWallet.js';

/** Place in a public header inside the SDK providers. Hidden for signed-out visitors. */
export function UserMenu() {
  const { client, identity } = useCloudgate();
  const { currentUser, auth, loading } = useAuthContext();
  if (loading) return <span className="cg-account-skeleton" role="status" aria-label="Loading your profile" />;
  if (!auth?.accessToken || !currentUser?.user?.id) return null;
  const environment = identity?.environment ?? client.config.environment;
  return <AccountMenu key={`${client.config.apiUrl}:${client.auth.tenancyName}:${currentUser.user.id}:${environment}`} publicAccount environment={environment} />;
}

function MenuWallet({ environment, active }) {
  const { client } = useCloudgate();
  const { wallet, balance, loading, error, balanceError } = useUserWallet(client, environment, active);
  return <div className="cg-menu-wallet-copy">
    <span className="cg-menu-wallet-label">eZAR wallet <small>{/^prod/i.test(environment) ? 'Production' : 'Sandbox'}</small></span>
    {loading ? <span className="cg-account-skeleton cg-balance-skeleton" role="status" aria-label="Loading wallet" /> : error ? <span className="cg-menu-wallet-hint">Wallet temporarily unavailable</span>
      : wallet?.linked ? <><strong>{balanceError ? 'Balance unavailable' : balance ? `${walletMoney(balance.available)} eZAR` : 'Loading balance...'}</strong><span className="cg-menu-wallet-hint">{walletNumber(wallet.accountNumber)}</span></>
        : <><strong>Connect your wallet</strong><span className="cg-menu-wallet-hint">Your account and balance, in one place</span></>}
  </div>;
}

export function AccountMenu({ publicAccount = false, environment }) {
  const walletAvailable = useWalletAvailability(environment);
  const walletVisible = useWalletAvailability(environment, true);
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
  return <div className={`account-menu${publicAccount ? ' cg-user-menu' : ''}`} ref={root}>
    <button ref={trigger} type="button" className="account-trigger" aria-label={`My account: ${name}${role ? `, ${role}` : ''}`}
      aria-haspopup="menu" aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
      }}>
      {publicAccount ? <UserAvatar user={user} /> : <span className="account-avatar" aria-hidden="true">{avatar}</span>}
      <span className="account-trigger-copy"><span className="account-name">{name}</span>{!publicAccount && role && <span className="account-role">{role}</span>}</span>
      <ChevronDown size={13} className="account-chevron" aria-hidden="true" />
    </button>
    <div id={id} ref={menu} role="menu" aria-label="My account" className="account-dropdown"
      data-state={open ? 'open' : 'closed'} aria-hidden={!open} inert={open ? undefined : ''} onKeyDown={keyDown}>
      <div className="account-dropdown-heading" role="presentation">
        {publicAccount ? <UserAvatar user={user} /> : <span className="account-avatar account-dropdown-avatar" aria-hidden="true">{avatar}</span>}
        <div className="account-dropdown-identity"><strong>{name}</strong><span>{user?.emailAddress}</span>{!publicAccount && role && <span className="user-role">{role}</span>}</div>
      </div>
      {publicAccount ? <>
        <NavLink role="menuitem" tabIndex={-1} to="/account/profile" end onClick={() => close()}><UserRound size={18} /><span className="cg-menu-item-copy"><strong>My profile</strong><small>Personal details and photo</small></span><ArrowUpRight size={15} className="cg-menu-trailing" /></NavLink>
        {walletVisible && <NavLink role="menuitem" tabIndex={-1} to="/account/wallet" className="cg-menu-wallet" onClick={() => close()}><EzarLogo size={24} decorative />{walletAvailable ? <MenuWallet environment={environment} active={open} /> : <span>Wallet · Coming soon</span>}<ArrowUpRight size={15} className="cg-menu-trailing" /></NavLink>}
        {canAccessBackoffice(user) && <NavLink role="menuitem" tabIndex={-1} to={backofficePath('/')} onClick={() => close()}><LayoutDashboard size={17} />Back office<ArrowUpRight size={15} className="cg-menu-trailing" /></NavLink>}
      </> : <>
      <NavLink role="menuitem" tabIndex={-1} to={backofficePath('/profile')} end onClick={() => close()}><UserRound size={16} />Profile</NavLink>
      <NavLink role="menuitem" tabIndex={-1} to={backofficePath('/account/settings')} end onClick={() => close()}><Settings2 size={16} />Settings</NavLink>
      <NavLink role="menuitem" tabIndex={-1} to={backofficePath('/about')} end onClick={() => close()}><Info size={16} />About</NavLink>
      </>}
      <div role="separator" className="account-menu-separator" />
      <button role="menuitem" tabIndex={-1} type="button" onClick={() => { close(); logout(true); }}><LogOut size={16} />Log out</button>
    </div>
  </div>;
}
