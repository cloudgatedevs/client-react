import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { getProfileDisplayName, useAuthContext } from '../auth/index.js';
import { ProfilePictureEditor } from './ProfilePictureEditor.jsx';

export function ProfilePictureCard() {
  const { currentUser } = useAuthContext();
  const user = currentUser?.user;
  const [open, setOpen] = useState(false), [failed, setFailed] = useState(false);
  const trigger = useRef(null);
  useEffect(() => setFailed(false), [user?.id, user?.photoUrl]);
  const name = getProfileDisplayName({ name: user?.name, surname: user?.surname, email: user?.emailAddress });
  return <>
    <section className="card flex items-center gap-4 p-6" aria-labelledby="profile-picture-heading">
      <span className="profile-picture-preview" aria-hidden="true">{user?.photoUrl && !failed
        ? <img src={user.photoUrl} alt="" onError={() => setFailed(true)} /> : name.slice(0, 1).toUpperCase()}</span>
      <div className="min-w-0 space-y-2"><h2 id="profile-picture-heading" className="font-semibold">Profile picture</h2>
        <button ref={trigger} type="button" className="btn-ghost" onClick={() => setOpen(true)}><Camera size={15} />Change profile picture</button>
      </div>
    </section>
    <ProfilePictureEditor open={open} onClose={() => setOpen(false)} returnFocusRef={trigger} />
  </>;
}
