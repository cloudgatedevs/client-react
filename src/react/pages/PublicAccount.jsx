import { useWalletAvailability } from '../settings/useWalletAvailability.js';
import { Suspense, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, UserRound, Wallet } from 'lucide-react';
import { useSettings } from '../settings/SettingsProvider.jsx';
import { UserMenu } from '../components/AccountMenu.jsx';
import { WalletWorkspace } from '../components/WalletWorkspace.jsx';
import { ScreenLoader } from '../components/ScreenLoader.jsx';

export function PublicAccountLayout() {
  const walletAvailable = useWalletAvailability(undefined, true);
  const { settings } = useSettings();
  const { pathname } = useLocation();
  const main = useRef(null);
  useEffect(() => { main.current?.focus({ preventScroll: true }); }, [pathname]);
  return <div className="cg-account-site">
    <a className="cg-account-skip" href="#account-main">Skip to content</a>
    <header className="cg-account-header"><Link to="/" className="cg-account-brand">{settings.app_logo_url && <img src={settings.app_logo_url} alt="" />}<span>{settings.app_name}</span></Link><UserMenu /></header>
    <div className="cg-account-shell"><div className="cg-account-navigation"><Link className="cg-account-back" to="/"><ArrowLeft size={16} />Back to website</Link><nav aria-label="Your account"><NavLink to="/account/profile"><UserRound size={16} />Profile</NavLink>{walletAvailable && <NavLink to="/account/wallet"><Wallet size={16} />Wallet</NavLink>}</nav></div>
      <main ref={main} id="account-main" tabIndex={-1} key={pathname}><Suspense fallback={<ScreenLoader />}><Outlet /></Suspense></main>
    </div>
  </div>;
}

export function PublicWallet() {
  return <WalletWorkspace />;
}
