import assert from 'node:assert/strict';
import test from 'node:test';
import { createUserWalletClient, walletAmount, walletAccountNumber } from '../src/platform/wallet.js';

test('in-app connection requires a six-digit PIN and strips caller-selected identities', async () => {
  const calls = [];
  const wallet = createUserWalletClient({ request: async (path, options) => { calls.push([path, options.body]); return { linked: true, production: false, accountNumber: '3287272359041533' }; } });
  for (const pin of ['123456', '012345']) await wallet.link({ verificationToken: 'proof', code: '123456', pin, accountId: 'injected', userId: 99 });
  assert.equal(calls.length, 2); assert.equal(calls[0][1].createWallet, false); assert.equal(calls[0][1].accountId, undefined);
  assert.equal(calls[1][1].pin, '012345');
  for (const pin of ['12345', '1234567', '123456789012', '1234567890123', '12345a', '１２３４５６', '123456\n', 123456, null]) {
    await assert.rejects(wallet.link({ verificationToken: 'proof', code: '123456', pin }));
    await assert.rejects(wallet.unlock({ verificationToken: 'proof', code: '123456', pin }));
    await assert.rejects(wallet.authorize({ spendingToken: 'ticket', operationId: '76019e19-7607-46e3-b1b5-1a447d46ffda', authorizationDigest: 'a'.repeat(64), pin }));
  }
  await assert.rejects(wallet.link({ verificationToken: 'proof', code: '123456', pin: '123456', createWallet: true, confirmPin: '654321' }));
  assert.equal(calls.length, 2);
});

test('disconnect targets only the signed-in app user and selected environment', async () => {
  const calls = [];
  const wallet = createUserWalletClient({ request: async (...args) => { calls.push(args); return { linked: false, production: true }; } });
  assert.equal((await wallet.disconnect({ environment: 'prod', accountId: 'other', userId: 123, tenantId: 456 })).linked, false);
  assert.equal(calls[0][0], 'wallet/disconnect');
  assert.deepEqual(calls[0][1].body, { environment: 'prod' });
});
test('disconnect rejects a stale connection or a response from another environment', async () => {
  const linked = { linked: true, production: false, accountNumber: '3287272359041533' };
  const wallet = createUserWalletClient({ request: async () => linked });
  await assert.rejects(wallet.disconnect(), /connection changed/);
  await assert.rejects(wallet.disconnect({ environment: 'prod' }), /different environment/);
});

test('wallet reads are scoped to the signed in user and do not send caller supplied account identifiers', async () => {
  const calls = [];
  const wallet = createUserWalletClient({ environment: 'sbx', request: async (...args) => { calls.push(args); return { linked: false, production: false }; } });
  await wallet.get({ accountId: 'other', userId: 99, tenantId: 88 });
  assert.deepEqual(calls, [['wallet/status', { body: { environment: 'sbx' } }]]);
});
test('connect uses a redirect handshake without accepting login credentials', async () => {
  const calls = [];
  const wallet = createUserWalletClient({ request: async (...args) => { calls.push(args); return { production: false, authorizationUrl: 'https://wallet.example/connect?request=1', state: 'a'.repeat(64), connectionTicket: 'protected', expiresAtUtc: new Date(Date.now()+600000).toISOString() }; } });
  const start = await wallet.startConnect({ returnUri: 'https://app.example/account/wallet', pin: 'ignored', phoneNumber: 'ignored', environment: 'sbx' });
  assert.ok(start.authorizationUrl);
  assert.deepEqual(calls[0][1].body, { returnUri: 'https://app.example/account/wallet', environment: 'sbx' });
  assert.equal(typeof wallet.link, 'function'); assert.equal(typeof wallet.sendCode, 'function');
  assert.equal(wallet.manage, undefined);
  await assert.rejects(wallet.startConnect({ returnUri: 'javascript:alert(1)' }));
});
test('balance preserves reserved and pending amounts and never invents zero on malformed responses', async () => {
  const value = { accountNumber: '0123456789012345', production: false, available: 89, reserved: 10, pending: 2, restricted: 0, pendingChange: 1 };
  assert.equal(await createUserWalletClient({ request: async () => value }).balance(), value);
  for (const bad of [{}, { ...value, available: undefined }, { ...value, reserved: null }])
    await assert.rejects(createUserWalletClient({ request: async () => bad }).balance());
});
test('invalid environment and invalid code are rejected before any request', async () => {
  const wallet = createUserWalletClient({ request: async () => { assert.fail('unexpected request'); } });
  await assert.rejects(wallet.get({ environment: 'qa' }));
  await assert.rejects(wallet.completeConnect({ connectionTicket: 'proof', code: '123', state: 'a'.repeat(64) }));
});

test('receive numbers stay strings, accept QR payloads, and validate checksum and amount precision', () => {
  assert.equal(walletAccountNumber('xcap-wallet:v1:3287 2723 5904 1533'), '3287272359041533');
  assert.throws(() => walletAccountNumber('3287272359041534'));
  assert.throws(() => walletAccountNumber('973ce964e0664cb38542ae9b512df72b'));
  assert.equal(walletAmount('10.000001'), '10.000001');
  for (const value of ['0', '-1', '1e5', '1.0000001', '999999999999.999999', Infinity]) assert.throws(() => walletAmount(value));
  assert.throws(() => walletAmount('1.001', 2));
});

test('holdings and history validate pages and never send user or account identifiers', async () => {
  const calls = [], accountNumber = '3287272359041533';
  const wallet = createUserWalletClient({ request: async (...args) => { calls.push(args); return { production: false, accountNumber, totalCount: 0, items: [] }; } });
  assert.equal((await wallet.holdings({ accountId: 'other', userId: 99, skip: 10, take: 5 })).totalCount, 0);
  assert.deepEqual(calls[0], ['wallet/holdings', { body: { skip: 10, take: 5, environment: 'sbx' } }]);
  await wallet.transactions(); await assert.rejects(wallet.holdings({ take: 1000 }));
  const wrong = createUserWalletClient({ request: async () => ({ production: true, accountNumber, totalCount: 0, items: [] }) });
  await assert.rejects(wrong.transactions());
});

test('transfer calls preserve the request ID and require PIN authorization separately', async () => {
  const calls = [], requestId = 'd426ed11-07c7-4328-ae63-2628dc0515f2', operationId = '76019e19-7607-46e3-b1b5-1a447d46ffda';
  const result = { production: false, accountNumber: '3287272359041533', operation: { id: operationId, status: 0, kind: 1, amount: 10, fee: 0, recipientAccountNumber: '9999999999999995', authorizationDigest: 'a'.repeat(64), expiresAtUtc: new Date(Date.now() + 600000).toISOString() } };
  const wallet = createUserWalletClient({ request: async (...args) => { calls.push(args); return result; } });
  await wallet.prepareSend({ spendingToken: 'ticket', recipientAccountNumber: '9999 9999 9999 9995', amount: '10', requestId, pin: 'secret', accountId: 'other' });
  assert.equal(calls[0][1].body.requestId, requestId); assert.equal(calls[0][1].body.recipientAccountNumber, '9999999999999995');
  assert.equal(calls[0][1].body.pin, undefined); assert.equal(calls[0][1].body.accountId, undefined);
  await assert.rejects(wallet.authorize({ spendingToken: 'ticket', operationId, authorizationDigest: 'a'.repeat(64), pin: '123' }));
  await wallet.authorize({ spendingToken: 'ticket', operationId, authorizationDigest: 'a'.repeat(64), pin: '123456' });
  assert.equal(calls[1][0], 'wallet/authorize'); assert.equal(calls[1][1].body.pin, '123456');
});

test('top-up ignores caller account numbers and rejects unsafe checkout URLs', async () => {
  const calls = [], requestId = 'd426ed11-07c7-4328-ae63-2628dc0515f2';
  const result = { production: false, accountNumber: '3287272359041533', invoiceId: requestId, amount: 10, status: 0, paymentUrl: 'https://checkout.example.test/pay/test' };
  const wallet = createUserWalletClient({ request: async (...args) => { calls.push(args); return result; } });
  await wallet.topup({ requestId, amount: '10.00', accountId: 'other' }); assert.equal(calls[0][1].body.accountId, undefined);
  for (const paymentUrl of ['javascript:alert(1)', 'http://evil.test/pay', 'https://user:secret@example.test/pay']) {
    result.paymentUrl = paymentUrl; await assert.rejects(wallet.topup({ requestId, amount: '10' }));
  }
});

test('invoice payment resolves a tenant invoice by SDK payment id and prepares it with the spending token', async () => {
  const calls = [];
  const digest = 'b'.repeat(64), opId = '5a2b7c9d-1e2f-4a3b-8c4d-5e6f7a8b9c0d', requestId = '6a2b7c9d-1e2f-4a3b-8c4d-5e6f7a8b9c0d';
  const wallet = createUserWalletClient({ environment: 'sbx', request: async (path, options) => {
    calls.push([path, options.body]);
    if (path === 'wallet/invoice') return { production: false, paymentId: 42, invoiceId: opId, checkoutToken: 'c'.repeat(32), amount: 25, currency: 'ZAR', description: 'Order 9', paid: false, canPay: true, status: 0 };
    if (path === 'wallet/pay-invoice') return { production: false, accountNumber: '3287272359041533', operation: { id: opId, status: 0, amount: 25, fee: 0, authorizationDigest: digest, kind: 'Invoice' } };
    assert.fail('unexpected ' + path);
  } });
  const invoice = await wallet.invoice({ paymentId: 42 });
  assert.equal(invoice.amount, 25); assert.deepEqual(calls[0], ['wallet/invoice', { paymentId: 42, environment: 'sbx' }]);
  const prepared = await wallet.payInvoice({ spendingToken: 'ticket', paymentId: 42, requestId });
  assert.equal(prepared.operation.id, opId); // no recipientAccountNumber on an invoice operation is fine
  assert.deepEqual(calls[1], ['wallet/pay-invoice', { spendingToken: 'ticket', environment: 'sbx', paymentId: 42, requestId }]);
  await assert.rejects(wallet.payInvoice({ spendingToken: 'ticket', paymentId: 0, requestId }), /invoice/);
  await assert.rejects(wallet.payInvoice({ paymentId: 42, requestId }), /Unlock/);
});

test('invoice preview rejects a different payment, environment or incomplete payment state', async () => {
  const valid = { production: false, paymentId: 42, invoiceId: '76019e19-7607-46e3-b1b5-1a447d46ffda', amount: 25, currency: 'ZAR', description: 'Goods', paid: false, canPay: true, status: 0 };
  for (const change of [{ paymentId: 43 }, { production: true }, { invoiceId: null }, { canPay: undefined }, { status: 999 }]) {
    const wallet = createUserWalletClient({ request: async () => ({ ...valid, ...change }), environment: 'sbx' });
    await assert.rejects(wallet.invoice({ paymentId: 42 }));
  }
});
