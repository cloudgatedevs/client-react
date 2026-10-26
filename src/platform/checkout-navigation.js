/** Add an app return route only to OpenPay checkout, never third-party provider URLs. */
export function checkoutWithReturnUrl(paymentUrl, applicationUrl) {
  try {
    const url = new URL(paymentUrl), returnTo = new URL(applicationUrl);
    const checkoutPath = /\/pay\/openpay\/(?:sandbox|production)\/[a-f0-9]{32}\/?$/i;
    if (!checkoutPath.test(url.pathname) || checkoutPath.test(returnTo.pathname) || returnTo.username || returnTo.password ||
      (returnTo.protocol !== 'https:' && !(returnTo.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(returnTo.hostname)))) return paymentUrl;
    // Avoid forwarding auth callbacks, search terms, or other private page parameters.
    returnTo.search = ''; returnTo.hash = '';
    url.searchParams.set('returnTo', returnTo.href);
    return url.href;
  } catch { return paymentUrl; }
}
