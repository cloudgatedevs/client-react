/** A persistent relationship verified by both IdP and hub sign-in. No ABP token is kept in the app. */
export function createAccountLinkClient({ request }) {
  return {
    get: options => request('profile/cloudgate-link', { ...options, method: 'GET' }),
    start: ({ returnUrl }, options) => request('profile/cloudgate-link/start', { ...options, body: { returnUrl } }),
    complete: ({ code }, options) => request('profile/cloudgate-link/complete', { ...options, body: { code } }),
    detach: options => request('profile/cloudgate-link', { ...options, method: 'DELETE' }),
  };
}
