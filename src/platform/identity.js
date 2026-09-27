export const isWebAppId = value => typeof value === 'string' &&
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);

// Published metadata wins over build-time defaults, including the environment.
export function createAppIdentityResolver({ webAppId, environment = 'sbx', resolvePublishedApp = async () => null } = {}) {
  return async () => {
    const published = await resolvePublishedApp();
    if (published && isWebAppId(published.webAppId) && typeof published.isProduction === 'boolean')
      return { webAppId: published.webAppId, environment: published.isProduction ? 'prod' : 'sbx' };
    return { webAppId: String(webAppId || '').trim(), environment: String(environment || 'sbx').trim().toLowerCase() };
  };
}
