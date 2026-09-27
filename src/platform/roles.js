/** Role-name helpers for display/account protections. Use canAccessBackoffice for authorization. */
export const ADMIN_ROLES = Object.freeze(['admin']);
export const isAdminRole = role => String(role ?? '').trim().toLowerCase() === 'admin';
