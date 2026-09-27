export const EMAIL_TEMPLATE_MAX_LENGTH = 256 * 1024;
export const EMAIL_TEMPLATE_FIELDS = Object.freeze(['body', 'title', 'subTitle', 'name', 'surname', 'email', 'username', 'phoneNumber', 'identityNumber', 'address', 'logoUrl', 'tenancyName', 'year']);

export function validateEmailTemplate(values) {
  if (typeof values?.templateEnabled !== 'boolean' || typeof values?.templateHtml !== 'string')
    return 'Provide the custom template setting and HTML.';
  if (values.templateHtml.length > EMAIL_TEMPLATE_MAX_LENGTH) return 'The email template exceeds the limit of 262,144 characters.';
  if (values.templateEnabled && !values.templateHtml.includes('${body}'))
    return 'Include ${body} so users receive the message and its action link.';
  return null;
}

/** Edits only the IdP email wrapper; SMTP settings and credentials are never round-tripped. */
export function createEmailTemplateClient({ request }) {
  async function run(options) {
    const result = await request('admin/email-template', options);
    if (typeof result?.templateEnabled !== 'boolean' || typeof result?.templateHtml !== 'string' || result?.scope !== 'tenant')
      throw new Error('Cloudgate returned invalid email template settings. Reload and try again.');
    return { templateEnabled: result.templateEnabled, templateHtml: result.templateHtml, scope: result.scope };
  }
  return {
    get: options => run({ ...options, method: 'GET', body: undefined }),
    update: (values, options) => {
      const problem = validateEmailTemplate(values);
      if (problem) return Promise.reject(new Error(problem));
      return run({ ...options, method: 'PUT', body: { templateEnabled: values.templateEnabled, templateHtml: values.templateHtml } });
    },
  };
}
