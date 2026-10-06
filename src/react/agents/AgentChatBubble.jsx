import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, Check, CornerDownRight, Eye, MessageSquare, MousePointerClick, Pencil, Play, RotateCcw, Send, X, Zap } from 'lucide-react';
import { useAgents } from './AgentsProvider.jsx';
import { AgentAvatar, formatRelativeTime } from './AgentAvatar.jsx';
import { Markdown } from './markdown.jsx';
import { useNotifications } from '../notifications/NotificationsProvider.jsx';
import { AGENT_INSIGHT_STATUS, AGENT_SEVERITY_LABELS } from '../../platform/agents.js';
import { describeCadence } from '../../platform/agent-watch.js';

const EXIT_MS = 260;
const severityClass = ['info', 'warning', 'critical'];
const AGENT_PERSON = 0;

/** Keeps a closing element mounted long enough for its exit animation. */
function usePresence(open) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); return undefined; }
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);
  return open || mounted;
}

// The bubble lives outside any open modal. A modal treats presses outside itself as "close me", pulls focus back
// inside itself and blocks scrolling elsewhere, all through listeners on the document. Stopping these events at
// the bubble keeps it usable on top of a modal without touching the modal.
const stop = event => event.stopPropagation();
const standalone = { onPointerDown: stop, onMouseDown: stop, onTouchStart: stop, onFocus: stop, onBlur: stop, onWheel: stop, onTouchMove: stop };

const plainTitle = message => String(message?.content || '').replace(/[*_`#>]/g, '').split('\n').find(line => line.trim())?.trim().slice(0, 48) || 'this message';

/**
 * The chat bubble above the bottom bar for the agent picked there. It is the agent's normal chat group:
 * findings arrive as cards, people and the agent talk in one feed, and replies to a finding stay in its thread.
 */
export function AgentChatBubble() {
  const agents = useAgents();
  const agentId = agents?.available ? agents.chatAgentId : null;
  const shown = useRef(null);
  if (agentId) shown.current = agentId;
  const present = usePresence(Boolean(agentId));
  if (!agents?.available || !present || typeof document === 'undefined') return null;
  const agent = agents.agents.find(item => item.id === (agentId || shown.current));
  if (!agent) return null;
  return createPortal(<ChatWindow key={agent.id} agents={agents} agent={agent} open={Boolean(agentId)} />, document.body);
}

function ChatWindow({ agents, agent, open }) {
  const { api } = agents;
  const onAgentsChanged = useNotifications()?.onAgentsChanged;
  const conversationId = agent.chatConversationId;
  const [messages, setMessages] = useState(null);
  const [streams, setStreams] = useState([]);
  const [threads, setThreads] = useState({});
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(null);
  const [error, setError] = useState(null);
  const [showWatches, setShowWatches] = useState(false);
  const root = useRef(null), feed = useRef(null), input = useRef(null), threadsRef = useRef({}), waitingRef = useRef(null), seenCount = useRef(-1), agentsRef = useRef(agents), loading = useRef(false);
  threadsRef.current = threads; waitingRef.current = waiting; agentsRef.current = agents;

  const load = useCallback(async () => {
    if (!conversationId || loading.current) return;
    loading.current = true;
    try {
      const result = await api.chatMessages({ conversationId, take: 60 });
      const items = Array.isArray(result?.items) ? result.items : [];
      const live = Array.isArray(result?.streams) ? result.streams : [];
      // Expanded threads, and threads the agent is answering in right now, stay fresh with the feed.
      const roots = [...new Set([...Object.keys(threadsRef.current), ...live.map(stream => stream.rootMessageId).filter(Boolean)])];
      const loaded = Object.fromEntries(await Promise.all(roots.map(async rootMessageId => {
        const thread = await api.chatThread({ conversationId, rootMessageId });
        return [rootMessageId, (Array.isArray(thread?.items) ? thread.items : []).filter(message => message.id !== rootMessageId)];
      })));
      setMessages(items); setStreams(live); setError(null);
      if (roots.length) setThreads(current => ({ ...current, ...Object.fromEntries(Object.entries(loaded).filter(([rootId]) => rootId in threadsRef.current || live.some(stream => stream.rootMessageId === rootId))) }));
      const wait = waitingRef.current;
      if (wait) {
        const pool = wait.rootId ? loaded[wait.rootId] || [] : items;
        const answered = pool.some(message => message.senderPersonId === AGENT_PERSON && !wait.known.has(message.id));
        if ((answered && !live.length) || Date.now() - wait.since > 180000) setWaiting(null);
      }
      if (items.length !== seenCount.current) {
        seenCount.current = items.length;
        api.chatRead(conversationId).then(() => agentsRef.current.refresh()).catch(() => {});
      }
    } catch (failure) {
      setError(failure?.message || 'The chat could not be loaded.');
      setMessages(current => current || []);
    } finally { loading.current = false; }
  }, [api, conversationId]);

  useEffect(() => { load(); }, [load]);
  const busy = Boolean(waiting) || streams.length > 0;
  useEffect(() => {
    if (!open) return undefined;
    const timer = setInterval(load, busy ? 1500 : 12000);
    return () => clearInterval(timer);
  }, [open, load, busy]);
  useEffect(() => onAgentsChanged?.(message => {
    if (message?.type === 'agentsChanged' && (!message.agentId || message.agentId === agent.id)) load();
  }) || undefined, [onAgentsChanged, agent.id, load]);
  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight }); }, [messages?.length, streams, waiting, threads]);
  useEffect(() => { if (open) input.current?.focus({ preventScroll: true }); }, [open]);
  useEffect(() => {
    // Escape closes the bubble first. When the bubble has focus it must not also close a modal underneath.
    const onKey = event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (root.current?.contains(document.activeElement)) { event.preventDefault(); event.stopPropagation(); }
      agentsRef.current.closeChat();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  // A modal watches focus leaving itself and pulls it straight back. When focus is leaving for this bubble, that
  // one event is kept from the modal so the message box can actually be typed in.
  useEffect(() => {
    const leaving = event => { if (root.current?.contains(event.relatedTarget)) event.stopPropagation(); };
    document.addEventListener("focusout", leaving, true);
    return () => document.removeEventListener("focusout", leaving, true);
  }, []);
  // A modal hides everything outside itself from assistive technology; the bubble is in use, so it is not hidden.
  useEffect(() => { if (open) root.current?.removeAttribute('aria-hidden'); });

  const send = useCallback(async (text, root) => {
    const content = String(text || '').trim();
    if (!content || !conversationId) return;
    setSending(true); setError(null);
    const known = new Set([...(messages || []), ...Object.values(threadsRef.current).flat()].map(message => message.id));
    try {
      await api.chatSend({ conversationId, content, replyToMessageId: root?.id });
      setDraft(''); setReplyTo(null);
      if (root) { threadsRef.current = { ...threadsRef.current, [root.id]: threadsRef.current[root.id] || [] }; setThreads(threadsRef.current); }
      const next = { known, rootId: root?.id || null, since: Date.now() };
      waitingRef.current = next; setWaiting(next);
      await load();
    } catch (failure) { setError(failure?.message || 'Your message could not be sent.'); }
    finally { setSending(false); }
  }, [api, conversationId, messages, load]);

  const toggleThread = async root => {
    if (threads[root.id]) { setThreads(current => { const next = { ...current }; delete next[root.id]; return next; }); return; }
    try {
      const thread = await api.chatThread({ conversationId, rootMessageId: root.id });
      setThreads(current => ({ ...current, [root.id]: (Array.isArray(thread?.items) ? thread.items : []).filter(message => message.id !== root.id) }));
    } catch (failure) { setError(failure?.message || 'The replies could not be loaded.'); }
  };

  const nameOf = personId => agent.people?.find(person => person.personId === personId)?.name || 'Teammate';
  const feedStream = streams.find(stream => !stream.rootMessageId);
  const thinking = (rootId = null) => waiting && waiting.rootId === rootId;

  const renderBubble = message => {
    if (message.isSystem) return <p key={message.id} className="cg-chat-system">{message.content}</p>;
    const fromAgent = message.senderPersonId === AGENT_PERSON, mine = !fromAgent && message.senderPersonId === agents.myPersonId;
    return <div key={message.id} className={`cg-chat-msg ${mine ? 'cg-chat-msg--user' : 'cg-chat-msg--agent'}`}>
      {fromAgent && <AgentAvatar src={agent.avatarUrl} color={agent.avatarColor} name={agent.name} size={20} />}
      <div className="cg-chat-bubble">
        {!fromAgent && !mine && <span className="cg-chat-sender">{nameOf(message.senderPersonId)}</span>}
        {message.isDeleted ? <em className="cg-agents-muted">Message deleted</em> : <Markdown text={message.content} />}
        <time dateTime={message.creationTimeUtc}>{formatRelativeTime(message.creationTimeUtc)}</time>
      </div>
    </div>;
  };

  const renderThread = root => {
    const replies = threads[root.id];
    const stream = streams.find(item => item.rootMessageId === root.id);
    const count = Math.max(root.replyCount || 0, replies?.length || 0);
    if (!count && !replies && !stream) return null;
    return <div className="cg-chat-thread">
      <button type="button" className="cg-chat-thread-toggle" aria-expanded={Boolean(replies)} onClick={() => toggleThread(root)}>
        <CornerDownRight size={13} aria-hidden="true" />{replies ? 'Hide replies' : `${count} ${count === 1 ? 'reply' : 'replies'}`}
        {!replies && root.unreadReplyCount > 0 && <span className="cg-chat-thread-new">{root.unreadReplyCount} new</span>}
      </button>
      {replies && <div className="cg-chat-thread-items">
        {replies.map(renderBubble)}
        {(stream || thinking(root.id)) && <StreamBubble agent={agent} text={stream?.text} />}
      </div>}
    </div>;
  };

  return <section ref={root} className="cg-agent-bubble" data-state={open ? 'open' : 'closed'} role="dialog" aria-label={`Chat with ${agent.name}`} {...standalone}>
    <header className="cg-agent-bubble-head">
      <AgentAvatar src={agent.avatarUrl} color={agent.avatarColor} name={agent.name} size={28} />
      <div className="cg-agent-bubble-title">
        <p className="cg-agent-bubble-name">{agent.name}</p>
        <p className="cg-agents-muted">{agent.typeDisplayName}{agent.status === 1 ? ' · Paused' : ''}</p>
      </div>
      <button type="button" className="cg-agent-bubble-close" aria-label={`What ${agent.name} watches`} title="Watching" aria-pressed={showWatches} onClick={() => setShowWatches(value => !value)}><Eye size={14} /></button>
      <button type="button" className="cg-agent-bubble-close" aria-label="Close chat" onClick={() => agents.closeChat()}><X size={14} /></button>
    </header>
    {showWatches ? <WatchList agents={agents} agent={agent} onBack={() => setShowWatches(false)} /> : !conversationId ? <div className="cg-agents-empty">
      <MessageSquare size={26} aria-hidden="true" />
      <p className="cg-agents-empty-title">{agents.canChat ? 'You are not in this agent’s chat yet' : 'Chat is not enabled for your account'}</p>
      <p className="cg-agents-muted">{agents.canChat ? 'Ask a Cloudgate admin to add your account under the agent’s Chat members. Its findings and reports will then arrive here.' : 'Your linked Cloudgate account needs the Chat permission to talk to agents.'}</p>
    </div> : <>
      <div ref={feed} className="cg-chat-feed" aria-live="polite">
        {messages === null && <p className="cg-agents-muted cg-agents-center">Loading…</p>}
        {messages?.length === 0 && !feedStream && !thinking() && <div className="cg-agents-empty">
          <MessageSquare size={26} aria-hidden="true" />
          <p className="cg-agents-empty-title">Ask {agent.name} anything</p>
          <p className="cg-agents-muted">{agent.description || 'Findings and scheduled reports from this agent arrive here.'}</p>
        </div>}
        {messages?.map(message => <div key={message.id} className="cg-chat-item">
          {message.insightId && !message.isDeleted
            ? <InsightCard message={message} agent={agent} agents={agents} busy={sending} reload={load} onReply={() => { setReplyTo(message); input.current?.focus(); }}
                onApprove={() => send(`Approved — go ahead with your proposed action: ${message.insightProposedAction}`, message)} />
            : renderBubble(message)}
          {renderThread(message)}
        </div>)}
        {(feedStream || thinking()) && <StreamBubble agent={agent} text={feedStream?.text} />}
      </div>
      {error && <p className="cg-agents-error cg-chat-error" role="alert">{error}</p>}
      {replyTo && <div className="cg-chat-replying">
        <CornerDownRight size={13} aria-hidden="true" /><span>Replying to <strong>{plainTitle(replyTo)}</strong></span>
        <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><X size={12} /></button>
      </div>}
      <form className="cg-chat-composer" onSubmit={event => { event.preventDefault(); if (!sending) send(draft, replyTo); }}>
        <textarea ref={input} className="input" rows={1} value={draft} placeholder={`Message ${agent.name}…`} aria-label="Message" disabled={sending}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (!sending) send(draft, replyTo); } }} />
        <button type="submit" className="btn-primary" disabled={sending || !draft.trim()} aria-label="Send"><Send size={13} /></button>
      </form>
    </>}
  </section>;
}

/** What this agent watches for the app: live watches and scheduled checks, with edit, Run now, and a way to add one without dragging. */
function WatchList({ agents, agent, onBack }) {
  const [state, setState] = useState({ items: null, error: null });
  const [running, setRunning] = useState(null), [note, setNote] = useState(null);
  useEffect(() => {
    let stopped = false;
    agents.api.watchList({ agentId: agent.id }).then(result => { if (!stopped) setState({ items: Array.isArray(result?.items) ? result.items : [], error: null }); })
      .catch(error => { if (!stopped) setState({ items: [], error }); });
    return () => { stopped = true; };
  }, [agents.api, agent.id, agents.watchRevision]);
  const edit = (workflow, mode, schedule) => agents.openWatch({ agent, mode, endpointId: workflow.endpointId, scheduleId: schedule?.id,
    widgetKey: schedule?.widgetKey, label: schedule?.widgetLabel || workflow.name || workflow.route,
    targets: [{ path: workflow.route, method: workflow.method === 'ANY' ? '' : workflow.method }] });
  const runNow = async schedule => {
    setRunning(schedule.id); setNote(null);
    try { await agents.api.watchScheduleRun(schedule.id); setNote({ text: 'Checking now. A message arrives here only if the condition is met.' }); }
    catch (failure) { setNote({ error: true, text: failure?.message || 'The check could not be started.' }); }
    finally { setRunning(null); }
  };
  const rows = (state.items || []).flatMap(workflow => [
    ...(workflow.watches || []).map(watch => ({ key: `w-${workflow.endpointId}`, workflow, mode: 'runs', icon: Zap, text: watch.watchPrompt || 'No instruction yet: the agent decides what is worth reporting.',
      meta: `When it runs · ${[watch.watchSandbox && 'Sandbox', watch.watchProduction && 'Production'].filter(Boolean).join(' and ') || 'Paused'}` })),
    ...(workflow.schedules || []).map(schedule => ({ key: `s-${schedule.id}`, workflow, mode: 'schedule', icon: CalendarClock, schedule, text: schedule.prompt,
      meta: `${describeCadence(schedule)} · ${schedule.isProduction ? 'Production' : 'Sandbox'}${schedule.isEnabled ? '' : ' · Paused'}${schedule.lastRunAtUtc ? ` · checked ${formatRelativeTime(schedule.lastRunAtUtc)}` : ' · not run yet'}` })),
  ]);
  return <div className="cg-watch-list">
    <div className="cg-watch-list-head">
      <p className="cg-agent-bubble-name">Watching</p>
      <button type="button" className="cg-chat-thread-toggle" onClick={onBack}>Back to chat</button>
    </div>
    <div className="cg-watch-list-items">
      {state.items === null && <p className="cg-agents-muted cg-agents-center">Loading…</p>}
      {state.error && <p className="cg-agents-error" role="alert">{state.error.message || 'The watches could not be loaded.'}</p>}
      {note && <p className={note.error ? 'cg-agents-error' : 'cg-agents-muted'} role="status">{note.text}</p>}
      {state.items && rows.length === 0 && !state.error && <div className="cg-agents-empty">
        <Eye size={24} aria-hidden="true" />
        <p className="cg-agents-empty-title">{agent.name} is not watching anything yet</p>
        <p className="cg-agents-muted">Drag {agent.name} from the bottom bar onto a table to check it on a schedule, or onto an action button to watch every time it runs.</p>
      </div>}
      {rows.map(({ key, workflow, mode, icon: Icon, schedule, text, meta }) => <article key={key} className="cg-watch-item">
        <Icon size={14} className="cg-watch-item-icon" aria-hidden="true" />
        <div className="cg-watch-item-text">
          <p className="cg-watch-item-name">{schedule?.widgetLabel || workflow.name || workflow.route}</p>
          <code>{workflow.method === 'ANY' ? '' : `${workflow.method} `}/{workflow.route}</code>
          <p className="cg-agents-muted">{text}</p>
          <p className="cg-watch-item-env">{meta}</p>
        </div>
        {schedule && <button type="button" className="cg-agent-bubble-close" disabled={running === schedule.id} title="Run now" aria-label={`Run the check on ${schedule.widgetLabel || workflow.name || workflow.route} now`} onClick={() => runNow(schedule)}><Play size={13} /></button>}
        <button type="button" className="cg-agent-bubble-close" title="Edit" aria-label={`Edit the watch on ${schedule?.widgetLabel || workflow.name || workflow.route}`} onClick={() => edit(workflow, mode, schedule)}><Pencil size={13} /></button>
      </article>)}
    </div>
    <div className="cg-watch-list-foot">
      <button type="button" className="btn-ghost btn-sm" onClick={() => agents.beginPick(agent)}><MousePointerClick size={13} /> Watch something on this page</button>
    </div>
  </div>;
}

function StreamBubble({ agent, text }) {
  return <div className="cg-chat-msg cg-chat-msg--agent">
    <AgentAvatar src={agent.avatarUrl} color={agent.avatarColor} name={agent.name} size={20} />
    <div className="cg-chat-bubble">
      {text ? <Markdown text={text} /> : <span className="cg-chat-typing" role="status" aria-label={`${agent.name} is working`}><i /><i /><i /></span>}
    </div>
  </div>;
}

function InsightCard({ message, agent, agents, busy, reload, onReply, onApprove }) {
  const [pending, setPending] = useState(null), [error, setError] = useState(null);
  const run = async (name, action) => {
    setPending(name); setError(null);
    try { await action(); await reload(); } catch (failure) { setError(failure?.message || 'This finding could not be updated.'); } finally { setPending(null); }
  };
  const open = (message.insightStatus ?? AGENT_INSIGHT_STATUS.open) === AGENT_INSIGHT_STATUS.open;
  const state = open ? AGENT_SEVERITY_LABELS[message.insightSeverity] || 'Info' : message.insightStatus === AGENT_INSIGHT_STATUS.dismissed ? 'Dismissed' : 'Handled';
  const locked = Boolean(pending) || busy;
  return <article className={`cg-insight cg-insight--${severityClass[message.insightSeverity] || 'info'} ${open ? '' : 'cg-insight--closed'}`} aria-label={`${state} finding from ${agent.name}`}>
    <header className="cg-insight-head">
      <AgentAvatar src={agent.avatarUrl} color={agent.avatarColor} name={agent.name} size={20} />
      <div className="cg-insight-meta"><span className="cg-insight-agent">{agent.name}</span><time dateTime={message.creationTimeUtc}>{formatRelativeTime(message.creationTimeUtc)}</time></div>
      <span className="cg-insight-state">{state}</span>
    </header>
    <Markdown text={message.content} className="cg-insight-body" />
    {message.insightProposedAction && <div className="cg-insight-action">
      <p className="cg-insight-action-label">Proposed action</p>
      <p>{message.insightProposedAction}</p>
      {message.insightApprovedBy ? <p className="cg-agents-muted">Approved by {message.insightApprovedBy}</p>
        : open && agents.canApprove ? <button type="button" className="btn-primary btn-sm" disabled={locked} onClick={() => run('approve', async () => { await agents.approve(message.insightId); await onApprove(); })}><Play size={12} /> Approve &amp; run</button>
        : open ? <p className="cg-agents-muted">Approving needs a linked Cloudgate account with the agent approval permission.</p> : null}
    </div>}
    {!open && message.insightResolvedBy && <p className="cg-agents-muted">{state} by {message.insightResolvedBy}</p>}
    {error && <p className="cg-agents-error" role="alert">{error}</p>}
    <footer className="cg-insight-foot">
      <button type="button" className="btn-ghost btn-sm" onClick={onReply}><CornerDownRight size={12} /> Reply</button>
      {open ? <>
        <button type="button" className="btn-ghost btn-sm" disabled={locked} onClick={() => run('ack', () => agents.acknowledge(message.insightId))}><Check size={12} /> Handled</button>
        <button type="button" className="btn-ghost btn-sm" disabled={locked} onClick={() => run('dismiss', () => agents.dismiss(message.insightId))}><X size={12} /> Dismiss</button>
      </> : <button type="button" className="btn-ghost btn-sm" disabled={locked} onClick={() => run('reopen', () => agents.reopen(message.insightId))}><RotateCcw size={12} /> Reopen</button>}
    </footer>
  </article>;
}
