import assert from 'node:assert/strict';
import test from 'node:test';
import { createPaymentsClient, safePaymentUrl } from '../src/platform/payments.js';
import { amountInMinorUnits, walletAccountNumber } from '../src/react/pages/paymentDisplay.js';

const status = { ready: true, provider: 'StripeConnect', status: 'Active', chargesEnabled: true, payoutsEnabled: false, production: true };
test('payments uses the native IdP endpoint with tenant environment without a controller', async () => {
  const calls = [];
  const client = createPaymentsClient({ environment: 'PROD', request: async (...args) => { calls.push(args); return status; } });
  assert.equal(await client.status(), status);
  assert.deepEqual(calls, [['admin/payments/status', { body: { environment: 'prod' } }]]);
});
test('payments rejects missing or invalid scope without sending a request', async () => {
  let calls = 0;
  for (const environment of ['invalid'])
    await assert.rejects(createPaymentsClient({ environment, request: async () => { calls++; } }).status(), /Payments needs/);
  assert.equal(calls, 0);
});
test('payments preserves setup-required status and surfaces API errors without a workflow fallback', async () => {
  const missing = { ...status, ready: false, provider: 'None', status: 'Missing', chargesEnabled: false, production: false };
  assert.equal(await createPaymentsClient({ request: async () => missing }).status(), missing);
  const failure = new Error('No application uses that controller path in this environment.');
  await assert.rejects(createPaymentsClient({ request: async () => { throw failure; } }).status(), error => error === failure);
});
test('payments does not show readiness from a malformed response', async () => {
  for (const value of [null, {}, { ready: true }, { ...status, payoutsEnabled: 'false' }])
    await assert.rejects(createPaymentsClient({ request: async () => value }).status(), /invalid Wallet status/);
});

test('readiness rejects the wrong environment and preserves coming-soon and request cancellation', async () => {
  const signal = new AbortController().signal;
  const calls = [];
  const result = { ...status, ready: false, comingSoon: true };
  const client = createPaymentsClient({ request: async (...args) => { calls.push(args); return result; } });
  await assert.rejects(client.status({ environment: 'sbx' }), /different environment/);
  assert.equal(await client.status({ environment: 'production' }, { signal }), result);
  assert.equal(calls[1][1].signal, signal);
});

test('payment history sends environment, paging and status through the native IdP API', async () => {
  const calls = [];
  const client = createPaymentsClient({ request: async (...args) => { calls.push(args); return { items: [], totalCount: 0 }; } });
  await client.list({ environment: 'PROD', skip: 25, status: 1 });
  assert.deepEqual(calls, [['admin/payments/history', { body: { environment: 'prod', skip: 25, take: 25, status: 1 } }]]);
  for (const input of [{ take: 101 }, { skip: -1 }, { status: 9 }, { environment: 'other' }]) await assert.rejects(client.list(input));
  assert.equal(calls.length, 1);
});

const testPayment = { amount: 1234, currency: 'USD', description: ' Test order ', reference: 'ORDER-1', idempotencyKey: '11111111-2222-3333-4444-555555555555', returnUrl: 'https://app.example/payments/test' };
test('test checkout forces sandbox even in a production app and retains the retry key', async () => {
  const calls = [];
  const client = createPaymentsClient({ environment: 'prod', request: async (...args) => { calls.push(args); return { id: 1, isProduction: false, paymentUrl: 'https://checkout.stripe.com/test' }; } });
  await client.createTest({ ...testPayment, environment: 'prod', isProduction: true });
  await client.createTest(testPayment);
  assert.equal(calls[0][0], 'admin/payments/test-checkout');
  assert.equal(calls[0][1].body.environment, 'sbx');
  assert.equal(calls[0][1].body.description, 'Test order');
  assert.equal(calls[0][1].body.currency, 'usd');
  assert.equal(calls[0][1].body.isProduction, undefined);
  assert.deepEqual(calls[0], calls[1]);
});
test('test checkout rejects invalid amounts, unsafe redirects and production responses', async () => {
  let calls = 0;
  const client = createPaymentsClient({ request: async () => { calls++; return { id: 1, isProduction: true, paymentUrl: 'https://checkout.stripe.com/live' }; } });
  for (const overrides of [{ amount: 1.2 }, { amount: 0 }, { currency: 'US' }, { description: ' ' }, { idempotencyKey: '' }, { returnUrl: 'javascript:alert(1)' }]) await assert.rejects(client.createTest({ ...testPayment, ...overrides }));
  assert.equal(calls, 0);
  await assert.rejects(client.createTest(testPayment), /invalid sandbox checkout/);
});
test('test amounts convert to minor units without rounding or decimal loss', () => {
  assert.equal(amountInMinorUnits('0.29', 'USD'), 29);
  assert.equal(amountInMinorUnits('12', 'JPY'), 12);
  assert.equal(amountInMinorUnits('1.234', 'BHD'), 1234);
  for (const value of ['0', '-1', '1e3', '1.001', 'NaN', '99999999999999999999']) assert.throws(() => amountInMinorUnits(value, 'USD'));
});

test('invoice reads retain tenant API scope and reject different payment or environment responses', async () => {
  const calls = [];
  let invoice = { id: 24, isProduction: false, receivingAccountNumber: '0123456789012345' };
  const client = createPaymentsClient({ request: async (...args) => { calls.push(args); return invoice; } });
  assert.equal(await client.get({ paymentId: 24, environment: 'sandbox' }), invoice);
  assert.deepEqual(calls, [['admin/payments/invoice', { body: { environment: 'sandbox', paymentId: 24 } }]]);
  for (const paymentId of [0, -1, 1.5, '24', Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(client.get({ paymentId }));
  assert.equal(calls.length, 1);
  invoice = { ...invoice, id: 25 };
  await assert.rejects(client.get({ paymentId: 24 }), /different payment/);
  invoice = { ...invoice, id: 24, isProduction: true };
  await assert.rejects(client.get({ paymentId: 24 }), /different payment/);
  assert.equal(await client.get({ paymentId: 24, environment: 'prod' }), invoice);
});

test('checkout permits HTTP only for a sandbox payment opened from a local app', async () => {
  const url = 'http://localhost:5173/pay/openpay/sandbox/invoice';
  const appUrl = 'http://localhost:3001/backoffice/cloudgate/payments/test';
  assert.equal(safePaymentUrl(url, { isProduction: false, appUrl }), url);
  assert.equal(safePaymentUrl(url, { isProduction: true, appUrl }), null);
  assert.equal(safePaymentUrl(url, { isProduction: false, appUrl: 'https://app.example' }), null);
  for (const unsafe of ['javascript:alert(1)', 'http://checkout.example/test', 'https://user:secret@checkout.example/test', '//checkout.example/test'])
    assert.equal(safePaymentUrl(unsafe, { isProduction: false, appUrl }), null);
  assert.equal(safePaymentUrl('https://checkout.example/test'), 'https://checkout.example/test');
  const client = createPaymentsClient({ request: async () => ({ id: 24, isProduction: false, paymentUrl: url }) });
  assert.equal((await client.createTest({ ...testPayment, returnUrl: appUrl })).paymentUrl, url);
  await assert.rejects(client.createTest(testPayment), /invalid sandbox checkout/);
});

test('account display preserves leading zeroes and never displays GUIDs as account numbers', () => {
  assert.equal(walletAccountNumber('0123456789012345'), '0123 4567 8901 2345');
  for (const value of [null, '', '7c6804d09b0441a3b0dd62ed0c698b92', '123456789012345', 1234567890123456])
    assert.equal(walletAccountNumber(value), null);
});
