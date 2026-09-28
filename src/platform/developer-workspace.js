/** The app receives a one-use launch URL, never an ABP access or refresh token. */
export function createDeveloperWorkspaceClient({ request, resolveAppIdentity, projectPath = '' }) {
  const configuredFocus = String(projectPath ?? '').trim();
  const focus = configuredFocus.replace(/^\/+|\/+$/g, '');
  return {
    async open({ returnUrl, sdkVersion, sdkSource }, options) {
      if (configuredFocus && !focus) throw new Error('The configured developer controller path is invalid. Set a controller path or leave it empty for all controllers.');
      const app = await resolveAppIdentity();
      const url = new URL(returnUrl);
      url.hash = '';
      const value = await request('developer-workspace', { ...options, body: {
        webAppId: app.webAppId, environment: /^prod/.test(app.environment) ? 'prod' : 'sbx', returnUrl: url.href,
        ...(focus ? { projectPath: focus } : {}),
        ...(sdkVersion ? { sdkVersion, sdkSource: sdkSource === 'local' ? 'local' : 'npm' } : {}),
      } });
      if (focus && (!value.controllerId || String(value.controllerPath).toLowerCase() !== focus.toLowerCase()))
        throw new Error('Cloudgate did not apply the configured controller focus. Update and restart the Cloudgate server, then reconnect.');
      const frame = new URL(value.frameUrl);
      if (!['https:', 'http:'].includes(frame.protocol) || frame.username || frame.password || frame.pathname !== '/developer'
        || (frame.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(frame.hostname) && !frame.hostname.endsWith('.localhost')))
        throw new Error('Cloudgate returned an invalid developer workspace URL.');
      return { ...value, frameUrl: frame.href, frameOrigin: frame.origin };
    },
    async sdkStatus({ runningVersion, sdkSource } = {}, options = {}) {
      const app = await resolveAppIdentity();
      const query = new URLSearchParams({ webAppId: app.webAppId });
      if (runningVersion) query.set('runningVersion', runningVersion);
      if (sdkSource) query.set('sdkSource', sdkSource);
      return request(`developer-workspace/sdk-status?${query}`, { ...options, method: 'GET' });
    },
  };
}

export function isDeveloperWorkspaceMessage(event, frameWindow, frameOrigin) {
  return Boolean(frameWindow && event.source === frameWindow && event.origin === frameOrigin
    && event.data?.source === 'cloudgate-developer' && ['ready', 'expired', 'error', 'ended', 'environment', 'sdk-update'].includes(event.data.type));
}
