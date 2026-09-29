import { SDK_PAYMENT_ROUTES } from '../routing.js';
import { useState } from 'react';
import { BackofficeLink as Link } from '../components/BackofficeLink.jsx';
import { RefreshCw, FlaskConical } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { Badge, ErrorNote, PageHead, Spinner, Table, useAsync } from '../components/ui.jsx';
import { Field } from '../components/forms.jsx';
import { PAYMENT_STATUSES, paymentAmount, paymentStatusTone } from './paymentDisplay.js';

export function PaymentList() {
  const { client, identity } = useCloudgate();
  const [selectedEnvironment, setEnvironment] = useState(null), [status, setStatus] = useState(''), [skip, setSkip] = useState(0);
  const environment = selectedEnvironment || (/^prod/.test(identity?.environment || client.config.environment) ? 'prod' : 'sbx');
  const take = 25;
  const payments = useAsync(() => client.payments.list({ environment, status: status === '' ? null : Number(status), skip, take }), [client, environment, status, skip]);
  const rows = payments.data?.items || [];
  const count = payments.data?.totalCount || 0;
  return <div className="space-y-5">
    <PageHead title="All payments" subtitle="Payment records across your Cloudgate tenant.">
      <button className="btn-ghost" disabled={payments.loading} onClick={payments.reload}><RefreshCw size={15} />Refresh</button>
      <Link className="btn-primary" to={SDK_PAYMENT_ROUTES.test}><FlaskConical size={15} />Test payment</Link>
    </PageHead>
    <div className="card flex flex-wrap gap-4 p-4">
      <Field label="Environment" id="payment-environment"><select id="payment-environment" className="input" value={environment} onChange={event => { setEnvironment(event.target.value); setSkip(0); }}><option value="sbx">Sandbox</option><option value="prod">Production</option></select></Field>
      <Field label="Status" id="payment-status"><select id="payment-status" className="input" value={status} onChange={event => { setStatus(event.target.value); setSkip(0); }}><option value="">All statuses</option>{PAYMENT_STATUSES.map((label, value) => <option key={label} value={value}>{label}</option>)}</select></Field>
    </div>
    <ErrorNote error={payments.error} />
    {payments.loading ? <Spinner /> : !payments.error && <>
      <Table rows={rows} empty={`No ${environment === 'prod' ? 'production' : 'sandbox'} payments match these filters.`} columns={[
        { key: 'reference', label: 'Payment', mobile: 'title', render: row => <div><p className="font-medium">{row.reference || `Payment #${row.id}`}</p><p className="text-xs text-mist-muted">{row.description || '—'}</p></div> },
        { key: 'grossAmount', label: 'Amount', render: row => paymentAmount(row.grossAmount, row.currency) },
        { key: 'status', label: 'Status', render: row => <Badge tone={paymentStatusTone(row.status)}>{PAYMENT_STATUSES[row.status] || 'Unknown'}</Badge> },
        { key: 'creationTime', label: 'Created', render: row => row.creationTime ? new Date(row.creationTime).toLocaleString() : '—' },
        { key: 'refundedAmount', label: 'Refunded', render: row => paymentAmount(row.refundedAmount || 0, row.currency) },
      ]} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-mist-muted"><p>{count ? `${skip + 1}–${Math.min(skip + rows.length, count)} of ${count} payments` : '0 payments'}</p><div className="flex gap-2"><button className="btn-ghost" disabled={skip === 0} onClick={() => setSkip(value => Math.max(0, value - take))}>Previous</button><button className="btn-ghost" disabled={skip + take >= count} onClick={() => setSkip(value => value + take)}>Next</button></div></div>
    </>}
  </div>;
}
