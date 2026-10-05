import test from 'node:test';
import assert from 'node:assert/strict';
import { hasConfirmedSdkUpdate } from '../src/platform/sdk-update.js';

test('the dock only signals a verified newer SDK than the app actually loaded', () => {
  const available = { latestVersion: '0.1.10', updateAvailable: true };
  assert.equal(hasConfirmedSdkUpdate(available, '0.1.9', 'npm'), true);
  assert.equal(hasConfirmedSdkUpdate({ ...available, latestVersion: '0.10.0' }, '0.9.9', 'npm'), true);
  for (const version of [null, undefined, '', 'unknown', '^0.1.9', '0.1.10-beta.1', '0.1.10', '0.1.11'])
    assert.equal(hasConfirmedSdkUpdate(available, version, 'npm'), false, String(version));
  for (const status of [undefined, {}, { updateAvailable: true }, { ...available, latestVersion: 'latest' },
    { ...available, checkError: 'npm failed' }, { ...available, sdkSource: 'local' },
    { ...available, updateAvailable: 'true' }, { ...available, updateAvailable: false }])
    assert.equal(hasConfirmedSdkUpdate(status, '0.1.9', 'npm'), false, JSON.stringify(status));
  assert.equal(hasConfirmedSdkUpdate(available, '0.1.9', 'local'), false);
  assert.equal(hasConfirmedSdkUpdate({ ...available, runningVersion: '0.1.7', projectVersion: '0.1.8' }, '0.1.10', 'npm'), false);
});
