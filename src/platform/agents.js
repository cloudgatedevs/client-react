/**
 * AI agents for the back office. Every call runs on the server as the Cloudgate account linked in the
 * signed-in user's profile; the app only ever holds its IdP bearer. A 403 with code `agents-link-required`
 * means no linked account, `agents-permission-required` means the app role or the linked account lacks access.
 * Talking to an agent uses the normal chat feature: each agent has one chat group, reached through `chat*`.
 */
import { watchRouteKey } from './agent-watch.js';

export const AGENT_SEVERITY = Object.freeze({ info: 0, warning: 1, critical: 2 });
export const AGENT_INSIGHT_STATUS = Object.freeze({ open: 0, handled: 1, dismissed: 2 });
export const AGENT_SEVERITY_LABELS = Object.freeze(['Info', 'Warning', 'Critical']);

export function agentsAccessState(error) {
  const code = error?.body?.code;
  if (code === 'agents-link-required') return 'unlinked';
  if (code === 'agents-permission-required' || error?.status === 403 || error?.status === 401) return 'forbidden';
  if (error?.status === 404 || error?.code === 'unavailable' || error?.code === 'not-installed') return 'unavailable';
  return 'error';
}

export function createAgentsClient({ request, resolveAppIdentity, projectPath }) {
  const guid = value => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
  // Watches are resolved inside the app's own controllers and environment, like the Logs page.
  const scope = async () => {
    let environment = 'sbx';
    try { environment = /^prod/i.test(String((await resolveAppIdentity?.())?.environment || '')) ? 'prod' : 'sbx'; } catch { /* keep sandbox */ }
    return { environment, projectPath: String(projectPath || '').trim().replace(/^\/+|\/+$/g, '') || '*' };
  };
  return {
    /** Agents with their chat conversation, unread count and people, plus open finding counts. */
    overview: options => request('agents/overview', { ...options, body: {} }),
    attention: ({ skip = 0, take = 25, includeHandled = false, agentId } = {}, options) =>
      request('agents/attention', { ...options, body: { skip, take, includeHandled, ...(guid(agentId) ? { agentId } : {}) } }),
    acknowledge: (id, options) => request('agents/insights/ack', { ...options, body: { id, dismiss: false } }),
    dismiss: (id, options) => request('agents/insights/ack', { ...options, body: { id, dismiss: true } }),
    reopen: (id, options) => request('agents/insights/reopen', { ...options, body: { id } }),
    approve: (id, options) => request('agents/insights/approve', { ...options, body: { id } }),
    /** Root messages of the agent chat, oldest first, with any reply the agent is still writing in `streams`. */
    chatMessages: ({ conversationId, beforeUtc, take = 50 }, options) =>
      request('agents/chat/messages', { ...options, body: { conversationId, take, ...(beforeUtc ? { beforeUtc } : {}) } }),
    chatThread: ({ conversationId, rootMessageId }, options) => request('agents/chat/thread', { ...options, body: { conversationId, rootMessageId } }),
    /** Posts as the linked account. The agent answers in the same chat; poll `chatMessages` or listen for `agentsChanged`. */
    chatSend: ({ conversationId, content, replyToMessageId }, options) =>
      request('agents/chat/send', { ...options, body: { conversationId, content, ...(replyToMessageId ? { replyToMessageId } : {}) } }),
    chatRead: (conversationId, options) => request('agents/chat/read', { ...options, body: { conversationId } }),
    /** For each route a page declares or called: the workflow that answers it and the agents watching it. */
    watchResolve: async (routes, options) => request('agents/watch/resolve', { ...options, body: { ...await scope(),
      routes: (routes || []).filter(route => route?.path).slice(0, 80).map(route => ({ key: route.key || watchRouteKey(route), path: route.path, method: route.method || '' })) } }),
    /** Every workflow the app can call, with its watches and schedules: the pool an undeclared element is matched against. */
    watchWorkflows: async options => request('agents/watch/workflows', { ...options, body: await scope() }),
    /** Workflows agents are watching for this app, optionally for one agent. */
    watchList: async ({ agentId } = {}, options) => request('agents/watch/list', { ...options, body: { ...await scope(), ...(guid(agentId) ? { agentId } : {}) } }),
    /** Attaches an agent to every run of a workflow with an instruction, or removes it with `attached: false`. Needs the approve permission. */
    watchSet: async ({ agentId, endpointId, attached = true, watchPrompt = '', watchSandbox = true, watchProduction = true }, options) =>
      request('agents/watch/set', { ...options, body: { ...await scope(), agentId, endpointId, attached, watchPrompt, watchSandbox, watchProduction } }),
    /**
     * Checks a workflow on a schedule, for reads that otherwise only run when someone opens the page. The agent
     * replays `sampleUrl` (the page's own call) in the app's environment and alerts only when `prompt` is met.
     * Pass `id` to change an existing schedule; `enableWorkflowRuns` consents to adding the Testing tools.
     */
    watchScheduleSet: async ({ id, agentId, endpointId, prompt, intervalMinutes = 60, timeOfDayUtcMinutes, dayOfWeek, isEnabled = true, sampleUrl, enableWorkflowRuns = false }, options) =>
      request('agents/watch/schedule/set', { ...options, body: { ...await scope(), ...(guid(id) ? { id } : {}), agentId, endpointId, prompt, intervalMinutes, isEnabled,
        ...(Number.isInteger(timeOfDayUtcMinutes) ? { timeOfDayUtcMinutes } : {}), ...(Number.isInteger(dayOfWeek) ? { dayOfWeek } : {}),
        ...(sampleUrl ? { sampleUrl: String(sampleUrl).slice(0, 2048) } : {}), enableWorkflowRuns } }),
    watchScheduleDelete: (id, options) => request('agents/watch/schedule/delete', { ...options, body: { id } }),
    /** Runs the schedule's saved request once, as the agent will, and says whether the workflow answered. No agent run, no alert. */
    watchScheduleTest: (id, options) => request('agents/watch/schedule/test', { ...options, body: { id }, timeoutMs: 60000 }),
    /** Runs the check once now without moving its schedule. */
    watchScheduleRun: (id, options) => request('agents/watch/schedule/run', { ...options, body: { id } }),
  };
}
