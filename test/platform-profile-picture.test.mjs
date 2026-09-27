import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileClient, PROFILE_PICTURE_MAX_BYTES } from '../src/platform/profile.js';
import { createIdpClient } from '../src/platform/transport.js';

test('profile photos use the current IdP tenant and multipart bearer transport, including refreshed tokens', async () => {
  let token = 'old';
  const calls = [];
  const result = { profilePictureId: 'picture-id', photoUrl: 'https://api.test/api/idp/qa/profile/pictures/picture-id' };
  const request = createIdpClient({ apiUrl: 'https://api.test', auth: {
    tenancyName: 'qa', authHeader: () => ({ Authorization: `Bearer ${token}` }),
    refresh: async () => { token = 'new'; return true; },
  }, fetchImpl: async (url, options) => {
    calls.push({ url, ...options });
    return calls.length === 1 ? Response.json({}, { status: 401 }) : Response.json({ result });
  } });
  const api = createProfileClient({ request });
  const blob = new Blob(['image-content'], { type: 'image/jpeg' });
  assert.deepEqual(await api.uploadPicture(blob), result);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].headers.Authorization, 'Bearer new');
  assert.equal(calls[1].headers['Content-Type'], undefined, 'Browser must add the multipart boundary');
  assert.equal(calls[1].credentials, 'omit');
  assert.equal(calls[1].redirect, 'error');
  assert.equal(calls[1].url, 'https://api.test/api/idp/qa/profile/picture');
  assert.equal(calls[1].method, 'PUT');
  assert.deepEqual([...calls[1].body.keys()], ['file']);
  assert.equal(await calls[1].body.get('file').text(), 'image-content');
  await api.removePicture();
  assert.equal(calls.at(-1).method, 'DELETE');
  assert.equal(calls.at(-1).body, undefined);
});

test('profile photo validation rejects invalid data before sending it', async () => {
  let calls = 0;
  const api = createProfileClient({ request: async () => { calls++; } });
  for (const file of [null, 'photo', new Blob([], { type: 'image/png' }), new Blob(['<svg/>'], { type: 'image/svg+xml' }),
    new Blob([new Uint8Array(PROFILE_PICTURE_MAX_BYTES + 1)], { type: 'image/png' })]) {
    await assert.rejects(api.uploadPicture(file), /PNG, JPEG, WebP or GIF/);
  }
  assert.equal(calls, 0);
});

test('failed profile photo uploads retain server error details for retry', async () => {
  const error = new Error('Storage is unavailable');
  const api = createProfileClient({ request: async () => { throw error; } });
  await assert.rejects(api.uploadPicture(new Blob(['image'], { type: 'image/png' })), failure => failure === error);
});
