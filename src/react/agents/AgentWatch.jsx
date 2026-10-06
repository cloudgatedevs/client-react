import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAgents } from './AgentsProvider.jsx';
import { AgentAvatar } from './AgentAvatar.jsx';
import { useCloudgate } from '../context.jsx';
import { callsFor, describeWatchElement, gatewayRoutesFromEntries, lastCallFor, readWatchTarget, watchElementKey } from '../../platform/agent-watch.js';

const TARGET = '[data-cg-feed]';
const targetAt = (x, y) => document.elementFromPoint(x, y)?.closest?.(TARGET) || null;

// Elements that declare no workflow are still targets: an action is the button itself, data is the nearest widget.
const ACTIONS = 'button, [role="button"], input[type="submit"], a[class*="btn"], a[class*="button"]';
const WIDGETS = '.cgw-table, table, form, article, section, [class*="tile"], [class*="card"], [class*="panel"], [class*="chart"], [class*="stat"], [class*="metric"], [class*="kpi"]';
const NOT_ACTIONS = '.cgw-tablist, [role="tablist"], .cgw-table-tools, .cgw-table-toolbar, .cgw-pager, nav, [aria-label="Close"], [class*="close"]';
// While a dialog is open it is the page: its buttons and forms are what the agent can be dropped on.
const scopeOf = start => {
  const dialog = start?.closest?.('[role="dialog"]');
  if (dialog) return dialog.matches('.developer-panel, .cg-agent-bubble') || dialog.querySelector('.cg-watch-form') ? null : dialog;
  return document.getElementById('main-content');
};
function autoTargetAt(x, y) {
  const start = document.elementFromPoint(x, y), main = scopeOf(start);
  if (!main || !start || start === main || !main.contains(start)) return null;
  const action = start.closest(ACTIONS);
  if (action && main.contains(action) && !action.closest(NOT_ACTIONS) && !/tile|card/i.test(action.getAttribute('class') || '')) return action;
  const table = start.closest('.cgw-table');
  if (table && main.contains(table)) return table;
  const page = main.getBoundingClientRect();
  for (let node = start; node && node !== main; node = node.parentElement) {
    if (!node.matches(WIDGETS)) continue;
    const box = node.getBoundingClientRect();
    // Big enough to be a widget, small enough not to be the whole page.
    if (box.width >= 80 && box.height >= 36 && box.width * box.height < page.width * Math.max(page.height, 400) * 0.8) return node;
  }
  return null;
}
const labelOf = element => readWatchTarget(element)?.label || describeWatchElement(element).label;

/**
 * Everything around dropping an agent on the page: the avatar that follows the pointer, the highlight on
 * drop targets, the drop itself (or a click in pick mode), and the small agent mark on watched targets.
 */
export function AgentWatchLayer() {
  const agents = useAgents();
  const { client, basePath } = useCloudgate();
  const location = useLocation();
  const ghost = useRef(null), label = useRef(null), hovered = useRef(null), pageStart = useRef(0), firstPage = useRef(true), cache = useRef(new Map()), calls = useRef([]);
  const drag = agents?.available ? agents.drag : null;
  const api = agents?.api, available = Boolean(agents?.available), revision = agents?.watchRevision;

  useEffect(() => {
    if (firstPage.current) { firstPage.current = false; return; }
    pageStart.current = typeof performance !== 'undefined' ? performance.now() : 0;
  }, [location.pathname]);

  // Gateway calls are recorded as they happen: the browser's own resource list has a fixed size and fills up
  // with script and style loads long before a page asks for its data.
  const gatewayUrl = client.config.gatewayUrl;
  useEffect(() => {
    if (!available || typeof PerformanceObserver === 'undefined') return undefined;
    let origin;
    try { origin = new URL(gatewayUrl).origin; } catch { return undefined; }
    const record = entries => {
      for (const entry of entries) if (entry.name.startsWith(origin + '/')) calls.current.push({ name: entry.name, startTime: entry.startTime });
      if (calls.current.length > 300) calls.current = calls.current.slice(-200);
    };
    const observer = new PerformanceObserver(list => record(list.getEntries()));
    try { observer.observe({ type: 'resource', buffered: true }); } catch { return undefined; }
    return () => observer.disconnect();
  }, [available, gatewayUrl]);

  // --- drag and pick ------------------------------------------------------------------------------------
  const drop = (x, y, agent) => {
    const element = targetAt(x, y);
    const widget = element ? null : autoTargetAt(x, y);
    const overPage = Boolean(document.elementFromPoint(x, y)?.closest?.('#main-content'));
    const dialogTitle = widget?.closest?.('[role="dialog"]')?.querySelector('h1, h2, h3')?.textContent?.replace(/\s+/g, ' ').trim();
    agents.endDrag();
    // A declared target also carries the call the page last made to it, which a scheduled check replays.
    const declare = node => { const target = readWatchTarget(node); return target && { ...target, url: lastCallFor(calls.current, gatewayUrl, target.path) }; };
    if (element) {
      const target = declare(element);
      const inputs = callsFor(calls.current, gatewayUrl, target.path, pageStart.current);
      agents.openWatch({ agent, targets: inputs.length ? inputs.map(call => ({ ...call, method: target.method })) : [target], label: target?.label,
        widgetKey: watchElementKey(element, location.pathname, target?.label || target.path) });
      return;
    }
    if (!widget && !overPage) return;
    // Nothing declared under the pointer: match the widget (or the page) against the app's workflows, favouring
    // the ones this page called.
    const declared = [...document.querySelectorAll(`#main-content ${TARGET}`)].map(declare).filter(Boolean);
    const called = gatewayRoutesFromEntries(calls.current, gatewayUrl, pageStart.current);
    const targets = [...new Map([...declared, ...called].map(target => [target.key, target])).values()];
    const described = widget ? describeWatchElement(widget)
      : { kind: 'data', label: document.querySelector('#main-content h1')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 60) || 'this page' };
    // A dialog's button is often just "Create" or "Save": its title says what is being created.
    if (dialogTitle && !described.label.toLowerCase().includes(dialogTitle.toLowerCase())) described.label = `${described.label} · ${dialogTitle}`.slice(0, 60);
    // The page's own path and routes name the resource in the backend's words (a "customer" may be a "profile").
    // The page's own path names the resource; the app's base path ("/backoffice") is not part of that name.
    const context = basePath && location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) : location.pathname;
    // An action has not been called yet, so the routes this page did call are a weak extra clue for it.
    const routes = described.kind === 'action' ? called.map(call => call.path).join(' ') : '';
    agents.openWatch({ agent, targets, label: described.label, page: !widget,
      widgetKey: widget ? watchElementKey(widget, location.pathname, described.label) : undefined,
      auto: { ...described, context, routes } });
  };
  if (agents?.dropRef) agents.dropRef.current = available ? drop : null;

  useEffect(() => {
    if (!drag) return undefined;
    const root = document.documentElement;
    root.classList.add('cg-agent-dragging');
    const picking = drag.mode === 'pick';
    const setHover = element => {
      if (hovered.current === element) return;
      hovered.current?.removeAttribute('data-cg-drop');
      hovered.current = element;
      element?.setAttribute('data-cg-drop', '');
      if (label.current) label.current.textContent = element ? `Watch ${labelOf(element)}` : picking ? 'Click what to watch' : 'Drop on what to watch';
    };
    const move = event => {
      if (ghost.current) ghost.current.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
      setHover(targetAt(event.clientX, event.clientY) || autoTargetAt(event.clientX, event.clientY));
    };
    const cancel = event => { if (event.key === 'Escape') { event.preventDefault(); agents.endDrag(); } };
    const click = event => { event.preventDefault(); event.stopPropagation(); agents.dropRef.current?.(event.clientX, event.clientY, drag.agent); };
    if (drag.point && ghost.current) ghost.current.style.transform = `translate(${drag.point.x + 14}px, ${drag.point.y + 14}px)`;
    setHover(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('keydown', cancel, true);
    // A dragged agent is released by the icon's own handler; pick mode waits for a click here.
    if (picking) window.addEventListener('click', click, true);
    return () => {
      root.classList.remove('cg-agent-dragging');
      hovered.current?.removeAttribute('data-cg-drop'); hovered.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('keydown', cancel, true);
      window.removeEventListener('click', click, true);
    };
  }, [drag]);

  // --- marks on watched targets -------------------------------------------------------------------------
  const sync = useCallback(async () => {
    if (!api?.watchResolve) return;
    const elements = [...document.querySelectorAll(TARGET)];
    const targets = elements.map(readWatchTarget);
    const unknown = [...new Map(targets.filter(target => target && !cache.current.has(target.key)).map(target => [target.key, target])).values()].slice(0, 60);
    if (unknown.length) {
      try {
        const result = await api.watchResolve(unknown);
        for (const item of result?.items || []) cache.current.set(item.key, item.workflows || []);
      } catch { return; }
    }
    elements.forEach((element, index) => {
      const found = cache.current.get(targets[index]?.key) || [];
      const live = found.flatMap(workflow => workflow.watches || []), scheduled = found.flatMap(workflow => workflow.schedules || []);
      const watches = [...live, ...scheduled];
      if (!watches.length) {
        if (element.hasAttribute('data-cg-watched')) { element.removeAttribute('data-cg-watched'); element.removeAttribute('data-cg-watch-inside'); element.removeAttribute('data-cg-watch-clock'); element.classList.remove('cg-watch-anchor'); element.style.removeProperty('--cg-watch-avatar'); }
        return;
      }
      // A dashed ring marks an element that is only checked on a schedule.
      element.toggleAttribute('data-cg-watch-clock', !live.length);
      const names = [...new Set(watches.map(watch => watch.agentName))].join(', ');
      if (element.getAttribute('data-cg-watched') !== names) element.setAttribute('data-cg-watched', names);
      element.style.setProperty('--cg-watch-avatar', `url("${String(watches[0].avatarUrl || '').replace(/"/g, '%22')}")`);
      const style = getComputedStyle(element);
      if (style.position === 'static') element.classList.add('cg-watch-anchor');
      if (style.overflow !== 'visible') element.setAttribute('data-cg-watch-inside', '');
    });
  }, [api]);

  useEffect(() => {
    if (!available) return undefined;
    cache.current = new Map();
    let timer = setTimeout(sync, 500);
    const schedule = () => { clearTimeout(timer); timer = setTimeout(sync, 700); };
    const page = document.getElementById('main-content');
    const observer = page && typeof MutationObserver !== 'undefined' ? new MutationObserver(schedule) : null;
    observer?.observe(page, { childList: true, subtree: true });
    return () => { clearTimeout(timer); observer?.disconnect(); };
  }, [available, revision, sync, location.pathname]);

  if (!drag || typeof document === 'undefined') return null;
  return createPortal(<>
    <div ref={ghost} className="cg-agent-ghost" aria-hidden="true" style={drag.point ? { transform: `translate(${drag.point.x + 14}px, ${drag.point.y + 14}px)` } : undefined}>
      <AgentAvatar src={drag.agent.avatarUrl} color={drag.agent.avatarColor} name={drag.agent.name} size={34} />
      <span ref={label}>{drag.mode === 'pick' ? 'Click what to watch' : 'Drop on what to watch'}</span>
    </div>
    <div className="cg-agent-drop-hint" role="status">
      {drag.mode === 'pick' ? `Click what ${drag.agent.name} should watch` : `Drop ${drag.agent.name} on what it should watch`} · Esc to cancel
    </div>
  </>, document.body);
}

export { AgentWatchDialog } from './AgentWatchDialog.jsx';
