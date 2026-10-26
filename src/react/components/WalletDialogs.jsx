import { useEffect, useId, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, ExternalLink, LockKeyhole, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { Modal, Field, Notice } from './forms.jsx';
import { Digits } from './UserWallet.jsx';
import { walletNumber } from './useUserWallet.js';
import { walletAccountNumber, walletAmount } from '../../platform/wallet.js';
import { checkoutWithReturnUrl } from '../../platform/checkout-navigation.js';
import { CopyWalletNumber, operationLabels, valueText, WalletBadge, walletDate } from './WalletWorkspace.jsx';

export function DisconnectWallet({ client, environment, wallet, onDisconnected, onClose }) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function disconnect() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await client.wallet.disconnect({ environment }); onDisconnected(); }
    catch (e) { setError(e.message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <Modal open title="Disconnect your wallet?" description="Remove this wallet's connection to your profile in this app." onClose={busy ? undefined : onClose}
    footer={<><button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>Keep connected</button><button type="button" className="btn-danger" disabled={busy} onClick={disconnect}>{busy ? 'Disconnecting…' : 'Disconnect wallet'}</button></>}>
    <div className="cg-w-form"><Notice error>{error}</Notice><div className="cg-w-destination cg-w-destination-first"><span className="cg-w-label">Voucher wallet account number</span><strong>{walletNumber(wallet.accountNumber)}</strong><WalletBadge status={wallet.production ? 'neutral' : 'available'}>{wallet.production ? 'Production' : 'Sandbox'}</WalletBadge></div>
      <p className="cg-w-hint">Your wallet, funds and transaction history stay intact. Existing payments will still go to this account.</p>
      <p className="cg-w-hint">You can reconnect anytime with your mobile verification code and wallet PIN.</p>
    </div>
  </Modal>;
}

export function ReceiveWallet({ wallet, onClose }) {
  const [qr, setQr] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(`xcap-wallet:v1:${wallet.accountNumber}`, { width: 320, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#1d211f', light: '#ffffff' } })
      .then(value => { if (active) setQr(value); }).catch(() => { if (active) setError('Could not generate the QR code. You can still share your account number.'); });
    return () => { active = false; };
  }, [wallet.accountNumber]);
  return <Modal open title="Receive eZAR" onClose={onClose} footer={<button className="btn-ghost" onClick={onClose}>Done</button>}><div className="cg-w-receive">
    <WalletBadge status={wallet.production ? 'neutral' : 'available'}>{wallet.production ? 'Production' : 'Sandbox'}</WalletBadge>
    <div className="cg-w-qr">{qr ? <img src={qr} width="256" height="256" alt={`Receive eZAR into account ${walletNumber(wallet.accountNumber)}`} /> : <QrCode size={40} aria-label="Generating QR code" />}</div>
    <Notice error>{error}</Notice><p>Scan with a supporting wallet to send eZAR to this account.</p><span className="cg-w-label">Voucher wallet account number</span><div className="cg-w-account-number"><strong>{walletNumber(wallet.accountNumber)}</strong><CopyWalletNumber number={wallet.accountNumber} /></div>
  </div></Modal>;
}

export function SendWallet({ client, environment, wallet, session, setSession, draft, setDraft, onChanged, onClose }) {
  const formId = useId(), started = useRef(false), pending = useRef(false), alive = useRef(true);
  const [recipient, setRecipient] = useState(draft?.recipientAccountNumber || ''), [amount, setAmount] = useState(draft?.amount || '');
  const [op, setOp] = useState(null), [unlock, setUnlock] = useState(false), [ticket, setTicket] = useState(null);
  const [code, setCode] = useState(''), [pin, setPin] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [now, setNow] = useState(Date.now());
  useEffect(() => { alive.current = true; const timer = setInterval(() => setNow(Date.now()), 1000); return () => { alive.current = false; clearInterval(timer); }; }, []);
  const validSession = session?.accountNumber === wallet.accountNumber && Date.parse(session.expiresAtUtc) > now;
  const terminal = op && [3, 4, 5, 6].includes(op.status);
  const expired = op?.status === 0 && Date.parse(op.expiresAtUtc.endsWith('Z') ? op.expiresAtUtc : `${op.expiresAtUtc}Z`) <= now;
  const wait = ticket ? Math.max(0, Math.ceil((Date.parse(ticket.resendAvailableAtUtc) - now) / 1000)) : 0;
  function accept(result) {
    if (result.accountNumber !== wallet.accountNumber) throw new Error('This transfer belongs to a different wallet.');
    if (!alive.current) return;
    setOp(result.operation);
    if (result.operation) setDraft({ ...draft, operationId: result.operation.id, attempted: true });
    onChanged();
    return result.operation;
  }
  async function work(action) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { if (alive.current) setError(e.message || 'Could not complete the request. Check the transfer status before retrying.'); }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  const credentials = value => ({ environment, spendingToken: value.spendingToken });
  async function recover(currentSession = session) {
    const result = await client.wallet.operation({ ...credentials(currentSession), ...(op?.id || draft?.operationId ? { operationId: op?.id || draft.operationId } : { requestId: draft.requestId }) });
    return accept(result);
  }
  async function prepare(currentSession = session) {
    if (draft?.attempted) {
      const recovered = await recover(currentSession);
      if (recovered) return;
      if (!draft.recipientAccountNumber || !draft.amount) throw new Error('The transfer could not be found. Close this window and refresh your history.');
    }
    const number = walletAccountNumber(draft?.recipientAccountNumber || recipient), value = walletAmount(draft?.amount || amount);
    if (number === wallet.accountNumber) throw new Error('Choose another wallet to send to.');
    const intent = { recipientAccountNumber: number, requestId: draft?.requestId || crypto.randomUUID(), amount: value, attempted: true };
    setDraft(intent);
    try {
      const result = await client.wallet.prepareSend({ ...credentials(currentSession), ...intent });
      if (result.accountNumber !== wallet.accountNumber) throw new Error('The transfer account could not be verified.');
      if (alive.current) { setOp(result.operation); setDraft({ ...intent, operationId: result.operation?.id }); onChanged(); }
    } catch (original) {
      try {
        const result = await client.wallet.operation({ ...credentials(currentSession), requestId: intent.requestId });
        if (result.accountNumber === wallet.accountNumber && result.operation) { setOp(result.operation); setDraft({ ...intent, operationId: result.operation.id }); onChanged(); return; }
      } catch { /* Retain the same intent for a safe retry. */ }
      // A rejected HTTP request followed by a successful empty lookup did not reserve funds.
      // Transport failures remain recoverable with the original key.
      if (original.status >= 400 && original.status < 500) {
        const result = await client.wallet.operation({ ...credentials(currentSession), requestId: intent.requestId }).catch(() => undefined);
        if (result?.accountNumber === wallet.accountNumber && result.operation === null) setDraft(null);
      }
      throw original;
    }
  }
  useEffect(() => {
    if (!draft?.attempted || started.current) return;
    started.current = true;
    if (validSession) work(() => prepare()); else setUnlock(true);
  }, []);
  useEffect(() => {
    if (!op || ![1, 2].includes(op.status) || !validSession) return;
    const timer = setInterval(() => { if (!pending.current) work(() => recover()); }, 5000);
    return () => clearInterval(timer);
  }, [op?.id, op?.status, validSession]);
  async function sendCode() {
    await work(async () => { const result = await client.wallet.sendUnlockCode({ environment }); if (result.accountNumber !== wallet.accountNumber) throw new Error('Refresh your linked wallet.'); setTicket(result); setCode(''); setPin(''); });
  }
  async function submit(event) {
    event.preventDefault();
    if (unlock) {
      if (!ticket) return sendCode();
      return work(async () => {
        const currentSession = await client.wallet.unlock({ environment, verificationToken: ticket.verificationToken, code, pin });
        if (currentSession.accountNumber !== wallet.accountNumber) throw new Error('Use the PIN for your linked wallet.');
        setSession(currentSession); setPin(''); setCode(''); setTicket(null); setUnlock(false);
        if (op) await recover(currentSession); else await prepare(currentSession);
      });
    }
    if (!op) return work(async () => {
      walletAmount(draft?.amount || amount); const number = walletAccountNumber(draft?.recipientAccountNumber || recipient);
      if (number === wallet.accountNumber) throw new Error('Choose another wallet to send to.');
      if (!validSession) { setUnlock(true); return; }
      await prepare();
    });
    if (!validSession) { setUnlock(true); return; }
    if (op.status === 0 && !expired) return work(async () => {
      try { accept(await client.wallet.authorize({ ...credentials(session), operationId: op.id, authorizationDigest: op.authorizationDigest, pin })); }
      catch (original) { const current = await recover().catch(() => null); if (!current || current.status === 0) throw original; }
      finally { setPin(''); }
    });
  }
  async function cancel() {
    if (!validSession) { setUnlock(true); return; }
    await work(async () => { try { accept(await client.wallet.cancel({ ...credentials(session), operationId: op.id })); } catch (original) { const current = await recover().catch(() => null); if (!current || current.status !== 6) throw original; } });
  }
  const close = () => { if (terminal) setDraft(null); onClose(); };
  const primary = unlock ? ticket ? 'Unlock wallet' : 'Send verification code' : !op ? draft?.attempted ? 'Recover transfer' : 'Continue' : op.status === 0 ? !validSession ? 'Unlock to continue' : 'Confirm transfer' : null;
  return <Modal open title={unlock ? 'Unlock your wallet' : op ? 'Your transfer' : 'Send eZAR'} onClose={busy ? undefined : close}
    footer={<><button type="button" className="btn-ghost" disabled={busy} onClick={close}>{terminal ? 'Done' : 'Close'}</button>
      {op?.status === 0 && !unlock && <button type="button" className="btn-ghost" disabled={busy} onClick={cancel}>Cancel transfer</button>}
      {primary && <button type="submit" form={formId} className="btn-primary" disabled={busy || (unlock && ticket && (code.length !== 6 || !/^\d{6}$/.test(pin))) || (!unlock && op?.status === 0 && validSession && (!/^\d{6}$/.test(pin) || expired))}>{busy ? 'Please wait…' : primary}</button>}
    </>}>
    <form id={formId} onSubmit={submit} className="cg-w-form"><Notice error>{error}</Notice>
      {unlock ? <><span className="cg-w-modal-symbol"><LockKeyhole size={26} /></span><p className="cg-w-hint">Verify {wallet.phoneNumber} and enter the PIN for account {walletNumber(wallet.accountNumber)}. You’ll review the transfer before authorizing it.</p>
        {ticket && <><Digits label="Verification code" value={code} onChange={setCode} disabled={busy} /><button type="button" className="btn-ghost w-fit" disabled={busy || wait > 0} onClick={sendCode}>{wait > 0 ? `Resend in ${wait}s` : 'Resend code'}</button><Digits label="Wallet PIN" value={pin} onChange={setPin} secret disabled={busy} /></>}
      </> : !op ? <><span className="cg-w-modal-symbol"><ArrowUpRight size={26} /></span><Field label="Receiving voucher wallet account number" id={`${formId}-recipient`} hint="Enter 16 digits or paste a wallet receive code."><input className="input" id={`${formId}-recipient`} value={recipient} onChange={e => setRecipient(e.target.value)} autoComplete="off" placeholder="0000 0000 0000 0000" disabled={busy || draft?.attempted} /></Field>
        <Field label="Amount (eZAR)" id={`${formId}-amount`}><input className="input" id={`${formId}-amount`} value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" disabled={busy || draft?.attempted} /></Field>
        <p className="cg-w-hint"><ShieldCheck size={15} />Your PIN authorizes only the amount and recipient you review.</p>{draft?.attempted && <Notice>This transfer request is saved. Continue to check its status safely before retrying.</Notice>}
      </> : <><div className="cg-w-transfer-summary"><span className="cg-w-modal-symbol">{op.status === 3 ? <CheckCircle2 size={28} /> : <ArrowUpRight size={28} />}</span>
        <WalletBadge status={op.status === 3 ? 'available' : [4, 5].includes(op.status) ? 'restricted' : 'pending'}>{expired ? 'Authorization expired' : operationLabels[op.status]}</WalletBadge>
        <strong>{valueText(op.amount)} <small>eZAR</small></strong><p>To {walletNumber(op.recipientAccountNumber)}</p><dl><div><dt>Processing fee</dt><dd>{valueText(op.fee)} eZAR</dd></div><div><dt>Total</dt><dd>{valueText(op.amount + op.fee)} eZAR</dd></div></dl></div>
        {op.status === 0 && !expired && validSession && <><Digits label="Confirm with wallet PIN" value={pin} onChange={setPin} secret disabled={busy} /><p className="cg-w-hint">Review the recipient and total. Authorization expires {walletDate(op.expiresAtUtc)}.</p></>}
        {expired && <Notice>This unsigned transfer has expired. Cancel it to release the reservation before starting again.</Notice>}
        {[1, 2].includes(op.status) && <Notice>Your transfer is processing. You can close this window and follow its progress in transaction history.</Notice>}
        {op.status === 5 && <Notice error>This transfer needs review. Do not send it again. Your transaction remains visible in history.</Notice>}
        {op.status === 4 && <Notice error>The transfer failed. Refresh your balance and check the transaction before starting a new transfer.</Notice>}
        <button type="button" className="btn-ghost w-fit" disabled={busy} onClick={() => validSession ? work(() => recover()) : setUnlock(true)}><RefreshCw size={14} />Check transfer status</button>
      </>}
      {error && !unlock && (session || draft?.attempted) && <button type="button" className="cg-w-link" disabled={busy} onClick={() => { setSession(null); setUnlock(true); setPin(''); }}>Unlock wallet again</button>}
    </form>
  </Modal>;
}

export function TopupWallet({ client, environment, wallet, draft, setDraft, onChanged, onClose }) {
  const formId = useId(), pending = useRef(false), alive = useRef(true);
  const [amount, setAmount] = useState(draft?.amount || ''), [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const recovering = !!draft?.invoiceId && !result;
  const paid = Number(result?.status) === 200;
  async function work(action) { if (pending.current) return; pending.current = true; setBusy(true); setError(''); try { await action(); } catch (e) { setError(e.message); } finally { pending.current = false; setBusy(false); } }
  function accept(value, checkout = false) {
    if (!alive.current) return;
    if (value.accountNumber !== wallet.accountNumber) throw new Error('The top-up does not match your linked wallet.');
    setResult(value); setDraft(value); if (Number(value.status) === 200) onChanged();
    if (checkout && [0, 100].includes(Number(value.status))) {
      window.location.assign(checkoutWithReturnUrl(value.paymentUrl, window.location.href));
      onClose();
    }
  }
  async function create(event) {
    event.preventDefault();
    await work(async () => {
      const intent = { requestId: draft?.requestId || crypto.randomUUID(), amount: walletAmount(draft?.amount || amount, 2), attempted: true };
      setDraft(intent); accept(await client.wallet.topup({ ...intent, environment }), true);
    });
  }
  const check = (checkout = false) => work(async () => accept(await client.wallet.topupStatus({ environment, invoiceId: result?.invoiceId || draft?.invoiceId }), checkout));
  useEffect(() => { alive.current = true; if (draft?.invoiceId) check(true); return () => { alive.current = false; }; }, []);
  const closed = result && [200, 400, 410, 500].includes(Number(result.status));
  const close = () => { if (closed) setDraft(null); onClose(); };
  return <Modal open title="Top up your wallet" description="Choose an amount, then pay securely at checkout." onClose={busy ? undefined : close}
    footer={<><button className="btn-ghost" disabled={busy} onClick={close}>{paid ? 'Done' : 'Close'}</button>{recovering ? <button className="btn-primary" disabled={busy} onClick={() => check(true)}>{busy ? 'Checking…' : 'Retry status check'}</button> : !result ? <button className="btn-primary" type="submit" form={formId} disabled={busy || !amount}>{busy ? 'Opening checkout…' : draft?.attempted ? 'Retry checkout' : 'Continue to checkout'}</button> : !closed && <a className="btn-primary" href={checkoutWithReturnUrl(result.paymentUrl, window.location.href)}>Continue to checkout<ExternalLink size={15} /></a>}</>}>
    <div className="cg-w-form"><Notice error>{error}</Notice>{recovering ? <p className="cg-w-hint">Checking your saved top-up before opening checkout…</p> : !result ? <form id={formId} onSubmit={create} className="cg-w-form"><Field label="Top-up amount (eZAR)" id={`${formId}-amount`} hint="Your payment amount is in ZAR. 1 ZAR adds 1 eZAR to your wallet."><input id={`${formId}-amount`} className="input" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy || draft?.attempted} /></Field>
      <div className="cg-w-quick-amounts">{[50, 100, 250, 500].map(value => <button key={value} type="button" className="btn-ghost" disabled={busy || draft?.attempted} onClick={() => setAmount(String(value))}>{value} eZAR</button>)}</div></form> : <>
      <div className="cg-w-transfer-summary"><span className="cg-w-modal-symbol">{paid ? <CheckCircle2 size={28} /> : <ArrowDownLeft size={28} />}</span><WalletBadge status={paid ? 'available' : closed ? 'restricted' : 'pending'}>{({ 200: 'Paid', 400: 'Cancelled', 410: 'Expired', 500: 'Failed' })[result.status] || 'Awaiting payment'}</WalletBadge><strong>{valueText(result.amount)} <small>eZAR</small></strong></div>
      <Notice>{paid ? 'Payment confirmed. Your wallet updates once the vouchers are issued.' : closed ? 'This checkout is closed. You can create another top-up.' : 'Your balance updates after payment is confirmed and vouchers are issued.'}</Notice><button type="button" className="btn-ghost w-fit" disabled={busy} onClick={() => check()}><RefreshCw size={14} />{busy ? 'Checking…' : 'Check payment status'}</button>
    </>}<div className="cg-w-destination"><span className="cg-w-label">Receiving wallet</span><strong>{walletNumber(wallet.accountNumber)}</strong><WalletBadge status={wallet.production ? 'neutral' : 'available'}>{wallet.production ? 'Production' : 'Sandbox'}</WalletBadge></div></div>
  </Modal>;
}

export { PayInvoice } from './PayInvoice.jsx';
