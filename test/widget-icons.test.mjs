import test from 'node:test';
import assert from 'node:assert/strict';
import { icons } from 'lucide-react';
import { build } from 'esbuild';
import { createIconIndex, searchIcons, iconSnippet } from '../src/react/widgets/icon-model.js';

const index = createIconIndex(icons);
test('icon discovery uses installed exports, supports keywords and filters before paging', () => {
  assert.equal(index.length, Object.keys(icons).length);
  assert.equal(new Set(index.map(icon => icon.name)).size, index.length);
  assert.ok(searchIcons(index, 'home').some(icon => icon.name === 'House'));
  assert.ok(searchIcons(index, 'delete').some(icon => icon.name === 'Trash'));
  assert.ok(searchIcons(index, 'arrow-left').some(icon => icon.name === 'ArrowLeft'));
  assert.ok(searchIcons(index, 'arrow left').every(icon => icon.search.includes('arrow') && icon.search.includes('left')));
  assert.ok(searchIcons(index, 'email', 'communication').some(icon => icon.name === 'Mail'));
  assert.equal(searchIcons(index, 'email', 'nature').length, 0);
  assert.equal(searchIcons(index, 'no-icon-has-this-name').length, 0);
  assert.ok(searchIcons(index, '', 'essentials').length > 40);
  assert.ok(searchIcons(index, '', 'other').every(icon => !icon.categories.length));
});

test('copied icon snippets use real named imports, preview settings and accessible decoration', async () => {
  for (const name of ['Search', 'ArrowLeft', 'ChartColumn', 'Sparkles']) {
    assert.ok(icons[name]);
    const snippet = iconSnippet(name, 32, 1.5, 'accent');
    assert.match(snippet, /size=\{32\}/);
    assert.match(snippet, /strokeWidth=\{1.5\}/);
    assert.match(snippet, /--accent-text/);
    assert.match(snippet, /aria-hidden="true"/);
    await build({stdin:{contents:snippet, loader:'jsx'}, bundle:true, write:false, external:['lucide-react'], logLevel:'silent'});
  }
  assert.doesNotMatch(iconSnippet('Search'), /style=/);
  assert.throws(() => iconSnippet('invalid;name'));
});
