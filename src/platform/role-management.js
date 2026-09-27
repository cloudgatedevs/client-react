import { BACKOFFICE_PERMISSION_KEYS } from './backoffice-permissions.js';
/** Tenant IdP role management. Uses the current IdP session, never a linked ABP token. */
export function createRolesClient({ request }) {
  const run = (action, body = {}, options = {}) => request(`admin/roles/${action}`, { ...options, body });
  return {
    list: options => run('list', {}, options),
    options: options => request('admin/users/role-options', { ...options, body: {} }),
    create: (values, options) => run('create', values, options),
    update: (values, options) => run('update', values, options),
    delete: (id, options) => run('delete', { id }, options),
  };
}

export function validateRole(values) {
  const name = String(values?.name ?? '').trim();
  if (name.length < 2 || name.length > 64 || !/^[\p{L}\p{N} _-]+$/u.test(name))
    return 'Role names must be 2–64 characters using letters, digits, spaces, hyphens or underscores.';
  if (!Array.isArray(values?.permissions) || values.permissions.length > 200 + BACKOFFICE_PERMISSION_KEYS.length ||
    values.permissions.filter(p => !BACKOFFICE_PERMISSION_KEYS.some(key => key.toLowerCase() === String(p?.key ?? '').trim().toLowerCase())).length > 200)
    return 'A role can have at most 200 custom permissions, plus the built-in back-office permissions.';
  const keys = new Set();
  for (const pair of values.permissions) {
    const key = String(pair?.key ?? '').trim();
    if (!key || key.length > 128 || !/^[\p{L}\p{N}._:-]+$/u.test(key)) return 'Each permission needs a key of 1–128 characters: letters, digits, dots, underscores, hyphens or colons.';
    if (String(pair?.value ?? '').trim().length > 512) return 'Permission values must be at most 512 characters.';
    if (keys.has(key.toLowerCase())) return 'Permission keys must be unique.';
    keys.add(key.toLowerCase());
  }
  return null;
}
