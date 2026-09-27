import { safeNotificationLink } from './notifications.js';

export const NOTIFICATION_STYLES = Object.freeze(['info', 'success', 'warning', 'danger']);
export function validateNotification(values) {
  if (!values || typeof values.allUsers !== 'boolean' || (values.allUsers ? values.userId != null : !Number.isSafeInteger(values.userId) || values.userId <= 0))
    return 'Select one app user or all app users.';
  for (const [key, label, max, required] of [['title', 'Title', 160, true], ['body', 'Message', 4000, true], ['actionUrl', 'Action link', 2048], ['actionLabel', 'Action label', 80]]) {
    const value = values[key];
    if (required && (typeof value !== 'string' || !value.trim())) return `Enter a ${label.toLowerCase()}.`;
    if (value != null && (typeof value !== 'string' || value.length > max)) return `${label} must be at most ${max.toLocaleString()} characters.`;
  }
  if (!NOTIFICATION_STYLES.includes(values.style ?? 'info')) return 'Choose Info, Success, Warning or Danger.';
  if (values.actionUrl?.trim() && !safeNotificationLink(values.actionUrl)) return 'Use a local /path or an HTTP(S) action link without credentials.';
  if (values.actionLabel?.trim() && !values.actionUrl?.trim()) return 'An action label requires an action link.';
  return null;
}

function paging({ skip = 0, take = 25 }) {
  if (!Number.isInteger(skip) || skip < 0 || !Number.isInteger(take) || take < 1 || take > 100) throw new Error('Use skip >= 0 and take between 1 and 100.');
  return { skip, take };
}
function pageResult(value) {
  if (!Array.isArray(value?.items) || !Number.isInteger(value.totalCount) || value.totalCount < 0) throw new Error('Cloudgate returned an invalid notification list.');
  return value;
}

/** Native IdP Admin APIs; the personal inbox remains scoped to the deployed app environment. */
export function createNotificationAdminClient({ request, resolveAppIdentity }) {
  const environment = async value => {
    const selected = value ?? (await resolveAppIdentity()).environment;
    if (['sbx', 'sandbox'].includes(selected)) return 'sbx';
    if (['prod', 'production'].includes(selected)) return 'prod';
    throw new Error('Choose Sandbox or Production.');
  };
  const run = async (action, scope, body, options) => request(`admin/notifications/${action}`, {
    ...options, method: 'POST', body: { ...body, environment: await environment(scope) },
  });
  return {
    history: async (query = {}, options) => pageResult(await run('history', query.environment, paging(query), options)),
    recipients: async (query, options) => {
      if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(query?.id || '') || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(query.id)) throw new Error('Choose a notification.');
      if (query.isRead != null && typeof query.isRead !== 'boolean') throw new Error('Choose a valid read filter.');
      return pageResult(await run('recipients', query.environment, { ...paging(query), id: query.id, ...(query.isRead != null ? { isRead: query.isRead } : {}) }, options));
    },
    send: async (values, options) => {
      const problem = validateNotification(values);
      if (problem) throw new Error(problem);
      // Sending always requires an explicit environment, even when the app has a default.
      if (!values.environment) throw new Error('Choose Sandbox or Production before sending.');
      const result = await run('send', values.environment, {
        allUsers: values.allUsers, ...(values.allUsers ? {} : { userId: values.userId }),
        title: values.title.trim(), body: values.body.trim(), style: values.style ?? 'info',
        actionUrl: values.actionUrl?.trim() || null, actionLabel: values.actionLabel?.trim() || null,
      }, options);
      if (typeof result?.id !== 'string' || !result.id || !Number.isInteger(result.recipientCount) || result.recipientCount < 0)
        throw new Error('Delivery could not be confirmed. Check sent history before sending again.');
      return { id: result.id, recipientCount: result.recipientCount };
    },
  };
}
