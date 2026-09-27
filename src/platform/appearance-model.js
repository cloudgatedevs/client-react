import { isHex } from './theme-colors.js';
export { isHex, rgb, foreground, accentText } from './theme-colors.js';
import { PALETTE_DEFAULTS, PALETTE_COLOR_KEYS, PALETTE_PRESETS, parseCustomPalette } from './theme-palette.js';
export * from './theme-palette.js';
import { FONT_DEFAULTS, FONT_KEYS, isFont, normalizeFonts } from './theme-fonts.js';
export * from './theme-fonts.js';

export const DEFAULT_SETTINGS = Object.freeze({
  enable_public_website: 'true',
  require_public_website_login: 'false',
  app_name: 'Admin',
  app_tagline: 'Back office',
  app_description: '',
  app_logo_url: '',
  app_icon_url: '',
  app_url: '',
  support_email: '',
  footer_note: '',
  theme_mode: 'light',
  ...PALETTE_DEFAULTS,
  ...FONT_DEFAULTS,
  theme_density: 'content',
});
export const LAYOUT_PRESETS = Object.freeze([
  {
    value: 'wide',
    label: 'Wide',
    description: 'A broad, centred workspace with generous spacing.',
    detail: 'Up to 1,600 px · relaxed spacing',
  },
  {
    value: 'content',
    label: 'Content',
    description: 'A focused, centred layout for everyday work.',
    detail: 'Up to 1,120 px · comfortable spacing',
  },
  {
    value: 'compact',
    label: 'Compact',
    description: 'More rows and controls in view, with less padding.',
    detail: 'Full width · tight spacing',
  },
  {
    value: 'flex',
    label: 'Flex',
    description: 'Fill the available space and adapt to your screen.',
    detail: 'Full width · balanced spacing',
  },
]);
// Existing installations used "comfortable". Read it as Content without rewriting saved settings.
export const normalizeDensity = (value) =>
  LAYOUT_PRESETS.some((preset) => preset.value === value) ? value : 'content';
// Preserve the tuple API for consumers that only need the two brand colours.
export const THEME_PRESETS = PALETTE_PRESETS.map(({ name, colors }) =>
  [name, colors.theme_primary, colors.theme_secondary]);

export const safeUrl = (value) => !value || /^https?:\/\//i.test(value);
export function normalizeSettings(values = {}) {
  const result = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(result))
    if (typeof values[key] === 'string') result[key] = values[key];
  if (!['light', 'dark', 'system'].includes(result.theme_mode))
    result.theme_mode = 'light';
  Object.assign(result, normalizeFonts(result));
  result.theme_density = normalizeDensity(result.theme_density);
  if (!['true', 'false'].includes(result.enable_public_website))
    result.enable_public_website = 'true';
  if (!['true', 'false'].includes(result.require_public_website_login))
    result.require_public_website_login = 'false';
  for (const key of PALETTE_COLOR_KEYS)
    if (!isHex(result[key])) result[key] = DEFAULT_SETTINGS[key];
  for (const key of ['app_logo_url', 'app_icon_url', 'app_url'])
    if (!safeUrl(result[key])) result[key] = '';
  if (result.theme_custom_palette && !parseCustomPalette(result.theme_custom_palette)) result.theme_custom_palette = '';
  return result;
}
export function validateSettings(values) {
  if (FONT_KEYS.some(key => values[key] !== undefined && !isFont(values[key], key === 'theme_font_heading')))
    return 'Choose a body and heading font from the available fonts.';
  if (values.theme_custom_palette && !parseCustomPalette(values.theme_custom_palette))
    return 'Give your custom palette a name and seven valid six-digit hex colours.';
  if (
    values.theme_density !== 'comfortable' &&
    !LAYOUT_PRESETS.some((preset) => preset.value === values.theme_density)
  )
    return 'Choose a layout: Wide, Content, Compact or Flex.';
  if (!values.app_name.trim()) return 'Give the application a name.';
  if (PALETTE_COLOR_KEYS.some((key) => !isHex(values[key])))
    return 'Use six-digit hex colours, for example #4f46e5.';
  if (
    ['app_logo_url', 'app_icon_url', 'app_url'].some(
      (key) => !safeUrl(values[key]),
    )
  )
    return 'Image and application URLs must start with https:// or http://.';
  if (
    values.support_email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.support_email)
  )
    return 'Enter a valid support email address.';
  return null;
}
