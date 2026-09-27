import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import preset from '../tailwind.preset.js';
import { readFile, writeFile, mkdir, readdir, rm, stat, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWidgetManifest } from '../src/widgets/manifest.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await writeFile(path.join(root, 'src/widgets/picker-manifest.json'), JSON.stringify(createWidgetManifest(), null, 2) + '\n');
const output = path.resolve(root, 'dist/react');
if (!output.startsWith(root + path.sep) || path.basename(output) !== 'react') throw new Error('Invalid build output');
await rm(output, { force: true, recursive: true });
await mkdir(output, { recursive: true });
await build({
  absWorkingDir: root, entryPoints: { index: path.join(root, 'src/react/index.jsx'), widgets: path.join(root, 'src/react/widgets/index.jsx') }, outdir: output,
  tsconfigRaw: { compilerOptions: {} },
  bundle: true, splitting: true, format: 'esm', jsx: 'automatic', target: 'es2020',
  external: ['react', 'react-dom', 'react-router-dom', 'lucide-react', '@radix-ui/react-dialog'],
  loader: { '.svg': 'dataurl' }, logLevel: 'info',
  // Resolve only this package's source and leave dependencies to the consumer.
  // Explicit resolution also works in restricted hosts that cannot enumerate parent directories.
  plugins: [{ name: 'package-source', setup(builder) {
    builder.onResolve({ filter: /.*/ }, async args => {
      if (args.kind !== 'entry-point' && !args.path.startsWith('.') && !path.isAbsolute(args.path)) return { path: args.path, external: true };
      const base = path.resolve(args.importer ? path.dirname(args.importer) : root, args.path);
      // Embed the SDK's own version in its React footer from the package manifest.
      if (base !== path.join(root, 'package.json') && !base.startsWith(path.join(root, 'src') + path.sep)) throw new Error('Source import leaves package: ' + args.path);
      for (const file of [base, base + '.js', base + '.jsx', path.join(base, 'index.js')]) {
        if (await stat(file).then(value => value.isFile()).catch(() => false)) return { path: file, namespace: 'cloudgate-source' };
      }
      throw new Error('Cannot resolve package source: ' + args.path);
    });
    builder.onLoad({ filter: /.*/, namespace: 'cloudgate-source' }, async args => ({
      contents: await readFile(args.path), loader: args.path.endsWith('.svg') ? 'dataurl' : args.path.endsWith('.json') ? 'json' : args.path.endsWith('.jsx') ? 'jsx' : 'js',
    }));
  } }],
});
const integrationStyles = (await readdir(path.join(root, 'src/react/integrations'))).filter(name => name.endsWith('.css')).map(name => `integrations/${name}`);
const input = (await Promise.all(['fonts.css', 'index.css', 'theme.css', 'polish.css', 'users.css', 'media.css', 'account.css', 'popover.css', 'widgets/widgets.css', 'widgets/rich-text.css', 'widgets/calendar.css', 'widgets/scrum-board.css', 'widgets/library.css', ...integrationStyles, 'layout.css', 'palettes.css'].map(name => readFile(path.join(root, 'src/react', name), 'utf8')))).join('\n');
const css = await postcss([tailwind({ ...preset, content: [path.join(root, 'src/**/*.{js,jsx}').replaceAll('\\', '/')] }), autoprefixer()]).process(input, { from: undefined });
await writeFile(path.join(output, 'styles.css'), css.css);
await cp(path.join(root, 'src/react/assets/fonts'), path.join(output, 'assets/fonts'), { recursive: true });
console.log('Built React entry, lazy feature chunks and shared CSS.');
