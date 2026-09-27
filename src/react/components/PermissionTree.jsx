import { useId, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { BACKOFFICE_PERMISSION_TREE as tree, BACKOFFICE_PERMISSION_KEYS as keys, normalizeRolePermissions } from '../../platform/backoffice-permissions.js';

export function PermissionTree({ value, onChange, disabled = false }) {
  const [search, setSearch] = useState('');
  const id = useId();
  const checked = key => ['true', '1'].includes(String(value.find(p => p.key.toLowerCase() === key.toLowerCase())?.value ?? '').toLowerCase());
  const update = (selected, enabled) => {
    const targets = new Set(selected);
    if (enabled && selected.some(key => key !== 'backoffice.access')) targets.add('backoffice.access');
    if (!enabled && selected.includes('backoffice.access')) keys.forEach(key => targets.add(key));
    onChange(normalizeRolePermissions(value).map(p => targets.has(p.key) ? { ...p, value: String(enabled) } : p));
  };
  return <fieldset disabled={disabled} className="permission-tree">
    <legend className="font-semibold text-sm mb-2">Back office permissions</legend>
    <div className="permission-tree-toolbar">
      <label className="permission-tree-search"><Search size={14} /><input className="input" aria-label="Search permissions" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a permission…" /></label>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn-ghost btn-sm" onClick={() => update(keys, true)}>Select all</button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => onChange(normalizeRolePermissions(value).map(p => keys.includes(p.key) ? { ...p, value: String(p.key === 'backoffice.access' || p.key.endsWith('.view') || ['backoffice.payments.history', 'backoffice.payments.testView'].includes(p.key)) } : p))}>Read only</button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => update(keys, false)}>Clear</button></div>
    </div>
    <label className="permission-tree-root"><input type="checkbox" checked={checked('backoffice.access')} onChange={e => update(['backoffice.access'], e.target.checked)} />Back office access</label>
    <div className="permission-tree-groups">{tree.filter(group => group.children).map((group, index) => {
      const matches = text => text.toLowerCase().includes(search.trim().toLowerCase());
      const children = matches(group.label) ? group.children : group.children.filter(item => matches(item.label));
      if (!children.length) return null;
      const count = group.children.filter(item => checked(item.key)).length;
      return <details key={group.label} open={search ? true : undefined} className="permission-tree-group">
        <summary><ChevronRight size={14} aria-hidden="true" /><span>{group.label}</span><span className="text-xs text-mist-dim">{count}/{group.children.length}</span></summary>
        <label className="permission-tree-select-group"><input type="checkbox" checked={count === group.children.length} ref={el => { if (el) el.indeterminate = count > 0 && count < group.children.length; }} onChange={e => update(group.children.map(p => p.key), e.target.checked)} />All {group.label.toLowerCase()} permissions</label>
        {children.map(item => <label key={item.key} htmlFor={`${id}-${index}-${item.key}`} className="permission-tree-leaf"><input id={`${id}-${index}-${item.key}`} type="checkbox" checked={checked(item.key)} onChange={e => update([item.key], e.target.checked)} />{item.label}</label>)}
      </details>;
    })}</div>
  </fieldset>;
}
