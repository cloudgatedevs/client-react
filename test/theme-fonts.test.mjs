import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DEFAULT_SETTINGS, FONT_DEFAULTS, FONT_OPTIONS, fontVariables, normalizeSettings, validateSettings } from '../src/platform/appearance-model.js';
import { createAppearanceClient } from '../src/platform/appearance.js';

test('old or invalid font settings get safe defaults; raw CSS and URLs cannot reach font styles', () => {
  assert.equal(normalizeSettings({}).theme_font_body, 'inter');
  assert.equal(normalizeSettings({}).theme_font_heading, 'inherit');
  for (const value of ['', null, {}, 'inherit', 'Inter', 'url(https://other.invalid/font)', 'serif; color:red']) {
    const values = { ...DEFAULT_SETTINGS, theme_font_body: value };
    assert.equal(normalizeSettings(values).theme_font_body, 'inter');
    assert.match(validateSettings(values), /Choose a body and heading font/);
    assert.deepEqual(fontVariables(values), fontVariables(FONT_DEFAULTS));
  }
  assert.match(validateSettings({ ...DEFAULT_SETTINGS, theme_font_heading: 'unknown' }), /Choose a body and heading font/);
});

test('every font round-trips with revision and environment to private and public appearance', async () => {
  const revision = '11111111-1111-1111-1111-111111111111';
  let stored = { ...DEFAULT_SETTINGS, app_name: 'Atlas' };
  const client = createAppearanceClient({ webAppId: revision, environment: 'prod', request: async (url, { body }) => {
    assert.equal(body.webAppId, revision);
    assert.equal(body.environment, 'prod');
    if (url.endsWith('/update')) {
      assert.equal(body.revision, revision);
      assert.deepEqual(Object.keys(body.values).sort(), ['theme_font_body', 'theme_font_heading']);
      stored = { ...stored, ...body.values };
    }
    return { values: stored, revision };
  }, publicRequest: async () => ({ values: stored, revision, allowSelfRegistration: false }) });
  for (const font of FONT_OPTIONS) for (const heading of [font.id, 'inherit', 'lora']) {
    const patch = { theme_font_body: font.id, theme_font_heading: heading };
    const result = await client.save(patch, revision);
    assert.equal(result.values.app_name, 'Atlas');
    for (const value of [result, await client.get(), await client.getPublic()]) {
      assert.equal(value.values.theme_font_body, font.id);
      assert.equal(value.values.theme_font_heading, heading);
    }
    const variables = fontVariables(result.values);
    assert.equal(variables['--font-body'], font.family);
    if (heading === 'inherit') assert.equal(variables['--font-heading'], font.family);
    assert.equal(validateSettings(result.values), null);
  }
});

test('all bundled font faces have licensed, intact, local WOFF2 assets', async () => {
  const base = new URL('../src/react/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('assets/fonts/manifest.json', base), 'utf8'));
  const css = await readFile(new URL('fonts.css', base), 'utf8');
  assert.deepEqual(manifest.map(font => font.id), FONT_OPTIONS.filter(font => font.id !== 'system').map(font => font.id));
  assert.equal(manifest.length, 14);
  assert.doesNotMatch(css, /https?:|@import/);
  for (const font of manifest) {
    assert.match(await readFile(new URL(`assets/fonts/${font.id}/LICENSE.txt`, base), 'utf8'), /SIL OPEN FONT LICENSE/i);
    for (const file of font.files) {
      const path = `assets/fonts/${font.id}/${file.file}`;
      const data = await readFile(new URL(path, base));
      assert.equal(data.subarray(0, 4).toString(), 'wOF2');
      assert.equal(createHash('sha256').update(data).digest('hex'), file.sha256);
      assert.ok(css.includes(`url('./${path}')`));
    }
  }
  assert.equal([...css.matchAll(/font-display: swap/g)].length, manifest.flatMap(font => font.files).length);
});
