import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudgatePlatform, createWorkflowLogsClient, WorkflowLogsError } from '../src/platform/index.js';

const webAppId = '12345678-1234-1234-1234-123456789abc';
function fixture(projectPath, environment = 'sbx') {
  const calls = [];
  const logs = createWorkflowLogsClient({ projectPath,
    resolveAppIdentity: async () => ({ webAppId, environment }),
    request: async (route, options) => { calls.push({ route, ...options }); return { items: [] }; },
  });
  return { logs, calls };
}

test('fresh templates load all accessible controllers without a project environment value', async () => {
  for (const projectPath of [undefined, null, '', '   ', '*']) {
    const { logs, calls } = fixture(projectPath);
    assert.equal(logs.scope.configured, true);
    await logs.summary(168);
    await logs.list({ skip: 50, take: 50, idpUserId: 7 });
    await logs.get('123');
    assert.deepEqual(await logs.nodes('456'), []);
    assert.deepEqual(calls.map(call => call.route), ['summary', 'list', 'get', 'nodes'].map(action => `admin/workflow-logs/${action}`));
    assert.ok(calls.every(call => call.body.projectPath === '*' && call.body.environment === 'sbx'));
    assert.equal(calls[0].body.periodHours, 168);
    assert.equal(calls[1].body.idpUserId, 7);
    assert.equal(calls[2].body.id, '123');
    assert.equal(calls[3].body.sessionId, '456');
  }
});

test('an explicit controller remains pinned and cannot be overridden by list filters', async () => {
  const { logs, calls } = fixture(' /orders/ ', 'prod');
  const controller = new AbortController();
  await logs.list({ projectPath: '*', environment: 'sbx', route: 'list', search: 'ava@example.test', skip: 50, take: 50, outcome: 'error', signal: controller.signal });
  assert.equal(logs.scope.projectPath, 'orders');
  assert.equal(logs.scope.isProduction, true);
  assert.deepEqual(calls[0].body, { projectPath: 'orders', environment: 'prod', route: 'list', search: 'ava@example.test', skip: 50, take: 50, outcome: 'error' });
  assert.equal(calls[0].signal, controller.signal);
});

test('invalid explicit paths cannot silently widen the log scope', async () => {
  for (const projectPath of ['/', ' /// ']) {
    const { logs, calls } = fixture(projectPath);
    assert.equal(logs.scope.configured, false);
    await assert.rejects(logs.summary(), error => error instanceof WorkflowLogsError && error.code === 'configuration');
    assert.deepEqual(calls, []);
    const platform = createCloudgatePlatform({ projectPath });
    assert.equal(platform.logs.scope.configured, false);
    await assert.rejects(platform.logs.summary(), error => error.code === 'configuration');
  }
  const calls = [];
  const logs = createWorkflowLogsClient({ projectPath: 'missing',
    resolveAppIdentity: async () => ({ webAppId, environment: 'sbx' }),
    request: async (_, { body }) => { calls.push(body); throw { message: 'Controller not found.', status: 404, code: 'not-installed' }; },
  });
  await assert.rejects(logs.summary(), error => error.status === 404 && error.code === 'not-installed');
  assert.deepEqual(calls, [{ periodHours: 24, projectPath: 'missing', environment: 'sbx' }]);
});

test('release metadata chooses the log environment while requests retain the configured tenant and IdP bearer', async () => {
  const calls = [];
  const platform = createCloudgatePlatform({ apiUrl: 'https://api.example.invalid', tenancyName: 'app tenant', environment: 'sbx',
    resolvePublishedApp: async () => ({ webAppId, isProduction: true }),
    auth: { tenancyName: 'app tenant', authHeader: () => ({ Authorization: 'Bearer idp-session' }), ensureAccessToken: async () => {} },
    fetch: async (url, options) => { calls.push({ url, ...options, body: JSON.parse(options.body) }); return Response.json({ items: [], totalCount: 0 }); },
  });
  await platform.logs.summary();
  await platform.logs.list();
  assert.equal(platform.config.projectPath, '', 'The optional developer-workspace focus stays empty.');
  assert.equal(platform.logs.scope.isProduction, true);
  for (const call of calls) {
    assert.ok(call.url.startsWith('https://api.example.invalid/api/idp/app%20tenant/admin/workflow-logs/'));
    assert.equal(call.headers.Authorization, 'Bearer idp-session');
    assert.equal(call.headers['x-authentication-signature'], undefined);
    assert.equal(call.body.environment, 'prod');
    assert.equal(call.body.projectPath, '*');
  }
});

test('permission failures remain failures instead of becoming empty or unscoped logs', async () => {
  let count = 0;
  const logs = createWorkflowLogsClient({ resolveAppIdentity: async () => ({ webAppId, environment: 'sbx' }),
    request: async () => { count++; throw { message: 'Logs access required.', status: 403, code: 'forbidden' }; },
  });
  await assert.rejects(logs.list(), error => error instanceof WorkflowLogsError && error.status === 403 && error.code === 'forbidden');
  assert.equal(count, 1);
});
