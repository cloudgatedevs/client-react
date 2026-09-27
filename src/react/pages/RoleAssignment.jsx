import { useEffect, useRef, useState } from 'react';
import { useCloudgate } from '../context.jsx';
import { useAsync, ErrorNote, Spinner } from '../components/ui.jsx';
import { Modal, Field, Notice } from '../components/forms.jsx';

export function RoleAssignment({ user, onClose, onSaved }) {
  const { client } = useCloudgate();
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const mutation = useRef(false);
  useEffect(() => { setRole(user?.role || ''); setError(null); }, [user]);
  const roles = useAsync(async () => {
    if (!user) return [];
    const result = await client.roles.options();
    if (!Array.isArray(result?.items)) throw new Error('Unable to load available roles.');
    return result.items;
  }, [client, user]);
  const available = (roles.data || []).some(item => item.name === role);
  const save = async event => {
    event.preventDefault();
    if (mutation.current || !available) return;
    mutation.current = true; setBusy(true); setError(null);
    try {
      const saved = await client.users.setRole(user.id, role);
      if (!saved?.id || saved.role !== role) throw new Error('Unable to verify the new role. Refresh before retrying.');
      onSaved();
    } catch (err) { setError(err); }
    finally { mutation.current = false; setBusy(false); }
  };
  return <Modal open={!!user} title="Change user role" description={user?.email} onClose={busy ? undefined : onClose}>
    <ErrorNote error={error || roles.error} />
    {roles.loading ? <Spinner /> : roles.error ? <button className="btn-ghost" onClick={roles.reload}>Retry</button> : <form className="space-y-4" onSubmit={save}>
      <Field label="Role" id="assigned-role"><select id="assigned-role" className="input" value={role} disabled={busy} onChange={event => setRole(event.target.value)}>
        {!available && <option value={role} disabled>{role || 'Choose a role'}</option>}
        {(roles.data || []).map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
      </select></Field>
      <Notice>This role applies across the tenant’s applications. Its permissions control back office access and actions.</Notice>
      <button className="btn-primary" disabled={busy || !available || role === user?.role}>{busy ? 'Saving…' : 'Save user role'}</button>
    </form>}
  </Modal>;
}
