# @cloudgatedevs/cloudgate-client-react

The full Cloudgate React SDK: shared back office, native platform clients, widgets, appearance,
authentication and developer tools. The API, auth and WebSocket primitives are provided by
`@cloudgatedevs/cloudgate-client`, a dependency of this package. For Angular, Vue or an app that only needs
API/auth/WebSocket helpers, install that smaller package directly.

## Install and migrate

```sh
npm install @cloudgatedevs/cloudgate-client-react
```

React 18/19, React DOM, React Router 6, Lucide React and Radix Dialog are peer dependencies.
All former full-SDK entry points keep their suffix under the new package name:

| Previous import | New import |
| --- | --- |
| `@cloudgatedevs/cloudgate-client` (platform client) | `@cloudgatedevs/cloudgate-client-react` |
| `@cloudgatedevs/cloudgate-client/react` | `@cloudgatedevs/cloudgate-client-react/react` |
| `@cloudgatedevs/cloudgate-client/react/styles.css` | `@cloudgatedevs/cloudgate-client-react/react/styles.css` |
| `@cloudgatedevs/cloudgate-client/react/widgets` | `@cloudgatedevs/cloudgate-client-react/react/widgets` |
| `@cloudgatedevs/cloudgate-client/platform` | `@cloudgatedevs/cloudgate-client-react/platform` |
| `@cloudgatedevs/cloudgate-client/tailwind` | `@cloudgatedevs/cloudgate-client-react/tailwind` |
| `@cloudgatedevs/cloudgate-client/widgets/catalog` | `@cloudgatedevs/cloudgate-client-react/widgets/catalog` |
| `@cloudgatedevs/cloudgate-client/widgets/manifest` | `@cloudgatedevs/cloudgate-client-react/widgets/manifest` |

The sidebar footer shows this React SDK's package version. App versions remain in app metadata.

## React widget library

Reusable tables, charts, cards, controls and animated dialogs are available from
`@cloudgatedevs/cloudgate-client-react/react/widgets`. Import the shared React stylesheet
once. Widgets inherit your app's appearance and work without back-office providers.

The back-office **Widget library** page includes interactive examples, API notes
and recipes. `DataTable` supports remote lazy loading, debounced search, filters,
sorting, pagination, load-more/infinite scrolling, selection and column visibility.
Build agents can read the same version-matched catalogue through the packaged
read-only MCP server or offline CLI. See [the widget guide](docs/widgets.md).

## Native platform and React back office

```jsx
import { createCloudgatePlatform } from '@cloudgatedevs/cloudgate-client-react';
import { CloudgateBackoffice } from '@cloudgatedevs/cloudgate-client-react/react';
import { BrowserRouter, Route } from 'react-router-dom';
// Import app Tailwind utilities before shared styles to preserve responsive utility order.
import './index.css';
import '@cloudgatedevs/cloudgate-client-react/react/styles.css';

const client = createCloudgatePlatform({
  idpBaseUrl: 'https://hub.cloudgate.dev',
  apiUrl: 'https://api.cloudgate.dev',
  tenancyName: 'acme',
  webAppId: 'your-web-app-guid', // local fallback; published site metadata wins
  environment: 'sbx',
});

function App() {
  return <BrowserRouter>
    <CloudgateBackoffice client={client} metadata={{ name: 'My app', version: '1.0.0' }}>
      <Route path="/orders" element={<MyOrders />} />
    </CloudgateBackoffice>
  </BrowserRouter>;
}
```

Install React, React DOM, React Router 6, Lucide React and Radix Dialog to use this entry.
`CloudgateBackoffice` includes auth/admin guards, responsive navigation, profile, account linking,
user management, notifications, analytics, appearance, media, SMTP, Wallet status and optional logs.
Pass `navigation` for your app's own routes. App modules appear first; shared Cloudgate controls
live in a separate, initially collapsed **Administration** tree at the bottom of the menu.
Links accept `to`, `label`, optional `icon`, `group` (a section caption), `end`, and `keywords`.
Expandable modules accept a stable `id`, `label`, optional `icon` / `defaultExpanded`, and `children`:

```jsx
const navigation = [
  { to: '/', label: 'Dashboard', end: true },
  { id: 'sales', label: 'Sales', defaultExpanded: true, children: [
    { to: '/orders', label: 'Orders', keywords: ['purchases'] },
    { id: 'reports', label: 'Reports', children: [
      { to: '/sales/monthly', label: 'Monthly sales' },
    ] },
  ] },
];
// <CloudgateBackoffice client={client} navigation={navigation} fallback="/">…</CloudgateBackoffice>
```

Keep IDs unique among siblings and stable when labels change. Groups are disclosure buttons,
not routes; put an overview link inside a group when needed. Existing flat navigation remains
supported. Search includes nested pages, module names and keywords, reveals matching branches,
and leaves expansion preferences unchanged. Deep links open their ancestors automatically.
Administration groups default to collapsed except for the active page's ancestors. Manual
expansion lasts until navigating to another page. App module expansion and desktop sidebar
visibility are saved in this browser per API, tenant, app, environment and user. Storage is optional.
The desktop shell uses a 232px sidebar, 48px header
and dense tables; the mobile drawer keeps larger touch targets and keyboard focus management.
About and Profile remain in the sidebar footer. Navigation visibility never replaces route or
server authorization; applications must enforce their own module permissions.
Pass `fallback="/"` when the app provides a dashboard at `/`; the default is `/profile`.
Use `CloudgateProvider` and exported hooks/components to compose a different shell.
The template owns configuration, metadata, navigation and domain pages. Shared features update
through this package. The framework-independent helper package remains available separately for apps that do not use this UI.

The framework-independent API also works without the shared React UI:

```js
await client.initialize();
await client.profile.get();
await client.users.list({ skip: 0, take: 25 });
await client.appearance.get();
await client.notifications.list({ unreadOnly: true });
await client.payments.status();
await client.payments.list({ environment: 'sbx', skip: 0, take: 25 });
await client.accountLink.get();
await client.registration.get();
```

`client.files`, `smtp`, `analytics` and `logs` share the same bearer transport.
It serializes rotating refresh requests, retries a 401 once, omits cookies, refuses redirects
and supports abort/timeout options. Platform clients bind the configured tenant; query parameters
cannot change it. Published `cg-analytics.json` / injected metadata chooses the web app and environment.
Back-office entry requires `backoffice.access`; page and action permissions are checked separately.
Role names do not grant access. The server checks the current stored grants on every request.
The optional `projectPath` scopes native workflow observability and the developer workspace to
one controller. Leave it empty to browse all accessible controllers. The Logs client sends the
native API's `*` scope in this case, and the server applies tenant, controller and environment
access checks. Logs and analytics visitor-call details require `backoffice.logs.view`. No default controller is
created or invoked. Admin/user/appearance/payment routes never use HMAC secrets.

The Logs search matches controller/action paths, user emails, exact call/session/user IDs,
HTTP methods, status codes and country codes. It combines with the selected period, outcome,
action and minimum duration, and searches on the server before counting and paging. Requests
start after a short typing pause; clearing search returns to the first page. Deploy the matching
Cloudgate backend and SDK together to enable search. No database migration is required.

### Payments

**Administration → Payments** includes **Overview**, **All payments** and **Test payment**.
History is scoped to the authenticated tenant and selected environment, with status filters
and pagination. Test payment creates a sandbox checkout only, including when the app runs
in production. Amounts are entered in currency units and sent as integer minor units.
The native IdP Admin APIs recheck the user's current role permissions and tenant; no ABP account link
or workflow is required. Configure providers and payouts in the Cloudgate hub.

### Creating and inviting app users

The shared Users view includes profile photos (with initials fallback), email verification,
role/status, contact details, identity number, address, metadata and joined/last-sign-in dates.
The row action menu supports keyboard navigation, stays outside table overflow and preserves
confirmation dialogs and administrator protections. The IdP Admin user projection supplies the
additional fields without account secrets; rebuild/restart the backend to load them. No migration
is required. Missing fields from older servers display as unknown or empty.

**Administration → People & access → Users → Add user** creates an IdP user and emails
an invitation to the current app. The server resolves the app's name and published URL
from its web app ID, preferring an active custom domain. Public invitations use this server-selected
destination. Publish the app and allow its URL in IdP redirect settings first.

For a sandbox app running on localhost, the SDK sends its current origin as `developmentAppUrl`.
A Cloudgate server running in `Development` accepts only loopback/`.localhost` HTTP(S) origins
and can invite users before the app is published. The form and new-user email identify this as a
local development invitation: open it on the computer running the app. The protected invitation
retains that origin through acceptance. Production servers continue to use the published URL;
they never use this local override. Tenant ownership and the app role’s invitation permission are still required.

New users choose their own password through a single-use invitation that expires after three
days. Accepting confirms their email and sends them to sign in to the invited app. Invitations
use the tenant's existing IdP email template and SMTP configuration. Accounts and roles remain
tenant-wide; inviting someone does not create a separate app-specific role or access grant.

If email delivery fails, the form keeps the created user and offers **Retry invitation**.
**Send app invite** in the user actions can resend an invitation without replacing an existing
account's password or role. All administration requests use the current IdP bearer and applicable back-office grants.
Deploy the backend invitation endpoints and the Hub's `/idp/:tenancyName/accept-invite` page
together. No new database migration is required beyond the existing IdP account-security schema.

```js
await client.users.invitationApp(); // trusted app name and destination shown in the form
await client.users.invite({ email: 'person@example.com', name: 'Jane', surname: 'Doe' });
await client.users.resendInvite(userId);
```

The lower-level `users.create` API remains available for existing integrations that explicitly
supply a password; the back office uses `users.invite` instead.

### Profile pictures

Open **My account → Profile → Change profile picture** to choose a photo
with Uppy, including the camera picker, then reposition and zoom the circular crop.
Only **Save photo** uploads the cropped 512px JPEG. Cancellation leaves the saved photo
unchanged. Removal asks for confirmation and restores the initials fallback.
The header, account dropdown and Profile page update together after saving.

`client.profile.uploadPicture(blob)` and `client.profile.removePicture()` use the native
IdP `profile/picture` endpoint for the signed-in user. No ABP link is required.
The server validates and normalizes image data; supported input types are PNG, JPEG,
WebP and GIF, up to 5 MB. Uppy and the crop editor load when the picture editor opens.

### Persistent Cloudgate account link

Profile opens the hub approval page in a popup, with a same-window fallback. The originating
IdP session starts and completes a five-minute opaque request; the hub authenticates and
explicitly approves the ABP user. Both users must be active in the same tenant. No ABP bearer
token is returned to or stored by the app. The relationship is stored on `IdpUser`, so it survives
IdP sign-outs. Detaching also invalidates outstanding approvals. Multiple app profiles may point
to the same Cloudgate account; each profile requires a verified relationship. The authenticated
ABP-to-IdP builder/launcher mapping also establishes this link when creating or reusing an unlinked
IdP user, without an additional popup. A link to a different ABP user is never replaced.
The profile displays the linked account's picture, with initials as a fallback. **Cancel linking**
revokes a pending request so a new one can be opened. Successful popup approvals close
automatically; the full-page redirect flow retains a return link.

Backend migration `AddIdpCloudgateAccountLink` and the hub `/account-link` route must be deployed
before this feature is available. Register custom app return URLs in the tenant's IdP settings.
The link is an optional identity association. All current back-office controls use the signed-in
IdP user and its back-office permissions; linking, detaching or ABP permissions do not change that access.
The back office never requests, stores or uses an ABP bearer token to perform these actions.

### Self-registration settings

Open **Administration → People & access → Settings** to enable or disable **Allow self-registration**.
This reads and updates the existing tenant-wide `App.Idp.AllowSelfRegistration` setting, shared by
all apps and environments. It does not change reCAPTCHA secrets, return URLs, token lifetimes or
existing users. Administrators can still create accounts when public self-registration is disabled.

The current IdP user must be active in the authenticated tenant and have the registration view/edit permission. The server rechecks the current database account and grants on reads and writes; no ABP link is required.
Successful saves audit the IdP actor and old/new values. The ABP audit user column stays null to avoid
attributing an IdP action to an unrelated ABP account. The UI disables editing if settings cannot load.

```js
const settings = await client.registration.get(); // { allowSelfRegistration: false, scope: 'tenant' }
await client.registration.update({ allowSelfRegistration: true });
```

Deploy the backend registration endpoints before using this screen. Account linking is optional.

**Prompt for email verification** is a second tenant-wide setting on this screen, off by default.
When enabled, the shared layout shows an email verification reminder above every signed-in page
for users whose current profile reports `isEmailConfirmed: false`. It does not block access.
The reminder supports resending, delivery errors and a 60-second cooldown, and refreshes verification
status on window focus, while visible, or through **I've verified my email**.

The backend persists `App.Idp.PromptForEmailVerification`. Its value is returned on the user's own
profile; it does not require a linked ABP account. `client.profile.resendVerification()` posts to
the self-service `profile/resend-verification` endpoint, which selects the recipient from the IdP
session and uses the tenant's standard verification email/template. Custom apps can render the
exported `EmailVerificationPrompt` inside `CloudgateProvider` and `AuthProvider`.

```js
await client.registration.update({ allowSelfRegistration: false, promptForEmailVerification: true });
await client.profile.resendVerification();
```

Rebuild/restart the updated backend before enabling the prompt. No database migration is required.
Older servers keep the new toggle disabled; older clients that omit it preserve the saved policy.

### App-user email template

Open **Administration → Messaging → Email template** to enable a custom layout, edit its HTML,
insert merge fields, preview a sample password reset, or restore the default draft. Save explicitly;
disabling the layout preserves its HTML. The preview is sandboxed, uses sample data, and sends no email.

The setting applies to every app in the tenant, in sandbox and production. It wraps password resets,
verification, invitations and send-email messages. SMTP credentials and Cloudgate team emails are
unaffected. The SDK uses dedicated GET/PUT `/api/idp/{tenancyName}/admin/email-template` endpoints and
the existing `App.Idp.Email.TemplateEnabled` / `App.Idp.Email.TemplateHtml` settings.

```js
const template = await client.emailTemplate.get(); // { templateEnabled, templateHtml, scope: 'tenant' }
await client.emailTemplate.update({ templateEnabled: true, templateHtml: '<h1>${title}</h1>${body}' });
```

The current email-template view/edit permission is checked on every read and write, as for Registration.
Deploy the updated backend endpoints first; account linking is optional. HTML is limited to
262,144 characters; enabled templates require the exact `${body}` token. `EMAIL_TEMPLATE_FIELDS`,
`EMAIL_TEMPLATE_MAX_LENGTH` and `validateEmailTemplate` are available from the platform entry point.
Writes audit the IdP actor with HTML hashes instead of template content, without attributing the
change to an ABP user.

### Create app notifications

Open **Administration → Messaging → App notifications** (`/app-notifications`), or choose
**Manage app notifications** from the personal inbox. Select Sandbox or Production, create a notification,
choose one app user or all current users, then review the message and audience before sending.
Supported styles are Info, Success, Warning and Danger. Optional action links accept local app paths
or HTTP(S) URLs. Messages are plain text. Sent history includes recipient counts and filtered read receipts.

Recipient lookup starts only when the search input is focused. The dropdown searches on the server
after a 250 ms typing pause and requests 10 users per page. Changing search, closing the dropdown or
switching to all users cancels pending lookups. Arrow keys and Enter select a recipient; Escape closes
the dropdown first. Loading failures can be retried without losing the notification draft.

```js
await client.notificationAdmin.send({
  environment: 'sbx', allUsers: false, userId: 123,
  title: 'Report ready', body: 'Your report is available.', style: 'success',
  actionUrl: '/reports', actionLabel: 'View report',
});
const history = await client.notificationAdmin.history({ environment: 'sbx', skip: 0, take: 25 });
const receipts = await client.notificationAdmin.recipients({ environment: 'sbx', id: history.items[0].id, isRead: true });
```

The SDK uses the existing native IdP `admin/notifications/send`, `history` and `recipients` APIs and
the app-user search API. These require the relevant current back-office permissions; they do not require an ABP link.
No workflow or additional SDK package is involved. Sending requires an explicit environment;
history defaults to the deployed app's environment when omitted. The personal inbox stays in its
own app environment regardless of the administration selector. Broadcast recipients are snapshotted
when sent and are tenant-wide, not restricted to a single app. Later signups do not inherit old broadcasts.

The UI blocks repeated submission while sending, keeps failed drafts and does not automatically retry
a failed send. After a timeout or uncertain response, check sent history before sending again to avoid
duplicates. Titles are limited to 160 characters, bodies to 4,000, URLs to 2,048 and labels to 80.
`validateNotification` and `NOTIFICATION_STYLES` are exported from the platform entry point.
These calls use the app's IdP bearer and never request or store an ABP bearer token.

### Local SDK development without publishing

In the blank template, run `npm run dev:sdk`. It reads the sibling SDK checkout directly and
Vite watches JS, JSX and CSS edits. There is no package publishing, Git push, `npm link`, or
SDK build step. For another location, use `npm run dev:sdk -- --sdk "D:/repos/GitHub/client-react"`.
Normal `npm run dev` / builds still use the installed package. Shared dependency deduplication
keeps React hooks on one React instance. Changes to SDK configuration may require restarting Vite.

### Package validation

`npm test`, `npm run build`, then `npm pack` produces a portable package with lazy React chunks,
compiled CSS, core source and declarations. `prepack` builds the UI. Core-only consumers need
no React packages. Test a release tarball in the template with `npm install ./vendor/<file>.tgz`.
Keep the SDK version and template lockfile updated together before publishing a template release.

## Existing workflow gateway client

The following signing examples are for trusted servers. Native platform clients above use bearer authentication.

Every request carries three headers, exactly as the gateway expects:

| Header | Value |
| --- | --- |
| `X-Api-Key` | your API key |
| `X-Timestamp` | Unix milliseconds |
| `X-Authentication-Signature` | HMAC-SHA512 hex of `timestamp + VERB + path + body` |

`path` includes the query string, and the signature is computed with
Web Crypto — available natively in browsers and Node 18+.

## Install

```bash
npm install @cloudgatedevs/cloudgate-client-react
```

## Quick start

```js
import { createCloudgateClient } from "@cloudgatedevs/cloudgate-client-react";

const cloudgate = createCloudgateClient({
  baseUrl: "https://acme.api.cloudgate.dev", // gateway origin only
  environment: "prod",                       // prod | sbx — becomes {baseUrl}/{environment}
  basePath: "api",                           // controller/project path, set once
  apiKey: "your-api-key",
  apiSecret: "your-api-secret",
});

// Request paths are just the route — env + basePath are prepended for you:
// GET https://acme.api.cloudgate.dev/prod/api/explorer/stats
const stats = await cloudgate.get("/explorer/stats");
const page = await cloudgate.get("/payments/tickets", {
  params: { skip: 0, take: 25, status: "pending" },
});

// POST https://acme.api.cloudgate.dev/prod/api/contact
const created = await cloudgate.post("/contact", {
  name: "Jane Doe",
  email: "jane@company.com",
  message: "Hello!",
});
```

### Browser applications

Native platform features use `createCloudgatePlatform` with IdP bearer authentication (below).
Keep signing credentials on a server. `VITE_` values are public browser bundle contents,
even when their `.env` file is ignored by Git. Custom signed workflow calls should pass
through your application's server; they do not belong in the generic back office.

### In Node (scripts, servers, cron jobs)

```js
import { createCloudgateClient } from "@cloudgatedevs/cloudgate-client-react";

const cloudgate = createCloudgateClient({
  baseUrl: process.env.CLOUDGATE_API_URL,
  environment: process.env.CLOUDGATE_ENVIRONMENT,
  apiKey: process.env.CLOUDGATE_API_KEY,
  apiSecret: process.env.CLOUDGATE_API_SECRET,
});

const rows = await cloudgate.get("/api/reports/daily", { params: { date: "2026-07-12" } });
```

## API

### `createCloudgateClient(options) → client`

| Option | Type | Notes |
| --- | --- | --- |
| `baseUrl` | `string` (required) | Gateway origin, e.g. `https://acme.cloudgate.dev` or `http://acme.localhost:44301`. |
| `environment` | `string` | Environment segment (`prod`, `sbx`, …) appended to the origin. Omit to use `baseUrl` as-is. |
| `basePath` | `string` | **Optional** convenience prefix appended after the environment — usually a controller/project path, e.g. `api`. Set it to pin one controller and then call bare routes (`/contact`). **Omit it** (the default) to keep the client general: pass the full path per call, controller included. Never a limit — just a shortcut. |

### One client, any controller (default)

Only `environment` shapes the URL automatically (the `/prod` or `/sbx`
segment). Leave `basePath` unset and pass the full path — controller and
route — on each call, so a single client reaches everything:

```js
const cg = createCloudgateClient({
  baseUrl: "https://acme.api.cloudgate.dev",
  environment: "prod",
  apiKey, apiSecret,
});

await cg.post("/api/contact", body);      // → …/prod/api/contact
await cg.get("/crm/leads", { params });   // → …/prod/crm/leads
await cg.get("/some-project/widgets");    // → …/prod/some-project/widgets
```

Set `basePath: "api"` only if you specifically want to pin one controller and
then call `cg.post("/contact")`.
| `apiKey` | `string` | Omit both key and secret to send unsigned requests. |
| `apiSecret` | `string` | Used for HMAC-SHA512 signing. |
| `timeoutMs` | `number` | Default per-request timeout (default `30000`). |
| `fetch` | `typeof fetch` | Custom fetch implementation (tests, polyfills). |
| `headers` | `object` | Extra headers sent on every request. |

### Client methods

```ts
client.get(path, opts?)            // GET
client.post(path, body?, opts?)    // POST (JSON body)
client.put(path, body?, opts?)     // PUT
client.patch(path, body?, opts?)   // PATCH
client.delete(path, opts?)         // DELETE
client.request(path, opts?)        // anything else
client.signingEnabled              // boolean
client.baseUrl                     // normalised base URL
```

`opts`: `{ params, headers, timeoutMs, raw }` — see `index.d.ts` for full types.

### Responses

Cloudgate sometimes returns workflow results as JSON **strings** (even
double-encoded), and some gateways wrap payloads in `{ result: ... }` or
`{ data: ... }`. The client normalises all of that — you get the actual value.
Pass `{ raw: true }` to skip envelope unwrapping.

### Errors

Non-2xx responses, timeouts and network failures throw a `CloudgateError`:

```js
import { CloudgateError } from "@cloudgatedevs/cloudgate-client-react";

try {
  await cloudgate.post("/contact", form);
} catch (err) {
  if (err instanceof CloudgateError) {
    console.error(err.status, err.body, err.url);
  }
}
```

## WebSockets (live workflow events)

Cloudgate workflows can push to WebSocket channels (`wss://{host}/ws/{env}/{channel}`),
secured with Basic credentials passed as an `Authorization` query parameter.
`createCloudgateWebSockets` manages any number of channel subscriptions with one
set of credentials, reconnecting automatically with exponential backoff.

Set two new env vars in your app (any names you like — the package takes plain
options; these are the recommended convention):

```bash
# .env
VITE_CLOUDGATE_WS_USER=yourUser
VITE_CLOUDGATE_WS_PASSWORD=yourPassword
```

```js
import { createCloudgateWebSockets } from "@cloudgatedevs/cloudgate-client-react";

export const sockets = createCloudgateWebSockets({
  baseUrl: import.meta.env.VITE_CLOUDGATE_API_URL,   // https://acme.cloudgate.dev
  environment: import.meta.env.VITE_ENVIRONMENT,     // sbx | prod
  username: import.meta.env.VITE_CLOUDGATE_WS_USER,
  password: import.meta.env.VITE_CLOUDGATE_WS_PASSWORD,
});

// Multiple channels, same credentials:
const a = sockets.connect("table-session", {
  filter: `"Id":${sessionId}`,               // server-side payload filter
  onMessage: (payload) => refetchSession(),
});
const b = sockets.connect("order-items", {
  filter: `"table_session_id":${sessionId}`,
  onMessage: (payload) => refetchOrders(),
  onStatus: (s) => console.log("order-items:", s), // connecting|open|closed|reconnecting|failed
});

// Later:
sockets.disconnect(a);   // one subscription
sockets.disconnectAll(); // all of them (manager stays usable)
sockets.dispose();       // all of them, permanently
```

Notes:

- `baseUrl` accepts a **function** when the gateway is only known at runtime
  (e.g. it arrives via a QR code): `createCloudgateWebSockets({ baseUrl: () => getStoreBase(), ... })`.
  The function is re-read on every (re)connect, and connects are skipped
  while it returns `null`.
- If `baseUrl` already ends in `/sbx` or `/prod`, that environment is used
  automatically; an explicit `environment` option overrides it.
- JSON frames are parsed before reaching `onMessage`; non-JSON frames are
  delivered as raw strings.
- Connecting the same channel + filter twice reuses the socket and just
  replaces the handler.
- In Node < 22 pass a `WebSocket` implementation (e.g. the `ws` package):
  `createCloudgateWebSockets({ ..., WebSocket: WS })`.

## Require login (IdP auth)

The package also ships the hosted-login session flow used across Cloudgate
apps. Set `VITE_REQUIRE_LOGIN=true` and unauthenticated visitors are redirected
to the IdP login page **before the page loads** — the current URL is passed as
`returnUrl` at redirect time, so there is nothing to configure for it.

```bash
VITE_REQUIRE_LOGIN=true
VITE_IDP_BASE_URL=https://idp.cloudgate.dev
VITE_IDP_TENANCY_NAME=acme     # optional — falls back to ?idp_tenant= or the subdomain
```

```js
// src/services/auth.js — create once, import everywhere
import { createCloudgateAuth } from "@cloudgatedevs/cloudgate-client-react";

export const auth = createCloudgateAuth({
  idpBaseUrl: import.meta.env.VITE_IDP_BASE_URL,
  tenancyName: import.meta.env.VITE_IDP_TENANCY_NAME,
  requireLogin: import.meta.env.VITE_REQUIRE_LOGIN,
});
```

```js
// src/main.jsx — gate the page load
import { auth } from "./services/auth.js";

auth.init().then((session) => {
  if (auth.requireLogin && !session) return; // browser is redirecting to login
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
});
```

`init()` does the whole dance: it consumes the `?access_token=…` /
`?refresh_token=…` params the IdP appends on the way back (and cleans them out
of the address bar), otherwise restores the stored session from
`localStorage`, silently refreshes an expired token via
`POST {idpApiUrl}/api/idp/{tenant}/Refresh`, and only then — when
`requireLogin` is on and no session could be established — redirects to
`{idpBaseUrl}/idp/{tenant}/login?returnUrl={current page}`.

After boot:

```js
auth.isAuthenticated();  // boolean
auth.getUser();          // { id, displayName, email, claims } from the JWT
auth.getAccessToken();   // valid token or null
auth.logout();           // clear session (+ redirect back to login by default)
```

To send the user's bearer token on gateway calls, pass headers as a function —
it's evaluated per request, so it always uses the current token:

```js
const cloudgate = createCloudgateClient({
  baseUrl: import.meta.env.VITE_CLOUDGATE_API_URL,
  environment: import.meta.env.VITE_ENVIRONMENT,
  headers: () => auth.authHeader(), // Authorization: Bearer … when signed in
});
```

## Embedded developer workspace

The React backoffice includes a compact **Developers** bar. An IdP user with `backoffice.developer.access` can open it after linking
an ABP account for the same Cloudgate project in their profile. The SDK owns the bar, frame lifecycle,
link recovery and `client.developerWorkspace.open({ returnUrl })` launch API. Pass `developerMode={false}`
to `CloudgateBackoffice` to omit the bar. No additional SDK package is required.

Cloudgate supplies an icon rail for **Build**, **API**, **Databases**, **WebSockets** and **Schedules**
inside `/developer`. New sessions start on the Build placeholder; API opens API Overview directly.
The overview links to workflow details where permitted. There are no secondary navigation menus.
This requires the matching hub and backend update.

Configure `projectPath` (or the template's `VITE_CLOUDGATE_API_PROJECT`) to focus the catalogue and
controller-owned resources on one controller. The server validates and retains this scope throughout
the session; invalid or inaccessible controllers fail without falling back to all controllers.
WebSockets are tenant-shared and labeled accordingly. Tenant-wide test recordings are unavailable
in a focused session. Controller selection in developer mode does not change your saved Hub selection.
Launching uses the IdP token to obtain a one-use code. Only the hub frame redeems it for a scoped ABP
token; the parent app never receives that token. The ABP user's existing permissions apply and the
server blocks project switching and account administration. Normal backoffice settings keep using
IdP back-office permissions. Minimize preserves the frame and unsaved work.
Sessions last 20 minutes and must then be reopened. Save workflow changes before ending the session.

The app URL must be in the tenant's IdP allowed redirect URLs. The configured hub origin must be
allowed by backend CORS, and the hub deployment must allow the app to frame `/developer` through its
`Content-Security-Policy: frame-ancestors` policy. Use the hub built for that backend; an unrelated
dedicated server selected in the normal hub is intentionally ignored by developer mode.

## Tests

```bash
npm test
```

Runs `node --test` for the platform clients, authentication integration,
back-office permissions, widgets, documentation CLI/MCP and re-exported core helpers.

## Publishing (maintainers)

Publish core changes from `client` first when this release requires a new core version.
Update this package's core dependency, run `npm install` and `npm test`, then publish
from `client-react`. The `prepack` hook builds the React bundles, styles and widget manifest.

```bash
npm login            # as a member of the @cloudgatedevs org
npm publish          # publishConfig.access is already "public"
```

## License

MIT © Cloudgate Devs

### IdP role management

The shared back office includes **Administration → People & access → Roles** at `/roles`.
The role editor has a searchable permission tree covering every current menu, with separate
view and action grants. **Select all**, **Read only** and **Clear** provide starting points.
An active app user with the appropriate role-management permissions can edit any role,
including the built-in `User`, `Contributor` and `Admin` roles. Their names cannot be renamed
or deleted. Assigned custom roles cannot be deleted, renames update existing assignments,
and users cannot change their own role assignment.

| Role | Initial back-office permissions |
| --- | --- |
| Admin | All 40 permissions |
| Contributor | Read access plus media upload/delete, branding, theme and email-template editing |
| User and custom roles | None |

These are editable defaults, not role-name exceptions. A User with **Select all** has the same
back-office capabilities as Admin. For a demo, edit User, choose **Read only**, then save:
menus remain available while changes are disabled in the UI and denied by the APIs.
Personal profile/account settings remain available to each signed-in user. Developer workspace
access also requires a linked Cloudgate account and its existing ABP permissions.

Use `canAccessBackoffice(profile)` for public-header links, and `usePermissions().can(key)` in
React pages. `BACKOFFICE_PERMISSIONS` supplies named constants. Custom navigation entries may
specify `permission`; custom application APIs must enforce their own corresponding grants.
All back-office permissions require `backoffice.access`. Permissions are returned in
`profile.rolePermissions`; a missing permission is denied, including on older servers.

Use `platform.roles.list()`, `.create({ name, permissions })`, `.update({ id, name, permissions })`
and `.delete(id)`, and `platform.users.setRole(userId, roleName)` for your own UI. For a built-in
role with no backing row, omit `id` from `.update()` and use its canonical name. The server returns
`{ items: [{ id, name, isDefault, userCount, permissions }] }` for the list and the saved role for
create/update. Permission pairs are `{ key, value }` strings. Reserved `backoffice.*` keys
control platform actions; other custom keys retain application-defined meanings.
`platform.roles.options()` returns role names for users with role-assignment permission,
without requiring permission to view the role configuration.

These methods call the native `/api/idp/{tenancyName}/admin/roles/*` and
`/api/idp/{tenancyName}/admin/users/set-role` endpoints with the current IdP bearer. They require
the corresponding Cloudgate backend update, and never use an ABP token, a linked account,
a workflow or a client-supplied tenant ID. Role changes apply across the tenant's applications.
API authorization uses current database grants immediately; refresh the app to update its menus.
Deploy the backend and `20260925190000_Seed_Idp_Backoffice_Permissions` migration before the SDK.
The migration adds missing built-in roles/permissions across existing tenants, preserves custom
permissions and explicit denials, and does not overwrite subsequent role edits. New tenants are
seeded during creation. Saving an empty permission list explicitly revokes all back-office access.

### Colour palettes

Administration → Theme includes eight coordinated colour palettes, previews in
light/dark/system mode, and a named custom palette editor. Palettes set the primary,
secondary, workspace tint, success, warning, error and information colours. Custom
palettes remain available when switching presets; Save changes applies the theme
to that app and environment. The Widget Library offers the same palettes for
temporary previews. Existing primary and secondary colours remain intact.

The platform entry exports `PALETTE_PRESETS`, `PALETTE_COLOR_KEYS`,
`paletteVariables(values, dark)` and `parseCustomPalette(value)` for integrations.
Use the matching Cloudgate backend before publishing this SDK update: it accepts
the additional `theme_*` colour fields and validates `theme_custom_palette` as a
bounded `{name, colors}` JSON string. These use existing appearance storage and
revision checks, so no database migration is required for palettes.

### Account menu and security

The header account menu includes Profile, Settings, About and Log out, with the signed-in role beside the name. Account Settings (`/account/settings`) shows email confirmation and manages IdP authenticator 2FA, including QR/manual setup, recovery-code replacement and disabling with proof. These APIs use the user's IdP session, without a linked ABP account.

Use `platform.accountSecurity.get()`, `beginSetup()`, `confirmSetup(code)`, `disable(code)` and `regenerateRecoveryCodes(code)` in your own UI. Successful enable/disable responses replace this browser's session; other sessions must sign in again. Recovery codes are returned only when generated and must be saved by the user.

Deploy the matching Cloudgate account-security migration/backend and Hub sign-in changes first. An older server shows an unavailable message; the UI never treats missing status as verified or enabled. Headless launcher integrations can pass `initialize({ onTwoFactorRequired })` and complete the protected challenge using `completeTwoFactorLogin`. The React provider handles this automatically. Setup keys and recovery codes stay in component memory, and the QR image is generated on Cloudgate without an external QR service.

## Public website and back office

Pass `basePath="/backoffice"` and `publicHome={<Home />}` to `CloudgateBackoffice` inside your
BrowserRouter to serve a website at `/` alongside the protected back office.
Application routes and navigation remain relative to the back office (for example `/orders`
opens `/backoffice/orders`). `useCloudgate().backofficePath()` builds links to shared screens.
Existing integrations that omit these props retain their root-mounted workspace.

The shared Settings screen saves **Enable public website** and **Website access** per web app
and environment. Choose **Everyone** for anonymous browsing or **Signed-in users** for an app
such as a wallet or member portal. Signed-in users need an active app account, not back-office
permissions. Disabling the website sends visitors to the back office, where role permissions
still apply. Existing installations default to Everyone; no data migration is needed.

The stored flags are `enable_public_website` and `require_public_website_login` (string booleans).
Deploy the updated Cloudgate server and SDK together before enabling required sign-in.
Public bootstrap reads only appearance and registration policy without sending a bearer token;
changes require `backoffice.settings.edit` through the existing IdP endpoint with revision checks.
Branding resets preserve both website access settings. The public header can use `useSettings().allowSelfRegistration`,
`client.signupUrl(returnUrl)`, and `canAccessBackoffice(profile)`. Back-office sign-in
returns to the requested deep link. Update the server to include `GET /api/idp/{tenant}/website`.

Add customer-facing pages through `publicRoutes` (React Router `Route` elements). They share
the website access gate and preserve their path, query and hash through hosted sign-in:

```jsx
<CloudgateBackoffice client={client} basePath="/backoffice" publicHome={<Home />}
  publicRoutes={<Route path="/wallet/*" element={<Wallet />} />}>
  <Route index element={<AdminDashboard />} />
</CloudgateBackoffice>
```

Keep customer pages inside this route group so the access setting covers them. Website
content does not mount until settings and the required session/profile have loaded; failed
checks offer retry. Signing out returns to `/` and requires sign-in again when configured.
This gates page rendering; application APIs must still enforce authentication, tenant and
record ownership, including for wallet data. Self-registration remains a separate tenant policy.
