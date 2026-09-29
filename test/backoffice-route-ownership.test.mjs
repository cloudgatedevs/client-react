import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRoutes } from 'react-router-dom';
import { assertNoPlatformRouteConflicts, collectRoutePaths, legacyPaymentRedirects, scopeNavigation, SDK_PAYMENT_ROUTES } from '../src/react/routing.js';
import { navigationSections, navigationTrail } from '../src/react/components/navigation.js';
import { permissionForBackofficePath } from '../src/react/auth/page-permissions.js';
import { BACKOFFICE_PERMISSIONS as P } from '../src/platform/backoffice-permissions.js';

test('application and Cloudgate payments select distinct pages and active links', () => {
  const app = { to: '/payments', label: 'Application payments' };
  const sdk = { label: 'Administration', section: 'platform', children: [{ label: 'Cloudgate payments', children: [
    { to: SDK_PAYMENT_ROUTES.overview, label: 'Overview', end: true },
    { to: SDK_PAYMENT_ROUTES.history, label: 'All payments' },
  ] }] };
  const nav = navigationSections(scopeNavigation([app, sdk], '/backoffice')).flatMap(section => section.items);
  assert.equal(navigationTrail('/backoffice/payments', nav).at(-1).label, 'Application payments');
  assert.equal(navigationTrail('/backoffice/cloudgate/payments', nav).at(-1).label, 'Overview');
  assert.equal(navigationTrail('/backoffice/cloudgate/payments/list', nav).at(-1).label, 'All payments');
  const routes = [{ path: '/backoffice', children: [
    { path: 'payments', id: 'application' },
    { path: SDK_PAYMENT_ROUTES.overview.slice(1), id: 'sdk' },
  ] }];
  assert.equal(matchRoutes(routes, '/backoffice/payments').at(-1).route.id, 'application');
  assert.equal(matchRoutes(routes, '/backoffice/cloudgate/payments').at(-1).route.id, 'sdk');
});

test('legacy SDK payment bookmarks survive without taking over app-owned payments', () => {
  assert.equal(legacyPaymentRedirects(['/accounts']).length, 3);
  for (const appPath of ['/payments', '/payments/', '/payments/:id', '/payments?status=open', '/Payments/*']) {
    assert.deepEqual(legacyPaymentRedirects([appPath]), []);
  }
  assert.equal(legacyPaymentRedirects(['/payment-tickets', '/payments-summary']).length, 3);
});

test('conflicting built-in routes fail clearly instead of depending on registration order', () => {
  const sdk = ['/users', '/account/settings', '/widgets/*', ...Object.values(SDK_PAYMENT_ROUTES)];
  for (const path of ['/users', '/users/', '/Users', '/users/*', '/widgets/table', '/cloudgate/payments']) {
    assert.throws(() => assertNoPlatformRouteConflicts([path], sdk), /conflicts with the built-in Cloudgate route/);
  }
  assert.doesNotThrow(() => assertNoPlatformRouteConflicts(['/payments', '/users-custom', '/customers/:id', '/', '/*'], sdk));
  assert.deepEqual(collectRoutePaths([{ children: [{ path: 'account', children: [{ path: 'settings' }] }] }]), ['/account', '/account/settings']);
});

test('canonical and legacy payment pages retain their existing grants', () => {
  for (const [route, grant] of [
    [SDK_PAYMENT_ROUTES.overview, P.PaymentsView], [SDK_PAYMENT_ROUTES.history, P.PaymentsHistory],
    [SDK_PAYMENT_ROUTES.test, P.PaymentsTestView], ['/payments', P.PaymentsView], ['/payments/list', P.PaymentsHistory], ['/payments/test', P.PaymentsTestView],
  ]) assert.equal(permissionForBackofficePath(route), grant);
});
