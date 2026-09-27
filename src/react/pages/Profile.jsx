import { useEffect, useState } from 'react';
import { useAuthContext } from '../auth/index.js';
import { CloudgateAccountLink } from './CloudgateAccountLink.jsx';
import { ProfilePictureCard } from '../components/ProfilePictureCard.jsx';

const Profile = () => {
  const { headerUser, updateUser } = useAuthContext();
  const user = headerUser?.user;

  const [form, setForm] = useState({ name: '', surname: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setForm({
      name: user?.name ?? '',
      surname: user?.surname ?? '',
      email: user?.emailAddress ?? '',
    });
  }, [user?.name, user?.surname, user?.emailAddress]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);
    setSaving(true);
    try {
      await updateUser({ name: form.name, surname: form.surname, email: form.email });
      setStatus({ type: 'success', message: 'Profile updated.' });
    } catch (error) {
      setStatus({ type: 'error', message: error?.message || 'Could not update profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <h1 className="hidden text-2xl font-semibold text-mist lg:block">Profile</h1>
        <p className="text-sm text-mist-muted lg:mt-1">Update the details on your IdP account.</p>
      </div>

      <ProfilePictureCard />
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 card p-6">
        {status && (
          <div
            className={[
              'rounded-lg px-4 py-3 text-sm',
              status.type === 'success' ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-400/25' : 'bg-red-500/12 text-red-700 dark:text-red-300 ring-1 ring-red-400/25',
            ].join(' ')}
          >
            {status.message}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-mist-muted" htmlFor="name">
            First name
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-mist-muted" htmlFor="surname">
            Last name
          </label>
          <input
            id="surname"
            type="text"
            value={form.surname}
            onChange={handleChange('surname')}
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-mist-muted" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            className="input"
          />
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
      <CloudgateAccountLink />
    </div>
  );
};

export { Profile };
