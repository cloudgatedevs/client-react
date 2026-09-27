# Bundled fonts

These unmodified variable WOFF2 files are sourced from Fontsource's
`@fontsource-variable/*` packages. `manifest.json` records each exact version,
download URL, package integrity and SHA-256 checksum of every included file.
Each family directory contains its upstream SIL Open Font License.

The SDK includes Latin and Latin Extended normal/italic subsets; Manrope has
normal only, so browsers synthesize italics. Other scripts fall back to the
system font. Font weights vary by family and are declared in `../../fonts.css`.
The CSS uses `Cloudgate …` family aliases to avoid collisions with application
fonts. Font binaries have not been modified or renamed internally.

Only faces used on a page are downloaded. No Google Fonts or Fontsource request
is made at runtime. Keep the relative `assets/fonts/` paths alongside packaged
`styles.css` when distributing the built SDK without a bundler.

To refresh, obtain the corresponding Fontsource packages, retain the original
licences and update the files, manifest and CSS together. Run the SDK font asset
tests, rebuild, then run the launcher's `sync:theme` and the hub's
`scripts/sync-fonts.mjs` against this checkout.

Sources: https://fontsource.org/docs/getting-started/variable and
https://github.com/fontsource/fontsource
