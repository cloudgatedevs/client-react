import { useEffect, useId, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { useAuthContext } from '../auth/index.js';
import { Field, Modal, Notice } from './forms.jsx';
import { EzarLogo } from './EzarLogo.jsx';
import { Digits } from './UserWallet.jsx';
import { completeWalletConnect } from '../../platform/wallet-connect.js';

function useScope(client, environment) {
  const { headerUser } = useAuthContext();
  return `${client.config.apiUrl}:${client.auth.tenancyName}:${headerUser?.user?.id}:${environment}`;
}
export function WalletConnectButton({ client, environment, onConnected }) {
  const scope = useScope(client, environment), [open, setOpen] = useState(false);
  return <><button type="button" className="btn-primary w-fit" onClick={() => setOpen(true)}><Link2 size={16} />Connect wallet</button>
    {open && <ConnectWallet key={scope} client={client} environment={environment} onClose={() => setOpen(false)} onConnected={value => { setOpen(false); onConnected?.(value); }} />}</>;
}
function ConnectWallet({ client, environment, onClose, onConnected }) {
  const id = useId(), pending = useRef(false), alive = useRef(true);
  const [step, setStep] = useState('phone'), [intent, setIntent] = useState('connect');
  const [phone, setPhone] = useState(''), [ticket, setTicket] = useState(null), [code, setCode] = useState('');
  const [pin, setPin] = useState(''), [confirm, setConfirm] = useState(''), [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [now, setNow] = useState(Date.now());
  useEffect(() => { alive.current = true; const timer = setInterval(() => setNow(Date.now()), 1000); return () => { alive.current = false; clearInterval(timer); }; }, []);
  const create = intent === 'create', wait = Math.max(0, Math.ceil((Date.parse(ticket?.resendAvailableAtUtc) - now) / 1000)) || 0;
  const expired = !!ticket && (!Number.isFinite(Date.parse(ticket.expiresAtUtc)) || Date.parse(ticket.expiresAtUtc) <= now);
  const reusable = ticket && ticket.requestedPhone === phone.trim() && !expired;
  async function run(action) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { if (alive.current) setError(e.message); }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  function clearPin() { setPin(''); setConfirm(''); setMissing(false); }
  async function send() {
    const result = await client.wallet.sendCode({ environment, phoneNumber: phone.trim() });
    if (alive.current) { setNow(Date.now()); setTicket({ ...result, requestedPhone: phone.trim() }); setCode(''); clearPin(); setStep('code'); }
  }
  async function submit(event) {
    event.preventDefault();
    if (step === 'phone') {
      if (reusable) { setError(''); setStep('code'); return; }
      return run(send);
    }
    if (expired || !ticket) { setError('Your SMS code has expired. Request a new code to continue.'); return; }
    if (step === 'code') {
      if (!/^\d{6}$/.test(code)) { setError('Enter the six-digit code from your SMS.'); return; }
      setError(''); clearPin(); setStep('pin'); return;
    }
    if (!/^\d{6}$/.test(pin) || create && pin !== confirm) { setError(create ? 'Enter a six-digit PIN and confirm it.' : 'Enter your six-digit wallet PIN.'); return; }
    await run(async () => {
      const value = await client.wallet.link({ environment, verificationToken: ticket.verificationToken, code, pin, createWallet: create, ...(create ? { confirmPin: confirm } : {}) });
      if (!alive.current) return;
      if (value.accountNotFound) { setMissing(true); return; }
      if (!value.linked) throw new Error('The wallet was not connected. Try again.');
      clearPin(); setCode(''); onConnected(value);
    });
  }
  function back() {
    clearPin(); setError('');
    setStep(step === 'pin' ? 'code' : 'phone');
  }
  const primary = step === 'phone' ? reusable ? 'Continue' : 'Send verification code' : step === 'code' ? 'Continue to PIN' : create ? 'Create wallet' : 'Connect wallet';
  return <Modal open title={step === 'phone' ? 'Set up your eZAR wallet' : step === 'code' ? 'Enter your SMS code' : create ? 'Choose your wallet PIN' : 'Enter your wallet PIN'}
    description={step === 'phone' ? 'Use voucher funds to pay for goods in this app.' : step === 'code' ? `We sent a six-digit code to ${ticket?.phoneNumber}.` : create ? 'Keep this PIN safe. You will use it to open your wallet and approve payments.' : 'Use the PIN for the wallet you want to connect.'}
    onClose={busy ? undefined : onClose}
    footer={<><button type="button" className="btn-ghost" disabled={busy} onClick={step === 'phone' ? onClose : back}>{step === 'phone' ? 'Cancel' : 'Back'}</button>
      <button className="btn-primary" type="submit" form={id} disabled={busy || step !== 'phone' && expired || step === 'code' && !/^\d{6}$/.test(code) || step === 'pin' && (!/^\d{6}$/.test(pin) || create && confirm !== pin)}>{busy ? 'Please wait…' : primary}</button></>}>
    <form id={id} onSubmit={submit} className="cg-w-form">
      <div className="cg-wallet-setup-brand"><EzarLogo size={40} /><div><strong>eZAR voucher wallet</strong><p>{/^prod/i.test(environment) ? 'Production' : 'Sandbox'} · Your funds, ready to spend</p></div></div>
      <ol className="cg-wallet-setup-steps" aria-label="Wallet setup progress">{[['phone', 'Mobile'], ['code', 'SMS code'], ['pin', 'PIN']].map(([key, label], index) => <li key={key} aria-current={step === key ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
      <Notice error>{error}</Notice>
      {step === 'phone' ? <>
        <fieldset className="cg-wallet-setup-choice" disabled={busy}><legend className="sr-only">Choose how to set up your wallet</legend>
          <label><input type="radio" name={`${id}-intent`} value="connect" checked={!create} onChange={() => { setIntent('connect'); clearPin(); }} /><span>Existing wallet<small>I already have an eZAR wallet and PIN.</small></span></label>
          <label><input type="radio" name={`${id}-intent`} value="create" checked={create} onChange={() => { setIntent('create'); clearPin(); }} /><span>New wallet<small>Create an empty voucher wallet.</small></span></label>
        </fieldset>
        <Field label="Mobile number" id={`${id}-phone`} hint={create ? 'We will send you an SMS code to set up your wallet.' : 'Enter the South African mobile number linked to your wallet.'}><input className="input" id={`${id}-phone`} type="tel" autoComplete="tel" placeholder="082 123 4567" value={phone} onChange={e => setPhone(e.target.value)} required disabled={busy} autoFocus /></Field>
      </> : step === 'code' ? <>
        <Digits label="Verification code" value={code} onChange={setCode} disabled={busy} autoFocus />
        <p className="cg-w-hint">Next, {create ? 'choose a PIN for your new wallet' : 'enter your existing wallet PIN'}. Your code and PIN are checked together when you finish.</p>
        {!expired && <button className="btn-ghost w-fit" type="button" disabled={busy || wait > 0} onClick={() => run(send)}>{wait ? `Resend in ${wait}s` : 'Resend code'}</button>}
      </> : <>
        <p className="cg-w-hint">{create ? 'New wallet for' : 'Connecting wallet for'} {ticket.phoneNumber}</p>
        <Digits label={create ? 'Choose wallet PIN' : 'Wallet PIN'} value={pin} onChange={value => { setPin(value); setMissing(false); }} secret disabled={busy} autoFocus />
        {create && <Digits label="Confirm wallet PIN" value={confirm} onChange={setConfirm} secret disabled={busy} />}
        {missing && <><Notice error>No wallet matches this mobile number and PIN. Check your PIN or choose to create a separate, empty wallet.</Notice><button type="button" className="btn-ghost" onClick={() => { setIntent('create'); clearPin(); }}>Create a new wallet</button></>}
        {create && <p className="cg-w-hint">Creating a new wallet does not move funds from an existing wallet.</p>}
      </>}
      {expired && step !== 'phone' && <><Notice error>Your SMS code has expired. Request a new code to continue.</Notice><button type="button" className="btn-ghost" disabled={busy || wait > 0} onClick={() => run(send)}>{wait ? `Resend in ${wait}s` : 'Send a new code'}</button></>}
    </form>
  </Modal>;
}
export function WalletConnectReturn({ client, environment, onConnected }) {
  const scope = useScope(client, environment), callback = useRef(onConnected);
  callback.current = onConnected;
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  // A retained promise also handles React StrictMode's effect replay without reusing the code.
  const task = useRef(null);
  useEffect(() => {
    let active = true;
    if (task.current?.scope !== scope) task.current = { scope, promise: completeWalletConnect(scope, input => client.wallet.completeConnect({ ...input, environment })) };
    if (task.current.promise) {
      setBusy(true);
      task.current.promise.then(value => { if (active) { if (value.cancelled) setMessage('Wallet connection cancelled.'); else { setMessage('Your wallet is connected.'); callback.current?.(value); } } })
        .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); });
    }
    return () => { active = false; };
  }, [client, environment, scope]);
  return <><Notice error>{error}</Notice>{(busy || message) && <p className="text-sm text-mist-muted" role="status">{busy ? 'Connecting your walletâ€¦' : message}</p>}</>;
}
