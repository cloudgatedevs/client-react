import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKOFFICE_PERMISSIONS as P, BACKOFFICE_PERMISSION_KEYS as keys, BACKOFFICE_PERMISSION_TREE as tree,
  canAccessBackoffice, hasBackofficePermission, normalizeRolePermissions, validateRole } from '../src/platform/index.js';
import { normalizeProfile } from '../src/platform/profile.js';

const profile = (role, grants) => ({ role, rolePermissions: grants.map(key => ({ key, value: 'true' })) });

test('back-office access comes from explicit grants, never the role name', () => {
  assert.equal(canAccessBackoffice({ role: 'Admin' }), false);
  assert.equal(canAccessBackoffice(profile('User', [])), false);
  assert.equal(canAccessBackoffice(profile('User', [P.Access])), true);
  for (const key of keys) assert.equal(hasBackofficePermission(profile('User', keys), key), true);
  assert.equal(hasBackofficePermission(profile('Admin', [P.UsersEdit]), P.UsersEdit), false);
});

test('view permission cannot enable edits and explicit revocation takes effect', () => {
  const user = profile('User', [P.Access, P.UsersView]);
  assert.equal(hasBackofficePermission(user, P.UsersView), true);
  assert.equal(hasBackofficePermission(user, P.UsersEdit), false);
  user.rolePermissions[0].value = 'false';
  assert.equal(hasBackofficePermission(user, P.UsersView), false);
});

test('ambiguous or non-boolean grants fail closed', () => {
  assert.equal(canAccessBackoffice({role:'Admin', rolePermissions:{}}), false);
  const user = profile('Admin', [P.Access, P.UsersDelete]);
  user.rolePermissions.push({ key: P.UsersDelete.toUpperCase(), value: 'false' });
  assert.equal(hasBackofficePermission(user, P.UsersDelete), false);
  for (const value of ['yes', 'false', '0', '', null]) {
    assert.equal(canAccessBackoffice({ rolePermissions: [{ key: P.Access, value }] }), false);
  }
});

test('profile normalization carries permission grants in both API casing conventions', () => {
  const user = normalizeProfile({ Id: 3, Role: 'User', RolePermissions: [{ Key: P.Access.toUpperCase(), Value: true }] });
  assert.equal(canAccessBackoffice(user), true);
  assert.deepEqual(normalizeProfile({ id: 3, role: 'Admin' }).rolePermissions, []);
});

test('normalizing a role preserves explicit denials and custom data without granting missing permissions', () => {
  const input = [{ key: P.Access.toUpperCase(), value: 'true' }, { key: P.UsersDelete, value: 'false' }, { key: 'orders.export', value: 'limited' }];
  const normalized = normalizeRolePermissions(input);
  assert.equal(normalized.length, keys.length + 1);
  assert.equal(hasBackofficePermission({ rolePermissions: normalized }, P.UsersDelete), false);
  assert.equal(hasBackofficePermission({ rolePermissions: normalized }, P.UsersView), false);
  assert.equal(normalized.find(p => p.key === 'orders.export').value, 'limited');
  assert.deepEqual(normalizeRolePermissions(normalized), normalized);
  assert.equal(input[0].key, P.Access.toUpperCase());
});

test('every built-in permission appears once in the role tree', () => {
  const leaves = tree.flatMap(group => group.children || [group]);
  assert.deepEqual(leaves.map(p => p.key).sort(), [...keys].sort());
  assert.equal(new Set(keys).size, keys.length);
});

test('seeding built-in permissions does not reduce existing custom permission capacity', () => {
  const custom = Array.from({ length: 200 }, (_, i) => ({ key: `custom.${i}`, value: 'true' }));
  assert.equal(validateRole({ name: 'Support', permissions: normalizeRolePermissions(custom) }), null);
  assert.match(validateRole({ name: 'Support', permissions: normalizeRolePermissions([...custom, { key: 'custom.extra', value: 'true' }]) }), /200 custom/);
});
