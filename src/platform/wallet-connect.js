const prefix = 'cloudgate-wallet-connect:';
const completions = new Map();
export function safeWalletUrl(value) {
  try {
    const url = new URL(value);
    return !url.username && !url.password && (url.protocol === 'https:' || url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) ? url.href : null;
  } catch { return null; }
}
export function saveWalletConnect(start, scope, browser = window) {
  if (!safeWalletUrl(start.authorizationUrl) || !/^[a-f0-9]{64}$/.test(start.state || '') || !start.connectionTicket ||
      !Number.isFinite(Date.parse(start.expiresAtUtc))) throw new Error('Could not verify the eZAR connection address.');
  const value = { scope, connectionTicket: start.connectionTicket, expiresAtUtc: start.expiresAtUtc,
    returnPath: browser.location.pathname + browser.location.search + browser.location.hash };
  // Store only the protected handshake ticket; never a PIN, OTP or spending token.
  browser.sessionStorage.setItem(prefix + start.state, JSON.stringify(value));
  browser.location.assign(start.authorizationUrl);
}
export function completeWalletConnect(scope, complete, browser = window) {
  const url = new URL(browser.location.href), state = url.searchParams.get('ezar_state');
  const code = url.searchParams.get('ezar_code'), error = url.searchParams.get('ezar_error');
  if (!state && !code && !error) return null;
  const key = prefix + state;
  let saved;
  try { saved = JSON.parse(browser.sessionStorage.getItem(key) || 'null'); } catch { /* Validation below rejects missing state. */ }
  for (const name of ['ezar_state', 'ezar_code', 'ezar_error']) url.searchParams.delete(name);
  // Remove the one-time code before any asynchronous work or navigation.
  browser.history.replaceState(browser.history.state, '', url.pathname + url.search + url.hash);
  const completionKey = key + ":" + scope;
  if (completions.has(completionKey)) return completions.get(completionKey);
  const task = Promise.resolve().then(async () => {
    if (!/^[a-f0-9]{64}$/.test(state || '') || !saved || saved.scope !== scope || !Number.isFinite(Date.parse(saved.expiresAtUtc)) || Date.parse(saved.expiresAtUtc) <= Date.now())
      throw new Error('This connection expired or belongs to another account. Connect your wallet again.');
    browser.sessionStorage.removeItem(key);
    if (saved.returnPath?.startsWith('/') && !saved.returnPath.startsWith('//')) browser.history.replaceState(browser.history.state, '', saved.returnPath);
    if (error) { if (error === 'cancelled') return { cancelled: true }; throw new Error('The eZAR connection was not completed. Try again.'); }
    if (!/^[a-f0-9]{64}$/.test(code || '')) throw new Error('The eZAR connection code is missing. Connect again.');
    return complete({ code, state, connectionTicket: saved.connectionTicket });
  });
  completions.set(completionKey, task);
  return task;
}
