import { usePermissions } from '../auth/permissions.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { useEffect, useState } from 'react';
import { Globe, Save } from 'lucide-react';
import { useSettings } from '../settings/SettingsProvider.jsx';
import { PageHead, ErrorNote, Spinner } from '../components/ui.jsx';
import { Notice } from '../components/forms.jsx';
import { RadioGroup } from '../widgets/RadioGroup.jsx';

export function WebsiteSettings() {
  const { can } = usePermissions();
  const { settings, loading, error, save, reload } = useSettings();
  const saved = settings.enable_public_website === 'true';
  const savedRequireLogin = settings.require_public_website_login === 'true';
  const [enabled, setEnabled] = useState(saved), [busy, setBusy] = useState(false), [failure, setFailure] = useState(null), [message, setMessage] = useState('');
  const [requireLogin, setRequireLogin] = useState(savedRequireLogin);
  useEffect(() => { setEnabled(saved); setRequireLogin(savedRequireLogin); }, [saved, savedRequireLogin]);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setFailure(null); setMessage('');
    try { await save({ enable_public_website: String(enabled), require_public_website_login: String(requireLogin) }); setMessage('Website settings saved.'); }
    catch (err) { setFailure(err); }
    finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <PageHead title="Settings" subtitle="Choose how visitors enter your application." />
    <ErrorNote error={error || failure} />
    {error && <button className="btn-ghost mb-4" onClick={reload}>Reload settings</button>}
    {message && <Notice>{message}</Notice>}
    {loading ? <Spinner /> : <form className="card max-w-2xl space-y-5 p-5" onSubmit={submit}>
      <div className="flex items-start gap-3"><Globe size={21} className="mt-1 shrink-0 text-accent" aria-hidden="true" /><div>
        <label className="flex items-center gap-3 font-semibold"><input type="checkbox" className="h-4 w-4 accent-accent" checked={enabled} disabled={!can(P.SettingsEdit) || busy || !!error} onChange={event => { setEnabled(event.target.checked); setMessage(''); }} />Enable public website</label>
        <p className="mt-3 text-sm leading-relaxed text-mist-muted">Enable your website and choose who can enter. When disabled, visitors are sent to the back office and need back office access.</p>
        <p className="mt-2 text-xs text-mist-dim">Applies to this application in the current environment. Back office access is controlled by role permissions.</p>
      </div></div>
      {enabled && <RadioGroup
        label="Website access"
        name="website-access"
        variant="cards"
        value={requireLogin ? 'signed-in' : 'everyone'}
        onChange={value => { setRequireLogin(value === 'signed-in'); setMessage(''); }}
        disabled={!can(P.SettingsEdit) || busy || !!error}
        options={[
          { value: 'everyone', label: 'Everyone', description: 'Visitors can browse without signing in.' },
          { value: 'signed-in', label: 'Signed-in users', description: 'Require sign-in before showing any website page. Any app user can enter; back office permissions are not required.' },
        ]}
      />}
      <div className="border-t border-ink-700 pt-4"><button className="btn-primary" type="submit" disabled={!can(P.SettingsEdit) || busy || !!error || (enabled === saved && requireLogin === savedRequireLogin)}><Save size={15} />{busy ? 'Saving…' : 'Save changes'}</button></div>
    </form>}
  </div>;
}
