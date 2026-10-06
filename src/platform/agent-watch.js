/**
 * Marks an element as something an AI agent can be dropped on: a data component names the route that loads
 * it, an action button or form names the route it calls. Spread the result onto the element:
 *   <section {...agentWatchProps({ route: 'orders/list', label: 'Orders' })}>
 *   <Button {...agentWatchProps({ route: 'deposits/create', method: 'POST', label: 'Create deposit' })}>
 * Routes are the gateway path the app calls, with or without parameters ("orders/${id}" or "orders/42").
 */
export function agentWatchProps(feed) {
  const value = typeof feed === 'string' ? { route: feed } : feed;
  const route = String(value?.route ?? '').trim().replace(/^\/+/, '');
  if (!route) return {};
  const method = String(value.method ?? '').trim().toUpperCase();
  const label = String(value.label ?? '').trim();
  return { 'data-cg-feed': route, ...(/^(GET|POST|PUT|PATCH|DELETE)$/.test(method) ? { 'data-cg-feed-method': method } : {}), ...(label ? { 'data-cg-feed-label': label.slice(0, 80) } : {}) };
}

/** The declaration on a marked element, or null. `label` falls back to the element's own accessible text. */
export function readWatchTarget(element) {
  const path = element?.getAttribute?.('data-cg-feed')?.trim();
  if (!path) return null;
  const method = element.getAttribute('data-cg-feed-method') || '';
  const label = element.getAttribute('data-cg-feed-label') || element.getAttribute('aria-label') || String(element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) || path;
  return { key: watchRouteKey({ path, method }), path, method, label };
}

export const watchRouteKey = ({ path, method }) => `${String(method || '').toUpperCase()} ${String(path || '').trim()}`.trim();

/**
 * The workflow routes a page called, read from the browser's resource timings so it works however the app
 * fetches. Newest first, one entry per concrete path and query, with the environment segment removed. Methods are not recorded
 * by the browser, so a path served by several workflows resolves to all of them.
 */
export function gatewayRoutesFromEntries(entries, gatewayUrl, since = 0, limit = 40) {
  let origin;
  try { origin = new URL(String(gatewayUrl || '').trim()).origin; } catch { return []; }
  const seen = new Set(), routes = [];
  for (const entry of [...(entries || [])].sort((a, b) => (b.startTime || 0) - (a.startTime || 0))) {
    if ((entry.startTime || 0) < since) continue;
    let url;
    try { url = new URL(entry.name); } catch { continue; }
    if (url.origin !== origin) continue;
    const parts = url.pathname.split('/').filter(Boolean);
    if (!/^(sbx|prod|sandbox|production)$/i.test(parts[0] || '') || parts.length < 2) continue;
    const path = parts.slice(1).map(part => { try { return decodeURIComponent(part); } catch { return part; } }).join('/');
    const requestUrl = parts.slice(1).join('/') + url.search;
    if (seen.has(requestUrl)) continue;
    seen.add(requestUrl);
    // `url` keeps the query the page sent, so a scheduled check can replay the same request.
    routes.push({ key: watchRouteKey({ path: requestUrl }), path, method: '', label: path, url: requestUrl });
    if (routes.length >= limit) break;
  }
  return routes;
}

/** True when a gateway path matches a declared route, whose parameters may be spelled ${id}, {id} or :id. */
export function routeMatches(route, path) {
  const canonical = value => String(value || '').split('?')[0].trim().replace(/^\/+|\/+$/g, '')
    .replace(/\$\{[^}/]*\}|\{[^}/]*\}|(?<=\/):[A-Za-z_]\w*/g, '*').toLowerCase();
  const template = canonical(route), actual = canonical(path);
  if (!template || !actual) return false;
  if (template === actual) return true;
  if (!template.includes('*')) return false;
  return new RegExp('^' + template.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+') + '$').test(actual);
}

/** The most recent call (path and query) the page made to a declared route: what a scheduled check replays. */
export function lastCallFor(entries, gatewayUrl, route) {
  return gatewayRoutesFromEntries(entries, gatewayUrl, 0, 200).find(call => routeMatches(route, call.path))?.url || '';
}

/** All inputs observed for a route, including different filters and route parameters. */
export function callsFor(entries, gatewayUrl, route, since = 0) {
  return gatewayRoutesFromEntries(entries, gatewayUrl, since, 80).filter(call => routeMatches(route, call.path));
}

/** Widget identity is independent of changing counts; no app-specific binding is required. */
export function watchWidgetKey(watch) {
  return watch?.widgetKey || (watch?.auto ? `${watch.auto.context || '/'}::${watch.label || watch.auto.label || ''}`.slice(0, 300) : '');
}

/** Disambiguate equally labelled widgets using their DOM position, without depending on changing values. */
export function watchElementKey(element, page, label) {
  const parts = [];
  for (let node = element; node?.parentElement && node.id !== 'main-content'; node = node.parentElement) {
    const siblings = [...node.parentElement.children].filter(other => other.tagName === node.tagName);
    parts.unshift(`${node.tagName.toLowerCase()}:${siblings.indexOf(node) + 1}`);
    if (node.getAttribute('role') === 'dialog') break;
  }
  return `${page}::${label}::${parts.join('/')}`.slice(0, 300);
}

/** Cadences a scheduled check can run on. Agents never run more often than every 15 minutes. */
export const WATCH_INTERVALS = Object.freeze([
  { minutes: 15, label: 'Every 15 minutes' }, { minutes: 60, label: 'Every hour' }, { minutes: 360, label: 'Every 6 hours' },
  { minutes: 1440, label: 'Every day' }, { minutes: 10080, label: 'Every week' },
]);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const zoneOffset = () => new Date().getTimezoneOffset();
const wrapDay = minutes => minutes < 0 ? [minutes + 1440, -1] : minutes >= 1440 ? [minutes - 1440, 1] : [minutes, 0];

/** A local "HH:MM" (and weekday, 0 = Sunday) as the UTC values a schedule stores. `offsetMinutes` is UTC minus local. */
export function localScheduleToUtc({ time, day } = {}, offsetMinutes = zoneOffset()) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time || ''));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return {};
  const [minutes, shift] = wrapDay(Number(match[1]) * 60 + Number(match[2]) + offsetMinutes);
  return { timeOfDayUtcMinutes: minutes, ...(Number.isInteger(day) ? { dayOfWeek: (day + shift + 7) % 7 } : {}) };
}

export function utcScheduleToLocal({ timeOfDayUtcMinutes, dayOfWeek } = {}, offsetMinutes = zoneOffset()) {
  if (!Number.isInteger(timeOfDayUtcMinutes)) return {};
  const [minutes, shift] = wrapDay(timeOfDayUtcMinutes - offsetMinutes);
  const two = value => String(value).padStart(2, '0');
  return { time: `${two(Math.floor(minutes / 60))}:${two(minutes % 60)}`, ...(Number.isInteger(dayOfWeek) ? { day: (dayOfWeek + shift + 7) % 7 } : {}) };
}

/** "Every hour", "Every day at 08:00", "Every Monday at 08:00", in the viewer's own time zone. */
export function describeCadence({ intervalMinutes, timeOfDayUtcMinutes, dayOfWeek } = {}, offsetMinutes = zoneOffset()) {
  const minutes = Number(intervalMinutes) || 0;
  const local = utcScheduleToLocal({ timeOfDayUtcMinutes, dayOfWeek }, offsetMinutes);
  const at = local.time ? ` at ${local.time}` : '';
  if (minutes === 10080) return `Every ${Number.isInteger(local.day) ? WEEKDAYS[local.day] : 'week'}${at}`;
  if (minutes === 1440) return `Every day${at}`;
  if (minutes > 1440 && minutes % 1440 === 0) return `Every ${minutes / 1440} days`;
  if (minutes === 60) return 'Every hour';
  if (minutes > 60 && minutes % 60 === 0) return `Every ${minutes / 60} hours`;
  return `Every ${minutes} minutes`;
}

/**
 * What an undeclared element on the page is, for matching it to a workflow: buttons, links styled as buttons
 * and forms are actions; everything else (tables, cards, tiles, charts) is data. The label is its accessible
 * name, its heading, or its own short text.
 */
export function describeWatchElement(element) {
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const tag = String(element?.tagName || '').toLowerCase();
  const classes = String(element?.getAttribute?.('class') || '');
  const action = (/^(button|input|form)$/.test(tag) || element?.getAttribute?.('role') === 'button' || (tag === 'a' && /btn|button/i.test(classes))) && !/tile|card/i.test(classes);
  const heading = element?.querySelector?.('h1, h2, h3, h4, caption, [class*="title"], [class*="heading"], [class*="label"]');
  // Rendered text keeps its line breaks, so a tile reading "New customers / 744 / 56%" is labelled by its first line.
  const own = String(element?.innerText ?? element?.textContent ?? '').split('\n').map(clean).find(Boolean);
  const label = clean(element?.getAttribute?.('aria-label')) || clean(heading?.textContent) || own || 'this item';
  return { kind: action ? 'action' : 'data', label: label.slice(0, 60) };
}

const WORD_NOISE = new Set(['the', 'a', 'an', 'of', 'to', 'for', 'and', 'or', 'in', 'on', 'by', 'with', 'all', 'new', 'open', 'view', 'this', 'your']);
/** Words of a label, route or workflow name, singular and lower-case: "Pending KYC cases" and "kyc/case-list" share "kyc" and "case". */
export function watchWords(text) {
  return [...new Set(String(text || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/)
    .map(word => word.length > 4 && word.endsWith('ies') ? word.slice(0, -3) + 'y' : word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word)
    .filter(word => word.length > 1 && !WORD_NOISE.has(word)))];
}

// What a button does, whatever word it uses: "Add", "New" and "Register" all create.
const VERBS = { create: ['create', 'add', 'new', 'register', 'insert', 'invite', 'issue'], update: ['update', 'save', 'edit', 'change', 'set', 'rename'], remove: ['delete', 'remove', 'archive', 'cancel', 'revoke'],
  approve: ['approve', 'accept', 'confirm'], reject: ['reject', 'decline', 'deny'], send: ['send', 'transfer', 'pay', 'withdraw', 'deposit'] };
const VERB_OF = new Map(Object.entries(VERBS).flatMap(([verb, words]) => words.map(word => [word, verb])));
const verbsIn = text => new Set(String(text || '').toLowerCase().split(/[^a-z]+/).map(word => VERB_OF.get(word)).filter(Boolean));

/**
 * Orders an app's workflows by how likely each one is behind an element. Shared words between the element's
 * label and the workflow's name and route count most, weighted so words every workflow has (a controller
 * prefix such as "admin") count little. Workflows the page called always lead for data; a data element prefers
 * a read and an action prefers a write. An action is matched on what it does first ("Create" finds the create
 * workflows), then on `context`: the page's own path (without the app's base path), which names the resource
 * in the backend's words when the screen uses different ones, and weakly on `routes`, the routes the page
 * called. Returns a new array; `matched` false means no word was shared.
 */
export function rankWorkflows(workflows, { label = '', kind = 'data', calledIds, context = '', routes = '' } = {}) {
  const list = Array.isArray(workflows) ? workflows : [];
  const called = calledIds instanceof Set ? calledIds : new Set(calledIds || []);
  const texts = list.map(workflow => `${workflow.name || ''} ${workflow.route || ''}`);
  const words = texts.map(text => new Set(watchWords(text)));
  const frequency = new Map();
  for (const set of words) for (const word of set) frequency.set(word, (frequency.get(word) || 0) + 1);
  const weight = word => Math.log(1 + list.length / frequency.get(word));
  const wanted = watchWords(label), around = watchWords(context).filter(word => !wanted.includes(word));
  // The page's routes are a hint only: they also name lookups the page loads (an app list, a type list).
  const nearby = watchWords(routes).filter(word => !wanted.includes(word) && !around.includes(word));
  const doing = kind === 'action' ? verbsIn(label) : new Set();
  return list.map((workflow, index) => {
    let match = 0, near = 0, hint = 0;
    for (const word of wanted) if (words[index].has(word)) match += weight(word);
    for (const word of around) if (words[index].has(word)) near += weight(word);
    for (const word of nearby) if (words[index].has(word)) hint += weight(word);
    const read = workflow.method === 'GET';
    const fit = kind === 'action' ? (read ? -1 : workflow.method === 'ANY' ? 0.5 : 2) : (read ? 1 : workflow.method === 'ANY' ? 0.5 : -0.5);
    // Data on the page can only have come from a workflow the page called, so those always lead for data.
    const seen = called.has(workflow.endpointId) ? (kind === 'action' ? 0.5 : 1000) : 0;
    // An action usually posts to the resource itself: "profiles", not "accounts/profiles/${id}". So a route that
    // ends on the page's resource leads, and each route parameter counts slightly against it.
    const parts = String(workflow.route || '').split('/').filter(Boolean);
    const tail = watchWords(parts[parts.length - 1] || '');
    const shape = kind !== 'action' ? 0
      : (tail.some(word => around.includes(word) || wanted.includes(word)) ? 3 : 0) - 0.5 * parts.filter(part => /[${}:]/.test(part)).length;
    // A button that creates is not behind a workflow that updates, however many other words they share.
    const verb = doing.size && [...verbsIn(texts[index])].some(item => doing.has(item)) ? 40 : 0;
    return { workflow, match: match + (verb ? 1 : 0), score: match * 4 + near * 4 + hint * 0.25 + verb + fit + seen + shape, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index).map(({ workflow, match, score }) => ({ ...workflow, score, matched: match > 0 }));
}
