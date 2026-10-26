import { SDK_PAYMENT_ROUTES } from '../routing.js';
import { usePermissions } from '../auth/permissions.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { useRef, useState } from 'react';
import { BackofficeLink as Link } from '../components/BackofficeLink.jsx';
import { ArrowUpRight, FlaskConical, RefreshCw, FileText } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { ErrorNote, PageHead, Spinner, useAsync } from '../components/ui.jsx';
import { Field, Notice } from '../components/forms.jsx';
import { safePaymentUrl } from '../../platform/payments.js';
import { checkoutWithReturnUrl } from '../../platform/checkout-navigation.js';
import { amountInMinorUnits, paymentAmount } from './paymentDisplay.js';
import { PaymentInvoiceModal, PaymentWalletDetails, WalletAccountNumber } from './PaymentDetails.jsx';
import { PayWithEzarButton } from '../components/PayWithEzarButton.jsx';

export function TestPayment() {
  const { can } = usePermissions();
  const { client } = useCloudgate();
  const wallet = useAsync(() => client.payments.status({ environment: 'sbx' }), [client]);
  const [amount, setAmount] = useState('1.00'), [currency, setCurrency] = useState('');
  const [description, setDescription] = useState('Test payment'), [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(null), [checkout, setCheckout] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
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
  const checkoutUrl = checkout && checkoutWithReturnUrl(safePaymentUrl(checkout.paymentUrl, { isProduction: checkout.isProduction }), window.location.href);
  return <div className="space-y-5">
    <PageHead title="Test payment" subtitle="Try your payment flow using the Cloudgate sandbox wallet."><Link className="btn-ghost" to={SDK_PAYMENT_ROUTES.history}>All payments</Link></PageHead>
    <Notice>Sandbox only. Create a test invoice, then pay from your eZAR wallet here or open checkout to try other payment methods. Creating an invoice does not send funds.</Notice>
    {new URLSearchParams(window.location.search).has('checkout') && <Notice>Checkout returned to your app. Check All payments for the confirmed payment status.</Notice>}
    <ErrorNote error={wallet.error || error} />
    <PaymentWalletDetails status={wallet.data} />
    {wallet.loading ? <Spinner /> : wallet.error ? <button className="btn-ghost" onClick={wallet.reload}>Try again</button> : wallet.data?.ready ? checkout ? <section className="card space-y-4 p-5">
      <div className="cg-heading-copy"><h2 className="font-semibold">Test invoice created</h2><p className="text-sm text-mist-muted">{paymentAmount(checkout.grossAmount, checkout.currency)} · {checkout.description}</p></div>
      {checkout.invoiceId && <PayWithEzarButton paymentId={checkout.id} environment="sbx" onPaid={() => client.payments.get({ paymentId: checkout.id, environment: 'sbx' }).then(setCheckout)} />}
      {checkout.invoiceNumber && <div className="grid gap-4 sm:grid-cols-2"><div><p className="label">Invoice number</p><button className="mt-1 text-sm font-medium text-blue-600 underline underline-offset-2 dark:text-blue-400" onClick={() => setShowInvoice(true)}>{checkout.invoiceNumber}</button></div><div><p className="label">Receiving wallet account</p><div className="mt-1 text-sm"><WalletAccountNumber value={checkout.receivingAccountNumber} /></div></div></div>}
      <div className="flex flex-wrap gap-2">{checkoutUrl && <a className="btn-primary" href={checkoutUrl} target="_blank" rel="noopener noreferrer">Open sandbox checkout<ArrowUpRight size={16} /></a>}<button className="btn-ghost" onClick={() => setShowInvoice(true)}><FileText size={16} />View {checkout.invoiceId ? 'invoice' : 'payment'}</button><button className="btn-ghost" onClick={() => { setCheckout(null); setShowInvoice(false); pending.current = null; }}>Create another test</button></div>
    </section> : <form className="card space-y-5 p-5" onSubmit={submit}>
      <fieldset disabled={!can(P.PaymentsTestCreate) || busy} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Amount" id="test-payment-amount"><input id="test-payment-amount" className="input" inputMode="decimal" required value={amount} onChange={event => setAmount(event.target.value)} /></Field>
          <Field label="Currency" id="test-payment-currency"><input id="test-payment-currency" className="input uppercase" required maxLength={3} pattern="[A-Za-z]{3}" value={selectedCurrency} onChange={event => setCurrency(event.target.value.toUpperCase())} /></Field></div>
        <Field label="Description" id="test-payment-description"><input id="test-payment-description" className="input" required maxLength={512} value={description} onChange={event => setDescription(event.target.value)} /></Field>
        <Field label="Reference (optional)" id="test-payment-reference"><input id="test-payment-reference" className="input" maxLength={256} value={reference} onChange={event => setReference(event.target.value)} /></Field>
        <button type="submit" className="btn-primary" aria-busy={busy}><FlaskConical size={16} />{busy ? 'Creating test checkout…' : 'Create test checkout'}</button>
      </fieldset>
    </form> : <section className="card space-y-4 p-5"><div className="cg-heading-copy"><h2 className="font-semibold">Sandbox wallet setup required</h2><p className="text-sm text-mist-muted">{wallet.data?.reason || 'Connect your sandbox wallet before creating a test payment.'}</p></div><div className="flex gap-2"><Link className="btn-ghost" to={SDK_PAYMENT_ROUTES.overview}>Payment overview</Link><button className="btn-ghost" onClick={wallet.reload}><RefreshCw size={15} />Refresh</button></div></section>}
    <PaymentInvoiceModal payment={showInvoice ? checkout : null} onClose={() => setShowInvoice(false)} onUpdated={setCheckout} />
  </div>;
}
