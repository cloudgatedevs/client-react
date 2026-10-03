import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require('react-dom/server');

async function load(file) {
  const compiled = await build({ entryPoints: [fileURLToPath(new URL(file, import.meta.url))],
    bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', logLevel: 'silent' });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}
const { Markdown } = await load('../src/react/agents/markdown.jsx');
const html = text => renderToStaticMarkup(React.createElement(Markdown, { text }));

test('agent markdown renders emphasis, including nested emphasis, without looping', () => {
  // A finding as the chat bridge posts it: an icon, a bold title and a body. Bold once froze the page.
  const finding = html('🔴 **Payment webhook failed**\n\nOrder `A-17` was **not** matched. See *the log* and **bold with _nested_ emphasis**.');
  assert.match(finding, /<strong>Payment webhook failed<\/strong>/);
  assert.match(finding, /<code class="cg-md-inline-code">A-17<\/code>/);
  assert.match(finding, /<strong>bold with <em>nested<\/em> emphasis<\/strong>/);
  assert.match(finding, /<em>the log<\/em>/);
});

test('agent markdown renders blocks and never emits unsafe links or raw HTML', () => {
  const out = html('# Summary\n\n- one\n- two\n\n1. first\n2. second\n\n> quoted\n\n```\ncode <b>here</b>\n```\n\n[ok](https://example.test/a) [local](/orders/1) [bad](javascript:alert(1)) <script>x</script>');
  assert.match(out, /<h3 class="cg-md-heading">Summary<\/h3>/);
  assert.match(out, /<ul class="cg-md-list"><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(out, /<ol class="cg-md-list"><li>first<\/li><li>second<\/li><\/ol>/);
  assert.match(out, /<blockquote class="cg-md-quote">quoted<\/blockquote>/);
  assert.match(out, /code &lt;b&gt;here&lt;\/b&gt;/);
  assert.match(out, /<a href="https:\/\/example\.test\/a" target="_blank" rel="noopener noreferrer">ok<\/a>/);
  assert.match(out, /<a href="\/orders\/1" rel="noopener noreferrer">local<\/a>/);
  assert.doesNotMatch(out, /javascript:/);
  assert.doesNotMatch(out, /<script>/);
  assert.equal(html(''), '');
});
