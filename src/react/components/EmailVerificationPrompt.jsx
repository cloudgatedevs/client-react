import { useEffect, useRef, useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { useAuthContext } from '../auth/index.js';

export function EmailVerificationPrompt() {
  const { client } = useCloudgate();
  const { currentUser, refreshLoginDetails } = useAuthContext();
  const user = currentUser?.user;
  const [busy, setBusy] = useState(false), [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState(''), [error, setError] = useState('');
  const [retryAt, setRetryAt] = useState(0), [remaining, setRemaining] = useState(0);
  const lock = useRef(false);
  useEffect(() => { setNotice(''); setError(''); setRetryAt(0); }, [user?.id, user?.emailAddress]);
  useEffect(() => {
    if (!user?.id) return;
    const refresh = () => { if (document.visibilityState === 'visible') refreshLoginDetails({ silent: true }); };
    const timer = user.promptForEmailVerification && user.isEmailConfirmed === false ? setInterval(refresh, 60000) : null;
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [user?.id, user?.promptForEmailVerification, user?.isEmailConfirmed, refreshLoginDetails]);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    tick();
    if (retryAt <= Date.now()) return;
    const timer = setInterval(() => { tick(); if (retryAt <= Date.now()) clearInterval(timer); }, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  if (!user?.promptForEmailVerification || user.isEmailConfirmed !== false) return null;
  const resend = async () => {
    if (lock.current || retryAt > Date.now()) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await client.profile.resendVerification();
      if (result.isEmailConfirmed) await refreshLoginDetails({ silent: true });
      else if (result.sent) {
        setNotice('Verification email sent. Check your inbox and spam folder.');
        setRetryAt(Date.now() + result.retryAfterSeconds * 1000);
      }
    } catch (failure) {
      setError(failure.message || 'Could not send the verification email. Please try again.');
      if (failure.status === 429) setRetryAt(Date.now() + (failure.body?.retryAfterSeconds || 60) * 1000);
    } finally { lock.current = false; setBusy(false); }
  };
  const check = async () => {
    setChecking(true); setError('');
    try {
      const profile = await refreshLoginDetails({ silent: true });
      if (!profile) setError('Could not check your email status. Please try again.');
      else if (profile.isEmailConfirmed === false) setNotice('Your email is not verified yet. Open the verification link in your inbox, then check again.');
    }
    finally { setChecking(false); }
  };
  return <section aria-label="Email verification reminder" className="mb-5 flex flex-wrap items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
    <Mail size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
    <div className="min-w-0 flex-1 basis-64">
      <h2 className="text-sm font-semibold">Verify your email address</h2>
      <p className="mt-1 break-words text-xs leading-relaxed text-mist-muted">Please verify {user.emailAddress} to confirm this email address belongs to you.</p>
      {notice && <p role="status" className="mt-2 text-xs text-mist-muted">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn-ghost btn-sm" disabled={busy || remaining > 0} onClick={resend}>
        {busy ? 'Sending…' : remaining > 0 ? `Resend in ${remaining}s` : 'Resend verification email'}
      </button>
      <button type="button" className="btn-ghost btn-sm" disabled={checking} onClick={check}>
        <RefreshCw size={13} aria-hidden="true" />{checking ? 'Checking…' : 'I’ve verified my email'}
      </button>
    </div>
  </section>;
}
