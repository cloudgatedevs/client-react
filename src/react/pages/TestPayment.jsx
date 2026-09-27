import { usePermissions } from '../auth/permissions.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { useRef, useState } from 'react';
import { BackofficeLink as Link } from '../components/BackofficeLink.jsx';
import { ArrowUpRight, FlaskConical, RefreshCw } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { ErrorNote, PageHead, Spinner, useAsync } from '../components/ui.jsx';
import { Field, Notice } from '../components/forms.jsx';
import { safePaymentUrl } from '../../platform/payments.js';
import { amountInMinorUnits, paymentAmount } from './paymentDisplay.js';

export function TestPayment() {
  const { can } = usePermissions();
  const { client } = useCloudgate();
  const wallet = useAsync(() => client.payments.status({ environment: 'sbx' }), [client]);
  const [amount, setAmount] = useState('1.00'), [currency, setCurrency] = useState('');
  const [description, setDescription] = useState('Test payment'), [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(null), [checkout, setCheckout] = useState(null);
  const pending = useRef(null), submitting = useRef(false);
  const selectedCurrency = currency || (wallet.data?.currency || 'USD').toUpperCase();
  const submit = async event => {
    event.preventDefault(); if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      const returnUrl = new URL(window.location.href); returnUrl.hash = ''; returnUrl.search = '?checkout=returned';
      const draft = { amount: amountInMinorUnits(amount, selectedCurrency), currency: selectedCurrency, description, reference, returnUrl: returnUrl.href };
      const signature = JSON.stringify(draft);
      if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
      setCheckout(await client.payments.createTest({ ...draft, idempotencyKey: pending.current.key }));
    } catch (failure) { setError(failure); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <div className="mx-auto max-w-3xl space-y-5">
    <PageHead title="Test payment" subtitle="Try your payment flow using the Cloudgate sandbox wallet."><Link className="btn-ghost" to="/payments/list">All payments</Link></PageHead>
    <Notice>Sandbox only. This screen creates test payments and cannot charge real money.</Notice>
    {new URLSearchParams(window.location.search).has('checkout') && <Notice>Checkout returned to your app. Check All payments for the confirmed payment status.</Notice>}
    <ErrorNote error={wallet.error || error} />
    {wallet.loading ? <Spinner /> : wallet.error ? <button className="btn-ghost" onClick={wallet.reload}>Try again</button> : wallet.data?.ready ? checkout ? <section className="card space-y-4 p-5">
      <h2 className="font-semibold">Test checkout created</h2><p className="text-sm text-mist-muted">{paymentAmount(checkout.grossAmount, checkout.currency)} · {checkout.description}</p>
      <div className="flex flex-wrap gap-2"><a className="btn-primary" href={safePaymentUrl(checkout.paymentUrl)} target="_blank" rel="noreferrer">Open sandbox checkout<ArrowUpRight size={16} /></a><button className="btn-ghost" onClick={() => { setCheckout(null); pending.current = null; }}>Create another test</button></div>
    </section> : <form className="card space-y-5 p-5" onSubmit={submit}>
      <fieldset disabled={!can(P.PaymentsTestCreate) || busy} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Amount" id="test-payment-amount"><input id="test-payment-amount" className="input" inputMode="decimal" required value={amount} onChange={event => setAmount(event.target.value)} /></Field>
          <Field label="Currency" id="test-payment-currency"><input id="test-payment-currency" className="input uppercase" required maxLength={3} pattern="[A-Za-z]{3}" value={selectedCurrency} onChange={event => setCurrency(event.target.value.toUpperCase())} /></Field></div>
        <Field label="Description" id="test-payment-description"><input id="test-payment-description" className="input" required maxLength={512} value={description} onChange={event => setDescription(event.target.value)} /></Field>
        <Field label="Reference (optional)" id="test-payment-reference"><input id="test-payment-reference" className="input" maxLength={256} value={reference} onChange={event => setReference(event.target.value)} /></Field>
        <button type="submit" className="btn-primary" aria-busy={busy}><FlaskConical size={16} />{busy ? 'Creating test checkout…' : 'Create test checkout'}</button>
      </fieldset>
    </form> : <section className="card space-y-4 p-5"><h2 className="font-semibold">Sandbox wallet setup required</h2><p className="text-sm text-mist-muted">{wallet.data?.reason || 'Connect your sandbox wallet before creating a test payment.'}</p><div className="flex gap-2"><Link className="btn-ghost" to="/payments">Payment overview</Link><button className="btn-ghost" onClick={wallet.reload}><RefreshCw size={15} />Refresh</button></div></section>}
  </div>;
}
