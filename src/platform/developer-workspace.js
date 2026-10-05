/** The app receives a one-use launch URL, never an ABP access or refresh token. */
export function createDeveloperWorkspaceClient({ request, resolveAppIdentity, projectPath = '' }) {
  // No configured controller (a fresh template) opens every controller the linked account can access; the
  // session always carries that account's own permissions. Set VITE_CLOUDGATE_API_PROJECT to focus one controller.
  const configuredFocus = String(projectPath ?? '').trim();
  const focus = configuredFocus === '' ? '*' : configuredFocus.replace(/^\/+|\/+$/g, '');
  return {
    async open({ returnUrl, sdkVersion, sdkSource }, options) {
      if (!focus) throw Object.assign(new Error('Developer mode is not set up for this app yet. Set VITE_CLOUDGATE_API_PROJECT to the Cloudgate controller path this app uses, or to * for every controller your account can access, then redeploy the app.'), { code: 'developer-controller-required' });
      if (focus !== '*' && !/^[a-zA-Z0-9_-]{1,256}$/.test(focus)) throw new Error('The configured developer controller path is invalid. Use one controller path or "*".');
      const app = await resolveAppIdentity();
      const url = new URL(returnUrl);
      url.hash = '';
      const value = await request('developer-workspace', { ...options, body: {
        webAppId: app.webAppId, environment: /^prod/.test(app.environment) ? 'prod' : 'sbx', returnUrl: url.href,
        projectPath: focus,
        ...(sdkVersion ? { sdkVersion, sdkSource: sdkSource === 'local' ? 'local' : 'npm' } : {}),
      } });
      if (focus === '*' ? value.controllerId || value.controllerPath !== '*'
        : !value.controllerId || String(value.controllerPath).toLowerCase() !== focus.toLowerCase())
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
    && event.data?.source === 'cloudgate-developer' && (['ready', 'expired', 'error', 'ended', 'environment', 'sdk-update'].includes(event.data.type)
      || event.data.type === 'refresh-app' && typeof event.data.requestId === 'string' && /^[a-f0-9-]{36}$/i.test(event.data.requestId)));
}

// Only the active, trusted workspace can request a reload. Use the parent's own
// location, never a URL supplied by a frame, so the current app route is retained.
export function handleDeveloperAppRefresh(event, frameWindow, frameOrigin, reload = () => window.location.reload()) {
  if (!isDeveloperWorkspaceMessage(event, frameWindow, frameOrigin) || event.data.type !== 'refresh-app') return false;
  event.source.postMessage({ source: 'cloudgate-app', type: 'refresh-app-accepted', requestId: event.data.requestId }, frameOrigin);
  reload();
  return true;
}
