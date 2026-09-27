import { useState } from 'react';
import { Check, Clock3, Code2, Mail } from 'lucide-react';
import { fmtDate, utcDate } from '../components/ui.jsx';

export function UserAvatar({ user, photoUrl = user.photoUrl }) {
  const [failed, setFailed] = useState(null);
  const photo = typeof photoUrl === 'string' ? photoUrl.trim() : '';
  return <span className="person-avatar user-list-avatar" aria-hidden="true">
    {photo && photo !== failed ? <img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(photo)} />
      : <>{(user.name || user.email || '?').slice(0, 1).toUpperCase()}{user.surname?.slice(0, 1).toUpperCase()}</>}
  </span>;
}

export function UserEmail({ user }) {
  const confirmed = user.isEmailConfirmed;
  const Icon = confirmed === true ? Check : confirmed === false ? Clock3 : Mail;
  return <div className="user-list-stack">
    <span className="user-list-email" title={user.email}>{user.email || '—'}</span>
    <span className={`user-email-status${confirmed === true ? ' is-verified' : ''}`}>
      <Icon size={12} aria-hidden="true" />{confirmed === true ? 'Verified' : confirmed === false ? 'Unverified' : 'Verification unknown'}
    </span>
  </div>;
}

export function formatMetadata(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  return JSON.stringify(value, null, 2);
}

export function UserContact({ user, onMetadata }) {
  const fields = [['Phone', user.phoneNumber], ['ID no.', user.identityNumber], ['Address', user.address]]
    .filter(([, value]) => value != null && String(value).trim());
  const metadata = formatMetadata(user.metadata);
  return <div className="user-list-stack user-contact">
    {fields.map(([label, value]) => <div key={label} className="user-detail-line"><span>{label}</span><span title={value}>{value}</span></div>)}
    {metadata && <button type="button" className="user-metadata-link" aria-label={`View metadata for ${user.email}`} onClick={() => onMetadata(user)}>
      <Code2 size={13} aria-hidden="true" />View metadata</button>}
    {!fields.length && !metadata && <span className="text-mist-dim">—</span>}
  </div>;
}

function ActivityDate({ value, empty = '—' }) {
  const date = utcDate(value);
  if (!date || Number.isNaN(date.getTime())) return <span>{empty}</span>;
  return <time dateTime={date.toISOString()} title={fmtDate(value)}>{date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>;
}

export function UserActivity({ user }) {
  return <div className="user-list-stack user-activity">
    <div className="user-detail-line"><span>Joined</span><ActivityDate value={user.creationTime} /></div>
    <div className="user-detail-line"><span>Last sign-in</span><ActivityDate value={user.lastLoginTimeUtc} empty={user.lastLoginTimeUtc === null ? 'Never' : '—'} /></div>
  </div>;
}
