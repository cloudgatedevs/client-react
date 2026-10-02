import { useCallback, useEffect, useState } from 'react';
import { BackofficeLink as Link } from '../components/BackofficeLink.jsx';
import { Check, Copy, Mail, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { useCloudgate } from '../context.jsx';

export function AccountSettings() {
  const { client } = useCloudgate();
  const [security, setSecurity] = useState(null), [setup, setSetup] = useState(null);
  const [recovery, setRecovery] = useState(null), [action, setAction] = useState('');
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const refresh = useCallback(async () => {
    setBusy(true); setError('');
    try { setSecurity(await client.accountSecurity.get()); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }, [client]);
  useEffect(() => {
    const controller = new AbortController();
    client.accountSecurity.get({ signal: controller.signal }).then(setSecurity).catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [client]);
  const begin = async () => {
    setBusy(true); setError(''); setNotice(''); setCode('');
    try { setSetup(await client.accountSecurity.beginSetup()); setAction('enable'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await (action === 'enable' ? client.accountSecurity.confirmSetup(code)
        : action === 'disable' ? client.accountSecurity.disable(code) : client.accountSecurity.regenerateRecoveryCodes(code));
      setSecurity(result.security); setRecovery(result.recoveryCodes || null); setSetup(null); setAction(''); setCode('');
      setNotice(action === 'enable' ? 'Two-factor authentication is on. Save your recovery codes below.'
        : action === 'disable' ? 'Two-factor authentication is off.' : 'Your previous recovery codes have been replaced. Save the new codes below.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const copy = async (text, message) => {
    try { await navigator.clipboard.writeText(text); setNotice(message); }
    catch { setError('Could not copy. Select and copy the text manually.'); }
  };
  return <div className="account-settings w-full max-w-2xl">
    <div className="account-settings-heading"><div><h1 className="text-xl font-semibold">Account settings</h1><p className="text-sm text-mist-muted mt-1">Email verification and sign-in security.</p></div>
      <button type="button" className="btn-ghost" onClick={refresh} disabled={busy} aria-label="Refresh security status"><RefreshCw size={16} /></button></div>
    {error && <div className="account-message is-error" role="alert">{error}{!security && <button type="button" className="btn-ghost" disabled={busy} onClick={refresh}>Try again</button>}</div>}
    {notice && <div className="account-message" role="status">{notice}</div>}
    {!security && !error && <p role="status" className="text-sm text-mist-muted">Loading account settings…</p>}
    {security && <>
      <section className="card account-security-section" aria-labelledby="email-security-title">
        <div className="account-security-icon"><Mail size={18} /></div><div className="account-security-body">
          <div className="account-security-title"><h2 id="email-security-title">Email address</h2><span className={`account-status ${security.isEmailConfirmed ? 'is-confirmed' : ''}`}>{security.isEmailConfirmed ? <><Check size={12} />Confirmed</> : 'Not confirmed'}</span></div>
          <p className="account-email">{security.email}</p>
          <p className="account-security-description">{security.isEmailConfirmed ? 'Your email address has been verified.' : 'Your email address has not been verified yet. After confirming it, refresh the status here.'}</p>
          <Link to="/profile" className="account-text-link">Edit profile</Link>
        </div>
      </section>
      <section className="card account-security-section" aria-labelledby="two-factor-title">
        <div className="account-security-icon"><ShieldCheck size={18} /></div><div className="account-security-body">
          <div className="account-security-title"><h2 id="two-factor-title">Two-factor authentication</h2><span className={`account-status ${security.twoFactorEnabled ? 'is-confirmed' : ''}`}>{security.twoFactorEnabled ? 'On' : 'Off'}</span></div>
          <p className="account-security-description">Add a code from your authenticator app when signing in, including with a social account.</p>
          {security.twoFactorEnabled && <p className="text-xs text-mist-muted mt-2">{security.recoveryCodesRemaining} recovery codes remaining.</p>}
          {!action && !recovery && <div className="account-security-actions">{security.twoFactorEnabled ? <>
            <button className="btn-ghost" onClick={() => { setAction('recovery'); setCode(''); setNotice(''); setError(''); }}>Replace recovery codes</button>
            <button className="btn-ghost" onClick={() => { setAction('disable'); setCode(''); setNotice(''); setError(''); }}>Turn off 2FA</button>
          </> : <button className="btn-primary" onClick={begin} disabled={busy}><Smartphone size={15} />{busy ? 'Starting…' : 'Set up 2FA'}</button>}</div>}
          {action && <form onSubmit={submit} className="account-setup">
            {setup && <>
              <p className="text-sm font-medium">1. Add this account to your authenticator app</p>
              <p className="account-security-description">Scan this QR code, or choose a time-based account and enter the setup key. Keep it private.</p>
              {setup.qrCodeDataUrl?.startsWith('data:image/png;base64,') && <img className="account-setup-qr" src={setup.qrCodeDataUrl} alt="Scan with your authenticator app to add this account" width="180" height="180" />}
              <div className="account-setup-key"><code>{setup.manualEntryKey}</code><button type="button" className="btn-ghost" aria-label="Copy setup key" onClick={() => copy(setup.manualEntryKey, 'Setup key copied.')}><Copy size={15} /></button></div>
              <a className="account-text-link" href={setup.authenticatorUri}>Open authenticator app</a>
              <p className="text-sm font-medium mt-4">2. Enter the six-digit code to finish</p>
              <p className="account-security-description">Setup expires in 10 minutes. Your other sessions will need to sign in again.</p>
            </>}
            {action !== 'enable' && <p className="account-security-description">{action === 'disable' ? 'Enter a code to turn off two-factor authentication. Your other sessions will need to sign in again.' : 'Enter a code to replace your recovery codes. All previous recovery codes will stop working.'}</p>}
            <label htmlFor="account-security-code" className="text-xs font-medium">{action === 'enable' ? 'Authenticator code' : 'Authenticator or recovery code'}</label>
            <input id="account-security-code" className="input" autoComplete="one-time-code" inputMode={action === 'enable' ? 'numeric' : 'text'}
              value={code} onChange={event => setCode(event.target.value)} required maxLength={32} autoFocus spellCheck={false} />
            <div className="account-security-actions"><button type="submit" className="btn-primary" disabled={busy || !code.trim()}>{busy ? 'Verifying…' : action === 'enable' ? 'Enable 2FA' : action === 'disable' ? 'Confirm turn off' : 'Replace codes'}</button>
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => { setAction(''); setSetup(null); setCode(''); setError(''); }}>Cancel</button></div>
          </form>}
          {recovery && <div className="account-recovery">
            <h3 className="text-sm font-semibold">Save your recovery codes</h3>
            <p className="account-security-description">Each code works once if you lose access to your authenticator. Store them somewhere safe. They are only shown now.</p>
            <div className="account-recovery-codes">{recovery.map(value => <code key={value}>{value}</code>)}</div>
            <div className="account-security-actions"><button type="button" className="btn-ghost" onClick={() => copy(recovery.join('\n'), 'Recovery codes copied.')}><Copy size={14} />Copy codes</button>
              <button type="button" className="btn-primary" onClick={() => { setRecovery(null); setNotice('Recovery codes hidden.'); }}>I saved my codes</button></div>
          </div>}
        </div>
      </section>
    </>}
  </div>;
}
