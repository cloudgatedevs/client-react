import { useEffect, useRef } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { useAgents } from './AgentsProvider.jsx';
import { AgentAvatar } from './AgentAvatar.jsx';
import { MetricsAppButton } from './MetricsApp.jsx';

// A modal dialog locks page scroll and turns pointer events off for everything outside it.
const modalOpen = () => typeof document !== 'undefined' && (document.body.hasAttribute('data-scroll-locked') || document.body.style.pointerEvents === 'none');

/** How many things an agent wants the viewer to see: unread chat messages, or open findings when there is no chat. */
export const agentNotificationCount = agent => Math.max(0, Number(agent?.chatConversationId ? agent.unreadCount : agent?.openInsightCount) || 0);

/**
 * One icon per agent for the dark bottom bar. Hover shows the name, the badge above the icon counts that
 * agent's notifications, and a click opens (or closes) its chat bubble. Dragging an icon onto the page starts
 * a watch on whatever it is dropped on. The Metrics-app phone button is always present, whether or not a
 * Cloudgate account is linked or any agents exist: the store links and QR codes need no session. `disabled`
 * greys the agent icons out while the developer workspace is open: clicking an agent calls `onDisabledClick`.
 * The phone still opens its modal above the workspace. With `onCreate`, an app that has no agents yet also
 * shows a dashed "Create agent" circle.
 */
export function AgentDockIcons({ disabled = false, onDisabledClick, onCreate }) {
  const agents = useAgents();
  const press = useRef(null);
  const closeChat = agents?.closeChat, chatting = Boolean(agents?.chatAgentId);
  // While the developer workspace is open the agents step aside: no chat, no dragging, and an open bubble closes.
  useEffect(() => { if (disabled && chatting) closeChat?.(); }, [disabled, chatting]);
  if (!agents?.available) {
    // No agents to show (not linked, no permission, or none created yet): the phone still has its place,
    // and an app that could create agents offers that beside it.
    return <div className="cg-agent-dock" role="group" aria-label="AI agents" onClick={event => event.stopPropagation()}>
      {agents?.empty && onCreate && <button type="button" className="cg-agent-dock-item cg-agent-dock-create" aria-label="Create agent" onClick={() => onCreate()}>
        <Plus size={14} aria-hidden="true" />
        <span className="cg-agent-dock-tip" role="tooltip">Create agent</span>
      </button>}
      <MetricsAppButton />
    </div>;
  }
  // A press that travels a few pixels becomes a drag; the click that may follow it is ignored.
  const pressed = (event, agent) => {
    if (event.button !== 0 || disabled) return;
    // Over an open modal the press must not count as a click outside it, which would close the modal.
    event.stopPropagation();
    press.current = { x: event.clientX, y: event.clientY, dragged: false };
    const move = moveEvent => {
      const start = press.current;
      if (!start || start.dragged || Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) < 6) return;
      start.dragged = true;
      agents.beginDrag(agent, { x: moveEvent.clientX, y: moveEvent.clientY });
    };
    const up = upEvent => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (press.current?.dragged) {
        if (upEvent.type === 'pointerup' && agents.dropRef.current) agents.dropRef.current(upEvent.clientX, upEvent.clientY, agent);
        else agents.endDrag();
      }
      setTimeout(() => { press.current = null; }, 0);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  return <div className="cg-agent-dock" role="group" aria-label="AI agents" onClick={event => event.stopPropagation()}>
    {agents.agents.map(agent => {
      const count = agentNotificationCount(agent), active = agents.chatAgentId === agent.id;
      return <button key={agent.id} type="button" className="cg-agent-dock-item" data-active={active || undefined} data-paused={agent.status === 1 || undefined}
        aria-label={count ? `${agent.name}, ${count} new` : agent.name} aria-haspopup="dialog" aria-expanded={active}
        aria-disabled={disabled || undefined} data-disabled={disabled || undefined} title={disabled ? 'Close the developer workspace to use agents' : undefined}
        onPointerDown={event => pressed(event, agent)} onDragStart={event => event.preventDefault()}
        onMouseDown={event => { if (modalOpen()) event.preventDefault(); }}
        onClick={event => { event.stopPropagation(); if (disabled) { onDisabledClick?.(); return; } if (press.current?.dragged) return; agents.toggleChat(agent.id); }}>
        <AgentAvatar src={agent.avatarUrl} color={agent.avatarColor} name={agent.name} size={26} />
        {count > 0 && <span key={count} className="cg-agent-dock-badge" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
        {!disabled && <span className="cg-agent-dock-tip" role="tooltip">{agent.name}</span>}
      </button>;
    })}
    {/* The agents' alerts also reach a phone: the app that delivers them is offered right beside them. */}
    <MetricsAppButton />
  </div>;
}

/** The same icons in a bar of their own, for users who have agents but no developer bar. */
export function AgentsBar() {
  const agents = useAgents();
  if (!agents?.available) return null;
  return <div className="developer-dock cg-agents-bar">
    <span className="cg-agents-bar-label"><Sparkles size={14} aria-hidden="true" />AI agents</span>
    <AgentDockIcons />
  </div>;
}
