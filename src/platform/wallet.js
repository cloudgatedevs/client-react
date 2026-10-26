import { safeWalletUrl } from './wallet-connect.js';
import { readWalletSettings } from './wallet-settings.js';
import { createAppIdentityResolver } from './identity.js';

const guid = value => typeof value === 'string' && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value) && !/^0{8}-(?:0{4}-){3}0{12}$/.test(value);
const validPin = value => typeof value === 'string' && value.length === 6 && /^[0-9]{6}$/.test(value);
export function walletAccountNumber(value) {
  const number = String(value ?? '').trim().replace(/^xcap-wallet:v1:/i, '').replace(/\s/g, '');
  let sum = 0;
  for (let i = 0; i < number.length; i++) { let digit = Number(number[i]); if (i % 2 === 0) { digit *= 2; if (digit > 9) digit -= 9; } sum += digit; }
  if (!/^[1-9]\d{15}$/.test(number) || sum % 10 !== 0) throw new Error('Enter a valid 16-digit wallet account number.');
  return number;
}
export function walletAmount(value, decimals = 6) {
  const text = String(value ?? '').trim();
  if (!new RegExp(`^(?:0|[1-9]\\d{0,11})(?:\\.\\d{1,${decimals}})?$`).test(text) || Number(text) <= 0 || Number(text) >= 1e12)
    throw new Error(`Enter a positive amount with up to ${decimals} decimal places.`);
  const canonical = text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  if (String(Number(text)) !== canonical && Number(text) >= .000001) throw new Error('This amount has too many significant digits.');
  return text;
}
function spending(input) {
  if (typeof input.spendingToken !== 'string' || !input.spendingToken || input.spendingToken.length > 4096) throw new Error('Unlock your wallet to continue.');
  return { spendingToken: input.spendingToken, environment: input.environment };
}

/** The current IdpUser's own wallet, independently of the tenant's merchant wallet. */
export function createUserWalletClient({ request, environment = 'sbx', resolveAppIdentity = createAppIdentityResolver({ environment }) }) {
  async function call(action, input = {}, options) {
    const env = String(input.environment ?? (await resolveAppIdentity()).environment).toLowerCase();
    if (!/^(sbx|sandbox|prod|production)$/.test(env)) throw new Error('Choose a sandbox or production wallet.');
    const value = await request(`wallet/${action}`, { ...options, body: { ...input, environment: env } });
    if (value?.production !== /^prod/.test(env)) throw new Error('The wallet response belongs to a different environment.');
    return value;
  }
  const status = value => {
    if (typeof value?.linked !== 'boolean' || typeof value.production !== 'boolean' || (value.linked && !/^\d{16}$/.test(value.accountNumber)))
      throw new Error('Could not read your linked wallet. Please refresh.');
    return value;
  };
  const scoped = value => {
    if (!/^\d{16}$/.test(value?.accountNumber)) throw new Error('The wallet account could not be verified.');
    return value;
  };
  async function page(action, input = {}, options) {
    const skip = input.skip ?? 0, take = input.take ?? 10;
    if (!Number.isInteger(skip) || skip < 0 || !Number.isInteger(take) || take < 1 || take > 100) throw new Error('Choose a page size between 1 and 100.');
    const value = scoped(await call(action, { skip, take, environment: input.environment }, options));
    if (!Number.isInteger(value.totalCount) || value.totalCount < 0 || !Array.isArray(value.items) || value.items.length > take ||
        !value.items.every(item => guid(item.id) && Number.isFinite(item.amount) && item.amount >= 0 &&
          (action === 'holdings' ? ['available', 'reserved', 'pending', 'restricted'].includes(item.status) :
            ['in', 'out'].includes(item.direction) && Number.isInteger(item.status) && item.status >= 0 && item.status <= 6 && Number.isFinite(item.fee))))
      throw new Error('Your wallet records are temporarily unavailable.');
    return value;
  }
  const operation = value => {
    scoped(value);
    const op = value.operation;
    if (op !== null && (!op || !guid(op.id) || !Number.isInteger(op.status) || op.status < 0 || op.status > 6 ||
        !Number.isFinite(op.amount) || op.amount <= 0 || !Number.isFinite(op.fee) || op.fee < 0 ||
        (op.recipientAccountNumber != null && !/^\d{16}$/.test(op.recipientAccountNumber)) || (op.status === 0 && !/^[a-f0-9]{64}$/i.test(op.authorizationDigest || ''))))
      throw new Error('Could not verify the transfer. Check its status before trying again.');
    return value;
  };
  const topup = value => {
    scoped(value); let url;
    try { url = new URL(value.paymentUrl); } catch { throw new Error('The checkout address is unavailable.'); }
    if (!guid(value.invoiceId) || !Number.isFinite(value.amount) || value.amount <= 0 || url.username || url.password ||
        (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new Error('The top-up checkout could not be verified.');
    return value;
  };
  async function configuration(action, input = {}, options) {
    const env = String(input.environment ?? (await resolveAppIdentity()).environment).toLowerCase();
    if (!/^(sbx|sandbox|prod|production)$/.test(env)) throw new Error('Choose a sandbox or production environment.');
    const body = { environment: env };
    if (action === 'update') {
      const country = String(input.countryCode ?? '').trim().toUpperCase();
      if (typeof input.enabled !== 'boolean' || (country !== '' && !/^[A-Z]{2}$/.test(country)) || (input.enabled && !country))
        throw new Error('Select a configured country to enable user wallets.');
      Object.assign(body, { enabled: input.enabled, countryCode: country });
    }
    const value = await request(`admin/wallet-settings/${action}`, { ...options, body });
    if (!value) throw new Error('User wallet settings are unavailable.');
    return readWalletSettings(value, env);
  }
  return {
    async sendCode({ phoneNumber, environment }, options) {
      if (typeof phoneNumber !== 'string' || !/^(?:0|\+?27)[6-8]\d{8}$/.test(phoneNumber.replace(/[\s()-]/g, ''))) throw new Error('Enter a South African mobile number.');
      const value = await call('send-code', { phoneNumber, environment }, options);
      if (!value.verificationToken || !value.phoneNumber || !Number.isFinite(Date.parse(value.expiresAtUtc))) throw new Error('Could not start mobile verification.');
      return value;
    },
    async link({ verificationToken, code, pin, createWallet = false, confirmPin, environment }, options) {
      if (!verificationToken || verificationToken.length > 4096 || !/^\d{6}$/.test(code || '') || !validPin(pin) ||
          typeof createWallet !== 'boolean' || createWallet && confirmPin !== pin) throw new Error('Enter your verification code and a matching six-digit wallet PIN.');
      return status(await call('link', { verificationToken, code, pin, createWallet, ...(createWallet ? { confirmPin } : {}), environment }, options));
    },
    settings(input, options) { return configuration('details', input, options); },
    updateSettings(input, options) { return configuration('update', input, options); },
    holdings(input, options) { return page('holdings', input, options); },
    transactions(input, options) { return page('transactions', input, options); },
    async sendUnlockCode(input = {}, options) {
      const value = scoped(await call('unlock-code', { environment: input.environment }, options));
      if (!value.verificationToken || !value.phoneNumber || !Number.isFinite(Date.parse(value.expiresAtUtc))) throw new Error('Could not start mobile verification.');
      return value;
    },
    async unlock({ verificationToken, code, pin, environment }, options) {
      if (!verificationToken || !/^\d{6}$/.test(code || '') || !validPin(pin)) throw new Error('Enter your six-digit code and six-digit wallet PIN.');
      const value = scoped(await call('unlock', { verificationToken, code, pin, environment }, options));
      if (!value.spendingToken || !Number.isFinite(Date.parse(value.expiresAtUtc))) throw new Error('The wallet could not be unlocked.');
      return value;
    },
    async prepareSend(input, options) {
      if (!guid(input.requestId)) throw new Error('Provide a unique transfer request ID.');
      return operation(await call('prepare-send', { ...spending(input), requestId: input.requestId, amount: walletAmount(input.amount), recipientAccountNumber: walletAccountNumber(input.recipientAccountNumber) }, options));
    },
    async operation(input, options) {
      if (!guid(input.operationId) && !guid(input.requestId)) throw new Error('Choose a wallet transaction.');
      return operation(await call('operation', { ...spending(input), ...(guid(input.operationId) ? { operationId: input.operationId } : { requestId: input.requestId }) }, options));
    },
    async authorize(input, options) {
      if (!guid(input.operationId) || !/^[a-f0-9]{64}$/i.test(input.authorizationDigest || '') || !validPin(input.pin)) throw new Error('Review the transfer and enter your six-digit wallet PIN.');
      return operation(await call('authorize', { ...spending(input), operationId: input.operationId, authorizationDigest: input.authorizationDigest, pin: input.pin }, options));
    },
    async cancel(input, options) {
      if (!guid(input.operationId)) throw new Error('Choose a wallet transaction.');
      return operation(await call('cancel', { ...spending(input), operationId: input.operationId }, options));
    },
    /** One of the tenant's own eZAR invoices (by the SDK payment id), ready to be paid from this wallet. */
    async invoice(input, options) {
      if (!Number.isSafeInteger(input?.paymentId) || input.paymentId < 1) throw new Error('Choose an invoice to pay.');
      const value = await call('invoice', { paymentId: input.paymentId, environment: input.environment }, options);
      if (value?.paymentId !== input.paymentId || !guid(value.invoiceId) || !Number.isFinite(value.amount) || value.amount <= 0 || value.currency !== 'ZAR' ||
          ![0, 100, 200, 400, 410, 500].includes(value.status) || typeof value.canPay !== 'boolean' ||
          typeof value.description !== 'string' || typeof value.paid !== 'boolean')
        throw new Error('The invoice could not be verified.');
      return value;
    },
    /**
     * Pay a tenant invoice from the wallet balance. Needs an unlocked wallet (spendingToken). Returns the
     * operation awaiting the wallet PIN: review amount/fee, then `authorize({ spendingToken, operationId, authorizationDigest, pin })`.
     */
    async payInvoice(input, options) {
      if (!Number.isSafeInteger(input?.paymentId) || input.paymentId < 1) throw new Error('Choose an invoice to pay.');
      if (!guid(input.requestId)) throw new Error('Provide a unique payment request ID.');
      return operation(await call('pay-invoice', { ...spending(input), paymentId: input.paymentId, requestId: input.requestId }, options));
    },
    async topup(input, options) {
      if (!guid(input.requestId)) throw new Error('Provide a unique top-up request ID.');
      return topup(await call('topup', { environment: input.environment, amount: walletAmount(input.amount, 2), requestId: input.requestId }, options));
    },
    async topupStatus(input, options) {
      if (!guid(input.invoiceId)) throw new Error('Choose a top-up invoice.');
      return topup(await call('topup-status', { environment: input.environment, invoiceId: input.invoiceId }, options));
    },
    async get(input = {}, options) { return status(await call('status', { environment: input.environment }, options)); },
    async disconnect(input = {}, options) {
      const value = status(await call('disconnect', { environment: input.environment }, options));
      if (value.linked) throw new Error('Your wallet connection changed. Refresh your wallet before disconnecting it again.');
      return value;
    },
    async balance(input = {}, options) {
      const value = await call('balance', { environment: input.environment }, options);
      if (!/^\d{16}$/.test(value?.accountNumber) || typeof value.production !== 'boolean' ||
          !['available', 'reserved', 'pending', 'restricted', 'pendingChange'].every(key => Number.isFinite(value[key]) && value[key] >= 0))
        throw new Error('Your wallet balance is temporarily unavailable.');
      return value;
    },
    async startConnect({ returnUri, environment }, options) {
      const uri = safeWalletUrl(returnUri);
      if (!uri || new URL(uri).search || new URL(uri).hash) throw new Error('Provide a valid app return address.');
      const value = await call('start-connect', { returnUri: uri, environment }, options);
      if (!safeWalletUrl(value.authorizationUrl) || !/^[a-f0-9]{64}$/.test(value.state || '') || !value.connectionTicket || !Number.isFinite(Date.parse(value.expiresAtUtc)))
        throw new Error('Could not start the wallet connection.');
      return value;
    },
    async completeConnect({ connectionTicket, code, state, environment }, options) {
      if (!connectionTicket || connectionTicket.length > 4096 || !/^[a-f0-9]{64}$/.test(code || '') || !/^[a-f0-9]{64}$/.test(state || ''))
        throw new Error('The wallet connection could not be verified.');
      return status(await call('complete-connect', { connectionTicket, code, state, environment }, options));
    },
  };
}
