import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, PALETTE_PRESETS, PALETTE_COLOR_KEYS, paletteColors, paletteVariables,
  parseCustomPalette, contrastRatio, normalizeSettings, validateSettings } from '../src/platform/appearance-model.js';
import { createAppearanceClient } from '../src/platform/appearance.js';

test('legacy brand colours survive normalization and receive defaults for new palette roles', () => {
  const result = normalizeSettings({ theme_primary: '#F0C040', theme_secondary: '#AABBCC' });
  assert.equal(result.theme_primary, '#F0C040');
  assert.equal(result.theme_secondary, '#AABBCC');
  assert.equal(result.theme_neutral, DEFAULT_SETTINGS.theme_neutral);
  assert.equal(result.theme_custom_palette, '');
  assert.equal(validateSettings(result), null);
  for (const key of PALETTE_COLOR_KEYS) {
    assert.match(validateSettings({ ...result, [key]: 'red' }), /six-digit/);
    assert.equal(normalizeSettings({ ...result, [key]: 'red' })[key], DEFAULT_SETTINGS[key]);
  }
});

test('custom palettes validate the complete bounded public contract', () => {
  const custom = { name: '  Studio  ', colors: paletteColors(DEFAULT_SETTINGS) };
  assert.deepEqual(parseCustomPalette(JSON.stringify(custom)), { ...custom, name: 'Studio' });
  for (const invalid of [null, 'bad', '[]', '{}', JSON.stringify({ ...custom, name: '' }),
    JSON.stringify({ ...custom, name: 'a'.repeat(41) }), JSON.stringify({ ...custom, extra: true }),
    JSON.stringify({ ...custom, colors: { ...custom.colors, theme_primary: 'url(x)' } }),
    JSON.stringify({ ...custom, colors: { theme_primary: '#aabbcc' } }),
    JSON.stringify({ ...custom, colors: { ...custom.colors, extra: '#ffffff' } })]) {
    assert.equal(parseCustomPalette(invalid), null);
    if (invalid) assert.match(validateSettings({ ...DEFAULT_SETTINGS, theme_custom_palette: invalid }), /custom palette/);
  }
});

test('palette text, status and button labels remain readable on all surfaces in both modes', () => {
  const extremes = ['#ffffff', '#000000', '#ffff00', '#808080', '#ff00ff'];
  const palettes = [...PALETTE_PRESETS, ...extremes.map(hex => ({ id: hex,
    colors: Object.fromEntries(PALETTE_COLOR_KEYS.map(key => [key, hex])) }))];
  for (const { id, colors } of palettes) for (const dark of [false, true]) {
    const vars = paletteVariables(colors, dark);
    const channels = key => vars[key].split(' ').map(Number);
    for (const shade of [950, 900, 850, 800]) {
      for (const key of ['--mist', '--mist-muted', '--mist-dim', '--accent-text', '--cgw-success', '--cgw-warning', '--cgw-danger', '--cgw-info']) {
        assert.ok(contrastRatio(channels(key), channels(`--ink-${shade}`)) >= 4.5, `${id} ${dark} ${key} on ${shade}`);
      }
    }
    assert.ok(contrastRatio(channels('--accent'), channels('--accent-fg')) >= 4.5, `${id} button label`);
    for (const tone of ['success','warning','danger','info']) {
      assert.ok(contrastRatio(channels(`--cgw-${tone}`), channels(`--cgw-${tone}-fg`)) >= 4.5,
        `${id} ${dark} solid ${tone} button label`);
    }
    assert.equal(validateSettings({ ...DEFAULT_SETTINGS, ...colors }), null);
  }
});

test('saved custom palette survives preset switching and round-trips through public appearance', async () => {
  const revision = '11111111-1111-1111-1111-111111111111';
  let stored = { ...DEFAULT_SETTINGS };
  const client = createAppearanceClient({ webAppId: revision, environment: 'sbx', request: async (url, { body }) => {
    if (url.endsWith('/update')) stored = { ...stored, ...body.values };
    return { values: stored, revision };
  }, publicRequest: async () => ({ values: stored, revision, allowSelfRegistration: true }) });
  const custom = { name: 'Studio', colors: { ...PALETTE_PRESETS[1].colors, theme_primary: '#286478' } };
  await client.save({ ...custom.colors, theme_custom_palette: JSON.stringify(custom) }, revision);
  await client.save(PALETTE_PRESETS[3].colors, revision);
  const publicTheme = (await client.getPublic()).values;
  assert.deepEqual(parseCustomPalette(publicTheme.theme_custom_palette), custom);
  assert.equal(publicTheme.theme_primary, PALETTE_PRESETS[3].colors.theme_primary);
  const restored = await client.save(parseCustomPalette(publicTheme.theme_custom_palette).colors, revision);
  assert.equal(restored.values.theme_primary, custom.colors.theme_primary);
});
