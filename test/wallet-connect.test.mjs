import test from 'node:test';
import assert from 'node:assert/strict';
import { saveWalletConnect, completeWalletConnect, safeWalletUrl } from '../src/platform/wallet-connect.js';
import { randomBytes } from 'node:crypto';

function browser() {
  const storage = new Map();
  const b = { location: { href: 'https://app.example/account/wallet?tab=history#details', pathname: '/account/wallet', search: '?tab=history', hash: '#details', assign(value) { b.assigned = value; } },
    sessionStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
    history: { replaceState(_state,_title,path) { b.location.href = new URL(path, 'https://app.example').href; } }, storage };
  return b;
}
const start = () => ({ state: randomBytes(32).toString('hex'), authorizationUrl: 'https://wallet.example/connect?request=1', connectionTicket: 'protected-ticket', expiresAtUtc: new Date(Date.now()+600000).toISOString() });
test('callback removes code, restores local destination and exchanges only its matching protected ticket', async () => {
  const b = browser(), request = start(), calls=[];
  saveWalletConnect(request, 'user:1:sbx', b);
  assert.equal(b.assigned, request.authorizationUrl);
  b.location.href = `https://app.example/account/wallet?ezar_code=${'c'.repeat(64)}&ezar_state=${request.state}`;
  const task = completeWalletConnect('user:1:sbx', async input => { calls.push(input); return { linked:true }; }, b);
  assert.doesNotMatch(b.location.href,/ezar_code/);
  assert.deepEqual(await task,{linked:true});
  assert.equal(calls[0].connectionTicket, request.connectionTicket); assert.equal(calls.length,1); assert.equal(b.storage.size,0);
  assert.equal(b.location.href,'https://app.example/account/wallet?tab=history#details');
  assert.equal(completeWalletConnect('user:1:sbx',()=>assert.fail(),b),null);
});
test('cancel returns locally without linking', async () => {
  const b=browser(), request=start();saveWalletConnect(request,'scope',b);
  b.location.href=`https://app.example/account/wallet?ezar_error=cancelled&ezar_state=${request.state}`;
  assert.deepEqual(await completeWalletConnect('scope',()=>assert.fail(),b),{cancelled:true});assert.equal(b.storage.size,0);
});
test('wrong user or environment, expired ticket and unsolicited callbacks never exchange', async () => {
  for(const kind of ['scope','expired','unsolicited']) {
    const b=browser(), request=start(); if(kind==='expired')request.expiresAtUtc=new Date(0).toISOString();
    if(kind!=='unsolicited')saveWalletConnect(request,'scope',b);
    b.location.href=`https://app.example/account/wallet?ezar_code=${'c'.repeat(64)}&ezar_state=${request.state}`;
    await assert.rejects(completeWalletConnect(kind==='scope'?'other':'scope',()=>assert.fail(),b),/another account/);
  }
});
test('unsafe external links are rejected',()=>{
  for(const url of ['javascript:alert(1)','http://evil.example','https://name:secret@wallet.example','//wallet.example'])assert.equal(safeWalletUrl(url),null);
  assert.equal(safeWalletUrl('http://localhost:3002'),'http://localhost:3002/');
});
test('a cached completion cannot be reused after changing users or environments', async () => {
  const b = browser(), request = start(); saveWalletConnect(request, 'user:1:sbx', b);
  const callback = `https://app.example/account/wallet?ezar_code=${'d'.repeat(64)}&ezar_state=${request.state}`;
  b.location.href = callback;
  await completeWalletConnect('user:1:sbx', async () => ({ linked: true }), b);
  b.location.href = callback;
  await assert.rejects(completeWalletConnect('user:2:prod', () => assert.fail(), b), /another account/);
});
test('a corrupted saved expiry cannot bypass expiration checking', async () => {
  const b = browser(), request = start(); saveWalletConnect(request, 'scope', b);
  const key = 'cloudgate-wallet-connect:' + request.state;
  b.storage.set(key, JSON.stringify({ ...JSON.parse(b.storage.get(key)), expiresAtUtc: 'invalid' }));
  b.location.href = `https://app.example/account/wallet?ezar_code=${'d'.repeat(64)}&ezar_state=${request.state}`;
  await assert.rejects(completeWalletConnect('scope', () => assert.fail(), b), /another account/);
});
