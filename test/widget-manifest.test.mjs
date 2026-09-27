import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createWidgetManifest } from '../src/widgets/manifest.mjs';
import { widgets } from '../src/widgets/catalog.js';

test('published picker metadata covers actual widgets without embedding examples or executable markup', () => {
  const manifest = createWidgetManifest();
  assert.equal(manifest.widgets.length, widgets.length);
  assert.equal(new Set(manifest.widgets.map(widget => widget.id)).size, widgets.length);
  assert.equal(manifest.aliases['search-select'], 'select');
  assert.equal(manifest.widgets.find(widget => widget.id === 'lazy-table').kind, 'pattern');
  assert.equal(manifest.widgets.find(widget => widget.id === 'line-chart').exports[0], 'LineChart');
  assert.equal(manifest.widgets.some(widget => widget.example || widget.props), false);
  assert.match(manifest.fingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(JSON.parse(readFileSync(new URL('../src/widgets/picker-manifest.json', import.meta.url))), manifest);
});
test('CLI manifest returns the same installed catalogue identity', () => {
  const child = spawnSync(process.execPath, [fileURLToPath(new URL('../src/widgets/cli.mjs', import.meta.url)), 'manifest'], { encoding: 'utf8', timeout: 10000 });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout).result, createWidgetManifest());
});
