import { useLocation } from 'react-router-dom';
import { useAuthContext } from './useAuthContext.js';
import { useCloudgate } from '../context.jsx';
import { hasBackofficePermission } from '../../platform/backoffice-permissions.js';

import { permissionForBackofficePath } from './page-permissions.js';
export { BACKOFFICE_ROUTE_PERMISSIONS } from './page-permissions.js';

export function usePermissions() {
  const { currentUser } = useAuthContext();
  return { can: permission => hasBackofficePermission(currentUser?.user, permission), permissions: currentUser?.user?.rolePermissions || [] };
}
export function filterPermissionNavigation(items, can, basePath = '') {
  return items.flatMap(item => {
    if (item.children) { const children = filterPermissionNavigation(item.children, can, basePath); return children.length ? [{ ...item, children }] : []; }
    const path = item.to?.startsWith(basePath) ? item.to.slice(basePath.length) || '/' : item.to;
    return can(item.permission || permissionForBackofficePath(path)) ? [item] : [];
  });
}
export function RequirePagePermission({ children }) {
  const { pathname } = useLocation();
  const { basePath, navigation } = useCloudgate();
  const { can } = usePermissions();
  const path = pathname.slice(basePath.length).replace(/\/+$/, '') || '/';
  const find = items => items.flatMap(item => item.children ? find(item.children) : [item]);
  const item = find(navigation).find(item => item.to?.replace(/\/+$/, '') === pathname.replace(/\/+$/, ''));
  const permission = item?.permission || permissionForBackofficePath(path);
  if (can(permission)) return children;
  return <section className="card p-6 space-y-3" role="alert"><h1 className="text-xl font-semibold">Permission required</h1><p className="text-sm text-mist-muted">Your role does not have access to this page. Choose an available page from the menu or ask someone who manages roles to update your access.</p></section>;
}
