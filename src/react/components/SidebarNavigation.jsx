import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Circle, Folder, Search, X } from 'lucide-react';
import { filterNavigation, navigationSections, navigationTrail } from './navigation.js';

function readPreferences(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return { hidden: saved?.hidden === true, expanded: Object.fromEntries(Object.entries(saved?.expanded || {}).filter(([, value]) => typeof value === 'boolean')) };
  } catch { return { hidden: false, expanded: {} }; }
}

export function useNavigationPreferences(key) {
  const [stored, setStored] = useState(() => ({ key, value: readPreferences(key) }));
  const value = stored.key === key ? stored.value : readPreferences(key);
  const update = useCallback(change => setStored(previous => {
    const before = previous.key === key ? previous.value : readPreferences(key);
    const value = change(before);
    if (value === before && previous.key === key) return previous;
    return { key, value };
  }), [key]);
  useEffect(() => {
    if (stored.key === key) {
      try { localStorage.setItem(key, JSON.stringify(stored.value)); } catch { /* Storage-disabled sessions still work. */ }
    }
  }, [stored, key]);
  return [value, update];
}

function NavigationNode({ item, activeKey, expanded, toggle, searching, onNavigate, platform }) {
  const id = useId();
  const group = Boolean(item.children);
  const Icon = item.icon === null ? null : item.icon || (group ? Folder : Circle);
  const active = item.key === activeKey;
  if (!group) return <li>
    <Link to={item.to} aria-current={active ? 'page' : undefined} onClick={onNavigate}
      title={item.label} className={`nav-item ${active ? 'is-active' : ''}`}>
      {Icon && <Icon className="nav-icon" size={16} strokeWidth={1.7} aria-hidden="true" />}
      <span className="nav-label">{item.label}</span>
    </Link>
  </li>;
  if (!item.children.length) return null;
  const containsActive = items => items.some(child => child.key === activeKey || (child.children && containsActive(child.children)));
  const activeBranch = containsActive(item.children);
  const open = searching || (expanded[item.key] ?? (platform ? activeBranch : item.defaultExpanded ?? false));
  return <li className="nav-group">
    <button type="button" className={`nav-item nav-group-toggle ${activeBranch ? 'has-active' : ''}`}
      aria-expanded={open} aria-controls={id} onClick={() => toggle(item.key, !open)} title={item.label}
      aria-disabled={searching || undefined}>
      {Icon && <Icon className="nav-icon" size={16} strokeWidth={1.7} aria-hidden="true" />}
      <span className="nav-label">{item.label}</span>
      <ChevronRight className={`nav-chevron ${open ? 'is-open' : ''}`} size={13} aria-hidden="true" />
    </button>
    <div id={id} className="nav-children-collapse" data-expanded={open} aria-hidden={!open || undefined} ref={element => { if (element) element.inert = !open; }}>
      <ul className="nav-children">
        {item.children.map(child => <NavigationNode key={child.key} item={child} {...{ activeKey, expanded, toggle, searching, onNavigate, platform }} />)}
      </ul>
    </div>
  </li>;
}

export function SidebarNavigation({ navigation, preferences, updatePreferences, query, setQuery, onNavigate }) {
  const { pathname } = useLocation();
  const inputId = useId();
  const sections = useMemo(() => navigationSections(navigation), [navigation]);
  const trail = useMemo(() => navigationTrail(pathname, sections.flatMap(section => section.items)), [pathname, sections]);
  const activeKey = trail.at(-1)?.key;
  const activePlatform = sections.some(section => section.platform && section.items.includes(trail[0]));
  const [platformExpansion, setPlatformExpansion] = useState({ pathname, groups: {} });
  // Administration opens the active branch by default. Manual toggles last only on this page.
  useEffect(() => { setPlatformExpansion({ pathname, groups: {} }); }, [pathname, updatePreferences]);
  const platformExpanded = platformExpansion.pathname === pathname ? platformExpansion.groups : {};
  // App modules retain their preferences and reveal the ancestors of a new route.
  useEffect(() => {
    if (activePlatform) return;
    const keys = trail.filter(item => item.children).map(item => item.key);
    if (keys.length) updatePreferences(previous => keys.every(key => previous.expanded[key]) ? previous
      : { ...previous, expanded: { ...previous.expanded, ...Object.fromEntries(keys.map(key => [key, true])) } });
  }, [trail, activePlatform, updatePreferences]);
  const searching = Boolean(query.trim());
  const filtered = sections.map(section => ({ ...section, items: filterNavigation(section.items, query, section.label) })).filter(section => section.items.length);
  const toggle = (key, open) => {
    if (!searching) updatePreferences(previous => ({ ...previous, expanded: { ...previous.expanded, [key]: open } }));
  };
  const togglePlatform = (key, open) => {
    if (!searching) setPlatformExpansion(previous => ({ pathname,
      groups: { ...(previous.pathname === pathname ? previous.groups : {}), [key]: open } }));
  };
  return <>
    <div className="nav-search">
      <Search size={15} aria-hidden="true" />
      <label htmlFor={inputId} className="sr-only">Search menu</label>
      <input id={inputId} type="search" placeholder="Find a page…" value={query} autoComplete="off"
        onChange={event => setQuery(event.target.value)} onKeyDown={event => {
          if (event.key === 'Escape' && query) { event.preventDefault(); event.stopPropagation(); setQuery(''); }
        }} />
      {query && <button type="button" aria-label="Clear menu search" onClick={() => { setQuery(''); document.getElementById(inputId)?.focus(); }}><X size={14} /></button>}
    </div>
    <nav aria-label="Back office" className={`sidebar-nav ${searching ? 'is-searching' : ''}`}>
      {filtered.map(section => <div key={section.key} className={`nav-section ${section.platform ? 'nav-platform' : 'nav-app'}`}>
        {section.label && <p className="nav-section-label">{section.label}</p>}
        <ul>{section.items.map(item => <NavigationNode key={item.key} item={item}
          platform={section.platform} expanded={section.platform ? platformExpanded : preferences.expanded}
          toggle={section.platform ? togglePlatform : toggle} {...{ activeKey, searching, onNavigate }} />)}</ul>
      </div>)}
      {!filtered.length && <p className="nav-empty" role="status">No pages found. Try another name.</p>}
    </nav>
  </>;
}
