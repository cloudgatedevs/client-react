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
export function connectNotificationSocket({ apiUrl, environment, getAccessToken, onChange, onStatus = () => {}, WebSocketImpl = WebSocket,
  retryDelayMs = 1000, heartbeatMs = 25000, handshakeMs = 20000 }) {
  let stopped = false, socket, retry, heartbeat, handshake, attempt = 0;
  const clearConnectionTimers = () => { clearInterval(heartbeat); clearTimeout(handshake); };
  const schedule = () => {
    if (stopped) return;
    clearTimeout(retry);
    retry = setTimeout(open, Math.min(30000, retryDelayMs * 2 ** Math.min(attempt++, 5)));
  };
  async function open() {
    if (stopped) return;
    onStatus('connecting');
    try {
      const token = await getAccessToken();
      if (stopped) return;
      if (!token) { onStatus('disconnected'); schedule(); return; }
      const url = new URL(`${String(apiUrl).replace(/\/+$/, '')}/ws-idp-notifications`);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('environment', environment);
      url.searchParams.set('access_token', token);
      const current = new WebSocketImpl(url.toString());
      socket = current;
      handshake = setTimeout(() => { if (current.readyState === 0) current.close(); }, handshakeMs);
      current.onopen = () => {
        if (stopped || socket !== current) return;
        clearTimeout(handshake); attempt = 0; onStatus('connected');
        heartbeat = setInterval(() => { if (current.readyState === 1) current.send('ping'); }, heartbeatMs);
      };
      current.onmessage = event => {
        if (stopped || socket !== current) return;
        try {
          const message = JSON.parse(event.data);
          // 'ready' arrives after server registration, closing the reconnect/inbox race.
          if (message.environment === environment && ['ready', 'notificationsChanged'].includes(message.type)) onChange();
        } catch { /* Ignore malformed frames. REST remains the source of notification content. */ }
      };
      current.onerror = () => { if (!stopped) onStatus('disconnected'); };
      current.onclose = () => {
        if (stopped || socket !== current) return;
        clearConnectionTimers(); onStatus('disconnected'); schedule();
      };
    } catch { if (!stopped) { onStatus('disconnected'); schedule(); } }
  }
  retry = setTimeout(open, 0);
  return () => { stopped = true; clearTimeout(retry); clearConnectionTimers(); socket?.close(); };
}
