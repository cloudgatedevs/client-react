import { useWalletAvailability } from '../settings/useWalletAvailability.js';
import { useEffect, useId, useRef, useState } from 'react';
import { Camera, Check, CheckCircle2, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { getProfileDisplayName, useAuthContext } from '../auth/index.js';
import { CloudgateAccountLink } from './CloudgateAccountLink.jsx';
import { UserWallet } from '../components/UserWallet.jsx';
import { UserAvatar } from '../components/UserAvatar.jsx';
import { ProfilePictureEditor } from '../components/ProfilePictureEditor.jsx';
import { EmailVerificationPrompt } from '../components/EmailVerificationPrompt.jsx';

export function Profile({ showAccountLink = true }) {
  const { headerUser } = useAuthContext();
  return headerUser?.user ? <ProfileContent key={headerUser.user.id} user={headerUser.user} showAccountLink={showAccountLink} /> : null;
}

function ProfileContent({ user, showAccountLink }) {
  const walletAvailable = useWalletAvailability();
  const { updateUser } = useAuthContext();
  const id = useId(), photoTrigger = useRef(null), mounted = useRef(false);
  const [photoOpen, setPhotoOpen] = useState(false), [saving, setSaving] = useState(false), [status, setStatus] = useState(null);
  const saved = { name: user.name ?? '', surname: user.surname ?? '', email: user.emailAddress ?? '' };
  const [form, setForm] = useState(saved);
  const baseline = useRef(saved);
  const dirty = Object.keys(saved).some(key => form[key] !== saved[key]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  // Token refreshes must not overwrite a form the user is editing.
  useEffect(() => {
    const previous = baseline.current, next = { name: user.name ?? '', surname: user.surname ?? '', email: user.emailAddress ?? '' };
    baseline.current = next;
    setForm(current => Object.keys(previous).every(key => current[key] === previous[key]) ? next : current);
  }, [user.name, user.surname, user.emailAddress]);
  const name = getProfileDisplayName({ ...user, email: user.emailAddress });
  const valid = form.name.trim() && form.surname.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  async function submit(event) {
    event.preventDefault();
    if (saving || !valid || !dirty) return;
    setStatus(null); setSaving(true);
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    try {
      await updateUser(values);
      if (mounted.current) { setForm(values); setStatus({ message: 'Your profile has been updated.' }); }
    } catch (error) { if (mounted.current) setStatus({ error: true, message: error?.message || 'Could not update your profile. Please try again.' }); }
    finally { if (mounted.current) setSaving(false); }
  }
  const change = key => event => { setForm(value => ({ ...value, [key]: event.target.value })); setStatus(null); };
  return <div className="cg-profile">
    <header className="cg-profile-heading"><p className="cg-account-eyebrow">YOUR ACCOUNT</p><h1>My profile</h1><p>A little more you. Keep your details, photo and wallet together.</p></header>
    <section className="cg-profile-identity card" aria-label="Profile overview">
      <div className="cg-profile-cover" aria-hidden="true" />
      <div className="cg-profile-identity-content">
        <button type="button" ref={photoTrigger} className="cg-profile-photo" aria-label="Change profile picture" onClick={() => setPhotoOpen(true)}>
          <UserAvatar user={user} /><span className="cg-profile-camera"><Camera size={16} /></span>
        </button>
        <div className="cg-profile-identity-copy"><h2>{name}</h2><p>{user.emailAddress}</p>
          <span className={`cg-account-status${user.isEmailConfirmed === true ? ' is-verified' : ''}`}><Mail size={13} />{user.isEmailConfirmed === true ? 'Email verified' : 'Email not verified'}</span>
        </div>
        <span className="cg-profile-photo-hint">Make it yours.<br />Click your photo to update it.</span>
      </div>
    </section>
    <div className={`cg-profile-grid${walletAvailable ? "" : " cg-profile-no-wallet"}`}>
      <div className="cg-profile-main">
        <form className="card cg-profile-form" onSubmit={submit} aria-label="Personal details" aria-busy={saving}>
          <div className="cg-profile-section-heading"><span className="cg-profile-section-icon"><UserRound size={20} /></span><div><h2>Personal details</h2><p>How you appear in this app.</p></div></div>
          <div className="cg-profile-fields">
            <div><label htmlFor={`${id}-name`}>First name</label><input id={`${id}-name`} className="input" autoComplete="given-name" required maxLength={64} value={form.name} onChange={change('name')} disabled={saving} /></div>
            <div><label htmlFor={`${id}-surname`}>Last name</label><input id={`${id}-surname`} className="input" autoComplete="family-name" required maxLength={64} value={form.surname} onChange={change('surname')} disabled={saving} /></div>
            <div className="cg-profile-email"><label htmlFor={`${id}-email`}>Email address</label><input id={`${id}-email`} className="input" type="email" autoComplete="email" required maxLength={256} value={form.email} onChange={change('email')} disabled={saving} /><p>Used for sign-in and account updates.</p></div>
          </div>
          {status && <div className={`cg-profile-feedback${status.error ? ' is-error' : ''}`} role={status.error ? 'alert' : 'status'}>{!status.error && <CheckCircle2 size={17} />}{status.message}</div>}
          <footer className="cg-profile-form-footer"><span>{dirty ? 'You have unsaved changes' : <><Check size={14} />Your details are up to date</>}</span><div>
            {dirty && <button className="btn-ghost" type="button" disabled={saving} onClick={() => { setForm(saved); setStatus(null); }}>Discard</button>}
            <button className="btn-primary" type="submit" disabled={saving || !dirty || !valid}>{saving ? 'SavingÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦' : 'Save changes'}</button>
          </div></footer>
        </form>
        <EmailVerificationPrompt />
        {showAccountLink && <CloudgateAccountLink />}
      </div>
      {walletAvailable && <aside className="cg-profile-aside"><UserWallet /><div className="cg-profile-reassurance"><ShieldCheck size={20} /><p>Your wallet stays yours.<span>Updating your profile does not change your wallet account number or PIN.</span></p></div></aside>}
    </div>
    <ProfilePictureEditor open={photoOpen} onClose={() => setPhotoOpen(false)} returnFocusRef={photoTrigger} />
  </div>;
}
