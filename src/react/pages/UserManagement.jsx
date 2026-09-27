import { usePermissions } from '../auth/permissions.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { useCloudgate } from '../context.jsx';
import { useRef, useState } from 'react';
import { Eye, KeyRound, Pencil, Plus, Power, RefreshCw, Send, ShieldCheck, Trash2 } from 'lucide-react';

import { isAdminRole } from '../../platform/roles.js';
import { useAuthContext } from '../auth/index.js';
import { useAsync, Table, Badge, PageHead, SearchBar, Pager, Spinner, ErrorNote } from '../components/ui.jsx';
import { Modal, Notice } from '../components/forms.jsx';
import { RoleAssignment } from './RoleAssignment.jsx';
import { UserEditor } from './UserEditor.jsx';
import { ActionMenu } from '../components/ActionMenu.jsx';
import { UserActivity, UserAvatar, UserContact, UserEmail, formatMetadata } from './UserListDetails.jsx';

const SIZE = 25;
const emptyUser = { email: '', name: '', surname: '', phoneNumber: '' };
export function UserManagement() {
  const { can } = usePermissions();
  const { client } = useCloudgate();
  const request = (action, body = {}) => client.request(`admin/users/${action}`, { body });
  const { currentUser } = useAuthContext();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [form, setForm] = useState(null);
  const [invitationResult, setInvitationResult] = useState(null);
  const [roleUser, setRoleUser] = useState(null);
  const [metadataUser, setMetadataUser] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState('');
  const mutation = useRef(false);
  const users = useAsync(async () => {
    const value = await request('list', { skip: page * SIZE, take: SIZE, filter: query });
    if (!Array.isArray(value?.items)) throw new Error('Cloudgate returned an unexpected user list.');
    if (page > 0 && value.items.length === 0) setPage(Math.max(0, Math.ceil(value.totalCount / SIZE) - 1));
    return value;
  }, [query, page]);
  const total = users.data?.totalCount || 0;
  const protectedUser = (user) => isAdminRole(user.role) || String(user.id) === String(currentUser?.user?.id);
  const run = async (operation) => {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setActionError(null);
    setNotice('');
    try {
      await operation();
    } catch (err) {
      setActionError(err);
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  };
  const edit = (user) =>
    run(async () => {
      const result = await request('details', { id: user.id });
      if (!result?.id) throw new Error('Unable to load this user. Refresh and try again.');
      setInvitationResult(null);
      setForm(result);
    });
  const save = (e) => {
    e.preventDefault();
    run(async () => {
      if (form.id && protectedUser(form)) throw new Error('Administrator accounts are managed in Cloudgate.');
      const payload = {
        email: form.email.trim(),
        name: form.name,
        surname: form.surname,
        phoneNumber: form.phoneNumber,
      };
      if (form.id) payload.id = form.id;
      const result = form.id ? await client.users.update(payload) : await client.users.invite(payload);
      const saved = form.id ? result : result.user;
      if (!saved?.id) throw new Error('Unable to verify the saved account. Refresh before retrying.');
      users.reload();
      if (!form.id && !result.invitation.sent) { setInvitationResult(result); return; }
      setForm(null);
      setNotice(form.id ? 'User saved.' : `Invitation sent to ${saved.email} for ${result.invitation.appName}.`);
    });
  };
  const retryInvitation = () => run(async () => {
    const result = await client.users.resendInvite(invitationResult.user.id);
    if (!result.invitation.sent) throw new Error('The invitation email could not be sent. Check your email settings and try again.');
    setForm(null); setInvitationResult(null);
    setNotice(`Invitation sent to ${result.user.email} for ${result.invitation.appName}.`);
  });
  const act = () =>
    run(async () => {
      const { user, action } = confirmation;
      if (protectedUser(user)) throw new Error('Administrator accounts are managed in Cloudgate.');
      if (action === 'resend-invite') {
        const result = await client.users.resendInvite(user.id);
        if (!result.invitation.sent) throw new Error('The invitation email could not be sent. Check your email settings and try again.');
        setConfirmation(null); setNotice(`Invitation sent to ${user.email} for ${result.invitation.appName}.`); return;
      }
      const result = await request(action, {
        id: user.id,
        ...(action === 'set-active' ? { isActive: !user.isActive } : {}),
      });
      if (
        action === 'delete'
          ? !result?.deleted
          : action === 'request-password-reset'
            ? result?.success !== true
            : !result?.id
      )
        throw new Error('Unable to verify the result. Refresh before retrying.');
      setConfirmation(null);
      setNotice(
        action === 'request-password-reset'
          ? 'Password reset email requested.'
          : action === 'delete'
            ? 'User deleted.'
            : 'User updated.',
      );
      users.reload();
    });
  return (
    <div className="user-management space-y-5">
      <PageHead
        title="Users"
        subtitle="Manage the Cloudgate identities that sign in to your applications."
      >
        <button className="btn-ghost" disabled={busy || users.loading} onClick={users.reload}>
          <RefreshCw size={16} />
          Refresh
        </button>
        <button
          className="btn-primary"
          disabled={!can(P.UsersInvite) || busy}
          onClick={() => {
            setActionError(null);
            setInvitationResult(null);
            setForm({ ...emptyUser });
          }}
        >
          <Plus size={16} />
          Add user
        </button>
      </PageHead>
      <Notice>
        These accounts and roles are shared across this Cloudgate tenant. Use Change role to manage access.
        Other administrator account details remain managed in the Cloudgate hub.
      </Notice>
      <SearchBar
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email or phone…"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setQuery(search.trim());
        }}
        onClear={
          query
            ? () => {
                setSearch('');
                setQuery('');
                setPage(0);
              }
            : undefined
        }
      />
      <ErrorNote error={users.error || (!form && !confirmation ? actionError : null)} />
      <Notice>{notice}</Notice>
      {users.loading ? (
        <Spinner />
      ) : (
        <Table
          rows={users.data?.items}
          empty="No users found."
          columns={[
            {
              key: 'name',
              label: 'User',
              mobile: 'title',
              render: (u) => (
                <span className="user-list-identity">
                  <UserAvatar user={u} photoUrl={String(u.id) === String(currentUser?.user?.id) ? currentUser.user.photoUrl ?? null : u.photoUrl} />
                  <span className="user-list-stack">
                    <span className="user-list-name">{[u.name, u.surname].filter(Boolean).join(' ') || u.email}</span>
                    <span className="user-list-id">ID {u.id}</span>
                  </span>
                </span>
              ),
            },
            { key: 'email', label: 'Email', mobile: 'meta', render: (u) => <UserEmail user={u} /> },
            {
              key: 'role',
              label: 'Access',
              render: (u) => (
                <div className="user-list-access">
                  <Badge tone={isAdminRole(u.role) ? 'violet' : 'blue'}>{u.role || 'User'}</Badge>
                  <Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'Active' : 'Disabled'}</Badge>
                </div>
              ),
            },
            { key: 'contact', label: 'Details', render: (u) => <UserContact user={u} onMetadata={setMetadataUser} /> },
            { key: 'activity', label: 'Activity', render: (u) => <UserActivity user={u} /> },
            {
              key: 'actions',
              label: 'Actions',
              mobile: 'actions',
              render: (u) => (
                <div className="user-row-actions">
                  <button className="btn-ghost btn-sm" disabled={busy} onClick={() => edit(u)}>
                    {(!can(P.UsersEdit) || protectedUser(u)) ? <Eye size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
                    {(!can(P.UsersEdit) || protectedUser(u)) ? 'View' : 'Edit'}
                  </button>
                  {String(u.id) !== String(currentUser?.user?.id) && [P.UsersAssignRoles, P.UsersInvite, P.UsersResetPassword, P.UsersEdit, P.UsersDelete].some(can) && <ActionMenu label={`Actions for ${u.email}`} disabled={busy} items={[
                    { key: 'role', label: 'Change role', icon: ShieldCheck, onSelect: () => setRoleUser(u) },
                    ...(!protectedUser(u) ? [
                      { key: 'resend-invite', label: 'Send app invite', icon: Send, disabled: !u.isActive },
                      { key: 'request-password-reset', label: 'Send password reset', icon: KeyRound, disabled: !u.isActive },
                      { key: 'set-active', label: u.isActive ? 'Disable user' : 'Enable user', icon: Power },
                      { key: 'delete', label: 'Delete user', icon: Trash2, danger: true },
                    ].map(item => ({ ...item, onSelect: () => { setActionError(null); setConfirmation({ user: u, action: item.key }); } })) : []),
                  ].filter(item => can({ role: P.UsersAssignRoles, 'resend-invite': P.UsersInvite, 'request-password-reset': P.UsersResetPassword, 'set-active': P.UsersEdit, delete: P.UsersDelete }[item.key]))} />}
                </div>
              ),
            },
          ]}
        />
      )}
      {!users.loading && (
        <Pager
          page={page}
          pages={Math.max(1, Math.ceil(total / SIZE))}
          total={total}
          from={total ? page * SIZE + 1 : 0}
          to={Math.min(total, (page + 1) * SIZE)}
          noun="users"
          onPage={setPage}
        />
      )}
      <Modal
        open={!!form}
        title={form?.id ? 'User details' : 'Create user'}
        description={form?.id ? undefined : 'Add a user and invite them to this app.'}
        onClose={
          busy
            ? undefined
            : () => {
                setForm(null);
                setActionError(null);
              }
        }
      >
        {form && (
          <UserEditor form={form} setForm={setForm} busy={busy} error={actionError}
            readOnly={form.id ? !can(P.UsersEdit) || protectedUser(form) : !can(P.UsersInvite)} result={invitationResult} onSubmit={save}
            onClose={() => { setForm(null); setActionError(null); setInvitationResult(null); }} onRetry={retryInvitation} />
        )}
      </Modal>
      <RoleAssignment user={roleUser} onClose={() => setRoleUser(null)} onSaved={() => { setRoleUser(null); setNotice('User role updated.'); users.reload(); }} />
      <Modal open={!!metadataUser} title="User metadata" description={metadataUser?.email} onClose={() => setMetadataUser(null)}>
        <pre className="user-metadata-content">{formatMetadata(metadataUser?.metadata)}</pre>
      </Modal>
      <Modal
        open={!!confirmation}
        title={
          confirmation?.action === 'delete'
            ? 'Delete user?'
            : confirmation?.action === 'resend-invite'
              ? 'Send app invite?'
            : confirmation?.action === 'request-password-reset'
              ? 'Send password reset?'
              : confirmation?.user.isActive
                ? 'Disable user?'
                : 'Enable user?'
        }
        onClose={
          busy
            ? undefined
            : () => {
                setConfirmation(null);
                setActionError(null);
              }
        }
      >
        <p className="break-all font-medium">{confirmation?.user.email}</p>
        <p className="text-sm text-mist-muted">
          {confirmation?.action === 'delete'
            ? 'This removes the tenant app identity. Existing application records are retained.'
            : confirmation?.action === 'resend-invite'
              ? 'Send an invitation to this app. An existing account keeps its password and role.'
            : confirmation?.action === 'request-password-reset'
              ? 'Send a secure reset link by email. The password changes only when the user completes the reset.'
              : confirmation?.user.isActive
                ? 'This account will no longer be able to sign in to applications in this tenant.'
                : 'This account will be able to sign in again.'}
        </p>
        <ErrorNote error={actionError} />
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" disabled={busy} onClick={() => setConfirmation(null)}>
            Cancel
          </button>
          <button
            className={confirmation?.action === 'delete' ? 'btn-danger' : 'btn-primary'}
            disabled={busy}
            onClick={act}
          >
            {busy ? 'Working…' : 'Confirm'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
