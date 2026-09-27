// Stable identifiers are persisted by Cloudgate. Never interpolate stored values into CSS.
const sans = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const serif = 'ui-serif, Georgia, Cambria, "Times New Roman", serif';
export const FONT_DEFAULTS = Object.freeze({ theme_font_body: 'inter', theme_font_heading: 'inherit' });
export const FONT_KEYS = Object.freeze(Object.keys(FONT_DEFAULTS));
export const FONT_OPTIONS = Object.freeze([
  ['system', 'System default', 'sans-serif'],
  ['inter', 'Inter', 'sans-serif'],
  ['roboto', 'Roboto', 'sans-serif'],
  ['open-sans', 'Open Sans', 'sans-serif'],
  ['source-sans-3', 'Source Sans 3', 'sans-serif'],
  ['nunito-sans', 'Nunito Sans', 'sans-serif'],
  ['dm-sans', 'DM Sans', 'sans-serif'],
  ['manrope', 'Manrope', 'sans-serif'],
  ['plus-jakarta-sans', 'Plus Jakarta Sans', 'sans-serif'],
  ['montserrat', 'Montserrat', 'sans-serif'],
  ['work-sans', 'Work Sans', 'sans-serif'],
  ['lora', 'Lora', 'serif'],
  ['source-serif-4', 'Source Serif 4', 'serif'],
  ['ibm-plex-sans', 'IBM Plex Sans', 'sans-serif'],
  ['rubik', 'Rubik', 'sans-serif'],
].map(([id, label, category]) => Object.freeze({
  id, label, category,
  family: id === 'system' ? sans : `"Cloudgate ${label}", ${category === 'serif' ? serif : sans}`,
})));
export function isFont(value, heading = false) {
  return (heading && value === 'inherit') || FONT_OPTIONS.some(font => font.id === value);
}
export function normalizeFonts(values = {}) {
  return Object.fromEntries(FONT_KEYS.map(key => [key,
    isFont(values[key], key === 'theme_font_heading') ? values[key] : FONT_DEFAULTS[key],
  ]));
}
export function fontFamily(id) {
  return (FONT_OPTIONS.find(font => font.id === id) || FONT_OPTIONS.find(font => font.id === FONT_DEFAULTS.theme_font_body)).family;
}
export function fontVariables(values = {}) {
  const fonts = normalizeFonts(values);
  return {
    '--font-body': fontFamily(fonts.theme_font_body),
    '--font-heading': fontFamily(fonts.theme_font_heading === 'inherit' ? fonts.theme_font_body : fonts.theme_font_heading),
  };
}
