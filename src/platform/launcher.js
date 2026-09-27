import { IDP_ACCESS_TOKEN_KEY, IDP_REFRESH_TOKEN_KEY, IDP_ACCESS_TOKEN_EXPIRY_KEY, isTokenValid } from '@cloudgatedevs/cloudgate-client';

// The code is carried in the fragment so it never reaches the app's HTTP server or referrer logs.
// Only the build's configured API, tenant and app ID may redeem it.
export async function consumeLauncherLogin({ apiUrl, tenancyName, webAppId, auth,
  onTwoFactorRequired, location = globalThis.window?.location, history = globalThis.window?.history, storage, fetcher = globalThis.fetch }) {
  if (!location) return false;
  const hash = new URLSearchParams(location.hash.slice(1));
  if (!hash.has('cloudgate_login')) return false;
  const code = hash.get('cloudgate_login');
  const query = new URLSearchParams(location.search);
  for (const key of ['access_token', 'refresh_token', 'expires_in', 'idp_tenant', 'tenant']) query.delete(key);
  hash.delete('cloudgate_login');
  const clean = location.pathname + (query.size ? `?${query}` : '') + (hash.size ? `#${hash}` : '');
  history.replaceState(history.state, '', clean);
  auth.logout({ redirectToLogin: false });
  if (!/^[A-Za-z0-9_-]{43}$/.test(code) || !apiUrl || !tenancyName || !webAppId)
    throw new Error('This app sign-in link is invalid. Open your app from the launcher again.');
  const response = await fetcher(`${apiUrl.replace(/\/$/, '')}/api/idp/${encodeURIComponent(tenancyName)}/RedeemLauncherLogin`, {
    method: 'POST', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ code, webAppId }), signal: AbortSignal.timeout(15000),
  });
  const raw = await response.json().catch(() => null);
  let tokens = raw?.result ?? raw;
  if (response.ok && tokens?.requiresTwoFactor && tokens?.challengeToken) {
    if (!onTwoFactorRequired) throw new Error('Two-factor authentication is required. Sign in to complete verification.');
    tokens = await onTwoFactorRequired(tokens);
  }
  if (!response.ok || !tokens?.accessToken || !isTokenValid(tokens.accessToken) || !tokens.refreshToken)
    throw new Error('This sign-in link has expired or could not be verified. Open your app from the launcher again, or sign in.');
  try {
    if (auth.setSession) { auth.setSession(tokens); return true; }
    storage ??= globalThis.window?.localStorage;
    storage.setItem(IDP_ACCESS_TOKEN_KEY, tokens.accessToken);
    storage.setItem(IDP_REFRESH_TOKEN_KEY, tokens.refreshToken);
    storage.setItem(IDP_ACCESS_TOKEN_EXPIRY_KEY, String(Math.floor(Date.now() / 1000) + Number(tokens.expiresIn || 0)));
  } catch (error) {
    auth.logout({ redirectToLogin: false });
    throw new Error('Allow browser storage to sign in to your app.', { cause: error });
  }
  return true;
}
