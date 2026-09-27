import { useId } from 'react';
import { FONT_OPTIONS, fontVariables, normalizeFonts } from '../../platform/theme-fonts.js';

export function FontPicker({ value, onChange }) {
  const id = useId();
  const fonts = normalizeFonts(value);
  return <fieldset className="space-y-3">
    <legend className="label">Fonts</legend>
    <div className="grid gap-4 sm:grid-cols-2">
      {[['theme_font_body', 'Body font'], ['theme_font_heading', 'Heading font']].map(([key, label]) =>
        <div key={key} className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${id}-${key}`} className="label">{label}</label>
          <select id={`${id}-${key}`} aria-label={label} className="input w-full" value={fonts[key]}
            onChange={event => onChange({ [key]: event.target.value })}>
            {key === 'theme_font_heading' && <option value="inherit">Same as body font</option>}
            {FONT_OPTIONS.map(font => <option key={font.id} value={font.id}>{font.label}</option>)}
          </select>
        </div>)}
    </div>
    <div role="group" aria-label="Font preview" className="space-y-2 rounded-xl border border-ink-700 p-4"
      style={{ ...fontVariables(value), fontFamily: 'var(--font-body)' }}>
      <p className="font-display text-lg font-semibold">Make it your own</p>
      <p className="text-sm text-mist-muted">A clear, comfortable workspace for your team. 0123456789</p>
    </div>
    <p className="text-xs leading-relaxed text-mist-dim">Preview your fonts, then save to apply them to your app. Fonts are included and served with your app.</p>
  </fieldset>;
}
