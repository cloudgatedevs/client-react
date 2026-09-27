import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCloudgate } from '../context.jsx';
import { getProfilePictureSrc } from '../../platform/profile.js';
import { TwoFactorLogin } from './TwoFactorLogin.jsx';
export const AuthContext = createContext(null);
export function AuthProvider({ children, publicAccess = false, onLogoutRedirect }) {
  const { client } = useCloudgate();
  const [loading, setLoading] = useState(true), [auth, setAuth] = useState(), [currentUser, setCurrentUser] = useState();
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const [error, setError] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const challengePromise = useRef(null), mounted = useRef(false);
  const requestTwoFactor = useCallback(value => new Promise((resolve, reject) => {
    if (!mounted.current) { reject(new Error('Sign-in cancelled.')); return; }
    challengePromise.current = { resolve, reject }; setChallenge(value);
  }), []);
  const revision = useRef(0);
  const applyProfile = useCallback(profile => setCurrentUser({
    user: { id: profile.id, name: profile.name ?? '', surname: profile.surname ?? '', emailAddress: profile.email ?? '', userName: profile.email ?? '', photoUrl: getProfilePictureSrc(profile), role: profile.role, rolePermissions: profile.rolePermissions, isEmailConfirmed: profile.isEmailConfirmed, promptForEmailVerification: profile.promptForEmailVerification === true },
    tenant: { tenancyName: client.auth.tenancyName },
  }), [client]);
  const loadProfile = useCallback(async ({ silent = false } = {}) => {
    const current = ++revision.current;
    try {
      const profile = await client.profile.get();
      if (current === revision.current) { applyProfile(profile); setError(null); return profile; }
    } catch (err) {
      if (current !== revision.current) return;
      if (err.status === 401 || err.status === 403) client.auth.logout({ redirectToLogin: false });
      else if (!silent) setError(err);
    }
  }, [client, applyProfile]);
  useEffect(() => {
    let active = true; mounted.current = true;
    let bootstrapped = false, lastToken, lastUser;
    setLoading(true);
    const unsubscribe = client.auth.subscribe(session => {
      if (!active) return;
      setAuth(session || undefined);
      if (!session) { revision.current++; setCurrentUser(undefined); }
      if (bootstrapped && session && session.accessToken !== lastToken) {
        if (session.user?.id !== lastUser) setCurrentUser(undefined);
        lastToken = session.accessToken; lastUser = session.user?.id;
        loadProfile();
      }
    });
    const stop = client.auth.startSessionMonitor();
    client.initialize({ onTwoFactorRequired: requestTwoFactor }).then(async session => {
      if (!active) return;
      setAuth(session || undefined);
      lastToken = session?.accessToken; lastUser = session?.user?.id; bootstrapped = true;
      if (session) await loadProfile();
      if (active) setLoading(false);
    }).catch(err => { if (active) { setError(err); setLoading(false); } });
    return () => { active = false; mounted.current = false; revision.current++; unsubscribe(); stop(); challengePromise.current?.reject(new Error('Sign-in cancelled.')); challengePromise.current = null; };
  }, [client, loadProfile, requestTwoFactor]);
  const logout = useCallback((redirect = true) => {
    client.auth.logout({ redirectToLogin: false });
    if (redirect && onLogoutRedirect) onLogoutRedirect();
    else if (redirect && publicAccess) window.location.assign('/');
    else if (redirect && client.auth.enabled) client.login(window.location.href);
  }, [client, publicAccess, onLogoutRedirect]);
  const updateUser = useCallback(async values => applyProfile(await client.profile.update(values)), [client, applyProfile]);
  const updateProfilePicture = useCallback(async file => {
    const userId = currentUserRef.current?.user?.id;
    const picture = await (file ? client.profile.uploadPicture(file) : client.profile.removePicture());
    if (mounted.current && userId != null && currentUserRef.current?.user?.id === userId) {
      // Discard profile reads begun before this save, including token-refresh reads.
      revision.current++;
      setCurrentUser(previous => previous?.user?.id === userId ? {
        ...previous, user: { ...previous.user, photoUrl: getProfilePictureSrc(picture) },
      } : previous);
    }
  }, [client]);
  const value = useMemo(() => ({ loading, auth, currentUser, error, headerUser: currentUser, logout, updateUser, updateProfilePicture, refreshLoginDetails: loadProfile }), [loading, auth, currentUser, error, logout, updateUser, updateProfilePicture, loadProfile]);
  if (challenge) return <TwoFactorLogin client={client} challenge={challenge}
    onSuccess={tokens => { challengePromise.current?.resolve(tokens); challengePromise.current = null; setChallenge(null); }}
    onCancel={() => { challengePromise.current?.reject(new Error('Sign-in cancelled.')); challengePromise.current = null; setChallenge(null); }} />;
  if (error && !publicAccess) return <div className="cg-connection-screen"><section className="card space-y-4 p-8 text-center" role="alert">
    <h1 className="text-xl font-semibold">Let’s get you signed in</h1><p className="text-sm text-mist-muted">{error.message}</p>
    {auth && <button className="btn-ghost" onClick={loadProfile}>Try again</button>}
    <button className="btn-primary" onClick={() => client.login()}>Sign in</button>
  </section></div>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
