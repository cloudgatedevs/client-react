import { createCloudgateAuth } from '@cloudgatedevs/cloudgate-client';
import { createIdpClient } from './transport.js';
import { createAppIdentityResolver } from './identity.js';
import { createPublishedAnalyticsResolver } from './published.js';
import { createAppearanceClient } from './appearance.js';
import { createPaymentsClient } from './payments.js';
import { createNotificationsClient, connectNotificationSocket } from './notifications.js';
import { createAppAnalyticsClient } from './analytics.js';
import { createAccountSecurityClient } from './account-security.js';
import { createProfileClient } from './profile.js';
import { createFilesClient, createUsersClient, createSmtpClient, createWorkflowLogsClient } from './features.js';
import { createRolesClient } from './role-management.js';
import { createAccountLinkClient } from './account-link.js';
import { createRegistrationClient } from './registration.js';
import { createEmailTemplateClient } from './email-template.js';
import { createNotificationAdminClient } from './notification-admin.js';
import { createDeveloperWorkspaceClient } from './developer-workspace.js';
import { consumeLauncherLogin } from './launcher.js';

export * from './transport.js';
export * from './identity.js';
export * from './published.js';
export * from './appearance.js';
export * from './appearance-model.js';
export * from './payments.js';
export * from './notifications.js';
export * from './notification-appearance.js';
export * from './analytics.js';
export * from './analytics-format.js';
export * from './profile.js';
export * from './account-security.js';
export * from './features.js';
export * from './roles.js';
export * from './backoffice-permissions.js';
export * from './role-management.js';
export * from './launcher.js';
export * from './account-link.js';
export * from './registration.js';
export * from './email-template.js';
export * from './notification-admin.js';
export * from './developer-workspace.js';

/** A per-app platform client. Configuration is explicit; the SDK reads no bundler environment. */
export function createCloudgatePlatform(options = {}) {
  const trim = value => String(value || '').trim().replace(/\/+$/, '');
  const config = Object.freeze({
    idpBaseUrl: trim(options.idpBaseUrl), apiUrl: trim(options.apiUrl || options.idpApiUrl || options.idpBaseUrl),
    tenancyName: String(options.tenancyName || '').trim(), returnUrl: trim(options.returnUrl),
    webAppId: options.webAppId || '', environment: options.environment || 'sbx',
    projectPath: String(options.projectPath || '').trim().replace(/^\/+|\/+$/g, ''),
    gatewayUrl: trim(options.gatewayUrl),
  });
  const auth = options.auth ?? createCloudgateAuth({ ...config, idpApiUrl: config.apiUrl, allowTenantOverride: false, storage: options.storage, fetch: options.fetch });
  const request = createIdpClient({ auth, apiUrl: config.apiUrl, fetchImpl: options.fetch, timeoutMs: options.timeoutMs });
  const publicRequest = createIdpClient({ auth, apiUrl: config.apiUrl, fetchImpl: options.fetch, timeoutMs: options.timeoutMs, anonymous: true });
  const published = options.resolvePublishedApp ?? createPublishedAnalyticsResolver({ fetchImpl: options.fetch });
  const resolveAppIdentity = createAppIdentityResolver({ ...config, resolvePublishedApp: published });
  const profile = createProfileClient({ request });
  const notifications = createNotificationsClient({ request, resolveAppIdentity });
  let initialization;
  const platform = {
    config, auth, request, resolveAppIdentity, profile,
    accountSecurity: createAccountSecurityClient({ request, auth }),
    users: createUsersClient({ request, resolveAppIdentity }),
    roles: createRolesClient({ request }),
    appearance: createAppearanceClient({ request, publicRequest, resolveAppIdentity }),
    payments: createPaymentsClient({ request, resolveAppIdentity }),
    files: createFilesClient({ request, resolveAppIdentity, mediaFolder: options.mediaFolder || (config.projectPath === '*' ? '' : config.projectPath) }),
    smtp: createSmtpClient({ request }),
    // Preserve an explicit invalid path so Logs cannot treat it as an omitted controller scope.
    logs: createWorkflowLogsClient({ request, resolveAppIdentity, projectPath: options.projectPath }),
    analytics: createAppAnalyticsClient({ request, ...config, resolvePublishedApp: async () => {
      const scope = await resolveAppIdentity();
      return scope.webAppId ? { webAppId: scope.webAppId, isProduction: /^prod/.test(scope.environment) } : null;
    } }),
    accountLink: createAccountLinkClient({ request }),
    developerWorkspace: createDeveloperWorkspaceClient({ request, resolveAppIdentity, projectPath: options.projectPath }),
    registration: createRegistrationClient({ request }),
    emailTemplate: createEmailTemplateClient({ request }),
    notificationAdmin: createNotificationAdminClient({ request, resolveAppIdentity }),
    notifications: { ...notifications, connect({ onChange, onStatus, ...socketOptions }) {
      let stopped = false, disconnect;
      resolveAppIdentity().then(scope => {
        if (stopped) return;
        disconnect = connectNotificationSocket({ ...socketOptions, apiUrl: config.apiUrl,
          environment: /^prod/.test(scope.environment) ? 'prod' : 'sbx', getAccessToken: () => auth.ensureAccessToken(), onChange, onStatus });
      }).catch(() => { if (!stopped) onStatus?.('disconnected'); });
      return () => { stopped = true; disconnect?.(); };
    } },
    loginUrl: returnUrl => auth.loginUrl(returnUrl ?? (config.returnUrl || undefined)),
    login: returnUrl => auth.login(returnUrl ?? (config.returnUrl || undefined)),
    signupUrl: returnUrl => {
      const login = auth.loginUrl(returnUrl ?? (config.returnUrl || undefined));
      if (!login) return '';
      const url = new URL(login); url.pathname = url.pathname.replace(/\/login\/?$/, '/signup'); return url.href;
    },
    initialize: ({ onTwoFactorRequired } = {}) => initialization ??= (async () => {
      await consumeLauncherLogin({ apiUrl: config.apiUrl, tenancyName: config.tenancyName, webAppId: config.webAppId, auth, fetcher: options.fetch, onTwoFactorRequired });
      return auth.init();
    })().finally(() => { initialization = undefined; }),
  };
  return platform;
}
