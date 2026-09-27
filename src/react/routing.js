export function normalizeBackofficeBasePath(value = '') {
  const base = String(value).replace(/\/+$/, '');
  if (!base) return '';
  if (!/^\/(?:[A-Za-z0-9_-]+\/?)+$/.test(base)) throw new Error('Use an absolute path for the back office, for example /backoffice.');
  return base;
}
export function scopedBackofficePath(base, path = '/') {
  if (!base || path === base || path.startsWith(`${base}/`)) return path;
  return path === '/' ? base : `${base}/${path.replace(/^\/+/, '')}`;
}
export function scopeNavigation(items, base) {
  return items.map(item => ({ ...item, ...(item.to ? { to: scopedBackofficePath(base, item.to) } : {}),
    ...(item.to === '/' && item.end === undefined ? { end: true } : {}),
    ...(item.children ? { children: scopeNavigation(item.children, base) } : {}) }));
}
