import { useEffect, useRef, useState } from 'react';
import { checkoutWithReturnUrl } from '../../platform/checkout-navigation.js';
import { Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { usePermissions } from '../auth/permissions.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { Badge, ErrorNote } from '../components/ui.jsx';
import { Modal, Notice } from '../components/forms.jsx';
import { safePaymentUrl } from '../../platform/payments.js';
import { PAYMENT_STATUSES, paymentAmount, paymentStatusTone, walletAccountNumber, walletTypeLabel } from './paymentDisplay.js';

export function WalletAccountNumber({ value }) {
  const [copied, setCopied] = useState(false), [error, setError] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const number = walletAccountNumber(value);
  if (!number) return <span className="text-mist-muted">Unavailable</span>;
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setError(null); setCopied(true); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 2000); }
    catch { setError('Could not copy. Select the account number to copy it.'); }
  };
  return <span className="inline-flex flex-wrap items-center gap-2"><span className="select-all whitespace-nowrap tabular-nums">{number}</span><button type="button" className="btn-ghost p-2" onClick={copy} title={copied ? 'Copied' : 'Copy account number'} aria-label={copied ? 'Account number copied' : 'Copy account number'}>{copied ? <Check size={15} /> : <Copy size={15} />}</button><span className="sr-only" role="status">{copied ? 'Account number copied' : ''}</span>{error && <span role="alert" className="text-xs text-red-600">{error}</span>}</span>;
}

export function PaymentWalletDetails({ status }) {
  if (!status) return null;
  const wallet = status.wallet;
  return <section className="card space-y-4 p-5" aria-label="Connected payment wallet">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Receiving wallet</h2><div className="flex flex-wrap gap-2"><Badge tone={status.production ? 'blue' : 'green'}>{status.production ? 'Production' : 'Sandbox'}</Badge><Badge tone={status.ready ? 'green' : 'amber'}>{status.ready ? 'Ready to accept payments' : status.comingSoon ? 'Coming soon' : 'Setup required'}</Badge></div></div>
    {status.walletDetailsUnavailable && <Notice>Wallet details are temporarily unavailable. Refresh to try again.</Notice>}
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {wallet && <><div className="sm:col-span-2 lg:col-span-1"><dt className="label">Wallet account number</dt><dd className="mt-1 text-sm font-medium"><WalletAccountNumber value={wallet.accountNumber} /></dd></div>
      {[
        ['Mobile number', wallet.phoneNumber], ['Wallet type', walletTypeLabel(wallet.walletType)],
        ['Account name', [wallet.firstName, wallet.lastName].filter(Boolean).join(' ') || wallet.profileName],
        ['Email address', wallet.email], ['Network', wallet.network],
      ].map(([label,value]) => <div key={label}><dt className="label">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value || '—'}</dd></div>)}</>}
      {!wallet && !status.walletDetailsUnavailable && <div><dt className="label">Provider</dt><dd className="mt-1 text-sm">{status.provider === 'None' ? 'Not connected' : status.provider}</dd></div>}
      <div><dt className="label">Currency</dt><dd className="mt-1 text-sm uppercase">{status.currency || '—'}</dd></div>
      <div><dt className="label">Withdrawals</dt><dd className="mt-1 text-sm">{status.payoutsEnabled ? 'Enabled' : 'Not activated'}</dd></div>
    </dl>
  </section>;
}

export function PaymentInvoiceModal({ payment, onClose, onUpdated }) {
  const { client } = useCloudgate();
  const { can } = usePermissions();
  const [busy, setBusy] = useState(false), [error, setError] = useState(null);
  const generation = useRef(0);
  useEffect(() => { generation.current++; setError(null); setBusy(false); return () => { generation.current++; }; }, [payment?.id, payment?.isProduction]);
  if (!payment) return null;
  const url = checkoutWithReturnUrl(safePaymentUrl(payment.paymentUrl, { isProduction: payment.isProduction }), window.location.href);
  const refresh = async () => {
    const current = generation.current; setBusy(true); setError(null);
    try {
      const result = await client.payments.get({ paymentId: payment.id, environment: payment.isProduction ? 'prod' : 'sbx' });
      if (generation.current === current) onUpdated?.(result);
    } catch (failure) { if (generation.current === current) setError(failure); }
    finally { if (generation.current === current) setBusy(false); }
  };
  return <Modal open title={payment.invoiceNumber ? `Invoice ${payment.invoiceNumber}` : `Payment #${payment.id}`} onClose={onClose}
    footer={<><button className="btn-ghost" onClick={onClose}>Close</button>{can(P.PaymentsHistory) && <button className="btn-ghost" disabled={busy} onClick={refresh}><RefreshCw size={15} />{busy ? 'Refreshing…' : 'Refresh status'}</button>}{url && <a className="btn-primary" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Open checkout</a>}</>}>
    <div className="space-y-4"><ErrorNote error={error} /><div className="flex flex-wrap items-center gap-2"><Badge tone={payment.isProduction ? 'blue' : 'green'}>{payment.isProduction ? 'Production' : 'Sandbox'}</Badge><Badge tone={paymentStatusTone(payment.status)}>{PAYMENT_STATUSES[payment.status] || 'Unknown'}</Badge></div>
      <div><h3 className="text-base font-semibold">{payment.description || 'Payment'}</h3><p className="mt-1 text-2xl font-semibold tabular-nums">{paymentAmount(payment.grossAmount, payment.currency)}</p></div>
      {payment.invoiceId && <div><p className="label">Receiving wallet account</p><div className="mt-1 text-sm"><WalletAccountNumber value={payment.receivingAccountNumber} /></div>{payment.invoiceDetailsUnavailable && <p className="mt-1 text-xs text-amber-700">The invoice’s receiving account could not be loaded. Refresh to try again.</p>}</div>}
      <dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="label">Created</dt><dd className="mt-1">{payment.creationTime ? new Date(payment.creationTime).toLocaleString() : '—'}</dd></div><div><dt className="label">Reference</dt><dd className="mt-1 break-words">{payment.reference || '—'}</dd></div>{payment.paidAt && <div><dt className="label">Paid</dt><dd className="mt-1">{new Date(payment.paidAt).toLocaleString()}</dd></div>}</dl>
      <p className="text-xs text-mist-muted">Payment status updates after confirmation. This invoice keeps its original receiving wallet.</p>
    </div>
  </Modal>;
}
