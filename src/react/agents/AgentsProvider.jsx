import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, OctagonAlert } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { usePermissions } from '../auth/permissions.jsx';
import { useNotifications } from '../notifications/NotificationsProvider.jsx';
import { useToast } from '../components/Toaster.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { agentsAccessState, AGENT_INSIGHT_STATUS, AGENT_SEVERITY } from '../../platform/agents.js';

const Context = createContext(null);
/** Null outside an AgentsProvider; `available` is false until the linked account and permissions check out. */
export const useAgents = () => useContext(Context);

const EMPTY_COUNTS = Object.freeze({ critical: 0, warning: 0, info: 0, total: 0 });

/**
 * Loads the tenant's AI agents for a back-office user whose profile links a Cloudgate account, keeps their
 * notification counts fresh over the notification socket, and raises a toast when a new warning or critical
 * finding arrives. Renders nothing itself: AgentDockIcons and AgentChatBubble read this context.
 */
export function AgentsProvider({ children, enabled = true, toasts = true }) {
  const { client } = useCloudgate();
  const { can } = usePermissions();
  const onAgentsChanged = useNotifications()?.onAgentsChanged;
  const toaster = useToast();
  const allowed = enabled && can(P.AgentsAccess) && typeof client?.agents?.overview === 'function';
  const [status, setStatus] = useState('idle'); // idle | loading | ready | unlinked | forbidden | unavailable | error
  const [overview, setOverview] = useState(null);
  const [attention, setAttention] = useState({ items: [], totalCount: 0, loading: false, error: null });
  const [chatAgentId, setChatAgentId] = useState(null);
  const [revision, setRevision] = useState(0);
  // drag: an agent being carried to (or picked onto) something on the page; watch: the open watch dialog.
  const [drag, setDrag] = useState(null), [watch, setWatch] = useState(null), [watchRevision, setWatchRevision] = useState(0);
  // Set by the watch layer: what a release at a point means. A ref, so a fast drag cannot outrun React's effects.
  const dropRef = useRef(null);
  const seen = useRef(null), sequence = useRef(0), statusRef = useRef('idle'), chatRef = useRef(null);
  statusRef.current = status; chatRef.current = chatAgentId;

  // New open warnings and critical findings get a toast; the first load only records what already exists.
  const announce = useCallback(items => {
    const ids = new Set(items.map(item => item.id));
    if (seen.current && toasts && toaster) {
      const fresh = items.filter(item => !seen.current.has(item.id) && item.status === AGENT_INSIGHT_STATUS.open
        && item.severity >= AGENT_SEVERITY.warning && item.agentId !== chatRef.current).slice(0, 3);
      for (const item of fresh) {
        const critical = item.severity === AGENT_SEVERITY.critical;
        toaster.toast({ id: `agent-insight-${item.id}`, tone: critical ? 'danger' : 'warning', icon: critical ? OctagonAlert : AlertTriangle, duration: critical ? 15000 : 10000,
          title: item.title || 'New finding', description: `${item.agentName || 'An agent'} needs your attention.`,
          action: { label: 'Open chat', onClick: () => setChatAgentId(item.agentId) } });
      }
    }
    seen.current = seen.current ? new Set([...seen.current, ...ids]) : ids;
  }, [toasts, toaster]);

  const loadAttention = useCallback(async () => {
    const request = ++sequence.current;
    setAttention(current => ({ ...current, loading: true, error: null }));
    try {
      const result = await client.agents.attention({ take: 50 });
      if (request !== sequence.current) return;
      const items = Array.isArray(result?.items) ? result.items : [];
      announce(items);
      setAttention({ items, totalCount: Number(result?.totalCount) || items.length, loading: false, error: null });
    } catch (error) {
      if (request === sequence.current) setAttention(current => ({ ...current, loading: false, error }));
    }
  }, [client, announce]);

  const refresh = useCallback(async () => {
    if (!allowed) return;
    if (statusRef.current === 'idle') setStatus('loading');
    try {
      const result = await client.agents.overview();
      setOverview(result);
      setStatus('ready');
      setRevision(value => value + 1);
      await loadAttention();
    } catch (error) {
      const next = agentsAccessState(error);
      // A transient failure keeps whatever was loaded; the next poll or event retries.
      if (next === 'error' && statusRef.current === 'ready') return;
      setStatus(next);
    }
  }, [allowed, client, loadAttention]);

  useEffect(() => {
    if (!allowed) { setStatus('idle'); setOverview(null); setChatAgentId(null); setDrag(null); setWatch(null); seen.current = null; return undefined; }
    let timer;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(refresh, 400); };
    refresh();
    const poll = setInterval(() => { if (statusRef.current === 'ready') refresh(); }, 60000);
    const unsubscribe = onAgentsChanged?.(message => { if (message?.type !== 'ready' || statusRef.current !== 'ready') schedule(); }) || (() => {});
    window.addEventListener('focus', schedule);
    return () => { clearTimeout(timer); clearInterval(poll); unsubscribe(); window.removeEventListener('focus', schedule); sequence.current++; };
  }, [allowed, refresh, onAgentsChanged]);

  const act = useCallback(async (method, id) => {
    await client.agents[method](id);
    await refresh();
  }, [client, refresh]);

  const value = useMemo(() => {
    const agents = Array.isArray(overview?.agents) ? overview.agents : [];
    const counts = overview ? { critical: overview.openCritical || 0, warning: overview.openWarning || 0, info: overview.openInfo || 0,
      total: (overview.openCritical || 0) + (overview.openWarning || 0) + (overview.openInfo || 0) } : EMPTY_COUNTS;
    return {
      available: allowed && status === 'ready' && agents.length > 0,
      // The viewer may use agents but the app has none yet.
      empty: allowed && status === 'ready' && agents.length === 0, status, overview, agents, counts, revision,
      canApprove: overview?.canApprove === true, canChat: overview?.canChat === true, myPersonId: overview?.myPersonId ?? null,
      attention, refresh,
      acknowledge: id => act('acknowledge', id), dismiss: id => act('dismiss', id), reopen: id => act('reopen', id), approve: id => act('approve', id),
      chatAgentId, openChat: agentId => setChatAgentId(agentId), closeChat: () => setChatAgentId(null),
      toggleChat: agentId => setChatAgentId(current => current === agentId ? null : agentId),
      // Watching: drag an agent onto a marked element (or pick one) and define what it should look for.
      canWatch: overview?.canApprove === true, drag, watch, watchRevision,
      beginDrag: (agent, point) => setDrag({ agent, mode: 'drag', point }),
      beginPick: agent => { setChatAgentId(null); setDrag({ agent, mode: 'pick' }); },
      endDrag: () => setDrag(null), dropRef,
      openWatch: value => setWatch(value), closeWatch: () => setWatch(null),
      watchChanged: () => setWatchRevision(value => value + 1),
      api: client.agents,
    };
  }, [allowed, status, overview, revision, attention, refresh, act, chatAgentId, client, drag, watch, watchRevision]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
