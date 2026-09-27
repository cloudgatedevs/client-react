import { usePermissions } from '../auth/permissions.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { useEffect, useState } from 'react';
import { BackofficeLink as Link } from '../components/BackofficeLink.jsx';
import { Plus, RefreshCw } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { Badge, ErrorNote, PageHead, Pager, Spinner, Table, fmtDate } from '../components/ui.jsx';
import { Notice } from '../components/forms.jsx';
import { NotificationStyleBadge } from '../notifications/NotificationStyleBadge.jsx';
import { NotificationComposer } from '../notifications/NotificationComposer.jsx';

function useQuery(load, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null }), [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setState({ data: null, loading: true, error: null });
    Promise.resolve().then(() => load(controller.signal)).then(data => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: null });
    }).catch(error => { if (!controller.signal.aborted) setState({ data: null, loading: false, error }); });
    return () => controller.abort();
  }, [...deps, revision]);
  return { ...state, reload: () => setRevision(value => value + 1) };
}
const Pagination = ({ data, page, onPage, noun }) => <Pager page={page} pages={Math.max(1, Math.ceil(data.totalCount / 25))} total={data.totalCount} from={data.totalCount ? page * 25 + 1 : 0} to={Math.min(data.totalCount, (page + 1) * 25)} noun={noun} onPage={onPage} />;

function Recipients({ client, environment, notification, onClose }) {
  const [page, setPage] = useState(0), [filter, setFilter] = useState('all');
  const query = useQuery(signal => client.notificationAdmin.recipients({ id: notification.id, environment, skip: page * 25, take: 25, ...(filter !== 'all' ? { isRead: filter === 'read' } : {}) }, { signal }), [client, environment, notification.id, page, filter]);
  return <section className="space-y-4 rounded-lg border border-ink-700 p-4" aria-label="Notification recipients">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="min-w-0 break-words text-lg font-semibold">{notification.title}</h2><button className="btn-ghost" onClick={onClose}>Close recipients</button></div>
    <p className="whitespace-pre-wrap break-words text-sm text-mist-muted">{notification.body}</p>
    {notification.actionUrl && <p className="break-all text-xs text-mist-dim">{notification.actionLabel || 'Open'} · {notification.actionUrl}</p>}
    <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs">Read state<select aria-label="Read state" className="input" value={filter} onChange={event => { setFilter(event.target.value); setPage(0); }}><option value="all">All</option><option value="read">Read</option><option value="unread">Unread</option></select></label><button className="btn-ghost" onClick={query.reload} disabled={query.loading}><RefreshCw size={14} /> Refresh recipients</button></div>
    <ErrorNote error={query.error} />
    {query.loading ? <Spinner /> : query.data && <><Table rows={query.data.items.map(item => ({ ...item, id: item.userId }))} empty="No matching recipients." columns={[
      { key: 'email', label: 'App user', mobile: 'title', render: item => <span className="break-all">{item.email || `User ${item.userId} (unavailable)`}</span> },
      { key: 'isRead', label: 'Status', render: item => <Badge tone={item.isRead ? 'green' : 'gray'}>{item.isRead ? 'Read' : 'Unread'}</Badge> },
      { key: 'readAtUtc', label: 'Read at', mobile: 'meta', render: item => fmtDate(item.readAtUtc) },
    ]} /><Pagination data={query.data} page={page} onPage={setPage} noun="recipients" /></>}
  </section>;
}

function History({ client, environment, onEnvironment }) {
  const { can } = usePermissions();
  const [page, setPage] = useState(0), [createOpen, setCreateOpen] = useState(false), [selected, setSelected] = useState(null), [notice, setNotice] = useState('');
  const query = useQuery(signal => client.notificationAdmin.history({ environment, skip: page * 25, take: 25 }, { signal }), [client, environment, page]);
  const name = environment === 'prod' ? 'Production' : 'Sandbox';
  return <div className="space-y-5">
    <PageHead title="App notifications" subtitle="Send updates to app users and track their read receipts.">
      <Link className="btn-ghost" to="/notifications">My inbox</Link>
      <button className="btn-ghost" onClick={query.reload} disabled={query.loading || createOpen}><RefreshCw size={14} /> Refresh history</button>
      <button className="btn-primary" disabled={!can(P.NotificationsSend) || !query.data || query.loading} onClick={() => { setCreateOpen(true); setNotice(''); }}><Plus size={14} /> Create notification</button>
    </PageHead>
    <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm font-semibold">Notification environment<select aria-label="Notification environment" className="input" value={environment} disabled={createOpen} onChange={event => onEnvironment(event.target.value)}><option value="sbx">Sandbox</option><option value="prod">Production</option></select></label><span className="text-xs text-mist-muted">History and sends below apply to {name}.</span></div>
    <Notice>Notifications target app users across this tenant. Choose one user or all current users; new users do not receive earlier broadcasts.</Notice>
    <Notice>{notice}</Notice><ErrorNote error={query.error} />
    {query.loading ? <Spinner /> : query.data && <>
      <Table rows={query.data.items} empty={`No notifications have been sent in ${name}.`} columns={[
        { key: 'title', label: 'Notification', mobile: 'title', render: item => <div className="min-w-0 max-w-md break-words"><p className="font-semibold">{item.title}</p><p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs font-normal text-mist-muted">{item.body}</p></div> },
        { key: 'style', label: 'Style', render: item => <NotificationStyleBadge style={item.style} /> },
        { key: 'creationTime', label: 'Sent', mobile: 'meta', render: item => fmtDate(item.creationTime) },
        { key: 'isBroadcast', label: 'Audience', render: item => item.isBroadcast ? 'All app users' : 'One app user' },
        { key: 'readCount', label: 'Read / recipients', render: item => `${item.readCount} / ${item.recipientCount}` },
        { key: 'actions', label: 'Actions', mobile: 'actions', render: item => <button className="btn-ghost btn-sm" onClick={() => setSelected(item)}>View recipients</button> },
      ]} />
      <Pagination data={query.data} page={page} onPage={setPage} noun="notifications" />
    </>}
    {selected && <Recipients key={selected.id} client={client} environment={environment} notification={selected} onClose={() => setSelected(null)} />}
    <NotificationComposer open={createOpen} client={client} environment={environment} onClose={() => setCreateOpen(false)} onSent={result => {
      setCreateOpen(false); setPage(0); setSelected(null);
      setNotice(`Notification sent to ${result.recipientCount} app ${result.recipientCount === 1 ? 'user' : 'users'} in ${name}.`); query.reload();
    }} />
  </div>;
}

export function AppNotifications() {
  const { client } = useCloudgate();
  const identity = useQuery(() => client.resolveAppIdentity(), [client]);
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  if (identity.loading) return <Spinner />;
  if (identity.error) return <><ErrorNote error={identity.error} /><button className="btn-ghost" onClick={identity.reload}>Retry</button></>;
  const environment = selectedEnvironment || (/^prod/.test(identity.data.environment) ? 'prod' : 'sbx');
  return <History key={environment} client={client} environment={environment} onEnvironment={setSelectedEnvironment} />;
}
