import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useCloudgate } from '../context.jsx';
const Context = createContext(null);
export const useNotifications = () => useContext(Context);
export function NotificationsProvider({ children }) {
  const { client } = useCloudgate();
  const [unread, setUnread] = useState(0), [revision, setRevision] = useState(0), [connection, setConnection] = useState('connecting');
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setRevision(value => value + 1);
    try { const result = await client.notifications.unreadCount(); if (request === sequence.current) setUnread(Number(result.unreadCount) || 0); }
    catch { /* The inbox displays request failures without breaking navigation. */ }
  }, [client]);
  useEffect(() => {
    refresh();
    const disconnect = client.notifications.connect({ onChange: refresh, onStatus: setConnection });
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { sequence.current++; disconnect(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [client, refresh]);
  return <Context.Provider value={{ api: client.notifications, unread, revision, connection, refresh }}>{children}</Context.Provider>;
}
