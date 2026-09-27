import { normalizeSettings } from './appearance-model.js';
import { createAppIdentityResolver, isWebAppId } from './identity.js';

/** Native IdP configuration; no workflow signatures or application database are involved. */
export function createAppearanceClient({ request, publicRequest, webAppId, environment = 'sbx', resolveAppIdentity = createAppIdentityResolver({ webAppId, environment }) }) {
  async function run(action, body = {}) {
    const scope = await resolveAppIdentity();
    if (!isWebAppId(scope.webAppId) || !/^(sbx|sandbox|prod|production)$/.test(scope.environment))
      throw new Error('Appearance needs a Cloudgate web app. Open the published app, or set VITE_CLOUDGATE_WEB_APP_ID for local development.');
    const response = await request(`admin/appearance/${action}`, { body: { ...body, ...scope } });
    if (!response?.values || typeof response.values !== 'object' || Array.isArray(response.values) ||
        typeof response.revision !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(response.revision))
      throw new Error('Cloudgate returned an invalid appearance response. Refresh and try again.');
    return { values: normalizeSettings(response.values), revision: response.revision };
  }
  function write(action, values, revision) {
    if (!revision) return Promise.reject(new Error('Load the saved appearance before making changes.'));
    return run(action, { ...(values ? { values } : {}), revision });
  }
  return {
    async getPublic() {
      const scope = await resolveAppIdentity();
      if (!isWebAppId(scope.webAppId) || !/^(sbx|sandbox|prod|production)$/.test(scope.environment))
        throw new Error('Set the Cloudgate web app ID and environment to load this website.');
      if (!publicRequest) throw new Error('Configure an anonymous Cloudgate request client to load this website.');
      const response = await publicRequest(`website?${new URLSearchParams({ webAppId: scope.webAppId, environment: scope.environment })}`, { method: 'GET' });
      if (typeof response?.allowSelfRegistration !== 'boolean' || !response.values ||
          Array.isArray(response.values) || !['true', 'false'].includes(response.values.enable_public_website) ||
          (Object.hasOwn(response.values, 'require_public_website_login') && !['true', 'false'].includes(response.values.require_public_website_login)) ||
          typeof response.revision !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(response.revision))
        throw new Error('The website settings could not be loaded. Update the Cloudgate server and try again.');
      return { values: normalizeSettings(response.values), revision: response.revision, allowSelfRegistration: response.allowSelfRegistration };
    },
    get: () => run('details'),
    save: (values, revision) => write('update', values, revision),
    reset: (revision) => write('reset', null, revision),
  };
}
