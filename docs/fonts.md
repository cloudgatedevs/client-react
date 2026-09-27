# App fonts

Administration → Theme, the Cloudgate Launcher and Cloudgate's web-app settings
offer separate **Body font** and **Heading font** selectors with live previews.
Saving applies them to the selected app and environment. Headings can follow the
body font. The defaults are Inter and “Same as body font”. Existing settings gain
these defaults on read without a migration.

Included families: Inter, Roboto, Open Sans, Source Sans 3, Nunito Sans, DM Sans,
Manrope, Plus Jakarta Sans, Montserrat, Work Sans, Lora, Source Serif 4, IBM Plex
Sans and Rubik. “System default” uses the visitor's installed UI font.

All files are self hosted by the app. Import the usual
`@cloudgatedevs/cloudgate-client-react/react/styles.css`; the published package
includes the WOFF2 files and licences. Vite resolves these relative CSS assets
for both development and production builds. Only selected fonts/subsets are
downloaded. Latin and Latin Extended are bundled; other scripts use system
fallbacks. See `src/react/assets/fonts/README.md` for provenance and licensing.

## Persistence and rollout

`theme_font_body` and `theme_font_heading` are appearance strings, validated by
Cloudgate's native appearance API. Both use the IDs exported by `FONT_OPTIONS`
from `/platform`. Only headings accept `inherit`. Arbitrary font names, URLs and
CSS are rejected. Edits use `backoffice.theme.edit`, existing revision checks and
tenant/app/environment isolation. Reset restores Inter and inherited headings.
The anonymous website bootstrap returns these settings too.

Template catalogue `appSettings` can include, for example:

```json
{"theme_font_body":"dm-sans","theme_font_heading":"lora"}
```

Template defaults apply on first rollout only; upgrades preserve the owner's
saved choices. Deploy the updated Cloudgate server before clients that save font
settings, then build the launcher/hub and rebuild consuming apps with this SDK.
No additional database migration is required for these two JSON settings.

## Custom modules and public pages

The SDK settings provider applies `--font-body` and `--font-heading` to the
document root. SDK headings and the Tailwind `font-display` utility use the
heading font; body text, controls and `font-sans` use the body font. Monospace
code/logs stay monospace. For custom CSS that specifies its own font, adopt the
tokens explicitly:

```css
.my-public-site { font-family: var(--font-body); }
.my-public-site h1, .my-public-site h2 { font-family: var(--font-heading); }
```

`fontVariables(values)` resolves a safe set of CSS variables for scoped previews.
Use it with `fontFamily: 'var(--font-body)'` on the preview container. A preview
must set both variables so unsaved fonts never change the rest of the app.
