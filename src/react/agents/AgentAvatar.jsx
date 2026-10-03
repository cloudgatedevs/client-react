import { useState } from 'react';
import { Bot } from 'lucide-react';

/** Round agent portrait on its tint; falls back to the agent's initial, then a bot glyph. */
export function AgentAvatar({ src, color, name, size = 32, className = '' }) {
  const [failed, setFailed] = useState(false);
  const initial = String(name || '').trim().charAt(0).toUpperCase();
  return <span className={`cg-agent-avatar ${className}`} style={{ '--cg-agent-size': `${size}px`, '--cg-agent-tint': color || '#64748b' }} aria-hidden="true">
    {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : initial ? <span>{initial}</span> : <Bot size={Math.round(size * 0.55)} />}
  </span>;
}

export function formatRelativeTime(value, now = Date.now()) {
  const time = value instanceof Date ? value.getTime() : Date.parse(String(value).endsWith('Z') || /[+-]\d\d:\d\d$/.test(String(value)) ? value : `${value}Z`);
  if (!Number.isFinite(time)) return '';
  const seconds = Math.round((time - now) / 1000);
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  const format = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }) : null;
  for (const [unit, span] of units) {
    if (Math.abs(seconds) >= span) { const amount = Math.round(seconds / span); return format ? format.format(amount, unit) : `${Math.abs(amount)} ${unit}${Math.abs(amount) === 1 ? '' : 's'} ago`; }
  }
  return 'just now';
}
