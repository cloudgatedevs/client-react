import { isWebAppId } from './identity.js';

/** Resolve an app's public proxy switch; credentials never appear in this response. */
export function createGatewayProxyResolver({ gatewayUrl, tenancyName, publicRequest }) {
  const base = String(gatewayUrl || '').trim().replace(/\/+$/, '').replace(/\/(sbx|prod|sandbox|production)$/i, '');
  const explicitProxy = /\/api\/app-proxy\//.test(base);
  const cached = new Map();
  return async scope => {
    // Explicit proxy URLs remain supported for older servers/clients and env exports.
    if (explicitProxy || !base || !isWebAppId(scope?.webAppId))
      return { gatewayUrl: base, proxyEnabled: explicitProxy };
    if (!tenancyName || !publicRequest) throw new Error('Configure the Cloudgate tenant and public settings client to discover the app proxy.');
    const environment = /^prod/i.test(scope.environment) ? 'prod' : 'sbx';
    const key = `${scope.webAppId}:${environment}`;
    let entry = cached.get(key);
    if (!entry || entry.expires <= Date.now()) {
      entry = { expires: Infinity };
      entry.promise = (async () => {
        const settings = await publicRequest(`website?${new URLSearchParams({ webAppId: scope.webAppId, environment })}`, { method: 'GET' });
        if (!settings || typeof settings !== 'object' || Array.isArray(settings) ||
            (settings.gatewayProxy !== undefined && typeof settings.gatewayProxy?.enabled !== 'boolean'))
          throw new Error('Cloudgate returned invalid app proxy settings.');
        // Older servers omit the switch. Network/auth failures never fall back to direct requests.
        const proxyEnabled = settings.gatewayProxy?.enabled === true;
        entry.expires = Date.now() + 30_000;
        return {
          gatewayUrl: proxyEnabled
            ? new URL(`/api/app-proxy/${encodeURIComponent(tenancyName)}/${scope.webAppId}`, base).href
            : base,
          proxyEnabled,
        };
      })().catch(error => { if (cached.get(key) === entry) cached.delete(key); throw error; });
      cached.set(key, entry);
    }
    return entry.promise;
  };
}
