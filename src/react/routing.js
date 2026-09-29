import { matchPath } from 'react-router-dom';

export const SDK_PAYMENT_ROUTES = Object.freeze({
  overview: '/cloudgate/payments',
  history: '/cloudgate/payments/list',
  test: '/cloudgate/payments/test',
});

const routePath = value => `/${String(value || '').split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, '')}`;

export function collectRoutePaths(routes, parent = '') {
  return routes.flatMap(route => {
    const path = route.path?.startsWith('/') ? routePath(route.path)
      : routePath(`${parent}/${route.path || ''}`);
    return [...(route.path != null || route.index ? [path] : []),
      ...collectRoutePaths(route.children || [], path === '/' ? '' : path)];
  });
}

// Catch competing page registrations before route order and menu depth disagree.
export function assertNoPlatformRouteConflicts(appPaths, platformPaths) {
  for (const appPath of appPaths.map(routePath)) {
    if (appPath === '/*' || appPath === '/') continue;
    const conflict = platformPaths.map(routePath).find(platformPath => {
      if (platformPath.endsWith('/*')) {
        return Boolean(matchPath({ path: platformPath, end: true }, appPath));
      }
      return Boolean(matchPath({ path: appPath, end: true }, platformPath));
    });
    if (conflict) throw new Error(`Application route "${appPath}" conflicts with the built-in Cloudgate route "${conflict}". Choose a distinct application route; sidebar groups do not create URL namespaces.`);
  }
}

// Preserve old SDK bookmarks only when the app does not own the payments namespace.
export function legacyPaymentRedirects(appPaths) {
  if (appPaths.some(value => /^\/payments(?:\/|$)/i.test(routePath(value)))) return [];
  return [
    { from: '/payments', to: SDK_PAYMENT_ROUTES.overview },
    { from: '/payments/list', to: SDK_PAYMENT_ROUTES.history },
    { from: '/payments/test', to: SDK_PAYMENT_ROUTES.test },
  ];
}

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
