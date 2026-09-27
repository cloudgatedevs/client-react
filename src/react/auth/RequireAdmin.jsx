import { Outlet } from 'react-router-dom';
import { useAuthContext } from './useAuthContext';
import { canAccessBackoffice } from '../../platform/backoffice-permissions.js';

export function RequireAdmin() {
  const { currentUser, logout, refreshLoginDetails } = useAuthContext();
  if (canAccessBackoffice(currentUser?.user)) return <Outlet />;
  return (
    <div className="grid min-h-screen w-full place-items-center p-6">
      <section className="card max-w-md space-y-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Back office access required</h1>
        <p className="text-sm text-mist-muted">
          Your role needs back office access. Ask someone who manages roles to grant the permissions you need.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn-ghost" onClick={refreshLoginDetails}>
            Check access again
          </button>
          <button className="btn-primary" onClick={() => logout(true)}>
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
