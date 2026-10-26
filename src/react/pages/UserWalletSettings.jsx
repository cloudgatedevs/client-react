import { useEffect, useState } from 'react';
import { Wallet, Save } from 'lucide-react';
import { usePermissions } from '../auth/permissions.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { useSettings } from '../settings/SettingsProvider.jsx';
import { Notice } from '../components/forms.jsx';

export function UserWalletSettings() {
  const { walletSettings: saved, saveWalletSettings, loading, error } = useSettings();
  const { can } = usePermissions();
  const [enabled, setEnabled] = useState(false), [country, setCountry] = useState('');
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [message, setMessage] = useState('');
  useEffect(() => { setEnabled((saved?.configuredEnabled ?? saved?.enabled) === true); setCountry(saved?.countryCode ?? ''); }, [saved?.configuredEnabled, saved?.enabled, saved?.countryCode, saved?.production]);
  const disabled = loading || !!error || !saved || busy || !can(P.SettingsEdit);
  const dirty = enabled !== (saved?.configuredEnabled ?? saved?.enabled) || country !== saved?.countryCode;
  const submit = async event => {
    event.preventDefault(); if (disabled || !dirty) return;
    setBusy(true); setFailure(''); setMessage('');
    try { await saveWalletSettings({ enabled, countryCode: country }); setMessage('User wallet settings saved.'); }
    catch (err) { setFailure(err.message); }
    finally { setBusy(false); }
  };
  return <form className="card max-w-2xl space-y-5 p-5" onSubmit={submit} aria-label="User wallet settings">
    <div className="flex items-start gap-3"><Wallet size={21} className="mt-1 shrink-0 text-accent" aria-hidden="true" /><div className="cg-heading-copy">
      <label className="flex items-center gap-3 font-semibold"><input type="checkbox" className="h-4 w-4 accent-accent" checked={enabled} disabled={disabled} onChange={event => { setEnabled(event.target.checked); setMessage(''); }} />Enable user wallets</label>
      <p className="mt-3 text-sm leading-relaxed text-mist-muted">Let signed-in users connect an eZAR wallet, see their balance, send and receive funds, and top up.</p>
      <p className="mt-2 text-xs text-mist-dim">Shared across this project's apps in {saved?.production ? 'Production' : 'Sandbox'}. You can also manage this in Cloudgate → Web Apps → App User Wallet.</p>
    </div></div>
    <div><label htmlFor="user-wallet-country" className="mb-2 block text-sm font-medium">Wallet country</label>
      <select id="user-wallet-country" className="input w-full" value={country} disabled={disabled} onChange={event => { setCountry(event.target.value); setMessage(''); }}>
        <option value="">Select country</option>{(saved?.availableCountries || []).map(code => <option key={code} value={code}>{new Intl.DisplayNames(['en'], { type: 'region' }).of(code)}</option>)}
      </select>{saved?.comingSoon ? <div role="status" className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm"><strong>Coming soon</strong><p className="mt-1 text-mist-muted">{saved.availabilityMessage || 'Wallets are not yet available for this country and environment.'}</p></div> : <p className="mt-2 text-xs text-mist-muted">{saved?.availabilityMessage || 'Availability follows the platform settings for the selected country and environment.'}</p>}</div>
    <p className="text-xs text-mist-dim">Disabling wallets removes wallet access in this app. Existing wallet connections, funds and invoices are preserved.</p>
    {failure && <Notice error>{failure}</Notice>}{message && <Notice>{message}</Notice>}
    {!loading && !error && !saved && <Notice error>User wallet settings could not be loaded. Reload settings to try again.</Notice>}
    <div className="border-t border-ink-700 pt-4"><button type="submit" className="btn-primary" disabled={disabled || !dirty || (enabled && !(saved?.availableCountries || []).includes(country))}><Save size={15} />{busy ? 'Saving…' : 'Save wallet settings'}</button></div>
  </form>;
}
