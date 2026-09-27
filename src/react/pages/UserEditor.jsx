import { LoaderCircle, Mail, Send } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { Field, Notice } from '../components/forms.jsx';
import { ErrorNote, useAsync } from '../components/ui.jsx';

export function UserEditor({ form, setForm, busy, error, readOnly, result, onSubmit, onClose, onRetry }) {
  const { client } = useCloudgate();
  const creating = !form.id;
  const app = useAsync(async () => creating ? client.users.invitationApp() : null, [client, creating]);
  if (result) return <div className="user-editor">
    <ErrorNote error={error || 'The user was created, but the invitation email could not be sent. Check your email settings and retry.'} />
    <p className="text-sm text-mist-muted">Retrying sends an invitation to <strong className="text-mist">{result.user.email}</strong> without creating another account.</p>
    <div className="user-editor-actions">
      <button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>Done</button>
      <button type="button" className="btn-primary" disabled={busy} onClick={onRetry}>
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}{busy ? 'Sending…' : 'Retry invitation'}
      </button>
    </div>
  </div>;
  return <form onSubmit={onSubmit} className="user-editor">
    <ErrorNote error={error} />
    {creating && <div className="user-invite-destination">
      <Mail size={19} aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium text-mist">{app.loading ? 'Loading invitation destination…' : app.data?.name || 'Invitation destination unavailable'}</p>
        {app.data && !app.loading && <p className="user-invite-url">{app.data.url}</p>}
        <p>{app.data?.isDevelopment ? 'Local development invitation. Open it on the computer running this app.' : 'The invitation opens this app. New users choose their own password.'}</p>
      </div>
    </div>}
    {creating && app.error && <div className="space-y-2"><ErrorNote error={app.error} /><button type="button" className="btn-ghost btn-sm" onClick={app.reload}>Try again</button></div>}
    <div className="user-editor-fields">
      {[
        ['Email address', 'email', 'email', 256, 'name@example.com'],
        ['First name', 'name', 'text', 64, 'First name'],
        ['Surname', 'surname', 'text', 64, 'Surname'],
        ['Phone number (optional)', 'phoneNumber', 'tel', 32, '+27 82 123 4567'],
      ].map(([label, key, type, max, placeholder]) => <div key={key} className={key === 'email' || key === 'phoneNumber' ? 'user-editor-wide' : undefined}>
        <Field label={label} id={`user-${key}`}>
          <input className="input" id={`user-${key}`} type={type} maxLength={max} required={key === 'email'}
            placeholder={placeholder} autoComplete="off" disabled={busy || readOnly} value={form[key] || ''}
            onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} />
        </Field>
      </div>)}
    </div>
    {creating && <p className="text-xs text-mist-muted">Created with the User role. The invitation expires in 3 days.</p>}
    {readOnly && <Notice>Manage administrator accounts in Cloudgate.</Notice>}
    <div className="user-editor-actions">
      <button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>
      {!readOnly && <button type="submit" className="btn-primary" disabled={busy || (creating && (app.loading || !app.data || !!app.error))}>
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : creating ? <Send size={15} /> : null}
        {busy ? (creating ? 'Creating & sending…' : 'Saving…') : creating ? 'Create & send invite' : 'Save user'}
      </button>}
    </div>
  </form>;
}
