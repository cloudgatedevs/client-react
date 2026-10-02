import { createCloudgateClient } from '@cloudgatedevs/cloudgate-client';

/**
 * Workflow gateway requests made as the signed-in IdP user.
 *
 * The bearer is refreshed before it expires and, when the gateway still answers 401, refreshed
 * once more and the request retried. A 401 that survives a successful refresh is not a session
 * problem (the workflow or its upstream refused the call) and is returned to the caller. Only
 * when the IdP will not issue a new token and the stored one is no longer valid is the session
 * ended, which sends the user to sign in again (see RequireAuth).
 */
export function createGatewayClient({ auth, gatewayUrl, environment = 'sbx', resolveAppIdentity, fetchImpl, timeoutMs, verifySession }) {
  const origin = String(gatewayUrl || '').trim().replace(/\/+$/, '').replace(/\/(sbx|prod|sandbox|production)$/i, '');
  const clients = new Map();
  const segment = value => /^prod/i.test(String(value || '')) ? 'prod' : 'sbx';
  async function client() {
    if (!origin) throw new Error('Set gatewayUrl to the workflow gateway host of this app.');
    let env = segment(environment);
    try { env = segment((await resolveAppIdentity?.())?.environment ?? environment); } catch { /* keep the configured environment */ }
    if (!clients.has(env)) clients.set(env, createCloudgateClient({ baseUrl: origin, environment: env, fetch: fetchImpl, ...(timeoutMs ? { timeoutMs } : {}) }));
    return clients.get(env);
  }
  async function request(path, options = {}) {
    const gateway = await client();
    await auth.ensureAccessToken?.();
    const send = () => gateway.request(path, { ...options, headers: { ...auth.authHeader?.(), ...options.headers } });
    const sent = auth.authHeader?.().Authorization;
    try { return await send(); } catch (error) {
      if (error?.status !== 401 || !sent) throw error;
      // Another request or tab may already have rotated the token.
      const rotated = auth.authHeader?.().Authorization;
      const refreshed = rotated && rotated !== sent ? true : await auth.refresh?.();
      const latest = auth.authHeader?.().Authorization;
      if (refreshed || (latest && latest !== sent)) return send();
      // No new token. An expired stored token ends the session; one that still looks valid is
      // checked against the IdP, which ends the session when it refuses it too.
      if (!auth.isAuthenticated?.()) auth.logout?.({ redirectToLogin: false });
      else await verifySession?.();
      throw error;
    }
  }
  return {
    request,
    get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
    put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
    patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
    delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
  };
}
