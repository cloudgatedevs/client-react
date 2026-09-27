import { usePermissions } from '../auth/permissions.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Mail, RefreshCw, Save, UserPlus } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { useAuthContext } from '../auth/index.js';
import { Badge, ErrorNote, PageHead, Spinner } from '../components/ui.jsx';
import { Notice } from '../components/forms.jsx';
import { useSettings } from '../settings/SettingsProvider.jsx';

export function Registration() {
  const { can } = usePermissions();
  const { client } = useCloudgate();
  const { refreshLoginDetails } = useAuthContext();
  const { reload: reloadWebsite } = useSettings();
  const [saved, setSaved] = useState(null), [enabled, setEnabled] = useState(false);
  const [promptEnabled, setPromptEnabled] = useState(false);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(null), [notice, setNotice] = useState('');
  const pending = useRef(null), lock = useRef(false);
  const id = useId();
  const load = useCallback(async () => {
    pending.current?.abort();
    const request = new AbortController(); pending.current = request;
    setLoading(true); setError(null); setNotice(''); setSaved(null);
    try {
      const value = await client.registration.get({ signal: request.signal });
      if (!request.signal.aborted) { setSaved(value); setEnabled(value.allowSelfRegistration); setPromptEnabled(value.promptForEmailVerification === true); }
    } catch (failure) { if (!request.signal.aborted) setError(failure); }
    finally { if (!request.signal.aborted) setLoading(false); }
  }, [client]);
  useEffect(() => { load(); return () => pending.current?.abort(); }, [load]);
  const save = async event => {
    event.preventDefault();
    if (lock.current || !dirty) return;
    lock.current = true; setBusy(true); setError(null); setNotice('');
    const request = new AbortController(); pending.current = request;
    try {
      const value = await client.registration.update({ allowSelfRegistration: enabled,
        ...(typeof saved.promptForEmailVerification === 'boolean' ? { promptForEmailVerification: promptEnabled } : {}) }, { signal: request.signal });
      if (!request.signal.aborted) {
        setSaved(value); setEnabled(value.allowSelfRegistration); setPromptEnabled(value.promptForEmailVerification === true);
        reloadWebsite();
        setNotice(value.promptForEmailVerification !== saved.promptForEmailVerification ? 'User settings saved for this tenant.'
          : `Self-registration ${value.allowSelfRegistration ? 'enabled' : 'disabled'} for this tenant.`);
        await refreshLoginDetails({ silent: true });
      }
    } catch (failure) {
      if (!request.signal.aborted) {
        setError(failure);
        // A revoked permission or unavailable endpoint must be rechecked before another edit.
        if ([401, 403, 404].includes(failure.status)) setSaved(null);
      }
    } finally { lock.current = false; if (!request.signal.aborted) setBusy(false); }
  };
  const dirty = saved && (enabled !== saved.allowSelfRegistration || promptEnabled !== (saved.promptForEmailVerification === true));
  return <div className="space-y-5">
    <PageHead title="Settings" subtitle="Manage registration and email verification reminders for your app users.">
      <button type="button" className="btn-ghost" onClick={load} disabled={loading || busy}><RefreshCw size={14} /> Reload setting</button>
    </PageHead>
    <Notice>These settings apply to all apps in your Cloudgate tenant, across sandbox and production.</Notice>
    {loading ? <Spinner /> : <>
      <ErrorNote error={error} />
      <Notice>{notice}</Notice>
      <form onSubmit={save} className="card max-w-3xl p-5">
        <fieldset disabled={!can(P.RegistrationEdit) || busy || !saved}>
          <div className="flex items-start gap-3">
            <span className="stat-icon shrink-0"><UserPlus size={17} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label htmlFor={id} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-semibold">
                  <input id={id} type="checkbox" role="switch" checked={enabled}
                    aria-describedby={`${id}-description`} className="h-4 w-4 accent-accent"
                    onChange={event => { setEnabled(event.target.checked); setNotice(''); }} />
                  Allow self-registration
                </label>
                {saved ? <Badge tone={saved.allowSelfRegistration ? 'green' : 'gray'}>Currently {saved.allowSelfRegistration ? 'enabled' : 'disabled'}</Badge> : <Badge>Not loaded</Badge>}
              </div>
              <p id={`${id}-description`} className="mt-1 text-sm leading-relaxed text-mist-muted">
                When enabled, new users can sign up through your app's registration flow. When disabled, public sign-up cannot create accounts; administrators can still add users. Existing users can still sign in.
              </p>
              <p className="mt-3 text-xs leading-relaxed text-mist-dim">Existing reCAPTCHA and sign-in settings continue to apply.</p>
            </div>
          </div>
          <div className="mt-5 flex items-start gap-3 border-t border-ink-700 pt-5">
            <span className="stat-icon shrink-0"><Mail size={17} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <label htmlFor={`${id}-verification`} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-semibold">
                <input id={`${id}-verification`} type="checkbox" role="switch" checked={promptEnabled}
                  disabled={typeof saved?.promptForEmailVerification !== 'boolean'}
                  aria-describedby={`${id}-verification-description`} className="h-4 w-4 accent-accent"
                  onChange={event => { setPromptEnabled(event.target.checked); setNotice(''); }} />
                Prompt for email verification
              </label>
              <p id={`${id}-verification-description`} className="mt-1 text-sm leading-relaxed text-mist-muted">
                Show a reminder at the top of every signed-in page until the user verifies their email address. Users can resend the verification email from the reminder and continue using the app.
              </p>
              {saved && typeof saved.promptForEmailVerification !== 'boolean' && <p className="mt-2 text-xs text-mist-dim">Update your Cloudgate server to enable email verification reminders.</p>}
            </div>
          </div>
          <p className="mt-4 text-xs text-mist-dim">Your role needs permission to edit user settings.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink-700 pt-4">
            <button type="submit" className="btn-primary" disabled={!dirty || busy}><Save size={14} />{busy ? 'Saving…' : 'Save changes'}</button>
            {dirty && <span className="text-xs text-mist-dim">Unsaved changes</span>}
          </div>
        </fieldset>
      </form>
    </>}
  </div>;
}
