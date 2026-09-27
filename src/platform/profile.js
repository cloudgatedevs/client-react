import { CloudgatePlatformError } from './transport.js';

export function normalizeProfile(raw) {
  const r = raw?.result ?? raw;
  if (!r || typeof r !== 'object' || (r.id ?? r.Id) == null) throw new CloudgatePlatformError('Cloudgate returned an invalid profile.');
  const permissions = r.rolePermissions ?? r.RolePermissions;
  return { id: r.id ?? r.Id, email: r.email ?? r.Email, name: r.name ?? r.Name, surname: r.surname ?? r.Surname, photoUrl: r.photoUrl ?? r.PhotoUrl ?? null, role: r.role ?? r.Role ?? null, isEmailConfirmed: r.isEmailConfirmed ?? r.IsEmailConfirmed ?? null,
    rolePermissions: Array.isArray(permissions) ? permissions.filter(p => p && typeof (p.key ?? p.Key) === 'string').map(p => ({ key: p.key ?? p.Key, value: String(p.value ?? p.Value ?? '') })) : [],
    ...(typeof (r.promptForEmailVerification ?? r.PromptForEmailVerification) === 'boolean' ? { promptForEmailVerification: r.promptForEmailVerification ?? r.PromptForEmailVerification } : {}) };
}
export function getProfileDisplayName(profile) {
  const name = String(profile?.name ?? '').trim(), surname = String(profile?.surname ?? '').trim();
  return (surname && !name.toLowerCase().endsWith(surname.toLowerCase()) ? `${name} ${surname}`.trim() : name) || profile?.email || 'User';
}
export const getProfilePictureSrc = profile => String(profile?.photoUrl ?? profile?.PhotoUrl ?? '').trim() || undefined;
export const PROFILE_PICTURE_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export function createProfileClient({ request }) {
  return {
    get: options => request('profile', { ...options, method: 'GET' }).then(normalizeProfile),
    resendVerification: async options => {
      const result = await request('profile/resend-verification', { ...options, method: 'POST', body: {} });
      if (typeof result?.sent !== 'boolean' || typeof result.isEmailConfirmed !== 'boolean' || !Number.isInteger(result.retryAfterSeconds) || result.retryAfterSeconds < 0)
        throw new CloudgatePlatformError('Cloudgate could not confirm that the verification email was sent. Try again.');
      return result;
    },
    update: ({ name, surname, email }, options) => request('profile', { ...options, method: 'PUT', body: { name, surname, email } }).then(normalizeProfile),
    uploadPicture: async (file, options) => {
      if (!(file instanceof Blob) || !PROFILE_PICTURE_TYPES.includes(file.type) || file.size === 0 || file.size > PROFILE_PICTURE_MAX_BYTES)
        throw new CloudgatePlatformError('Choose a PNG, JPEG, WebP or GIF image under 5 MB.');
      const body = new FormData();
      body.append('file', file, file.name || 'profile.jpg');
      return request('profile/picture', { ...options, method: 'PUT', body });
    },
    removePicture: options => request('profile/picture', { ...options, method: 'DELETE' }),
  };
}
