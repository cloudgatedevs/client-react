import { isWebAppId } from './identity.js';
import { CloudgatePlatformError } from './transport.js';

export const MEDIA_FOLDERS = Object.freeze(['media', 'branding']);
export function createFilesClient({ request, resolveAppIdentity, mediaFolder = '' }) {
  const prefix = String(mediaFolder).trim().replace(/^\/+|\/+$/g, '');
  async function folder(path) {
    if (!MEDIA_FOLDERS.includes(path)) throw new Error('Choose one of this app’s media folders.');
    if (prefix) return `${prefix}/${path}`;
    const scope = await resolveAppIdentity();
    if (!isWebAppId(scope.webAppId)) throw new Error('Open the published app or configure its web app ID to use the media library.');
    return `apps/${scope.webAppId}/${path}`;
  }
  return {
    list: async ({ path = 'media', skip = 0, take = 24, signal } = {}) => request(`files?${new URLSearchParams({ path: await folder(path), skip, take })}`, { method: 'GET', signal }),
    upload: async (file, path = 'media', options = {}) => {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Choose a JPEG, PNG, WebP or GIF image.');
      if (file.size > 10 * 1024 * 1024) throw new Error('Images must be 10 MB or smaller.');
      const body = new FormData(); body.append('file', file, file.name);
      return request(`files/upload?path=${encodeURIComponent(await folder(path))}`, { ...options, body });
    },
    delete: (id, options) => request(`files/${encodeURIComponent(id)}`, { ...options, method: 'DELETE' }),
  };
}

export function createUsersClient({ request, resolveAppIdentity, readLocation = () => globalThis.location }) {
  const run = (action, body = {}, options = {}) => request(`admin/users/${action}`, { ...options, body });
  const appScope = async () => {
    const scope = await resolveAppIdentity?.();
    if (!isWebAppId(scope?.webAppId)) throw new Error('Open the published app or configure its web app ID before inviting users.');
    const location = readLocation();
    const local = location && /^(localhost|127\.0\.0\.1|\[::1\]|[a-z0-9.-]+\.localhost)$/i.test(location.hostname)
      && ['http:', 'https:'].includes(location.protocol) && /^(sbx|sandbox)$/.test(scope.environment);
    return { webAppId: scope.webAppId, ...(local ? { developmentAppUrl: location.origin } : {}) };
  };
  const invite = async (action, values, options) => {
    const value = await run(action, { ...values, ...await appScope() }, options);
    if (!value?.user?.id || typeof value?.invitation?.sent !== 'boolean')
      throw new Error('Unable to verify the invitation. Refresh the users list before retrying.');
    return value;
  };
  return {
    list: (query, options) => run('list', query, options),
    get: (id, options) => run('details', { id }, options),
    create: (user, options) => run('create', user, options),
    invitationApp: async options => {
      const value = await run('invitation-app', await appScope(), options);
      if (!value?.name || !value?.url || !isWebAppId(value.webAppId)) throw new Error('Cloudgate returned an invalid invitation destination.');
      return value;
    },
    invite: ({ email, name, surname, phoneNumber }, options) => invite('invite', { email: email?.trim(), name: name?.trim(), surname: surname?.trim(), phoneNumber: phoneNumber?.trim() }, options),
    resendInvite: (id, options) => invite('resend-invite', { id }, options),
    update: (user, options) => run('update', user, options),
    setRole: (id, role, options) => run('set-role', { id, role }, options),
    setActive: (id, isActive, options) => run('set-active', { id, isActive }, options),
    requestPasswordReset: (id, options) => run('request-password-reset', { id }, options),
    delete: (id, options) => run('delete', { id }, options),
  };
}

export function createSmtpClient({ request }) {
  return {
    get: options => request('admin/email-settings/details', options),
    update: (values, options) => request('admin/email-settings/update', { ...options, body: values }),
    delete: options => request('admin/email-settings/delete', options),
    sendTest: (to, options) => request('admin/email-settings/send-test', { ...options, body: { to } }),
  };
}

export class WorkflowLogsError extends CloudgatePlatformError {
  constructor(message, status = 0, code = 'error') { super(message, { status, code }); this.name = 'WorkflowLogsError'; }
}
/** Native observability API. An omitted controller uses the server's tenant-scoped all-controllers view. */
export function createWorkflowLogsClient({ request, projectPath = '', resolveAppIdentity }) {
  const configuredPath = String(projectPath ?? '').trim();
  const path = configuredPath ? configuredPath.replace(/^\/+|\/+$/g, '') : '*';
  const scope = { projectPath: path, environment: '', get isProduction() { return /^(prod|production)$/.test(this.environment); }, configured: Boolean(path) };
  async function run(action, body = {}, options) {
    if (!path) throw new WorkflowLogsError('The configured workflow controller path is invalid. Set a controller path or leave it empty for all accessible controllers.', 0, 'configuration');
    const identity = await resolveAppIdentity();
    scope.environment = identity.environment;
    try { return await request(`admin/workflow-logs/${action}`, { ...options, body: { ...body, projectPath: path, environment: identity.environment } }); }
    catch (error) { throw new WorkflowLogsError(error.message, error.status, error.code); }
  }
  return {
    scope,
    list: ({ signal, ...query } = {}) => run('list', query, { signal }),
    summary: (periodHours = 24, options) => run('summary', { periodHours }, options),
    get: (id, options) => run('get', { id }, options),
    nodes: (sessionId, options) => run('nodes', { sessionId }, options).then(value => value?.items ?? []),
  };
}
