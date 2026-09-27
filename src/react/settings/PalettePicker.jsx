import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { PALETTE_PRESETS, PALETTE_ROLES, paletteColors, paletteMatches, paletteVariables, parseCustomPalette, isHex } from '../../platform/appearance-model.js';

function PaletteSample({ colors, dark }) {
  const variables = paletteVariables(colors, dark);
  const tone = key => `rgb(${variables[key]})`;
  return <span className="palette-sample" aria-hidden="true" style={{
    '--sample-bg': tone('--ink-950'), '--sample-card': tone('--ink-850'),
    '--sample-line': tone('--ink-700'), '--sample-text': tone('--mist'),
    '--sample-primary': colors.theme_primary, '--sample-secondary': colors.theme_secondary,
  }}>
    <span className="palette-miniature">
      <span className="palette-mini-sidebar"><i /><i /><i /></span>
      <span className="palette-mini-content"><span className="palette-mini-title" />
        <span className="palette-mini-chart">{[35, 60, 48, 78, 65, 100].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</span>
      </span>
    </span>
    <span className="palette-swatches">{[colors.theme_primary, colors.theme_secondary, tone('--ink-700'), tone('--ink-950'), tone('--mist')].map((color, index) =>
      <i key={index} style={{ background: color }} />)}</span>
  </span>;
}
export function PalettePicker({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const lastEdit = useRef(value.theme_custom_palette);
  const [systemDark, setSystemDark] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const dark = value.theme_mode === 'dark' || (value.theme_mode === 'system' && systemDark);
  const custom = parseCustomPalette(value.theme_custom_palette);
  const colors = paletteColors(value);
  const preset = PALETTE_PRESETS.find(item => paletteMatches(item.colors, colors));
  const customSelected = custom && paletteMatches(custom.colors, colors);
  // Only external changes reset the editor. Do not normalize incomplete hex/name input while typing.
  useEffect(() => {
    if (value.theme_custom_palette !== lastEdit.current) {
      setEditing(false); setDraft(null);
      lastEdit.current = value.theme_custom_palette;
    }
  }, [value.theme_custom_palette]);
  function edit(source = { name: customSelected ? custom.name : 'My palette', colors }) {
    setDraft(source); setEditing(true);
    lastEdit.current = JSON.stringify(source);
    onChange({ ...source.colors, theme_custom_palette: lastEdit.current });
  }
  function changeDraft(patch) {
    const next = { ...draft, ...patch };
    setDraft(next);
    lastEdit.current = JSON.stringify(next);
    onChange({ ...next.colors, theme_custom_palette: lastEdit.current });
  }
  return <section className="palette-picker" aria-label="Colour palette">
    <div className="palette-heading"><div><h2>Colour palette</h2><p>Choose a coordinated palette, then make it your own.</p></div>
      <span className="palette-current">{editing ? draft?.name || 'Custom palette' : customSelected ? custom.name : preset?.name || 'Custom colours'}</span>
    </div>
    <div className="palette-grid">
      {PALETTE_PRESETS.map(item => <button key={item.id} type="button" className="palette-option"
        aria-label={`${item.name} palette`} aria-pressed={!editing && !customSelected && preset?.id === item.id}
        onClick={() => { setEditing(false); onChange({ ...item.colors, theme_custom_palette: custom ? JSON.stringify(custom) : '' }); }}>
        <PaletteSample colors={item.colors} dark={dark} />
        <span className="palette-option-label"><strong>{item.name}</strong>{!editing && !customSelected && preset?.id === item.id && <Check size={15} />}</span>
        <small>{item.description}</small>
      </button>)}
      {custom && <button type="button" className="palette-option" aria-label={`Custom palette: ${custom.name}`}
        aria-pressed={!!customSelected} onClick={() => edit(custom)}>
        <PaletteSample colors={custom.colors} dark={dark} /><span className="palette-option-label"><strong>{custom.name}</strong>{customSelected ? <Check size={15} /> : <Pencil size={14} />}</span>
        <small>Your custom palette</small>
      </button>}
    </div>
    {!editing && <button type="button" className="btn-ghost palette-customize" onClick={() => edit()}>
      {customSelected ? <Pencil size={15} /> : <Plus size={15} />}{customSelected ? 'Edit custom palette' : 'Customize this palette'}
    </button>}
    {editing && draft && <div className="palette-editor">
      <div className="palette-heading"><div><h3>Customize your palette</h3><p>Start with these colours and make them yours.</p></div></div>
      <label className="palette-name"><span className="label">Palette name</span>
        <input className="input" required maxLength={40} value={draft.name} onChange={event => changeDraft({ name: event.target.value })} />
      </label>
      <div className="palette-editor-grid">{PALETTE_ROLES.map(role => <div key={role.key} className="palette-role">
        <label htmlFor={`palette-${role.key}`}>{role.label}</label><p>{role.hint}</p>
        <div className="palette-color-control">
          <input type="color" aria-label={`${role.label} colour picker`} value={isHex(draft.colors[role.key]) ? draft.colors[role.key] : '#000000'}
            onChange={event => changeDraft({ colors: { ...draft.colors, [role.key]: event.target.value } })} />
          <input id={`palette-${role.key}`} aria-label={`${role.label} hex`} required pattern="#[0-9a-fA-F]{6}" maxLength={7}
            spellCheck={false} value={draft.colors[role.key]} onChange={event => changeDraft({ colors: { ...draft.colors, [role.key]: event.target.value } })} />
        </div>
      </div>)}</div>
      <p className="palette-help">Workspace colours adapt to light and dark modes. Text and status colours adjust for readability. Save changes to keep this palette for everyone using this app.</p>
      <button type="button" className="btn-ghost palette-customize" onClick={() => {
        setEditing(false); setDraft(null); lastEdit.current = '';
        onChange({ theme_custom_palette: '' });
      }}><Trash2 size={14} />Remove custom palette</button>
      <p className="palette-help">Removing the saved palette keeps your currently selected colours.</p>
    </div>}
  </section>;
}
