import { isHex, rgb, foreground } from './theme-colors.js';

export const PALETTE_ROLES = [
  { key: 'theme_primary', label: 'Primary', hint: 'Buttons, links and selected items' },
  { key: 'theme_secondary', label: 'Secondary', hint: 'Supporting accents and charts' },
  { key: 'theme_neutral', label: 'Workspace', hint: 'Tint for backgrounds, borders and text' },
  { key: 'theme_success', label: 'Success', hint: 'Successful and healthy states' },
  { key: 'theme_warning', label: 'Warning', hint: 'Pending and attention states' },
  { key: 'theme_danger', label: 'Error', hint: 'Errors and destructive actions' },
  { key: 'theme_info', label: 'Information', hint: 'Informational messages' },
];
export const PALETTE_COLOR_KEYS = PALETTE_ROLES.map(role => role.key);
const palette = (id, name, description, colors) => ({ id, name, description,
  colors: Object.fromEntries(PALETTE_COLOR_KEYS.map((key, i) => [key, colors[i]])) });
export const PALETTE_PRESETS = [
  // Brand pairings inspired by Happy Hues (12, 14, 17) and Radix's accent/neutral approach.
  // Status colours retain their familiar meaning instead of becoming additional brand accents.
  palette('iris', 'Iris & Linen', 'Soft violet · periwinkle · cool linen', ['#6e56cf', '#a2a3e9', '#777b8e', '#398268', '#a47730', '#bc5265', '#497ab2']),
  palette('coastal', 'Coastal', 'Deep teal · sea glass · blue grey', ['#167d8d', '#8fc8bd', '#71838a', '#36846f', '#ab7937', '#ba5d67', '#477cba']),
  palette('sage-clay', 'Sage & Clay', 'Botanical green · clay · warm stone', ['#4d7161', '#cf9a80', '#858679', '#49785b', '#9c7538', '#b65d55', '#567a98']),
  palette('midnight-rose', 'Midnight Rose', 'Dusty blush · lavender · navy ink', ['#eebbc3', '#b8c1ec', '#626984', '#438573', '#aa7c40', '#b9526b', '#6383b8']),
  palette('citrus-mint', 'Citrus & Mint', 'Golden yellow · mint · soft graphite', ['#f2cf4a', '#94c9c4', '#777a80', '#3e8269', '#a47a2f', '#b75d60', '#477f9b']),
  palette('rosewater', 'Rosewater', 'Muted rose · aqua · warm ivory', ['#b76e88', '#8bd3dd', '#90877f', '#4f866b', '#a47736', '#b85065', '#4e8299']),
  palette('terracotta', 'Terracotta & Sand', 'Warm clay · honey · parchment', ['#b96f50', '#d4b779', '#918275', '#62815b', '#9c7333', '#b45958', '#5a8299']),
  palette('graphite', 'Graphite', 'Charcoal · silver sage · quiet stone', ['#41494c', '#a5b9ac', '#838481', '#4e8068', '#9b793c', '#b75d65', '#587f9c']),
];
// Keep existing installations stable when they have only saved primary/secondary colours.
export const PALETTE_DEFAULTS = Object.freeze({
  theme_primary: '#4f46e5', theme_secondary: '#7c3aed', theme_neutral: '#64748b',
  theme_success: '#15803d', theme_warning: '#a16207', theme_danger: '#be123c', theme_info: '#0369a1',
  theme_custom_palette: '',
});
export const paletteColors = values => Object.fromEntries(PALETTE_COLOR_KEYS.map(key =>
  [key, isHex(values?.[key]) ? values[key].toLowerCase() : PALETTE_DEFAULTS[key]]));
export const paletteMatches = (left, right) => PALETTE_COLOR_KEYS.every(key =>
  String(left?.[key]).toLowerCase() === String(right?.[key]).toLowerCase());
export function parseCustomPalette(value) {
  try {
    if (typeof value !== 'string' || value.length > 1024) return null;
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
      Object.keys(parsed).length !== 2 || !Object.hasOwn(parsed, 'name') || !Object.hasOwn(parsed, 'colors') ||
      typeof parsed.name !== 'string' || !parsed.name.trim() || parsed.name.length > 40 ||
      !parsed.colors || typeof parsed.colors !== 'object' || Array.isArray(parsed.colors) ||
      Object.keys(parsed.colors).length !== PALETTE_COLOR_KEYS.length ||
      !PALETTE_COLOR_KEYS.every(key => Object.hasOwn(parsed.colors, key) && isHex(parsed.colors[key]))) return null;
    return { name: parsed.name.trim(), colors: paletteColors(parsed.colors) };
  } catch { return null; }
}

const channels = hex => rgb(hex).split(' ').map(Number);
const mix = (values, target, amount) => values.map((value, i) => Math.round(value * (1 - amount) + (Array.isArray(target) ? target[i] : target) * amount));
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
export function contrastRatio(first, second) {
  const a = luminance(Array.isArray(first) ? first : channels(first));
  const b = luminance(Array.isArray(second) ? second : channels(second));
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
// Text/status colours adapt to every workspace surface; user-selected brand fills are retained.
function readable(color, backgrounds, dark) {
  const values = Array.isArray(color) ? color : channels(color);
  for (let step = 0; step <= 100; step++) {
    const adjusted = mix(values, dark ? 255 : 0, step / 100);
    if (backgrounds.every(background => contrastRatio(adjusted, background) >= 4.5)) return adjusted.join(' ');
  }
  return dark ? '255 255 255' : '0 0 0';
}
export function paletteVariables(values, dark = false) {
  const colors = paletteColors(values), neutral = channels(colors.theme_neutral);
  const stops = dark ? [.88, .84, .77, .68, .55, .35, .15] : [.94, .98, 1, .90, .80, .65, .50];
  const surfaces = stops.map(amount => mix(neutral, dark ? 0 : 255, amount));
  const backgrounds = surfaces.slice(0, 4);
  const variables = Object.fromEntries([950, 900, 850, 800, 700, 600, 500].map((shade, i) => [`--ink-${shade}`, surfaces[i].join(' ')]));
  const brandForeground = foreground(colors.theme_primary);
  Object.assign(variables, {
    '--mist': readable(mix(neutral, dark ? 255 : 0, dark ? .92 : .84), backgrounds, dark),
    '--mist-muted': readable(mix(neutral, dark ? 255 : 0, dark ? .72 : .42), backgrounds, dark),
    '--mist-dim': readable(mix(neutral, dark ? 255 : 0, dark ? .57 : .18), backgrounds, dark),
    '--accent': rgb(colors.theme_primary), '--secondary': rgb(colors.theme_secondary),
    '--accent-fg': contrastRatio(brandForeground.split(' ').map(Number), colors.theme_primary) >= 4.5 ? brandForeground :
      contrastRatio('#ffffff', colors.theme_primary) >= 4.5 ? '255 255 255' : '0 0 0',
    '--accent-text': readable(colors.theme_primary, backgrounds, dark),
  });
  for (const tone of ['success', 'warning', 'danger', 'info']) {
    const fill=readable(colors[`theme_${tone}`], backgrounds, dark);
    variables[`--cgw-${tone}`]=fill;
    // Solid semantic buttons need a foreground chosen against their actual palette fill.
    variables[`--cgw-${tone}-fg`]=contrastRatio(fill.split(' ').map(Number),'#ffffff') >= 4.5 ? '255 255 255' : '0 0 0';
  }
  ['primary', 'secondary', 'success', 'warning', 'danger', 'info'].forEach((tone, i) => {
    variables[`--cgw-chart-${i + 1}`] = `rgb(${readable(colors[`theme_${tone}`], backgrounds, dark)})`;
  });
  return variables;
}
