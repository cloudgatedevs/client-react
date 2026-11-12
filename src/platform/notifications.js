export function safeNotificationLink(value) {
  if (!value || typeof value !== 'string') return null;
  const original = value.trim();
  let decoded = original;
  for (let i = 0; i < 3; i++) {
    if (/[\u0000-\u001f\u007f\\]/.test(decoded) || decoded.startsWith('//')) return null;
    try { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; } catch { return null; }
  }
  if (/[\u0000-\u001f\u007f\\]/.test(decoded) || decoded.startsWith('//')) return null;
  if (decoded.startsWith('/')) return original;
  try {
    const url = new URL(decoded);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? original : null;
  } catch { return null; }
}

export function createNotificationsClient({ request, resolveAppIdentity }) {
  const run = async (action, body = {}) => {
    const { environment } = await resolveAppIdentity();
    if (!/^(sbx|sandbox|prod|production)$/.test(environment)) throw new Error('Choose a valid notification environment.');
    return request(`notifications/${action}`, { body: { ...body, environment } });
  };
  return {
    list: ({ skip = 0, take = 25, unreadOnly = false } = {}) => run('list', { skip, take, unreadOnly }),
    unreadCount: () => run('unread-count'),
    read: id => run('read', { id }),
    readAll: () => run('read-all'),
  };
}

/** Native WebSocket, backed by Cloudgate's Redis fan-out across instances. */
export function connectNotificationSocket({ apiUrl, environment, getSocketTicket, onChange, onAgents, onStatus = () => {}, WebSocketImpl = globalThis.WebSocket,
  retryDelayMs = 1000, heartbeatMs = 25000, handshakeMs = 20000 }) {
  if (typeof getSocketTicket !== 'function') throw new TypeError('Provide getSocketTicket to obtain a one-use notification ticket.');
  if (!/^(sbx|sandbox|prod|production)$/.test(environment)) throw new TypeError('Choose a valid notification environment.');
  environment = /^prod/.test(environment) ? 'prod' : 'sbx';
  const endpoint = new URL(`${String(apiUrl).replace(/\/+$/, '')}/ws-idp-notifications`);
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password)
    throw new TypeError('Use an HTTP(S) Cloudgate API URL without credentials.');
  endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
  let stopped = false, socket, retry, heartbeat, handshake, stable, ticketRequest, attempt = 0;
  const clearConnectionTimers = () => { clearInterval(heartbeat); clearTimeout(handshake); clearTimeout(stable); };
  const schedule = (retryAfterSeconds = 0) => {
    if (stopped) return;
    clearTimeout(retry);
    const backoff = Math.min(60000, retryDelayMs * 2 ** Math.min(attempt++, 10));
    const retryAfter = Number(retryAfterSeconds);
    const minimum = Number.isFinite(retryAfter) ? Math.min(86400000, Math.max(0, retryAfter * 1000)) : 0;
    retry = setTimeout(open, Math.max(minimum, backoff + Math.random() * backoff * 0.25));
  };
  async function open() {
    if (stopped) return;
    onStatus('connecting');
    const request = new AbortController();
    ticketRequest = request;
    try {
      // The authenticated REST transport refreshes the bearer if needed. Only the
      // 30-second, single-use ticket may go in the browser WebSocket URL.
      const result = await getSocketTicket({ environment, signal: request.signal });
      if (stopped) return;
      if (typeof result?.ticket !== 'string' || !/^[0-9a-f]{64}$/i.test(result.ticket)) {
        onStatus('disconnected'); schedule(); return;
      }
      const url = new URL(endpoint);
      url.searchParams.set('environment', environment);
      url.searchParams.set('ticket', result.ticket);
      const current = new WebSocketImpl(url.toString());
      socket = current;
      let ready = false;
      const disconnected = () => {
        if (stopped || socket !== current) return;
        socket = undefined;
        clearConnectionTimers();
        current.onopen = current.onmessage = current.onerror = current.onclose = null;
        current.close(); onStatus('disconnected'); schedule();
      };
      // A protocol upgrade is not enough: wait for the server's authenticated ready frame.
      handshake = setTimeout(disconnected, handshakeMs);
      current.onopen = () => {
        if (stopped || socket !== current) return;
        heartbeat = setInterval(() => {
          if (current.readyState === 1) {
            try { current.send('ping'); } catch { disconnected(); }
          }
        }, heartbeatMs);
      };
      current.onmessage = event => {
        if (stopped || socket !== current) return;
        try {
          const message = JSON.parse(event.data);
          // 'ready' arrives after server registration, closing the reconnect/inbox race.
          if (message.environment !== environment) return;
          if (message.type === 'ready' && !ready) {
            ready = true; clearTimeout(handshake); onStatus('connected');
            // Rapid upgrade/close cycles must keep backing off instead of retrying forever at 1s.
            stable = setTimeout(() => { attempt = 0; }, 30000);
          }
          if (!ready) return;
          if (['ready', 'notificationsChanged'].includes(message.type)) onChange();
          // Agent activity shares the socket: the same frame reaches the AI agents provider.
          if (['ready', 'agentsChanged'].includes(message.type)) onAgents?.(message);
        } catch { /* Ignore malformed frames. REST remains the source of notification content. */ }
      };
      current.onerror = disconnected;
      current.onclose = disconnected;
    } catch (error) {
      if (!stopped) {
        onStatus('disconnected');
        // The REST transport already tried a token refresh. Do not hammer a refused
        // account or an unavailable route; a new signed-in session reconnects normally.
        if (![400, 401, 403, 404].includes(error?.status) && error?.code !== 'configuration')
          schedule(error?.body?.retryAfterSeconds);
      }
    } finally { if (ticketRequest === request) ticketRequest = undefined; }
  }
  retry = setTimeout(open, 0);
  return () => { stopped = true; clearTimeout(retry); clearConnectionTimers(); ticketRequest?.abort(); socket?.close(); };
}
