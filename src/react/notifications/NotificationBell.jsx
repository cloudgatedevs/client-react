import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, RefreshCw, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BackofficeLink as Link } from '../components/BackofficeLink.jsx';
import * as Dialog from '@radix-ui/react-dialog';
import { Spinner } from '../components/ui.jsx';
import { useNotifications } from './NotificationsProvider';
import { notificationAppearance } from '../../platform/notification-appearance.js';
import { safeNotificationLink } from '../../platform/notifications.js';
import { NotificationItem } from './NotificationItem.jsx';

export function NotificationBell() {
  const { api: notificationsApi, unread, revision, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readError, setReadError] = useState(null);
  const [readingId, setReadingId] = useState(null);
  const reading = useRef(false);
  const [retry, setRetry] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const trigger = useRef(null);
  const navigating = useRef(false);
  const restoreFocus = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setOpen(false); }, [location.key]);
  // Preserve the preview while Radix plays the exit animation.
  useEffect(() => { if (open) { setItems([]); setReadError(null); } }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      // Close when switching between the desktop and mobile header.
      if (!trigger.current?.getClientRects().length) { setOpen(false); return; }
      const rect = trigger.current.getBoundingClientRect();
      const width = Math.min(360, window.innerWidth - 24);
      setPosition({ top: rect.bottom + 10, left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    setLoading(true); setError(null);
    notificationsApi.list({ take: 5 }).then(value => {
      if (!Array.isArray(value?.items)) throw new Error('Cloudgate returned an invalid inbox.');
      if (!stopped) setItems(value.items);
    }).catch(err => { if (!stopped) setError(err); }).finally(() => { if (!stopped) setLoading(false); });
    return () => { stopped = true; };
  }, [open, revision, retry]);

  async function read(item) {
    if (reading.current) return;
    reading.current = true; setReadingId(item.id); setReadError(null);
    try {
      if (!item.isRead) {
        await notificationsApi.read(item.id);
        setItems(current => current.map(value => value.id === item.id ? { ...value, isRead: true } : value));
        await refresh();
      }
      const link = safeNotificationLink(item.actionUrl);
      if (link) {
        navigating.current = true; setOpen(false);
        if (link.startsWith('/')) navigate(link);
        else window.location.assign(link);
      }
    } catch (failure) {
      setReadError(failure.message || 'Could not mark this notification as read. Try again.');
    } finally { reading.current = false; setReadingId(null); }
  }

  return <Dialog.Root open={open} onOpenChange={value => {
    if (value) { navigating.current = false; restoreFocus.current = false; }
    setOpen(value);
  }} modal={false}>
    <Dialog.Trigger asChild>
      <button ref={trigger} type="button" className="btn-ghost relative p-2" aria-label={`Notifications, ${unread} unread`}>
        <Bell size={19} aria-hidden="true" />
        {unread > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-fg">{unread > 99 ? '99+' : unread}</span>}
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Content className="notification-popover fixed z-50 flex max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-850 text-mist shadow-xl outline-none"
        aria-hidden={!open} inert={open ? undefined : ''}
        style={{ ...position, width: 'min(360px, calc(100vw - 24px))', maxHeight: `min(480px, calc(100dvh - ${position.top + 12}px))` }}
        onEscapeKeyDown={() => { restoreFocus.current = true; }}
        onCloseAutoFocus={event => {
          if (navigating.current) {
            event.preventDefault(); navigating.current = false;
            document.querySelector('main')?.focus({ preventScroll: true });
          } else if (restoreFocus.current) {
            // A quick reopen can reuse Radix's closing content and its outside-click
            // state. Explicit dismissals must still return focus to the bell.
            event.preventDefault(); restoreFocus.current = false;
            trigger.current?.focus({ preventScroll: true });
          }
        }}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-700 px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Dialog.Title className="text-sm font-semibold">Notifications</Dialog.Title>
            <Dialog.Description className="rounded-full bg-ink-800 px-2 py-0.5 text-[10px] font-medium text-mist-muted">{unread} unread</Dialog.Description>
          </div>
          <Dialog.Close asChild><button type="button" className="btn-ghost p-2" aria-label="Close notifications" onClick={() => { restoreFocus.current = true; }}><X size={16} /></button></Dialog.Close>
        </div>
        {readError && <p role="alert" className="border-b border-ink-700 px-3.5 py-2 text-xs text-red-700 dark:text-red-300">{readError}</p>}
        <div className="min-h-0 overflow-y-auto overscroll-contain" aria-busy={loading}>
          {loading && items.length === 0 ? <Spinner /> : error ? <div className="space-y-3 p-5">
            <p role="alert" className="text-sm text-mist-muted">{error.message || 'Could not load notifications.'}</p>
            <button type="button" className="btn-ghost text-xs" onClick={() => setRetry(value => value + 1)}><RefreshCw size={14} /> Try again</button>
          </div> : items.length === 0 ? <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-mist-muted">
            <Bell size={24} aria-hidden="true" /><p className="text-sm">No notifications yet.</p><p className="text-xs text-mist-dim">New updates will appear here.</p>
          </div> : <ul className="divide-y divide-ink-700">{items.map(item => <li key={item.id} data-notification-style={notificationAppearance(item.style).value} data-notification-read={item.isRead ? "true" : "false"}>
            <button type="button" className="block w-full text-left text-mist transition-colors hover:bg-ink-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              aria-disabled={readingId !== null} aria-busy={readingId === item.id} onClick={() => read(item)}>
              <NotificationItem item={item} />
            </button>
          </li>)}</ul>}
        </div>
        <div className="shrink-0 border-t border-ink-700 px-3 py-2">
          <Link to="/notifications" className="btn-ghost btn-sm w-full justify-center text-xs" onClick={event => {
            if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
              navigating.current = true; setOpen(false);
            }
          }}>View all notifications <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
