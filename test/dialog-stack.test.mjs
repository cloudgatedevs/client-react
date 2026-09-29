import test from 'node:test';
import assert from 'node:assert/strict';
import { createDialogStack } from '../src/react/components/dialog-stack.js';

test('child-first mounting still places the child backdrop above parent content', () => {
  const stack = createDialogStack(), parent = {}, child = {}, grandchild = {};
  stack.activate(grandchild, child); stack.activate(child, parent); stack.activate(parent, null);
  assert.ok(stack.layer(child) > stack.layer(parent) + 1);
  assert.ok(stack.layer(grandchild) > stack.layer(child) + 1);
});

test('new siblings, reopen, retained exit and cleanup use one shared ordering', () => {
  const stack = createDialogStack(), parent = {}, a = {}, b = {};
  let changes = 0;
  const unsubscribe = stack.subscribe(() => changes++);
  stack.activate(parent, null); stack.activate(a, parent);
  // Closing a is retained until its presence callback releases it.
  stack.activate(b, parent);
  assert.ok(stack.layer(b) > stack.layer(a) + 1);
  stack.release(a);
  assert.ok(stack.layer(b) > stack.layer(parent) + 1);
  stack.activate(a, parent);
  assert.ok(stack.layer(a) > stack.layer(b) + 1);
  stack.release(a); stack.release(b); stack.release(parent);
  stack.activate(a, null); assert.equal(stack.layer(a), 100);
  assert.equal(changes, 9); unsubscribe(); stack.release(a); assert.equal(changes, 9);
});
