import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationSections, navigationTrail, filterNavigation } from '../src/react/components/navigation.js';
import { WIDGET_NAV } from '../src/react/components/widgetNavigation.js';
import { scopeNavigation } from '../src/react/routing.js';
import { permissionForBackofficePath } from '../src/react/auth/page-permissions.js';
import { BACKOFFICE_PERMISSIONS as P } from '../src/platform/backoffice-permissions.js';
import { widgets } from '../src/widgets/catalog.js';

test('widget sidebar covers the catalogue with scoped links, nested search and active breadcrumbs', () => {
  const flatten = items => items.flatMap(item => item.children ? flatten(item.children) : [item]);
  const links = flatten(WIDGET_NAV.children);
  for (const widget of widgets) {
    const item = links.find(item => item.to === `/widgets/${widget.id}`);
    assert.equal(item?.label, widget.name);
    assert.equal(item?.permission, P.WidgetsView);
  }
  const scoped = scopeNavigation([WIDGET_NAV], '/backoffice');
  assert.deepEqual(navigationTrail('/backoffice/widgets/line-chart', scoped).map(item => item.label), ['Widget library', 'Charts', 'Essentials', 'Line chart']);
  assert.deepEqual(navigationTrail('/backoffice/widgets', scoped).map(item => item.label), ['Widget library', 'Overview']);
  assert.equal(navigationTrail('/backoffice/widgets/recipes/dashboard', scoped).at(-1).label, 'Recipes');
  const found = filterNavigation(scoped, 'widget pagination');
  assert.equal(found[0].children[0].children[0].to, '/backoffice/widgets/data-table');
});

test('all widget deep links require the library grant, including recipes and unknown routes', () => {
  for (const path of ['/widgets', '/widgets/', '/widgets/data-table', '/widgets/recipes/dashboard', '/widgets/unknown'])
    assert.equal(permissionForBackofficePath(path), P.WidgetsView);
  assert.equal(permissionForBackofficePath('/widgets-custom'), P.Access);
  assert.equal(permissionForBackofficePath('/roles/'), P.RolesView);
});

const menu = [
  { to: '/', label: 'Dashboard' },
  { id: 'commerce', label: 'Commerce', children: [
    { to: '/orders', label: 'Orders' },
    { id: 'reports', label: 'Reports', children: [
      { to: '/orders/reports', label: 'Sales report', keywords: ['revenue'] },
    ] },
    { to: '/orders/:id', label: 'Order detail', end: true },
  ] },
  { id: 'admin', label: 'Administration', section: 'platform', children: [
    { to: '/users', label: 'Users' },
  ] },
];

test('Ungrouped and legacy app links precede platform controls even with matching captions', () => {
  const sections = navigationSections([menu[2], ...menu.slice(0, 2), { to: '/stock', label: 'Stock', group: 'Administration' }]);
  assert.deepEqual(sections.map(s => [s.label, s.platform]), [['Workspace', false], ['Administration', false], ['', true]]);
  assert.equal(sections[0].items[0].label, 'Dashboard');
  const originalKey = sections[0].items[1].children[0].key;
  assert.equal(navigationSections([{ to: '/new', label: 'New' }, ...menu])[0].items[2].children[0].key, originalKey);
});

test('Deep routes reveal their full module trail and choose static routes over dynamic or parent links', () => {
  assert.deepEqual(navigationTrail('/orders/reports', menu).map(i => i.label), ['Commerce', 'Reports', 'Sales report']);
  assert.deepEqual(navigationTrail('/orders/123', menu).map(i => i.label), ['Commerce', 'Order detail']);
  assert.deepEqual(navigationTrail('/orders/123/history', menu).map(i => i.label), ['Commerce', 'Orders']);
  assert.deepEqual(navigationTrail('/orders-archive', menu), []);
  assert.equal(navigationTrail('/', menu).at(-1).label, 'Dashboard');
});

test('Search finds nested pages by module and keyword without changing saved tree structure', () => {
  const matches = filterNavigation(menu, 'COMMERCE revenue');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].children.length, 1);
  assert.equal(matches[0].children[0].children[0].to, '/orders/reports');
  assert.equal(menu[1].children.length, 3);
  assert.equal(filterNavigation(menu, 'commerce')[0].children.length, 3);
  assert.deepEqual(filterNavigation(menu, 'no-such-page'), []);
});
