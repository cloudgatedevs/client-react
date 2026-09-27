import { createIdpClient, CloudgatePlatformError } from './transport.js';

export class AppAnalyticsError extends CloudgatePlatformError {
  constructor(message, status = 0, code = 'error') { super(message, { status, code }); this.name = 'AppAnalyticsError'; }
}

export function createAppAnalyticsClient({ request, auth, apiUrl, projectPath, environment = 'sbx', preview = false, fetchImpl = globalThis.fetch, resolvePublishedApp = async () => null }) {
  const transport = request ?? createIdpClient({ auth, apiUrl, fetchImpl });
  const path = String(projectPath || '').trim().replace(/^\/+|\/+$/g, '');
  const scope = { projectPath: path, environment, get isProduction() { return /^prod/.test(this.environment); }, get configured() { return !preview && Boolean(request || (apiUrl && auth?.tenancyName)); } };
  async function run(section, body, signal) {
    if (!scope.configured) throw new AppAnalyticsError('Connect this app to Cloudgate and publish it to see its website analytics.', 0, 'unavailable');
    signal?.throwIfAborted();
    const published = await resolvePublishedApp();
    scope.environment = published ? (published.isProduction ? 'prod' : 'sbx') : environment;
    try {
      const value = await transport(`admin/analytics/${section}`, { signal, body: { ...body, projectPath: path, environment: scope.environment, ...(published ? { publishedWebAppId: published.webAppId } : {}) } });
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppAnalyticsError('Cloudgate returned an unexpected analytics response. Please try again.');
      return value;
    } catch (error) {
      if (signal?.aborted || error.name === 'AbortError' || error instanceof AppAnalyticsError) throw error;
      throw new AppAnalyticsError(error.message, error.status, error.code);
    }
  }
  return {
    scope,
    overview: (timePeriod = 3, { signal } = {}) => run('overview', { timePeriod }, signal),
    pages: ({ timePeriod = 3, skip = 0, take = 10, signal } = {}) => run('pages', { timePeriod, skip, take }, signal),
    sessions: ({ timePeriod = 3, skip = 0, take = 10, pagePath = '', signal } = {}) => run('sessions', { timePeriod, skip, take, ...(pagePath ? { pagePath } : {}) }, signal),
  };
}
