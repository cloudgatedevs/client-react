import { useEffect, useState } from 'react';
import { CheckCheck, ExternalLink, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../notifications/NotificationsProvider.jsx';
import { safeNotificationLink } from '../../platform/notifications.js';
import { Table, PageHead, ErrorNote, Pager, Spinner } from '../components/ui.jsx';
import { notificationAppearance } from '../../platform/notification-appearance.js';
import { NotificationStyleBadge } from '../notifications/NotificationStyleBadge.jsx';
import { NotificationReadStatus } from '../notifications/NotificationReadStatus.jsx';

export function Notifications() {
  const { api: notificationsApi } = useNotifications();
  const { revision, connection, refresh, unread } = useNotifications();
  const [page, setPage] = useState(0), [unreadOnly, setUnreadOnly] = useState(false);
  const [data, setData] = useState({ items: [], totalCount: 0 }), [loading, setLoading] = useState(true);
  const [error, setError] = useState(null), [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    let stopped = false;
    setLoading(true); setError(null);
    notificationsApi.list({ skip: page * 25, take: 25, unreadOnly }).then(value => {
      if (!Array.isArray(value?.items)) throw new Error('Cloudgate returned an invalid inbox.');
      if (!stopped) {
        setData(value);
        if (page && !value.items.length) setPage(Math.max(0, Math.ceil(value.totalCount / 25) - 1));
      }
    }).catch(err => { if (!stopped) setError(err); }).finally(() => { if (!stopped) setLoading(false); });
    return () => { stopped = true; };
  }, [page, unreadOnly, revision]);
  async function read(item, followLink = false) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      if (!item.isRead) await notificationsApi.read(item.id);
      await refresh();
      const link = followLink && safeNotificationLink(item.actionUrl);
      if (link) { if (link.startsWith('/')) navigate(link); else window.location.assign(link); }
    } catch (err) { setError(err); } finally { setBusy(false); }
  }
  async function readAll() {
    setBusy(true); setError(null);
    try { await notificationsApi.readAll(); await refresh(); } catch (err) { setError(err); } finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <PageHead title="Notifications" subtitle="Updates sent to your app account.">
      <button className="btn-ghost" onClick={refresh} disabled={busy}><RefreshCw size={16} /> Refresh</button>
      <button className="btn-primary" onClick={readAll} disabled={busy || unread === 0}><CheckCheck size={16} /> Mark all read</button>
    </PageHead>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2" aria-label="Notification filter">
        {[false, true].map(value => <button key={String(value)} className={unreadOnly === value ? 'btn-primary' : 'btn-ghost'} aria-pressed={unreadOnly === value} onClick={() => { setUnreadOnly(value); setPage(0); }}>{value ? 'Unread' : 'All'}</button>)}
      </div>
      <span className="text-xs text-mist-muted" role="status">{connection === 'connected' ? 'Live updates connected' : 'Reconnecting to live updates…'}</span>
    </div>
    {error && <ErrorNote error={error} />}
    {loading ? <Spinner /> : <Table rows={data.items} empty={unreadOnly ? 'You’re all caught up.' : 'No notifications yet.'}
      columns={[
        { key: 'title', label: 'Notification', mobile: 'title', render: item => <div className="min-w-0 max-w-md [overflow-wrap:anywhere]">
          <h2 className={`text-sm text-mist ${item.isRead ? 'font-medium' : 'font-semibold'}`}>{item.title}</h2>
          <p className="mt-1 whitespace-pre-wrap text-xs font-normal leading-relaxed text-mist-muted">{item.body}</p>
        </div> },
        { key: 'style', label: 'Style', render: item => <span data-notification-style={notificationAppearance(item.style).value}><NotificationStyleBadge style={item.style} /></span> },
        { key: 'isRead', label: 'Status', render: item => <NotificationReadStatus isRead={item.isRead} /> },
        { key: 'creationTime', label: 'Received', mobile: 'meta', render: item => <time className="whitespace-nowrap text-xs text-mist-dim" dateTime={item.creationTime}>{new Date(item.creationTime).toLocaleString()}</time> },
        { key: 'actions', label: 'Actions', mobile: 'actions', render: item => <div className="flex flex-wrap items-center gap-2">
          {!item.isRead && <button className="btn-ghost btn-sm" disabled={busy} onClick={() => read(item)}>Mark read</button>}
          {safeNotificationLink(item.actionUrl) && <a className="btn-primary btn-sm" href={safeNotificationLink(item.actionUrl)} onClick={event => { event.preventDefault(); read(item, true); }} aria-disabled={busy}>{item.actionLabel || 'Open'}<ExternalLink size={14} /></a>}
          {item.isRead && !safeNotificationLink(item.actionUrl) && <span className="text-mist-dim">—</span>}
        </div> },
      ]} />}
    {!loading && <Pager page={page} pages={Math.max(1, Math.ceil(data.totalCount / 25))} total={data.totalCount}
      from={data.totalCount ? page * 25 + 1 : 0} to={Math.min(data.totalCount, (page + 1) * 25)} noun="notifications" onPage={setPage} />}
  </div>;
}
