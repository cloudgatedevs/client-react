import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, EmptyState, LineChart, MetricCard, Switch } from '../widgets/index.jsx';
import { queryRows } from '../widgets/table-model.js';

const users = ['Alex Morgan', 'Sam Taylor', 'Jordan Lee', 'Casey Park', 'Robin Ellis', 'Jamie Reed',
  'Avery Chen', 'Drew Patel', 'Cameron Bell', 'Morgan Brooks', 'Riley West', 'Quinn Davis']
  .map((name, id) => ({id, name, email:name.toLowerCase().replace(' ', '.') + '@example.com',
    plan:['Team', 'Starter', 'Business'][id % 3],
    activity:['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => ({label:day, sessions:2 + (id * 7 + index * 3) % 18})),
  }));
const columns = [
  {key:'name', label:'User', render:(name, row) => <div className="cgw-row-demo-person"><strong>{name}</strong><small>{row.email}</small></div>},
  {key:'plan', label:'Plan', render:value => <Badge tone="accent">{value}</Badge>},
];
function waitForSample(signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError'));};
    const timer = setTimeout(() => {signal.removeEventListener('abort', abort); resolve();}, 450);
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, {once:true});
  });
}
function UserDetails({ user, state }) {
  const [details, setDetails] = useState(null), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setDetails(null); setError('');
    waitForSample(controller.signal).then(() => {
      if (controller.signal.aborted) return;
      if (state === 'error') throw new Error('Could not load this user. Switch to Ready and try again.');
      if (state !== 'loading') setDetails(user);
    }).catch(err => {if (!controller.signal.aborted) setError(err.message);});
    return () => controller.abort();
  }, [user, state, revision]);
  const busy = !details && !error;
  return <div className="cgw-stack">
    <div className="cgw-row cgw-between"><div><strong>{user.name}</strong><p className="cgw-muted">{user.email}</p></div><Badge tone="accent">{user.plan}</Badge></div>
    {error ? <Alert title="Details unavailable" tone="danger" action={<Button size="sm" variant="secondary" onClick={() => setRevision(value => value + 1)}>Try again</Button>}>{error}</Alert> : <>
      <MetricCard label="Sessions this week" value={details?.activity.reduce((sum, day) => sum + day.sessions, 0) ?? 0}
        description={`Activity for ${user.name}`} loading={busy} />
      <Card title="Daily activity" description={`Sessions for ${user.name}`}>
        <LineChart label={`${user.name} daily sessions`} data={details?.activity || []} series={[{key:'sessions', label:'Sessions'}]}
          height={190} loading={busy} />
      </Card>
    </>}
  </div>;
}

export function WidgetRowSelection({ state = 'ready' }) {
  const [activeId, setActiveId] = useState(null), [remote, setRemote] = useState(false);
  const user = state === 'empty' ? null : users.find(user => user.id === activeId);
  async function loadRows({signal, ...query}) {
    await waitForSample(signal);
    if (state === 'error') throw new Error('Sample users could not be loaded. Switch to Ready to try again.');
    return queryRows(state === 'empty' ? [] : users, columns, query);
  }
  return <div className="cgw-stack">
    <div className="cgw-row cgw-between"><p className="cgw-muted">Select a user to load their metrics and chart. All data in this example is fictional.</p>
      <Switch label="Simulated server" checked={remote} onChange={setRemote} /></div>
    <div className="cgw-row-selection-demo">
      <div className="cgw-stack">
        <DataTable label="Users" rows={remote ? undefined : state === 'empty' ? [] : users} loadRows={remote ? loadRows : undefined}
          columns={columns} pageSize={5} pageSizes={[5,10,25]} rowSelectable activeRowId={user ? activeId : null}
          onActiveRowChange={setActiveId} getRowLabel={row => row.name} reloadKey={state}
          loading={state === 'loading'} error={!remote && state === 'error' ? new Error('Switch to Ready to restore the sample users.') : undefined} />
        <p className="cgw-muted">Click anywhere on a row, or focus its circle and use Enter, Space or ↑/↓. The active user stays selected across pages.</p>
      </div>
      <section className="cgw-row-demo-details" aria-label="Selected user details">
        <div className="cgw-row cgw-between cgw-row-demo-heading"><strong>User details</strong>
          {user && <Button variant="ghost" size="sm" onClick={() => setActiveId(null)}>Clear active row</Button>}</div>
        {user ? <UserDetails key={user.id} user={user} state={state} /> : <EmptyState title="Select a user"
          description="Their metrics and activity will appear here. Table paging and bulk checkboxes can stay independent." />}
      </section>
    </div>
  </div>;
}
