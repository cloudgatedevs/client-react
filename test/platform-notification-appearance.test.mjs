import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationAppearance } from '../src/platform/notification-appearance.js';

test('notification styles use a fixed palette and fall back to info for older payloads', () => {
  for (const style of ['success', 'warning', 'danger', 'info']) {
    assert.equal(notificationAppearance(style).value, style);
    assert.equal(notificationAppearance(` ${style.toUpperCase()} `).value, style);
  }
  for (const style of [undefined, null, '', 'unknown', 'constructor', '__proto__', { color: 'red' }]) {
    assert.equal(notificationAppearance(style).value, 'info');
  }
  assert.equal(new Set(['success', 'warning', 'danger', 'info'].map(style => notificationAppearance(style).panel)).size, 4);
});
