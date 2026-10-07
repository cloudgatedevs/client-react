import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { applyBrandingMetadata } from '../src/react/settings/branding-metadata.js';
import { DEFAULT_SETTINGS } from '../src/platform/appearance-model.js';

const settings = { ...DEFAULT_SETTINGS, app_name: 'OpenFMI', app_tagline: 'The Office', app_description: 'Your accounts & support',
  app_logo_url: 'https://cdn.example/logo.png', app_icon_url: 'https://cdn.example/icon.png' };
const page = () => new JSDOM('<html><head><title>React Template</title><link rel="icon" href="/old.ico"><meta property="og:image:width" content="400"></head></html>',
  { url: 'https://office.example/backoffice/transactions?private=id' }).window.document;

test('branding creates missing metadata and replaces duplicates on repeated saves', () => {
  const doc = page();
  for (let i = 0; i < 3; i++) applyBrandingMetadata(doc, settings, '/default.svg');
  assert.equal(doc.title, 'OpenFMI · The Office');
  for (const selector of ['meta[name=description]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    assert.equal(doc.querySelectorAll(selector).length, 1);
    assert.equal(doc.querySelector(selector).content, settings.app_description);
  }
  assert.equal(doc.querySelector('meta[property="og:url"]').content, 'https://office.example/');
  assert.equal(doc.querySelector('meta[property="og:image"]').content, settings.app_logo_url);
  assert.equal(doc.querySelectorAll('link[rel=icon]').length, 1);
  assert.equal(doc.querySelector('link[rel=icon]').href, settings.app_icon_url);
  assert.equal(doc.querySelector('meta[property="og:image:width"]'), null);
});

test('clearing branding removes obsolete images and uses the tagline when description is empty', () => {
  const doc = page();
  applyBrandingMetadata(doc, settings);
  applyBrandingMetadata(doc, { ...settings, app_description: '', app_icon_url: '', app_logo_url: '' }, '/default.svg');
  assert.equal(doc.querySelector('meta[name=description]').content, 'The Office');
  assert.equal(doc.querySelector('meta[property="og:image"]'), null);
  assert.equal(doc.querySelector('meta[name="twitter:image"]'), null);
  assert.equal(doc.querySelector('link[rel=apple-touch-icon]'), null);
  assert.equal(doc.querySelector('link[rel=icon]').href, 'https://office.example/default.svg');
  applyBrandingMetadata(doc, { ...settings, app_tagline: '' });
  assert.equal(doc.title, 'OpenFMI');
});

test('logo and icon fall back to each other', () => {
  for (const empty of ['app_logo_url', 'app_icon_url']) {
    const doc = page();
    const values = { ...settings, [empty]: '' };
    applyBrandingMetadata(doc, values);
    assert.equal(doc.querySelector('link[rel=icon]').href, values.app_icon_url || values.app_logo_url);
    assert.equal(doc.querySelector('meta[property="og:image"]').content, values.app_logo_url || values.app_icon_url);
  }
});

test('branding text cannot create HTML and unsafe images are omitted', () => {
  const doc = page();
  const values = { ...settings, app_name: '</title><script>alert(1)</script>', app_description: '"><img onerror="alert(1)">',
    app_logo_url: 'javascript:alert(1)', app_icon_url: 'https://user:password@private.example/x.png' };
  applyBrandingMetadata(doc, values, '/default.svg');
  assert.equal(doc.querySelector('script, img'), null);
  assert.equal(doc.querySelector('meta[name=description]').content, values.app_description);
  assert.equal(doc.querySelector('meta[property="og:image"]'), null);
});
