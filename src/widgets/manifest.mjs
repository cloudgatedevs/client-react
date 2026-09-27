// Data-only picker contract. Generated at package build time; never import the SDK on the API host.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { widgets } from './catalog.js';

export function createWidgetManifest() {
  const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  const sourceFiles = readdirSync(new URL('./', import.meta.url)).filter(name => /\.(js|mjs)$/.test(name)).sort();
  const hash = createHash('sha256').update(version);
  for (const name of sourceFiles) hash.update(name).update(readFileSync(new URL(name, import.meta.url)));
  return {
    schemaVersion: 1, sdkVersion: version, fingerprint: hash.digest('hex'), sourceFiles,
    aliases: { 'search-select': 'select' },
    widgets: widgets.map(({ id, name, category, description, exports }) => ({
      id, name, category, description, exports,
      kind: category === 'Data' ? 'pattern' : 'component',
      tags: [category.toLowerCase(), ...(exports || []), ...(category === 'Data' ? ['table', 'records', 'users'] : [])],
      preview: { type: 'library', path: `/backoffice/widgets/${id}` },
    })),
  };
}
