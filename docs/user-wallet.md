# App user eZAR wallets



Each authenticated IdpUser can connect one eZAR voucher wallet per tenant and environment. The link follows that identity across apps in the same tenant. It is separate from the tenant's merchant wallet and payment configuration.



The SDK profile page includes the wallet card. To place it elsewhere inside `CloudgateProvider` and `AuthProvider`:



```jsx

import { UserWallet } from '@cloudgatedevs/cloudgate-client-react/react';

import '@cloudgatedevs/cloudgate-client-react/react/styles.css';



<UserWallet />

```



The component offers **Connect wallet** beside **About eZAR** inside the app. Setup has three steps: mobile number, six-digit SMS code, and six-digit wallet PIN. Choose **Existing wallet** or **New wallet** before requesting the code; new wallets require PIN confirmation. The code and PIN are verified together when setup finishes. A missing wallet also offers an explicit **Create a new wallet** choice. Connecting does not authorize a transaction or move funds. **Open wallet** opens the SDK wallet workspace. **About eZAR** opens `https://ezar.co.za` in a new tab.

The SDK wallet stays on the voucher network: users can receive voucher funds and pay for goods using their balance. It does not provide bank account setup, identity checks for withdrawals, or bank withdrawals. Payment authorization requires a short-lived wallet spending session, kept only in component memory.

For custom interfaces use `client.wallet.sendCode({ phoneNumber, environment })`, then `client.wallet.link({ verificationToken, code, pin, createWallet: false, environment })`. When the result has `accountNotFound`, ask the user to check the PIN or choose creation; only then send `createWallet: true` and `confirmPin`. Never persist PINs, OTPs or spending sessions. The older `startConnect`/`completeConnect` redirect methods and callback handler remain available for compatibility, but built-in connection buttons use the in-app flow.

Endpoints are `POST /api/idp/{tenancyName}/wallet/send-code`, `link`, `status` and `balance`. The authenticated principal determines the IdpUser; callers cannot choose a user or receiving voucher account. Cloudgate resolves Platform sessions server-side.

Deploy Platform's `AddVoucherWalletConnect` migration and the matching Cloudgate/Platform servers before using the in-app flow. Platform records a holder connection grant after phone and PIN verification. Country, audience and environment configuration remain enforced. `WalletAppUrl` is needed only for the legacy redirect flow.

Account numbers are 16-digit strings, never JavaScript numbers. Receiving references use a Luhn checksum. Balance fields (`available`, `reserved`, `pending`, `restricted`, `pendingChange`) are **eZAR units**, not minor currency units. Failed balance reads must show an unavailable state, not zero. `pendingChange` is a subset of `pending`, not an additional balance.



Phone verification expires after five minutes; SMS resend is available after sixty seconds, subject to provider limits. Going back to an unchanged mobile number reuses the unexpired verification ticket instead of sending another SMS. Verification tickets are bound to the authenticated user, tenant and environment. The server resolves wallet identifiers from the verified Platform connection grant. The durable link stores no PIN, PIN hash, private key or spending session. An IdP session permits balance reads; it does not authorize spending funds. PIN-protected transaction authorization remains separate.



Administrators can view connected users, account numbers, the mobile number verified at linking, and connection dates in **Web Apps → Wallets → App User Wallet**. That list is tenant-scoped and separates Sandbox from Production.



Deploy the `AddIdpUserWallets` and `AddIdpUserWalletTopups` database migrations, Cloudgate backend and the Platform voucher read endpoints before deploying apps with this SDK. SDK source and the local preview must be built; updating this repository does not publish an npm release automatically.



## Public account menu and profile



Place `<UserMenu />` in your public header inside the SDK providers. It is hidden for guests, and shows the signed-in user's photo, a profile link, their eZAR wallet with its available balance, and logout. A back-office link appears only for users with back-office access.



```jsx

import { UserMenu } from '@cloudgatedevs/cloudgate-client-react/react';



function Header() {

  return <header><a href="/">My app</a><UserMenu /></header>;

}

```



When `CloudgateBackoffice` has `publicHome` and a `basePath`, it provides `/account/profile` and `/account/wallet` automatically. These routes require an IdP session but no admin role. They are reserved SDK routes; keep your own public routes and back-office mount at distinct paths. Existing back-office profile URLs still work.



The profile page supports first name, last name, email and the existing photo upload/crop/remove flow. The header updates after saves. Unsaved edits survive background profile refreshes. Wallet status and balance are scoped to the signed-in user and app environment; the dropdown refreshes each time it opens, and never substitutes zero when a read fails.



For a custom router, render the exported `Profile` and `WalletWorkspace` components inside your authenticated routes at those paths. Use `<Profile showAccountLink={false} />` for the public account experience. `UserWallet` remains the compact linking and balance card for sidebars and profiles.



## Wallet workspace



`/account/wallet` includes the balance, current value-bearing vouchers, paginated transaction history, send, receive and top-up flows. It follows the configured app palette and supports mobile layouts, keyboard navigation, skeletons and reduced-motion preferences.



**Disconnect wallet** removes the signed-in user's connection in the current app and environment after confirmation. The wallet, funds, transactions and existing invoice destinations are preserved. The workspace clears local transfer/top-up drafts and spending access, then offers **Connect wallet** to reconnect through eZAR. Call `client.wallet.disconnect({ environment })` for a custom UI. Disconnecting invalidates the connection's unlock and spending tickets, even if the same wallet is linked again.



- The wallet balance is `available + reserved + restricted`. Reserved funds have not left the wallet. Pending output vouchers (including pending change) are shown separately until confirmed.

- `client.wallet.holdings({ skip, take })` returns current, positive-value vouchers with `available`, `reserved`, `pending` or `restricted` status. Consumed vouchers are excluded.

- `client.wallet.transactions({ skip, take })` returns operations and bearer-claim ownership changes. Completed transfers show the transferred amount, not the gross input vouchers and change as duplicate payments.

- Receive shows a copyable account number and a QR containing `xcap-wallet:v1:{accountNumber}`. Receive does not require an unlocked spending session.



Sending is a separate authorization flow:



```js

const proof = await client.wallet.sendUnlockCode(); // Uses the saved linked phone.

const session = await client.wallet.unlock({ verificationToken: proof.verificationToken, code, pin });

const transfer = await client.wallet.prepareSend({

  spendingToken: session.spendingToken,

  recipientAccountNumber, amount: '10.00', requestId: crypto.randomUUID(),

});

// Show the returned recipient, amount, fee, total and expiry before collecting the confirmation PIN.

await client.wallet.authorize({

  spendingToken: session.spendingToken, operationId: transfer.operation.id,

  authorizationDigest: transfer.operation.authorizationDigest, pin: confirmationPin,

});

```



The encrypted spending ticket is bound to the IdpUser, tenant, environment and linked account. It expires no later than the upstream wallet session (30 minutes). Unlocking never creates an account, and a different wallet PIN on the same phone cannot unlock the linked wallet. Keep the ticket and PIN in memory only. Backend auditing is disabled for these endpoints.



Use `operation({ spendingToken, operationId })`, or `operation({ spendingToken, requestId })` after an uncertain prepare response. Reuse the original request ID on retry. Use `cancel({ spendingToken, operationId })` to release an unsigned reservation. States are: 0 awaiting authorization, 1 authorized, 2 submitted, 3 confirmed, 4 failed, 5 needs review, 6 cancelled. Never treat an error or a timed-out response as proof that no transfer occurred.



The SDK remembers only the non-secret transfer intent in session storage so a reload can recover it after unlocking again. It keeps the spending ticket in React memory, clears it on identity/environment changes, and polls while a submitted transfer is open. The wallet refreshes on focus and while funds are settling.



Top-up creates an invoice for the linked user's account:



```js

const topup = await client.wallet.topup({ amount: '50.00', requestId: crypto.randomUUID() });

// The wallet workspace saves the invoice intent, then opens checkout in the same tab.

window.location.assign(topup.paymentUrl);

const latest = await client.wallet.topupStatus({ invoiceId: topup.invoiceId });

```



Amounts are in eZAR/ZAR units; top-ups accept two decimal places and sends up to six. A top-up uses its own local invoice association, separate from merchant payment records. The receiving account is always resolved server-side from the current user's link. Repeated requests with the same key return the same invoice. Reopening a saved top-up checks its status before navigating; paid or closed invoices stay on the status view. Payment methods are selected at hosted checkout; a wallet is credited only after payment confirmation and voucher issuance. Invoice statuses are 0 created, 100 pending, 200 paid, 400 cancelled, 410 expired and 500 failed.



These new actions are POSTs below `/api/idp/{tenancyName}/wallet/`: `disconnect`, `holdings`, `transactions`, `unlock-code`, `unlock`, `prepare-send`, `operation`, `authorize`, `cancel`, `topup`, `topup-status`. All require an active IdpUser and explicit environment; none accept a source account or user ID from the browser.




## Paying a tenant invoice from the wallet

A signed-in user can pay one of the tenant's own eZAR invoices (created with *Request a payment* / a payment link in Cloudgate, or `admin/payments/test-checkout` in sandbox) directly from their wallet balance, without hosted checkout. Use `PayWithEzarButton` inside the SDK providers on your order page:

```jsx
import { PayWithEzarButton } from '@cloudgatedevs/cloudgate-client-react/react';

// order.paymentId comes from your authenticated backend, which prices the goods,
// checks ownership/stock and creates or reuses the order's Cloudgate invoice.
<PayWithEzarButton
  paymentId={order.paymentId}
  onPaid={() => refreshOrder()}
/>
```

The button loads the user's wallet, offers inline connection if needed, and returns to the same invoice. It shows the merchant, order reference, amount and available balance; then it unlocks the wallet when necessary and prepares the payment. The final review includes fees and the total, and requires a six-digit PIN before authorization. The receipt appears only after the operation is confirmed. `onPaid` is called once per confirmed operation in a mounted dialog and is a UI notification, not proof for fulfilling an order. Your backend must verify the invoice's paid status through the existing payment confirmation/webhook integration before delivering goods. Keep merchant API credentials and price calculations on your backend.

The SDK's **Test payment** page includes the same button for sandbox invoices. A merchant invoice must receive into a different voucher wallet from the payer. App user wallets must be enabled in the selected environment; the button is disabled for signed-out users or unavailable wallets. The component does not require back-office payment permissions to spend a user's own wallet.

Only non-secret request/operation IDs are saved in session storage, scoped to the app, signed-in user, environment, wallet and payment. Closing/reopening or refreshing recovers the original operation after unlocking again; an uncertain network response reuses the original request ID. PINs, SMS codes and spending tokens are never persisted. `onPaid` may run again after remounting, so order refresh/fulfilment must be idempotent. No hosted-checkout navigation is performed by this flow.

You can also open `/account/wallet?pay=<paymentId>` (the SDK payment ID from payment history / invoice details), or render the lower-level `PayInvoice` dialog with an already linked wallet:

```jsx
import { PayInvoice } from '@cloudgatedevs/cloudgate-client-react/react';

<PayInvoice client={client} environment="sbx" wallet={wallet} session={session} setSession={setSession}
  paymentId={42} onPaid={() => refresh()} onClose={() => setOpen(false)} />
```

An unlocked spending session is kept in memory; a locked wallet currently requires SMS code + PIN, followed by a separate PIN confirmation of the prepared payment. Platform completes the voucher transfer to the merchant, closes the invoice and raises the merchant's paid webhook. Processing is polled while the dialog is open and refreshed on focus; closing the dialog does not cancel a submitted payment.

For a custom UI:

```js
const invoice = await client.wallet.invoice({ paymentId: 42 });       // { invoiceId, amount, currency: 'ZAR', merchantName, paid, canPay, ... }
const prepared = await client.wallet.payInvoice({ spendingToken: session.spendingToken, paymentId: 42, requestId: crypto.randomUUID() });
await client.wallet.authorize({ spendingToken: session.spendingToken, operationId: prepared.operation.id,
  authorizationDigest: prepared.operation.authorizationDigest, pin });
```

Endpoints are `POST /api/idp/{tenancyName}/wallet/invoice` and `wallet/pay-invoice`. The invoice must belong to the signed-in user's tenant, environment and country and be an eZAR (Platform) invoice. Cloudgate verifies its identity, amount and currency, selects a compatible voucher method for a fresh invoice, then prepares payment. It preserves an already selected voucher method, rejects closed invoices and does not replace a selected EFT method. The server resolves the checkout capability itself; callers never choose the receiving account. Reuse the same `requestId` on retry and use `operation({ requestId })` after an uncertain response. Invoice operations now include `invoiceId`, which the dialog checks against the reviewed invoice before allowing authorization. Deploy the matching Cloudgate changes together with this SDK version.

## Enable user wallets

In Cloudgate, select the project and environment, then open **Web Apps → App User Wallet**. Enable **User wallets**, select **South Africa**, and save. The same configuration is available in the SDK back office under **Settings → User wallet settings**. Sandbox and production are configured independently. New projects default to disabled; the country must explicitly be selected. Country options come from the platform configuration (`availableCountries`); do not hard-code a single country.

These settings are shared by apps using the same project's IdP. SDK admins need `backoffice.settings.view` / `backoffice.settings.edit`. Cloudgate management uses the Web App Identity permission. The SDK's `client.wallet.settings()` and `client.wallet.updateSettings({ enabled: true, countryCode: 'ZA' })` manage the current environment, or pass `environment` explicitly.

The public website bootstrap includes read-only `walletSettings`. The SDK hides wallet navigation and widgets when unavailable and checks again when the window regains focus. Wallet APIs enforce the same setting for reads, activation, sending and top-ups. Disabling does not disconnect users, delete accounts, alter balances or change existing invoice destinations. Existing checkout and payment processing continue independently. A user may still disconnect through the disconnect API.


## Connected wallet and payment responsibilities

The app-user SDK connects a voucher wallet account. Its 16-digit account number is distinct from a connected wallet address. The built-in wallet screens use six-digit masked PIN inputs and six-digit SMS inputs. The headless API and Platform require exactly six ASCII digits for wallet PINs, including sign-in, creation, unlocking and transaction authorization.

The SDK supports connection/disconnection, balances, holdings, history, voucher transfers, hosted top-ups and invoice payments. It does not expose bank management or withdrawal operations. Direct blockchain transfers and mobile voucher sending/claiming remain outside this migration; their operations must not be routed into voucher-transfer authorization.

The merchant payment pages show readiness, invoices and sandbox test checkout. Withdrawal setup and fee quotes are managed through Cloudgate/eZAR; the SDK does not submit merchant payouts. The Payments overview refreshes on return so completed eZAR verification is reflected by the backend.

Transaction progress currently uses status polling (five seconds while an authorized/submitted transfer dialog is open, ten seconds while balances/history are settling) and a focus refresh. The generic websocket client is available, but these SDK wallet components do not yet have an authenticated IdP wallet event subscription. eZAR's websocket workflow is not automatically inherited by SDK consumers.

Build and publish a new SDK release, update consuming apps, and deploy matching Cloudgate changes to roll out source updates. A local build does not update installed npm packages.
