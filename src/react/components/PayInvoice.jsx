import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Modal, Notice } from './forms.jsx';
import { Digits } from './UserWallet.jsx';
import { EzarLogo } from './EzarLogo.jsx';
import { walletNumber } from './useUserWallet.js';
import { operationLabels, valueText, WalletBadge } from './WalletWorkspace.jsx';

const timestamp = value => typeof value === 'string' ? Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`) : NaN;
const guid = value => typeof value === 'string' && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value);

/** Low-level dialog. PayWithEzarButton supplies wallet connection and identity-scoped recovery. */
export function PayInvoice(props) {
  const environment = props.environment ?? (props.wallet.production ? 'prod' : 'sbx');
  const key = `${props.client.config?.apiUrl}:${props.client.auth?.tenancyName}:${environment}:${props.wallet.accountNumber}:${props.paymentId}`;
  return <InvoicePayment key={key} {...props} environment={environment} recoveryKey={props.recoveryKey ?? `cg-wallet-invoice:${key}`} />;
}

function InvoicePayment({ client, environment, wallet, session, setSession, paymentId, recoveryKey, onChanged, onPaid, onClose }) {
  const formId = useId(), pending = useRef(false), alive = useRef(false), notified = useRef(null);
  const attempt = useRef(null);
  if (!attempt.current) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(recoveryKey));
      if (guid(saved?.requestId)) attempt.current = { requestId: saved.requestId, operationId: guid(saved.operationId) ? saved.operationId : null, attempted: saved.attempted === true };
    } catch { /* Recovery also works in memory when storage is unavailable. */ }
    attempt.current ??= { requestId: crypto.randomUUID(), attempted: false };
  }
  const [invoice, setInvoice] = useState(null), [balance, setBalance] = useState(null), [op, setOp] = useState(null);
  const [unlock, setUnlock] = useState(false), [ticket, setTicket] = useState(null), [code, setCode] = useState(''), [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [balanceError, setBalanceError] = useState('');
  const [revision, setRevision] = useState(0), [now, setNow] = useState(Date.now());
  const production = /^prod/i.test(environment);
  const validSession = session?.accountNumber === wallet.accountNumber && session.production === production && timestamp(session.expiresAtUtc) > now;
  const terminal = op && [3, 4, 5, 6].includes(op.status);
  const expired = op?.status === 0 && !(timestamp(op.expiresAtUtc) > now);
  const codeExpired = ticket && !(timestamp(ticket.expiresAtUtc) > now);
  const wait = ticket ? Math.max(0, Math.ceil((timestamp(ticket.resendAvailableAtUtc) - now) / 1000)) || 0 : 0;
  const credentials = value => ({ environment, spendingToken: value.spendingToken });
  function saveAttempt() { try { sessionStorage.setItem(recoveryKey, JSON.stringify(attempt.current)); } catch { /* Keep the same request in memory. */ } }
  function checkScope(result) {
    if (result?.accountNumber !== wallet.accountNumber || result.production !== production) throw new Error('This payment response belongs to a different wallet or environment.');
  }
  useEffect(() => {
    alive.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { alive.current = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError('');
    client.wallet.invoice({ environment, paymentId }, { signal: abort.signal }).then(value => {
      if (value.paymentId !== paymentId || value.production !== production || !guid(value.invoiceId)) throw new Error('The invoice could not be verified.');
      if (!abort.signal.aborted) setInvoice(value);
    }).catch(e => { if (!abort.signal.aborted) { setInvoice(null); setError(e.message); } })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    client.wallet.balance({ environment }, { signal: abort.signal }).then(value => {
      checkScope(value);
      if (!abort.signal.aborted) { setBalance(value); setBalanceError(''); }
    }).catch(() => { if (!abort.signal.aborted) { setBalance(null); setBalanceError('Your balance is unavailable. It will be checked before payment.'); } });
    return () => abort.abort();
  }, [client, environment, paymentId, revision]);

  async function work(action) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { if (alive.current) setError(e.message || 'Could not check the payment. Retry to recover the same payment.'); }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  function accept(result) {
    checkScope(result);
    const operation = result.operation;
    if (!operation) return null;
    if (operation.invoiceId?.toLowerCase() !== invoice.invoiceId.toLowerCase() || operation.amount !== invoice.amount ||
        !guid(operation.id) || !Number.isInteger(operation.status) || operation.status < 0 || operation.status > 6 ||
        !Number.isFinite(operation.fee) || operation.fee < 0 ||
        (operation.status === 0 && (!/^[a-f0-9]{64}$/i.test(operation.authorizationDigest || '') || !Number.isFinite(timestamp(operation.expiresAtUtc)))))
      throw new Error('The payment does not match this invoice. Check your transaction history before continuing.');
    if (!alive.current) return operation;
    attempt.current.operationId = operation.id; saveAttempt(); setOp(operation);
    onChanged?.();
    if (operation.status === 3 && notified.current !== operation.id) {
      notified.current = operation.id;
      // An order-view error must never turn a confirmed payment into a failed payment or trigger a retry.
      Promise.resolve().then(() => { if (alive.current) return onPaid?.(operation); }).catch(() => {
        if (alive.current) setError('Payment succeeded, but your order view could not refresh. Check your orders for the receipt.');
      });
    }
    return operation;
  }
  async function recover(currentSession = session) {
    return accept(await client.wallet.operation({ ...credentials(currentSession), ...(attempt.current.operationId ? { operationId: attempt.current.operationId } : { requestId: attempt.current.requestId }) }));
  }
  async function prepare(currentSession = session) {
    if (!alive.current) return;
    if (attempt.current.attempted) {
      const existing = await recover(currentSession);
      if (existing || !alive.current) return;
      if (attempt.current.operationId) throw new Error('Your saved payment could not be found. Check transaction history before continuing.');
    }
    attempt.current.attempted = true; saveAttempt();
    try {
      const operation = accept(await client.wallet.payInvoice({ ...credentials(currentSession), paymentId, requestId: attempt.current.requestId }));
      if (!operation) throw new Error('The payment could not be verified. Check its status before continuing.');
    } catch (original) {
      if (!alive.current) return;
      const existing = await recover(currentSession).catch(() => null);
      if (!existing) throw original;
    }
  }
  useEffect(() => {
    if (!op || ![1, 2].includes(op.status) || !validSession) return;
    const check = () => { if (document.visibilityState !== 'hidden') work(() => recover()); };
    const timer = setInterval(check, 5000); window.addEventListener('focus', check);
    return () => { clearInterval(timer); window.removeEventListener('focus', check); };
  }, [op?.id, op?.status, validSession]);
  async function sendCode() {
    await work(async () => {
      const result = await client.wallet.sendUnlockCode({ environment }); checkScope(result);
      if (alive.current) { setNow(Date.now()); setTicket(result); setCode(''); setPin(''); }
    });
  }
  async function submit(event) {
    event.preventDefault();
    if (pending.current || loading || !invoice) return;
    if (unlock) {
      if (!ticket) return sendCode();
      if (codeExpired || !/^[0-9]{6}$/.test(code) || !/^[0-9]{6}$/.test(pin)) return;
      return work(async () => {
        const currentSession = await client.wallet.unlock({ environment, verificationToken: ticket.verificationToken, code, pin });
        checkScope(currentSession);
        if (!alive.current) return;
        setSession(currentSession); setPin(''); setCode(''); setTicket(null); setUnlock(false);
        if (op) await recover(currentSession); else await prepare(currentSession);
      });
    }
    if (!op) {
      if (invoice.paid || !invoice.canPay) return;
      if (!validSession) { setUnlock(true); return; }
      return work(() => prepare());
    }
    if (!validSession) { setUnlock(true); return; }
    if (op.status !== 0 || expired || !/^[0-9]{6}$/.test(pin)) return;
    return work(async () => {
      try { accept(await client.wallet.authorize({ ...credentials(session), operationId: op.id, authorizationDigest: op.authorizationDigest, pin })); }
      catch (original) { const current = await recover().catch(() => null); if (!current || current.status === 0) throw original; }
      finally { if (alive.current) setPin(''); }
    });
  }
  function checkPayment() { if (!validSession) { setUnlock(true); return; } return work(() => op ? recover() : prepare()); }
  async function cancel() {
    if (!validSession) { setUnlock(true); return; }
    await work(async () => {
      try { accept(await client.wallet.cancel({ ...credentials(session), operationId: op.id })); }
      catch (original) { const current = await recover().catch(() => null); if (!current || current.status !== 6) throw original; }
    });
  }
  const primary = unlock ? ticket ? 'Unlock wallet' : 'Send verification code' : !op ? (invoice?.canPay && !invoice.paid ? 'Continue' : null) : op.status === 0 && !expired ? !validSession ? 'Unlock to continue' : 'Confirm payment' : null;
  return <Modal open title={unlock ? 'Unlock your wallet' : op?.status === 3 ? 'Payment successful' : 'Pay with eZAR'}
    description={unlock ? 'Verify your mobile number to use your voucher funds.' : 'Pay directly from your voucher wallet.'} onClose={busy ? undefined : onClose}
    footer={<><button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>{terminal || invoice?.paid ? 'Done' : 'Close'}</button>
      {unlock && <button type="button" className="btn-ghost" disabled={busy} onClick={() => { setUnlock(false); setPin(''); setCode(''); }}>Back</button>}
      {op?.status === 0 && !unlock && <button type="button" className="btn-ghost" disabled={busy} onClick={cancel}>Cancel payment</button>}
      {primary && <button type="submit" form={formId} className="btn-primary" disabled={busy || loading || (unlock && ticket && (codeExpired || !/^[0-9]{6}$/.test(code) || !/^[0-9]{6}$/.test(pin))) || (!unlock && op?.status === 0 && validSession && !/^[0-9]{6}$/.test(pin))}>{busy ? 'Please wait…' : primary}</button>}
    </>}>
    <form id={formId} onSubmit={submit} className="cg-w-form cg-w-pay-form">
      <div className="cg-w-pay-brand"><EzarLogo size={36} decorative /><div><strong>eZAR voucher wallet</strong><p>{production ? 'Production' : 'Sandbox'} · {walletNumber(wallet.accountNumber)}</p></div></div>
      <Notice error>{error}</Notice>
      {loading ? <p role="status" className="cg-w-hint">Loading payment…</p> : !invoice ? <button type="button" className="btn-ghost w-fit" onClick={() => setRevision(v => v + 1)}>Try again</button> : unlock ? <>
        <p className="cg-w-hint">Verify {wallet.phoneNumber} and enter your six-digit wallet PIN. You’ll review the total before confirming payment.</p>
        {ticket && <><Digits label="Verification code" value={code} onChange={setCode} disabled={busy || codeExpired} autoFocus />
          {codeExpired && <Notice>This code has expired. Request a new code to continue.</Notice>}
          <button type="button" className="btn-ghost w-fit" disabled={busy || wait > 0} onClick={sendCode}>{wait > 0 ? `Resend in ${wait}s` : 'Resend code'}</button>
          <Digits label="Wallet PIN" value={pin} onChange={setPin} secret disabled={busy || codeExpired} /></>}
      </> : <>
        <div className="cg-w-transfer-summary">
          {op?.status === 3 && <CheckCircle2 size={32} aria-hidden="true" />}
          {op && <WalletBadge status={op.status === 3 ? 'available' : [4, 5, 6].includes(op.status) ? 'restricted' : 'pending'}>{expired ? 'Authorization expired' : op.status === 3 ? 'Paid' : operationLabels[op.status]}</WalletBadge>}
          <strong>{valueText(invoice.amount)} <small>eZAR</small></strong><div className="cg-w-pay-merchant"><p>{invoice.merchantName ? `To ${invoice.merchantName}` : 'Invoice payment'}</p>
          <p>{invoice.description}{invoice.reference ? ` · ${invoice.reference}` : ''}</p></div>
          <dl>{!op && balance && <div><dt>Available balance</dt><dd>{valueText(balance.available)} eZAR</dd></div>}
            {op && <><div><dt>Processing fee</dt><dd>{valueText(op.fee)} eZAR</dd></div><div><dt>Total</dt><dd>{valueText(op.amount + op.fee)} eZAR</dd></div></>}
          </dl>
        </div>
        {!op && <><Notice>{balanceError}</Notice>{invoice.paid ? <Notice>This invoice has already been paid.</Notice> : !invoice.canPay ? <Notice>This invoice is closed or does not support payment from an eZAR voucher wallet.</Notice> : <>
          {balance && balance.available < invoice.amount && invoice.status === 0 && !attempt.current.attempted && <Notice>Your available balance is below the invoice amount. Add funds to your wallet before paying.</Notice>}
          <p className="cg-w-hint"><ShieldCheck size={15} />Review the total and confirm with your PIN before funds are sent.</p>
        </>}</>}
        {op?.status === 0 && !expired && validSession && <><Digits label="Confirm with wallet PIN" value={pin} onChange={setPin} secret disabled={busy} autoFocus /><p className="cg-w-hint">Your PIN approves this merchant and total.</p></>}
        {expired && <Notice>This unsigned payment has expired. Cancel it to release the reserved funds.</Notice>}
        {op && [1, 2].includes(op.status) && <Notice>Your payment is processing. You can close this window and return to the same order to check it.</Notice>}
        {op?.status === 5 && <Notice error>This payment needs review. Do not pay again. Check transaction history or contact support.</Notice>}
        {op?.status === 4 && <Notice error>The payment failed. Check transaction history before asking the merchant for a new invoice.</Notice>}
        {op?.status === 6 && <Notice>Payment cancelled. Reserved funds have been released.</Notice>}
        {op?.status === 3 && <div className="cg-w-pay-receipt" role="status"><p>Your voucher payment is complete.</p><span>Transaction: {op.id}</span></div>}
        {(op && op.status !== 0 || (!op || error) && attempt.current.attempted) && <button type="button" className="btn-ghost w-fit" disabled={busy} onClick={checkPayment}><RefreshCw size={14} />Check payment status</button>}
      </>}
      {error && !unlock && session && !terminal && <button type="button" className="cg-w-link" disabled={busy} onClick={() => { setSession(null); setUnlock(true); setPin(''); }}>Unlock wallet again</button>}
    </form>
  </Modal>;
}
