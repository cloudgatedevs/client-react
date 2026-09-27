export const DEFAULT_EMAIL_TEMPLATE = [
  '<!-- Hidden preview text shown in the inbox list -->',
  '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${subTitle}</div>',
  '',
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef1f7" style="background-color:#eef1f7;">',
  '  <tr>',
  '    <td align="center" style="padding:36px 12px;">',
  '      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;font-family:Segoe UI, Helvetica, Arial, sans-serif;">',
  '',
  '        <!-- Accent bar -->',
  '        <tr><td style="height:6px;background-color:#5566ff;background-image:linear-gradient(90deg,#5566ff,#8b5cf6);font-size:0;line-height:0;">&nbsp;</td></tr>',
  '',
  '        <!-- Header with your web app logo -->',
  '        <tr>',
  '          <td align="center" style="padding:30px 40px 6px 40px;">',
  '            <img src="${logoUrl}" height="44" alt="${tenancyName}" style="display:inline-block;border:0;max-height:44px;" />',
  '          </td>',
  '        </tr>',
  '',
  '        <!-- Title -->',
  '        <tr>',
  '          <td align="center" style="padding:16px 40px 0 40px;">',
  '            <h1 style="margin:0 0 8px 0;color:#0a1425;font-size:24px;line-height:1.3;letter-spacing:-0.4px;">${title}</h1>',
  '            <p style="margin:0;color:#697089;font-size:14px;line-height:1.6;">${subTitle}</p>',
  '          </td>',
  '        </tr>',
  '',
  '        <!-- Divider -->',
  '        <tr><td style="padding:24px 40px 0 40px;"><div style="border-top:1px solid #e7eaf3;font-size:0;line-height:0;">&nbsp;</div></td></tr>',
  '',
  '        <!-- Message body (required) -->',
  '        <tr>',
  '          <td style="padding:24px 40px 8px 40px;color:#4a5169;font-size:15px;line-height:1.7;">',
  '            ${body}',
  '          </td>',
  '        </tr>',
  '',
  '        <!-- Footer -->',
  '        <tr>',
  '          <td style="padding:28px 40px 30px 40px;">',
  '            <div style="border-top:1px solid #e7eaf3;padding-top:16px;color:#98a2b3;font-size:12px;line-height:1.7;">',
  '              This email was sent to <a href="mailto:${email}" style="color:#5566ff;text-decoration:none;">${email}</a>.<br />',
  '              &copy; ${year} ${tenancyName}. All rights reserved.',
  '            </div>',
  '          </td>',
  '        </tr>',
  '',
  '      </table>',
  '',
  '      <!-- Sub-footer -->',
  '      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">',
  '        <tr>',
  '          <td align="center" style="padding:14px 20px 0 20px;color:#a5adc2;font-size:11px;line-height:1.6;font-family:Segoe UI, Helvetica, Arial, sans-serif;">',
  '            You are receiving this email because you have an account with ${tenancyName}.',
  '          </td>',
  '        </tr>',
  '      </table>',
  '    </td>',
  '  </tr>',
  '</table>',
].join('\n')

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

/** A sample only. The backend continues to render and send the saved, unmodified HTML. */
export function emailTemplatePreview(html, { apiUrl, tenancyName }) {
  const fields = Object.fromEntries(Object.entries({
    title: 'Reset your password', subtitle: 'A password reset was requested for your account.',
    name: 'Jane', surname: 'Doe', email: 'jane@example.com', username: 'jane.doe',
    phonenumber: '+27 82 555 0100', identitynumber: 'Sample ID', address: '123 Example Street',
    tenancyname: tenancyName, year: new Date().getFullYear(),
    logourl: `${apiUrl}/api/idp/${encodeURIComponent(tenancyName)}/branding/logo`,
  }).map(([key, value]) => [key, escapeHtml(value)]));
  fields.body = '<p><b>Name:</b> Jane Doe<br><b>Email address:</b> jane@example.com</p><p>Click the link below to reset your password.</p><a style="display:inline-block;padding:11px 28px;background:#5566ff;color:white;border-radius:8px;text-decoration:none">Reset</a>';
  const merged = html.replace(/\$\{\s*([A-Za-z0-9_.\- ]+?)\s*\}/g, (_, key) => fields[key.trim().toLowerCase()] ?? '');
  const doc = new DOMParser().parseFromString(merged, 'text/html');
  // Sandbox/CSP are the security boundary. Also remove navigation and active content
  // so sample links and pasted templates cannot navigate even within the preview.
  doc.querySelectorAll('script,iframe,object,embed,base,link,meta').forEach(node => node.remove());
  doc.querySelectorAll('*').forEach(node => {
    for (const attribute of [...node.attributes]) {
      if (/^on/i.test(attribute.name) || ['href', 'xlink:href', 'action', 'formaction', 'target', 'autofocus'].includes(attribute.name.toLowerCase())) node.removeAttribute(attribute.name);
    }
  });
  const policy = doc.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src https: http: data:; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; connect-src 'none'";
  doc.head.prepend(policy);
  const style = doc.createElement('style');
  style.textContent = 'html{color-scheme:light}body{margin:0;background:#eef1f7;font-family:Arial,sans-serif;overflow-wrap:anywhere}img{max-width:100%}';
  doc.head.append(style);
  return '<!doctype html>' + doc.documentElement.outerHTML;
}
