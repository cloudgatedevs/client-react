import { useEffect, useRef, useState } from 'react';
import { completeTwoFactorLogin } from '../../platform/account-security.js';
export function TwoFactorLogin({ client, challenge, onSuccess, onCancel }) {
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef(null);
  useEffect(() => () => pending.current?.abort(), []);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    const controller = new AbortController(); pending.current = controller;
    try {
      const tokens = await completeTwoFactorLogin({ apiUrl: client.config.apiUrl, tenancyName: client.auth.tenancyName,
        challengeToken: challenge.challengeToken, code: code.trim(), signal: controller.signal });
      onSuccess(tokens);
    } catch (err) { if (!controller.signal.aborted) setError(err.message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  return <div className="grid min-h-screen place-items-center p-6"><form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
    <h1 className="text-xl font-semibold">Verify your sign-in</h1>
    <p className="text-sm text-mist-muted">Enter the six-digit code from your authenticator app, or an unused recovery code.</p>
    {error && <p role="alert" className="account-message is-error">{error}</p>}
    <label className="block text-xs font-medium" htmlFor="launcher-two-factor-code">Authenticator or recovery code</label>
    <input id="launcher-two-factor-code" className="input" value={code} onChange={event => setCode(event.target.value)} required maxLength={32} autoFocus autoComplete="one-time-code" spellCheck={false} />
    <div className="flex flex-wrap gap-2"><button type="submit" className="btn-primary" disabled={busy || !code.trim()}>{busy ? 'Verifying…' : 'Verify and sign in'}</button>
      <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button></div>
  </form></div>;
}
