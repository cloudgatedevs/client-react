import test from 'node:test';
import assert from 'node:assert/strict';
import { describeWatchElement, rankWorkflows, watchWords } from '../src/platform/agent-watch.js';
import { createAgentsClient } from '../src/platform/agents.js';

const element = ({ tag = 'div', text = '', heading, ...attributes }) => ({
  tagName: tag.toUpperCase(), textContent: text,
  getAttribute: name => attributes[name] ?? null,
  querySelector: () => heading ? { textContent: heading } : null,
});

test('undeclared elements are described as an action or data with a usable label', () => {
  assert.deepEqual(describeWatchElement(element({ tag: 'button', text: '  Create   deposit ' })), { kind: 'action', label: 'Create deposit' });
  assert.deepEqual(describeWatchElement(element({ tag: 'a', class: 'btn-primary', text: 'New payout' })), { kind: 'action', label: 'New payout' });
  assert.deepEqual(describeWatchElement(element({ tag: 'form', 'aria-label': 'Invite user' })), { kind: 'action', label: 'Invite user' });
  assert.deepEqual(describeWatchElement(element({ tag: 'section', class: 'cgw-table', 'aria-label': 'Transactions', text: 'lots of rows' })), { kind: 'data', label: 'Transactions' });
  assert.deepEqual(describeWatchElement(element({ tag: 'section', class: 'admin-dashboard-panel', heading: 'Compliance', text: 'Compliance Risk cases 6' })), { kind: 'data', label: 'Compliance' });
  // A tile is a link, but it shows data: it is not an action.
  assert.equal(describeWatchElement(element({ tag: 'a', class: 'admin-dashboard-metric-tile', text: 'Pending KYC 811' })).kind, 'data');
  assert.equal(describeWatchElement(element({ tag: 'a', text: 'Plain link' })).kind, 'data');
  assert.equal(describeWatchElement(element({ text: 'x'.repeat(200) })).label.length, 60);
  assert.deepEqual(describeWatchElement(null), { kind: 'data', label: 'this item' });
  const tile = element({ tag: 'a', class: 'metric-tile', text: 'New customers744 56.0%' }); tile.innerText = 'New customers\n744\n56.0%';
  assert.equal(describeWatchElement(tile).label, 'New customers', 'a tile is named by its first line, not its numbers');
});

test('labels, routes and names reduce to comparable words', () => {
  assert.deepEqual(watchWords('Pending KYC cases'), ['pending', 'kyc', 'case']);
  assert.deepEqual(watchWords('admin-reads/kycCases/list'), ['admin', 'read', 'kyc', 'case', 'list']);
  assert.deepEqual(watchWords('Open the Policies of a Class'), ['policy', 'class']);
  assert.deepEqual(watchWords(''), []);
});

const workflows = [
  { endpointId: 'tx-list', name: 'Browser list transactions', route: 'admin-reads/transactions', method: 'GET' },
  { endpointId: 'kyc-list', name: 'Browser list KYC cases', route: 'admin-reads/kyc-cases', method: 'GET' },
  { endpointId: 'dep-create', name: 'Create deposit', route: 'admin-writes/deposits/create', method: 'POST' },
  { endpointId: 'dep-list', name: 'Browser list deposits', route: 'admin-reads/deposits', method: 'GET' },
  { endpointId: 'chains', name: 'Browser list blockchains', route: 'admin-reads/blockchains', method: 'GET' },
];

test('a table is matched to the read whose name shares its label', () => {
  const ranked = rankWorkflows(workflows, { label: 'Transactions', kind: 'data' });
  assert.equal(ranked[0].endpointId, 'tx-list'); assert.equal(ranked[0].matched, true);
  assert.equal(rankWorkflows(workflows, { label: 'Pending KYC', kind: 'data' })[0].endpointId, 'kyc-list');
  assert.equal(ranked.length, workflows.length, 'every workflow stays available');
});

test('an action button prefers the write, a data element the read, for the same words', () => {
  assert.equal(rankWorkflows(workflows, { label: 'Create deposit', kind: 'action' })[0].endpointId, 'dep-create');
  assert.equal(rankWorkflows(workflows, { label: 'Deposits', kind: 'data' })[0].endpointId, 'dep-list');
  assert.equal(rankWorkflows(workflows, { label: 'Deposit', kind: 'action' })[0].endpointId, 'dep-create');
});

test('with no matching words, workflows the page called come first and nothing claims a match', () => {
  const ranked = rankWorkflows(workflows, { label: 'Overview', kind: 'data', calledIds: ['chains'] });
  assert.equal(ranked[0].endpointId, 'chains'); assert.equal(ranked[0].matched, false);
  assert.equal(rankWorkflows(workflows, { label: 'Zzz', kind: 'data' })[0].endpointId, 'tx-list', 'stable order among reads');
  // Words every workflow shares do not decide the order.
  assert.equal(rankWorkflows(workflows, { label: 'Browser list', kind: 'data', calledIds: new Set(['kyc-list']) })[0].endpointId, 'kyc-list');
  assert.deepEqual(rankWorkflows(null, {}), []);
  // For data, a workflow the page called beats a better-named one it never called; among called ones words decide.
  assert.equal(rankWorkflows(workflows, { label: 'KYC cases', kind: 'data', calledIds: ['chains'] })[0].endpointId, 'chains');
  assert.equal(rankWorkflows(workflows, { label: 'KYC cases', kind: 'data', calledIds: ['chains', 'kyc-list'] })[0].endpointId, 'kyc-list');
  // An action is not limited to what the page already called: its workflow runs only when it is pressed.
  assert.equal(rankWorkflows(workflows, { label: 'Create deposit', kind: 'action', calledIds: ['chains'] })[0].endpointId, 'dep-create');
});

test('the full workflow list is requested inside the app scope', async () => {
  const calls = [];
  await createAgentsClient({ request: async (path, options) => { calls.push({ path, body: options.body }); return {}; }, resolveAppIdentity: async () => ({ environment: 'prod' }), projectPath: 'orders' }).watchWorkflows();
  assert.deepEqual(calls, [{ path: 'agents/watch/workflows', body: { environment: 'prod', projectPath: 'orders' } }]);
});

test('a dialog button is matched on what it does and on the page it belongs to, not on the screen wording', () => {
  // The screen says "customer"; the backend says "profile". The button only says "Create".
  const app = [
    { endpointId: 'wallet-type', name: 'Browser change customer wallet type', route: 'admin-reads/customer-wallets/${profileId}/wallet-category', method: 'PUT' },
    { endpointId: 'wallets', name: 'Browser list customer wallets', route: 'admin-reads/customer-wallets', method: 'GET' },
    { endpointId: 'account-create', name: 'Create Account', route: 'accounts/profiles/${profileId}', method: 'POST' },
    { endpointId: 'profile-create', name: 'Browser create profile', route: 'admin-reads/profiles', method: 'POST' },
    { endpointId: 'profile-list', name: 'Browser list profiles', route: 'admin-reads/profiles/list', method: 'GET' },
    { endpointId: 'kyc-link', name: 'Generate KYC Link', route: 'kyc/create/${profileId}', method: 'POST' },
    { endpointId: 'profile-freeze', name: 'Browser freeze profile risk', route: 'admin-reads/risk/freeze/profile', method: 'POST' },
    // Other create workflows whose routes share the app's base path word and the page's lookups.
    { endpointId: 'bank-setting', name: 'Browser create banking provider app setting', route: 'admin-reads/backoffice/banking/provider-app-settings', method: 'POST' },
    { endpointId: 'kyc-setting', name: 'Browser create KYC provider app setting', route: 'admin-reads/backoffice/kyc/provider-app-settings', method: 'POST' },
  ];
  const context = '/profiles', routes = 'admin-reads/profiles/list admin-reads/customer-wallet-types admin-reads/backoffice/banking/provider-app-settings';
  const ranked = rankWorkflows(app, { label: 'Create · New customer', kind: 'action', calledIds: ['profile-list'], context, routes });
  assert.equal(ranked[0].endpointId, 'profile-create');
  assert.equal(ranked[0].matched, true);
  assert.ok(ranked.findIndex(w => w.endpointId === 'wallet-type') > ranked.findIndex(w => w.endpointId === 'account-create'), 'an update never outranks a create for a Create button');
  // "Add" and "Save" are verbs too.
  assert.equal(rankWorkflows(app, { label: 'Add customer', kind: 'action', context })[0].endpointId, 'profile-create');
  assert.equal(rankWorkflows(app, { label: 'Save', kind: 'action', context })[0].endpointId, 'wallet-type');
  // The page's name decides between create workflows, not the lookups the page happened to load.
  assert.equal(rankWorkflows(app, { label: 'Create', kind: 'action', context, routes })[0].endpointId, 'profile-create');
  assert.equal(rankWorkflows(app, { label: 'Create', kind: 'action', context: '/banking/providers', routes })[0].endpointId, 'bank-setting');
  // Without a verb in the label, words and context still decide.
  assert.equal(rankWorkflows(app, { label: 'Freeze', kind: 'action', context })[0].endpointId, 'profile-freeze');
});
