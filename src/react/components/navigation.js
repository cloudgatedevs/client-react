import { matchPath } from 'react-router-dom';

// Keep legacy group captions and app order; platform controls always follow app modules.
export function navigationSections(navigation) {
  const sections = new Map();
  for (const item of navigation) {
    const platform = item.section === 'platform';
    const label = platform ? '' : item.group || 'Workspace';
    const key = JSON.stringify([platform ? 'platform' : 'app', label]);
    if (!sections.has(key)) sections.set(key, { key, label, platform, items: [] });
    sections.get(key).items.push(item);
  }
  function nodes(items, parent) {
    return items.map(item => {
      const key = `${parent}/${encodeURIComponent(item.id || item.to || item.label)}`;
      return { ...item, key, ...(item.children ? { children: nodes(item.children, key) } : {}) };
    });
  }
  return [...sections.values()].sort((a, b) => Number(a.platform) - Number(b.platform))
    .map(section => ({ ...section, items: nodes(section.items, section.key) }));
}

// A detail route selects its parent link; a more specific link always wins.
export function navigationTrail(pathname, navigation) {
  let best = [], bestScore = -1;
  function visit(items, parents = []) {
    for (const item of items) {
      const trail = [...parents, item];
      if (item.children) visit(item.children, trail);
      else if (item.to && matchPath({ path: item.to, end: item.end ?? item.to === '/' }, pathname)) {
        const score = item.to.split('/').reduce((sum, segment) => sum + (segment === '*' ? 0 : segment.startsWith(':') ? 2 : segment ? 3 : 0), 0);
        if (score > bestScore || (score === bestScore && trail.length > best.length)) {
          best = trail; bestScore = score;
        }
      }
    }
  }
  visit(navigation);
  return best;
}

// Include ancestors in search, so searching a module also exposes its pages.
export function filterNavigation(items, query, ancestors = '') {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return items;
  return items.flatMap(item => {
    const text = `${ancestors} ${item.label} ${(item.keywords || []).join(' ')}`.toLocaleLowerCase();
    if (item.children) {
      const children = filterNavigation(item.children, query, text);
      return children.length ? [{ ...item, children }] : [];
    }
    return terms.every(term => text.includes(term)) ? [item] : [];
  });
}
