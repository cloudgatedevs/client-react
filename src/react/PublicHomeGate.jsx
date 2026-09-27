import { Link, Navigate, Outlet } from 'react-router-dom';
import { useCloudgate } from './context.jsx';
import { useSettings } from './settings/SettingsProvider.jsx';
import { ScreenLoader } from './components/ScreenLoader.jsx';
import { RequireAuth } from './auth/RequireAuth.jsx';

export function PublicHomeGate({ children }) {
  const { backofficePath } = useCloudgate();
  const { settings, loading, error, reload } = useSettings();
  if (loading) return <ScreenLoader />;
  if (error) return <div className="cg-connection-screen"><section className="card space-y-4 p-6" role="alert">
    <h1 className="text-xl font-semibold">Website temporarily unavailable</h1><p className="text-sm text-mist-muted">{error.message}</p>
    <div className="flex gap-3"><button className="btn-primary" onClick={reload}>Try again</button><Link className="btn-ghost" to={backofficePath('/')}>Back office</Link></div>
  </section></div>;
  if (settings.enable_public_website !== 'true') return <Navigate to={backofficePath('/')} replace />;
  const content = children ?? <Outlet />;
  return settings.require_public_website_login === 'true' ? <RequireAuth>{content}</RequireAuth> : content;
}
