import { useEffect, useState } from 'react';
import { getProfileDisplayName } from '../../platform/profile.js';

export function UserAvatar({ user, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user?.id, user?.photoUrl]);
  const name = getProfileDisplayName({ ...user, email: user?.emailAddress });
  const initials = [user?.name, user?.surname].filter(Boolean).map(value => value.trim().slice(0, 1)).join('').slice(0, 2) || name.slice(0, 1);
  return <span className={`cg-user-avatar ${className}`} aria-hidden="true">{user?.photoUrl && !failed
    ? <img src={user.photoUrl} alt="" onError={() => setFailed(true)} /> : initials.toUpperCase()}</span>;
}
