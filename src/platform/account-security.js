import { CloudgatePlatformError } from './transport.js';

const securityStatus = value => {
  if (typeof value?.email !== 'string' || typeof value.isEmailConfirmed !== 'boolean' || typeof value.twoFactorEnabled !== 'boolean' ||
    !Number.isInteger(value.recoveryCodesRemaining) || value.recoveryCodesRemaining < 0)
    throw new CloudgatePlatformError('Cloudgate returned incomplete account security status. Try refreshing the page.');
  return value;
};
export function createAccountSecurityClient({ request, auth }) {
  const change = async (path, code, options) => {
    const result = await request(`account/security/${path}`, { ...options, body: { code: String(code || '').trim() } });
    securityStatus(result?.security);
    if (result.tokens) auth.setSession(result.tokens);
    return result;
  };
  return {
    get: options => request('account/security', { ...options, method: 'GET' }).then(securityStatus),
    beginSetup: async options => {
      const result = await request('account/security/setup', options);
      if (!/^[A-Z2-7]{16,128}$/.test(result?.manualEntryKey || '') || !result?.authenticatorUri?.startsWith('otpauth://totp/'))
        throw new CloudgatePlatformError('Cloudgate could not start authenticator setup. Try again.');
      return result;
    },
    confirmSetup: (code, options) => change('enable', code, options),
    disable: (code, options) => change('disable', code, options),
    regenerateRecoveryCodes: (code, options) => change('recovery-codes', code, options),
  };
}

// A challenge is not an access token. Complete it only against the configured IdP.
export async function completeTwoFactorLogin({ apiUrl, tenancyName, challengeToken, code, fetchImpl = globalThis.fetch, signal }) {
  const response = await fetchImpl(`${apiUrl.replace(/\/+$/, '')}/api/idp/${encodeURIComponent(tenancyName)}/TwoFactorLogin`, {
    method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ challengeToken, code }),
  });
  const raw = await response.json().catch(() => null), result = raw?.result ?? raw;
  if (!response.ok || !result?.accessToken || !result?.refreshToken)
    throw new CloudgatePlatformError(raw?.error?.message || result?.message || 'Could not verify this code. Try again or sign in again.', { status: response.status });
  return result;
}
