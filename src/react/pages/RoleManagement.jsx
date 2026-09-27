import { useRef, useState } from 'react';
import { BackofficeLink as Link } from '../components/BackofficeLink.jsx';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { validateRole } from '../../platform/role-management.js';
import { useAsync, Table, Badge, PageHead, SearchBar, Spinner, ErrorNote, Pager } from '../components/ui.jsx';
import { Modal, Field, Notice } from '../components/forms.jsx';
import { PermissionTree } from '../components/PermissionTree.jsx';
import { BACKOFFICE_PERMISSIONS as P, BACKOFFICE_PERMISSION_KEYS, normalizeRolePermissions } from '../../platform/backoffice-permissions.js';
import { usePermissions } from '../auth/permissions.jsx';
import { useAuthContext } from '../auth/useAuthContext.js';

export function RoleManagement() {
  const { client } = useCloudgate();
  const { can } = usePermissions();
  const { refreshLoginDetails } = useAuthContext();
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const mutation = useRef(false);
  const roles = useAsync(async () => {
    const result = await client.roles.list();
    if (!Array.isArray(result?.items)) throw new Error('Cloudgate returned an unexpected role list.');
    return result.items;
  }, [client]);
  const filtered = (roles.data || []).filter(role => role.name.toLowerCase().includes(filter.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const current = Math.min(page, pages - 1);
  const run = async operation => {
    if (mutation.current) return;
    mutation.current = true; setBusy(true); setError(null); setNotice('');
    try { await operation(); } catch (e) { setError(e); }
    finally { mutation.current = false; setBusy(false); }
  };
  const edit = role => { setError(null); setForm(role ? { ...role, editing: true, permissions: normalizeRolePermissions(role.permissions) } : { name: '', permissions: normalizeRolePermissions(), editing: false }); };
  const save = event => {
    event.preventDefault();
    run(async () => {
      const validation = validateRole(form);
      if (validation) throw new Error(validation);
      const values = { name: form.name.trim(), permissions: form.permissions.map(p => ({ key: p.key.trim(), value: p.value.trim() })) };
      if (form.id != null) values.id = form.id;
      const result = await client.roles[form.editing ? 'update' : 'create'](values);
      if (!result?.id || !result?.name) throw new Error('Unable to verify the saved role. Refresh before retrying.');
      setForm(null); setNotice('Role saved.'); roles.reload(); await refreshLoginDetails({ silent: true });
    });
  };
  const updatePermission = (index, key, value) => setForm(previous => ({ ...previous, permissions: previous.permissions.map((p, i) => i === index ? { ...p, [key]: value } : p) }));
  return <div className="space-y-5">
    <PageHead title="Roles" subtitle="Choose which pages and actions each app role can access.">
      <button className="btn-ghost" disabled={busy || roles.loading} onClick={roles.reload}><RefreshCw size={16} />Refresh</button>
      {can(P.RolesCreate) && <button className="btn-primary" disabled={busy || roles.loading || !!roles.error} onClick={() => edit(null)}><Plus size={16} />Create role</button>}
    </PageHead>
    <Notice>Roles are shared across this Cloudgate tenant. Assign them in <Link className="underline" to="/users">Users</Link>. Built-in names cannot be renamed or deleted.</Notice>
    <SearchBar value={filter} placeholder="Search roles…" onChange={e => { setFilter(e.target.value); setPage(0); }} onSubmit={e => e.preventDefault()} />
    <ErrorNote error={roles.error || (!form && !deleting ? error : null)} /><Notice>{notice}</Notice>
    {roles.loading ? <Spinner /> : <Table rows={filtered.slice(current * 25, current * 25 + 25)} empty="No roles found." columns={[
      { key: 'name', label: 'Role', mobile: 'title', render: role => <span className="font-medium">{role.name}</span> },
      { key: 'isDefault', label: 'Type', render: role => <Badge tone={role.isDefault ? 'gray' : 'blue'}>{role.isDefault ? 'Built-in' : 'Custom'}</Badge> },
      { key: 'userCount', label: 'Users' },
      { key: 'permissions', label: 'Permissions', render: role => role.permissions.filter(p => ['true', '1'].includes(String(p.value).toLowerCase())).length },
      { key: 'actions', label: 'Actions', mobile: 'actions', render: role => <div className="flex flex-wrap gap-2">
        <button className="btn-ghost btn-sm" aria-label={`${can(P.RolesEdit) ? 'Edit' : 'View'} ${role.name}`} disabled={busy} onClick={() => edit(role)}>{can(P.RolesEdit) ? 'Edit' : 'View'}</button>
        {can(P.RolesDelete) && !role.isDefault && <button className="btn-ghost btn-sm" disabled={busy || role.userCount > 0} title={role.userCount ? 'Reassign users before deleting this role.' : undefined}
          aria-label={`Delete ${role.name}`} onClick={() => { setError(null); setDeleting(role); }}>Delete</button>}
      </div> },
    ]} />}
    {!roles.loading && !roles.error && <Pager page={current} pages={pages} total={filtered.length} from={filtered.length ? current * 25 + 1 : 0} to={Math.min((current + 1) * 25, filtered.length)} noun="roles" onPage={setPage} />}
    <Modal open={!!form} title={form?.editing ? `${can(P.RolesEdit) ? 'Edit' : 'View'} role: ${form.name}` : 'Create role'} onClose={busy ? undefined : () => { setForm(null); setError(null); }}>
      {form && <form onSubmit={save} className="space-y-4"><fieldset disabled={busy || !can(form.editing ? P.RolesEdit : P.RolesCreate)} className="space-y-4">
        <ErrorNote error={error} />
        <Field label="Role name" id="role-name"><input id="role-name" className="input" value={form.name} required minLength={2} maxLength={64} disabled={busy || form.isDefault}
          onChange={e => setForm(previous => ({ ...previous, name: e.target.value }))} /></Field>
        <p className="text-xs text-mist-muted">Access comes from permissions, regardless of the role name. Use Read only to allow browsing without changes.</p>
        <PermissionTree value={form.permissions} onChange={permissions => setForm(previous => ({ ...previous, permissions }))} disabled={busy || !can(form.editing ? P.RolesEdit : P.RolesCreate)} />
        {form.editing && !form.isDefault && <p className="text-xs text-mist-muted">Renaming also updates users currently assigned this role.</p>}
        <details><summary className="cursor-pointer text-sm font-medium">Custom application permissions</summary><div className="space-y-3 mt-3">
          {form.permissions.map((pair, index) => BACKOFFICE_PERMISSION_KEYS.some(key => key.toLowerCase() === pair.key.toLowerCase()) ? null : <div key={index} className="rounded-lg border border-ink-700 p-3 space-y-2">
            <Field label={`Permission key ${index + 1}`} id={`permission-key-${index}`}><input className="input" id={`permission-key-${index}`} placeholder="orders.view" required maxLength={128} value={pair.key} disabled={busy} onChange={e => updatePermission(index, 'key', e.target.value)} /></Field>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1"><Field label={`Permission value ${index + 1}`} id={`permission-value-${index}`}><input className="input" id={`permission-value-${index}`} placeholder="true" maxLength={512} value={pair.value} disabled={busy} onChange={e => updatePermission(index, 'value', e.target.value)} /></Field></div>
              <button type="button" className="btn-ghost p-2" aria-label={`Remove permission ${index + 1}`} disabled={busy} onClick={() => setForm(previous => ({ ...previous, permissions: previous.permissions.filter((_, i) => i !== index) }))}><Trash2 size={16} /></button>
            </div>
          </div>)}
          <button type="button" className="btn-ghost btn-sm" disabled={busy || form.permissions.filter(p => !BACKOFFICE_PERMISSION_KEYS.includes(p.key)).length >= 200} onClick={() => setForm(previous => ({ ...previous, permissions: [...previous.permissions, { key: '', value: '' }] }))}><Plus size={14} />Add permission</button>
        </div></details>
        {can(form.editing ? P.RolesEdit : P.RolesCreate) && <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save role'}</button>}
        </fieldset>
      </form>}
    </Modal>
    <Modal open={!!deleting} title="Delete role?" onClose={busy ? undefined : () => { setDeleting(null); setError(null); }}>
      <ErrorNote error={error} /><p className="text-sm">Delete “{deleting?.name}”? This removes its custom permissions.</p>
      <div className="flex gap-2"><button className="btn-ghost" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button>
        <button className="btn-danger" disabled={busy} onClick={() => run(async () => {
          const result = await client.roles.delete(deleting.id);
          if (!result?.deleted) throw new Error('Unable to verify deletion. Refresh before retrying.');
          setDeleting(null); setNotice('Role deleted.'); roles.reload();
        })}>{busy ? 'Deleting…' : 'Delete role'}</button></div>
    </Modal>
  </div>;
}
