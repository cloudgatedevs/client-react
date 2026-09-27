import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmailTemplateClient, validateEmailTemplate, EMAIL_TEMPLATE_MAX_LENGTH } from '../src/platform/email-template.js';

test('email template uses dedicated native endpoint and never sends extra settings', async () => {
  const calls = [], value = { templateEnabled: false, templateHtml: '', scope: 'tenant' };
  const client = createEmailTemplateClient({ request: async (path, options) => { calls.push({ path, ...options }); return { ...value, ...options.body, smtpPassword: 'secret' }; } });
  const signal = new AbortController().signal;
  assert.deepEqual(await client.get({ signal, method: 'POST', body: { tenantId: 3 } }), value);
  assert.equal(calls[0].method, 'GET'); assert.equal(calls[0].body, undefined); assert.equal(calls[0].signal, signal);
  const result = await client.update({ templateEnabled: true, templateHtml: '${body}', smtpPassword: 'ignored', tenantId: 3 }, { signal });
  assert.deepEqual(result, { templateEnabled: true, templateHtml: '${body}', scope: 'tenant' });
  assert.equal(calls[1].path, 'admin/email-template'); assert.equal(calls[1].method, 'PUT');
  assert.deepEqual(calls[1].body, { templateEnabled: true, templateHtml: '${body}' });
});

test('template validation matches backend and permits disabled drafts', async () => {
  let calls = 0;
  const client = createEmailTemplateClient({ request: async () => { calls++; } });
  for (const values of [{}, { templateEnabled: 'true', templateHtml: '${body}' }, { templateEnabled: true, templateHtml: '${Body}' }, { templateEnabled: true, templateHtml: '' }, { templateEnabled: false, templateHtml: 'x'.repeat(EMAIL_TEMPLATE_MAX_LENGTH + 1) }]) {
    await assert.rejects(client.update(values));
  }
  assert.equal(calls, 0);
  assert.equal(validateEmailTemplate({ templateEnabled: false, templateHtml: '' }), null);
  assert.equal(validateEmailTemplate({ templateEnabled: true, templateHtml: '${body}' }), null);
  assert.equal(validateEmailTemplate({ templateEnabled: false, templateHtml: 'x'.repeat(EMAIL_TEMPLATE_MAX_LENGTH) }), null);
});

test('invalid responses and failed writes cannot appear successful', async () => {
  for (const value of [null, {}, { templateEnabled: true, templateHtml: '' }, { templateEnabled: 'false', templateHtml: '', scope: 'tenant' }]) {
    await assert.rejects(createEmailTemplateClient({ request: async () => value }).get(), /invalid email template/);
  }
  const failure = Object.assign(new Error('Denied'), { status: 403 });
  await assert.rejects(createEmailTemplateClient({ request: async () => { throw failure; } }).update({ templateEnabled: false, templateHtml: '' }), error => error === failure);
});
