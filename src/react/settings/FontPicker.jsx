import { useId } from 'react';
import { fontVariables, normalizeFonts } from '../../platform/theme-fonts.js';
import { FontSelect } from './FontSelect.jsx';

export function FontPicker({ value, onChange }) {
  const id = useId();
  const fonts = normalizeFonts(value);
  return <fieldset className="space-y-3">
    <legend className="label">Fonts</legend>
    <div className="grid gap-4 sm:grid-cols-2">
      {[['theme_font_body', 'Body font'], ['theme_font_heading', 'Heading font']].map(([key, label]) =>
        <div key={key} className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${id}-${key}`} className="label">{label}</label>
          <FontSelect id={`${id}-${key}`} label={label} value={fonts[key]}
            heading={key === 'theme_font_heading'} bodyFont={fonts.theme_font_body}
            onChange={font => onChange({ [key]: font })} />
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
