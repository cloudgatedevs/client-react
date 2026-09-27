/** Tenant-wide IdP registration policy, authorized by the caller's current back-office permissions. */
export function createRegistrationClient({ request }) {
  async function run(options) {
    const result = await request('admin/registration', options);
    if (typeof result?.allowSelfRegistration !== 'boolean' || result?.scope !== 'tenant')
      throw new Error('Cloudgate returned an invalid registration setting. Reload and try again.');
    if (result.promptForEmailVerification !== undefined && typeof result.promptForEmailVerification !== 'boolean')
      throw new Error('Cloudgate returned an invalid email verification setting. Reload and try again.');
    return { allowSelfRegistration: result.allowSelfRegistration, scope: result.scope,
      ...(result.promptForEmailVerification === undefined ? {} : { promptForEmailVerification: result.promptForEmailVerification }) };
  }
  return {
    get: options => run({ ...options, method: 'GET', body: undefined }),
    update: (values, options) => {
      if (typeof values?.allowSelfRegistration !== 'boolean')
        return Promise.reject(new Error('Choose whether to allow self-registration.'));
      if (values.promptForEmailVerification !== undefined && typeof values.promptForEmailVerification !== 'boolean')
        return Promise.reject(new Error('Choose whether to prompt for email verification.'));
      return run({ ...options, method: 'PUT', body: { allowSelfRegistration: values.allowSelfRegistration,
        ...(values.promptForEmailVerification === undefined ? {} : { promptForEmailVerification: values.promptForEmailVerification }) } });
    },
  };
}
