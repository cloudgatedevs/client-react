import { Link, Navigate, Outlet } from 'react-router-dom';
import { useCloudgate } from './context.jsx';
import { useSettings } from './settings/SettingsProvider.jsx';
import { ScreenLoader } from './components/ScreenLoader.jsx';
import { RequireAuth } from './auth/RequireAuth.jsx';
import { useAuthContext } from './auth/useAuthContext.js';

export function PublicHomeGate({ children }) {
  const { backofficePath } = useCloudgate();
  const { settings, loading, error, reload } = useSettings();
  const { logout } = useAuthContext();
  if (loading) return <ScreenLoader />;
  if (error) return <div className="cg-connection-screen"><section className="card space-y-4 p-6" role="alert">
    <h1 className="text-xl font-semibold">{error.code === 'configuration' ? 'Website not configured' : 'Website temporarily unavailable'}</h1><p className="text-sm text-mist-muted">{error.message}</p>
    <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary" onClick={reload}>Try again</button><Link className="btn-ghost" to={backofficePath('/')}>Back office</Link><button type="button" className="btn-ghost" onClick={() => { logout(false); reload(); }}>Sign out</button></div>
  </section></div>;
  if (settings.enable_public_website !== 'true') return <Navigate to={backofficePath('/')} replace />;
  const content = children ?? <Outlet />;
  return settings.require_public_website_login === 'true' ? <RequireAuth>{content}</RequireAuth> : content;
}
