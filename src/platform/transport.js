/** Native Cloudgate APIs use IdP bearer tokens, never workflow signing credentials. */
export class CloudgatePlatformError extends Error {
  constructor(message, { status = 0, code = 'error', body, url } = {}) {
    super(message);
    this.name = 'CloudgatePlatformError';
    Object.assign(this, { status, code, body, url });
  }
}

export function createIdpClient({ auth, apiUrl, fetchImpl = globalThis.fetch, timeoutMs = 20000, anonymous = false }) {
  const base = String(apiUrl || '').trim().replace(/\/+$/, '');
  return async function request(path, { method = 'POST', body, signal, timeoutMs: callTimeout } = {}) {
    signal?.throwIfAborted();
    // Routes are relative to this tenant's API, so no caller can redirect the bearer.
    let decoded;
    try { decoded = decodeURIComponent(String(path)); } catch { decoded = ''; }
    if (!decoded || /^[\/\\]/.test(decoded) || /[:#\\]/.test(decoded.split('?')[0]) || decoded.split('?')[0].split('/').includes('..'))
      throw new CloudgatePlatformError('Use a relative Cloudgate API route.', { code: 'configuration' });
    if (!base || !auth?.tenancyName || !fetchImpl)
      throw new CloudgatePlatformError('Connect this app to Cloudgate before making requests.', { code: 'configuration' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), callTimeout ?? timeoutMs);
    const abort = () => controller.abort(signal.reason);
    signal?.addEventListener('abort', abort, { once: true });
    const url = `${base}/api/idp/${encodeURIComponent(auth.tenancyName)}/${path}`;
    try {
      if (!anonymous && auth.ensureAccessToken) await auth.ensureAccessToken();
      else if (!anonymous && auth.getAccessToken && !auth.getAccessToken()) await auth.refresh?.();
      controller.signal.throwIfAborted();
      if (!anonymous && ((auth.getAccessToken && !auth.getAccessToken()) || !auth.authHeader?.().Authorization))
        throw new CloudgatePlatformError('Sign in with an active Cloudgate IdP account.', { status: 401, code: 'forbidden' });
      const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
      const run = () => fetchImpl(url, {
        method, signal: controller.signal, credentials: 'omit', redirect: 'error',
        headers: { Accept: 'application/json', ...(!multipart && body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(!anonymous ? auth.authHeader() : {}) },
        ...(anonymous ? { cache: 'no-store' } : {}),
        ...(body !== undefined ? { body: multipart ? body : JSON.stringify(body) } : {}),
      });
      const sentToken = anonymous ? undefined : auth.authHeader().Authorization;
      let response = await run();
      if (response.status === 401 && !anonymous) {
        const changedToken = auth.authHeader().Authorization;
        const refreshed = changedToken && changedToken !== sentToken ? true : await auth.refresh?.();
        const latestToken = auth.authHeader().Authorization;
        if (refreshed || (latestToken && latestToken !== sentToken)) {
          controller.signal.throwIfAborted();
          response = await run();
        }
      }
      let raw;
      try { raw = await response.json(); } catch { raw = null; }
      controller.signal.throwIfAborted();
      const data = raw?.result ?? raw;
      if (!response.ok || raw?.success === false) {
        const status = response.status;
        const code = status === 401 || status === 403 ? 'forbidden'
          : status === 409 ? 'conflict'
          : status === 404 ? (data?.code === 'not-installed' ? 'not-installed' : 'unavailable') : 'error';
        const message = status >= 500 ? 'Cloudgate could not complete this request. Please try again.'
          : raw?.error?.message || data?.message || (typeof data === 'string' ? data : '') ||
            (code === 'forbidden' ? (status === 401 ? 'Sign in with an active Cloudgate IdP account.' : 'Your account does not have access to this Cloudgate feature.')
              : code === 'unavailable' ? 'This feature is not available on this Cloudgate server yet.' : 'Cloudgate could not complete this request. Please try again.');
        throw new CloudgatePlatformError(message, { status, code, body: data, url });
      }
      return data;
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? error;
      if (controller.signal.aborted) throw new CloudgatePlatformError('Cloudgate took too long to respond. Please try again.', { code: 'timeout', url });
      if (error instanceof CloudgatePlatformError) throw error;
      throw new CloudgatePlatformError('Could not reach Cloudgate. Check your connection and try again.', { code: 'network', url });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  };
}

// Compatibility name for callers migrating the former template adapter.
export const createIdpAdminClient = createIdpClient;
