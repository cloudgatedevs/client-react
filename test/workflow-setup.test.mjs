import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflowSetupClient, workflowSetupError } from '../src/platform/workflow-setup.js';
import { createIdpClient } from '../src/platform/transport.js';

const metadata = { id: 'shop', workflows: { file: '.template/workflow-template.json', projectPath: 'shop' } };
const revision = 'a'.repeat(64);
const status = { appId: 'shop', environment: 'prod', projectPath: 'shop', status: 'missing', revision, canApply: true,
  workflows: [{ name: 'Catalog', route: 'catalog', state: 'missing' }] };
const resolveAppIdentity = async () => ({ webAppId: 'owned-app', environment: 'production' });

test('workflow checks use resolved app identity and native IdP bearer, without sending bundle paths or signing secrets', async () => {
  let sent;
  const request = createIdpClient({ apiUrl: 'https://api.test', auth: { tenancyName: 'tenant', authHeader: () => ({ Authorization: 'Bearer user' }) },
    fetchImpl: async (url, init) => { sent = { url, ...init }; return Response.json({ result: status }); } });
  const client = createWorkflowSetupClient({ request, resolveAppIdentity, projectPath: '*' });
  assert.deepEqual(await client.status({ ...metadata, webAppId: 'foreign-app', tenantId: 999, apiKey: 'secret' }), status);
  assert.equal(sent.method, 'GET'); assert.equal(sent.headers.Authorization, 'Bearer user'); assert.equal(sent.credentials, 'omit');
  assert.equal(sent.url, 'https://api.test/api/idp/tenant/developer-workspace/workflows?webAppId=owned-app&appId=shop&environment=prod&projectPath=*');
  assert.equal(sent.body, undefined); assert.ok(!sent.url.includes('.template'));
});

test('applying needs a reviewed revision and explicit confirmation; only allowed fields cross the API boundary', async () => {
  const calls = [];
  const client = createWorkflowSetupClient({ request: async (...args) => { calls.push(args); return { projectPath: 'shop', publishedWorkflowCount: 2, warnings: [] }; }, resolveAppIdentity, projectPath: 'shop' });
  for (const input of [undefined, {}, { revision }, { revision: 'bad', confirmOverwrite: true }, { revision, confirmOverwrite: 'yes' }])
    await assert.rejects(client.apply(metadata, input), /Review and confirm/);
  assert.deepEqual(calls, []);
  await client.apply(metadata, { revision, confirmOverwrite: true, webAppId: 'foreign', environment: 'sbx', bundle: 'untrusted' });
  assert.equal(calls[0][0], 'developer-workspace/workflows');
  assert.deepEqual(calls[0][1].body, { webAppId: 'owned-app', appId: 'shop', environment: 'prod', projectPath: 'shop', revision, confirmOverwrite: true });
  assert.equal(calls[0][1].timeoutMs, 120000); assert.equal(calls[0][1].method, 'POST');
});

test('failed or unavailable checks are never reported as missing workflows', async () => {
  for (const error of [Object.assign(new Error('Network down'), { code: 'network' }), Object.assign(new Error('Denied'), { status: 403 }), Object.assign(new Error('Missing API'), { status: 404 })]) {
    const client = createWorkflowSetupClient({ request: async () => { throw error; }, resolveAppIdentity });
    await assert.rejects(client.status(metadata), actual => actual === error);
    assert.ok(!workflowSetupError(error).includes('Import workflows'));
  }
  assert.match(workflowSetupError({ status: 403 }), /Profile/);
  assert.match(workflowSetupError({ status: 404 }), /Update and restart/);
});

test('malformed or wrong-scope server responses cannot enable import actions', async () => {
  for (const value of [null, {}, { ...status, workflows: null }, { ...status, appId: 'other' }, { ...status, environment: 'sbx' },
    { ...status, revision: '' }, { ...status, workflows: [{ route: 'catalog', state: 'unknown' }] }]) {
    const client = createWorkflowSetupClient({ request: async () => value, resolveAppIdentity });
    await assert.rejects(client.status(metadata), /invalid workflow status/);
  }
});

test('apps without a package and invalid identity are rejected before a request', async () => {
  const client = createWorkflowSetupClient({ request: () => assert.fail('Must not request'), resolveAppIdentity });
  for (const value of [{}, { id: 'shop' }, { ...metadata, id: '../other' }]) await assert.rejects(client.status(value), /metadata/);
  const unscoped = createWorkflowSetupClient({ request: () => assert.fail('Must not request'), resolveAppIdentity: async () => ({}) });
  await assert.rejects(unscoped.status(metadata), /identity and environment/);
});
