import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useCloudgate } from '../context.jsx';
import { useAuthContext } from './useAuthContext';
import { ScreenLoader } from '../components/ScreenLoader.jsx';

const RequireAuth = ({ children }) => {
  const { client } = useCloudgate();
  const cloudgateAuth = client.auth;
  const redirectToLogin = client.login;
  const { auth, loading, currentUser, error, refreshLoginDetails } = useAuthContext();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!auth?.accessToken && cloudgateAuth.enabled) {
      setRedirecting(true);
      redirectToLogin(window.location.href);
    }
  }, [loading, auth?.accessToken]);

  if (loading || redirecting) {
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
    <button className="btn-primary" onClick={() => refreshLoginDetails()}>Try again</button>
  </section></div>;
  if (!currentUser) return <ScreenLoader />;

  return children ?? <Outlet />;
};

export { RequireAuth };
