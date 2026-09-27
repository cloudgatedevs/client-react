import { createAppIdentityResolver } from './identity.js';

/** Wallet readiness belongs to the authenticated tenant and environment. */
export function createPaymentsClient({ request, environment = 'sbx', resolveAppIdentity = createAppIdentityResolver({ environment }) }) {
  const scopeEnvironment = async value => {
    const env = String(value ?? (await resolveAppIdentity()).environment).toLowerCase();
    if (!/^(sbx|sandbox|prod|production)$/.test(env)) throw new Error('Payments needs a sandbox or production environment.');
    return env;
  };
  return {
    async status({ environment: selectedEnvironment } = {}) {
      const value = await request('admin/payments/status', { body: { environment: await scopeEnvironment(selectedEnvironment) } });
      if (typeof value?.ready !== 'boolean' || typeof value.production !== 'boolean' ||
          typeof value.chargesEnabled !== 'boolean' || typeof value.payoutsEnabled !== 'boolean')
        throw new Error('Cloudgate returned an invalid Wallet status. Refresh and try again.');
      return value;
    },
    async list({ environment: selectedEnvironment, skip = 0, take = 25, status = null } = {}, options) {
      if (!Number.isInteger(skip) || skip < 0 || !Number.isInteger(take) || take < 1 || take > 100
          || (status != null && (!Number.isInteger(status) || status < 0 || status > 5))) throw new Error('Provide valid payment filters.');
      const value = await request('admin/payments/history', { ...options, body: { environment: await scopeEnvironment(selectedEnvironment), skip, take, status } });
      if (!Array.isArray(value?.items) || !Number.isInteger(value.totalCount) || value.totalCount < 0) throw new Error('Cloudgate returned an invalid payment list.');
      return value;
    },
    async createTest({ amount, currency, description, reference, idempotencyKey, returnUrl }, options) {
      if (!Number.isSafeInteger(amount) || amount <= 0 || !/^[a-z]{3}$/i.test(currency || '') || !String(description || '').trim()
          || String(description).length > 512 || String(reference || '').length > 256
          || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(idempotencyKey || '')) throw new Error('Provide valid test payment details.');
      const destination = new URL(returnUrl);
      if (!['https:', 'http:'].includes(destination.protocol) || destination.username || destination.password || destination.hash) throw new Error('Provide a valid app return URL.');
      const value = await request('admin/payments/test-checkout', { ...options, body: {
        environment: 'sbx', amount, currency: currency.toLowerCase(), description: description.trim(), reference: reference?.trim() || null, idempotencyKey, returnUrl: destination.href,
      } });
      if (!value?.id || value.isProduction !== false || !safePaymentUrl(value.paymentUrl)) throw new Error('Cloudgate returned an invalid sandbox checkout.');
      return value;
    },
  };
}

export function safePaymentUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
