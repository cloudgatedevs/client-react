import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutWithReturnUrl } from '../src/platform/checkout-navigation.js';

const checkout = 'https://checkout.example.test/pay/openpay/sandbox/' + 'a'.repeat(32);
test('OpenPay checkout links return to the app page without leaking transient URL parameters', () => {
  const url = new URL(checkoutWithReturnUrl(checkout, 'http://localhost:3000/account/wallet?code=private#secret'));
  assert.equal(url.searchParams.get('returnTo'), 'http://localhost:3000/account/wallet');
  assert.equal(url.pathname, new URL(checkout).pathname);
});
test('invalid return targets and other payment providers are left unchanged', () => {
  for (const target of ['javascript:alert(1)', 'http://remote.example.test/', 'https://user:secret@example.test/', checkout, undefined]) {
    assert.equal(checkoutWithReturnUrl(checkout, target), checkout);
  }
  assert.equal(checkoutWithReturnUrl('https://checkout.stripe.com/pay/test', 'https://app.example.test/'), 'https://checkout.stripe.com/pay/test');
  assert.equal(checkoutWithReturnUrl(null, 'https://app.example.test/'), null);
});
