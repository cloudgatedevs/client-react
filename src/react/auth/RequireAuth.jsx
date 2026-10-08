import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useCloudgate } from '../context.jsx';
import { useAuthContext } from './useAuthContext';
import { ScreenLoader } from '../components/ScreenLoader.jsx';
import { useSettings } from '../settings/SettingsProvider.jsx';

const RequireAuth = ({ children }) => {
  const { client } = useCloudgate();
  const cloudgateAuth = client.auth;
  const redirectToLogin = client.login;
  const { auth, loading, currentUser, error, refreshLoginDetails, logout, sessionEnded, acknowledgeSessionEnd } = useAuthContext();
  const [redirecting, setRedirecting] = useState(false);
  const navigate = useNavigate();
  const leaving = useRef(false);
  // Present only when the app has a public website; its settings decide where an ended session goes.
  const website = useSettings();
  const websiteLoading = !!sessionEnded && !!website?.loading;
  const openWebsite = !!sessionEnded && !!website && !website.loading && !website.error &&
    website.settings?.enable_public_website === 'true' && website.settings?.require_public_website_login !== 'true';

  useEffect(() => {
    if (loading || websiteLoading) return;
    if (auth?.accessToken) { leaving.current = false; if (redirecting) setRedirecting(false); return; }
    if (!cloudgateAuth.enabled || leaving.current) return;
    // A session that ended (the token could not be refreshed) returns the visitor to a public
    // website that needs no sign in; everyone else signs in again and comes back to this page.
    if (openWebsite) { leaving.current = true; acknowledgeSessionEnd?.(); navigate('/', { replace: true }); return; }
    setRedirecting(true);
    redirectToLogin(window.location.href);
  }, [loading, websiteLoading, openWebsite, auth?.accessToken]);

  if (loading || redirecting || (!auth?.accessToken && (websiteLoading || openWebsite || leaving.current))) {
    return <ScreenLoader />;
  }

  if (!auth?.accessToken) {
    return (
      <div className="flex min-h-[60vh] grow flex-col items-center justify-center p-8 text-center">
        <p className="text-lg font-medium text-mist">Sign-in not configured</p>
        <p className="mt-2 max-w-md text-sm text-mist-muted">
          Connect this application to your Cloudgate tenant to enable sign-in.
        </p>
      </div>
    );
  }

  if (error) return <div className="cg-connection-screen"><section className="card space-y-4 p-6" role="alert">
    <h1 className="text-lg font-semibold">Could not check your account</h1><p>{error.message}</p>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn-primary" onClick={() => refreshLoginDetails()}>Try again</button>
      <button type="button" className="btn-ghost" onClick={() => logout(true)}>Sign out</button>
    </div>
  </section></div>;
  if (!currentUser) return <ScreenLoader />;

  return children ?? <Outlet />;
};

export { RequireAuth };
