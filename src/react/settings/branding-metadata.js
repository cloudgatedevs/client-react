const publicUrl = (value) => {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
};

/** Keep browser metadata aligned with the branded HTML emitted by Cloudgate publishing. */
export function applyBrandingMetadata(document, settings, fallbackIcon = '') {
  const name = settings.app_name.trim();
  const tagline = settings.app_tagline.trim();
  const title = tagline ? `${name} · ${tagline}` : name;
  const description = settings.app_description.trim() || tagline;
  const icon = publicUrl(settings.app_icon_url) || publicUrl(settings.app_logo_url);
  const image = publicUrl(settings.app_logo_url) || icon;
  document.title = title;
  for (const element of document.head.querySelectorAll('meta')) {
    const key = (element.getAttribute('property') || element.getAttribute('name') || '').toLowerCase();
    if (['description', 'application-name', 'og:type', 'og:site_name', 'og:title', 'og:description', 'og:url',
      'twitter:card', 'twitter:title', 'twitter:description', 'twitter:url'].includes(key) ||
      key.startsWith('og:image') || key.startsWith('twitter:image')) element.remove();
  }
  const meta = (attribute, key, content) => {
    if (content == null) return;
    const element = document.createElement('meta');
    element.setAttribute(attribute, key);
    element.content = content;
    document.head.appendChild(element);
  };
  meta('name', 'application-name', name);
  meta('name', 'description', description);
  meta('property', 'og:type', 'website');
  meta('property', 'og:site_name', name);
  meta('property', 'og:title', title);
  meta('property', 'og:description', description);
  meta('property', 'og:url', publicUrl(`${document.location.origin}/`) || null);
  meta('property', 'og:image', image || null);
  meta('property', 'og:image:alt', image ? name : null);
  meta('name', 'twitter:card', 'summary');
  meta('name', 'twitter:title', title);
  meta('name', 'twitter:description', description);
  meta('name', 'twitter:image', image || null);
  meta('name', 'twitter:image:alt', image ? name : null);

  for (const element of document.head.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')) element.remove();
  for (const rel of icon ? ['icon', 'apple-touch-icon'] : ['icon']) {
    const element = document.createElement('link');
    element.rel = rel;
    element.href = icon || fallbackIcon;
    element.dataset.appBrand = 'true';
    document.head.appendChild(element);
  }
}
