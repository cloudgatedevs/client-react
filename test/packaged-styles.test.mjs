import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import postcss from 'postcss';

const root = fileURLToPath(new URL('..', import.meta.url));

test('the published stylesheet includes profile and wallet layouts and resolves its font assets', async () => {
  await promisify(execFile)(process.execPath, ['scripts/build.mjs'], { cwd: root });
  const output = path.join(root, 'dist/react');
  const css = postcss.parse(await readFile(path.join(output, 'styles.css'), 'utf8'));
  const selectors = new Set();
  css.walkRules(rule => rule.selectors.forEach(selector => selectors.add(selector)));
  for (const selector of ['.account-dropdown', '.cg-user-avatar', '.cg-menu-wallet-copy', '.cg-account-shell', '.cg-w-workspace', '.cg-w-overview']) {
    assert.ok(selectors.has(selector), `Published CSS is missing ${selector}`);
  }
  css.walkAtRules('import', rule => assert.fail(`Unbundled stylesheet: ${rule.params}`));
  css.walkAtRules('tailwind', () => assert.fail('Tailwind was not compiled'));
  const fonts = [];
  css.walkDecls('src', declaration => {
    const match = declaration.value.match(/url\(["']?([^"')]+\.woff2)["']?\)/);
    if (match) fonts.push(match[1]);
  });
  assert.ok(fonts.length, 'Font declarations must be preserved');
  await Promise.all(fonts.map(font => access(path.resolve(output, font))));
});
