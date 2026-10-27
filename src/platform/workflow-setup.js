/** App workflow setup uses native IdP authorization and the linked developer's Cloudgate permissions. */
export function createWorkflowSetupClient({ request, resolveAppIdentity, projectPath = '' }) {
  async function scope(metadata) {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(metadata?.id || '') || !metadata?.workflows?.file)
      throw new Error('This app does not declare a workflow package in its metadata.');
    const identity = await resolveAppIdentity();
    if (!identity.webAppId || !/^(sbx|sandbox|prod|production)$/.test(identity.environment || ''))
      throw new Error('Configure this app’s Cloudgate identity and environment before checking workflows.');
    return { webAppId: identity.webAppId, appId: metadata.id,
      environment: /^prod/.test(identity.environment) ? 'prod' : 'sbx', projectPath };
  }
  return {
    async status(metadata, options = {}) {
      const input = await scope(metadata);
      const value = await request(`developer-workspace/workflows?${new URLSearchParams(input)}`, { ...options, method: 'GET' });
      if (!value || !['missing', 'ready', 'update-available', 'release-required'].includes(value.status)
        || !/^[a-f0-9]{64}$/.test(value.revision || '') || typeof value.canApply !== 'boolean'
        || typeof value.projectPath !== 'string' || value.appId !== input.appId || value.environment !== input.environment
        || !Array.isArray(value.workflows) || !value.workflows.every(item => item && typeof item.route === 'string'
          && typeof item.name === 'string' && ['missing', 'inactive', 'unpublished', 'release-required', 'ready'].includes(item.state)))
        throw new Error('Cloudgate returned an invalid workflow status. Update the server and try again.');
      return value;
    },
    async apply(metadata, { revision, confirmOverwrite = false } = {}, options = {}) {
      if (!/^[a-f0-9]{64}$/.test(revision || '') || confirmOverwrite !== true)
        throw new Error('Review and confirm the workflow changes before applying them.');
      const input = await scope(metadata);
      const value = await request('developer-workspace/workflows', { ...options, method: 'POST', timeoutMs: 120000,
        body: { ...input, revision, confirmOverwrite: true } });
      if (!value || typeof value.projectPath !== 'string' || !Number.isInteger(value.publishedWorkflowCount)
        || value.publishedWorkflowCount < 1 || !Array.isArray(value.warnings) || !value.warnings.every(message => typeof message === 'string'))
        throw new Error('Cloudgate did not confirm the workflow import. Check the current status before retrying.');
      return value;
    },
  };
}

export function workflowSetupError(error) {
  if (error?.status === 404) return 'Workflow setup is not available on this Cloudgate server yet. Update and restart the server, then check again.';
  if (error?.status === 403) return `${error.message || 'Workflow setup access is unavailable.'} Connect your Cloudgate account in Profile and check that it has permission to manage workflows.`;
  return error?.message || 'Could not check the app’s workflows. Try again.';
}
