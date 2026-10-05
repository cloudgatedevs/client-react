# React widget library

Import from `@cloudgatedevs/cloudgate-client-react/react/widgets` and import
`@cloudgatedevs/cloudgate-client-react/react/styles.css` once. The widgets need React and
the SDK's React peer dependencies; they do not need a router, Cloudgate client,
authentication or back-office providers. The existing `/react` Table remains
compatible; new modules should use the new `DataTable`.

The interactive library lives at `/backoffice/widgets` (or `<basePath>/widgets`).
Its menu appears above Administration and requires `backoffice.widgets.view`
plus back-office access. Admin and Contributor receive the new grant by default;
User and custom roles do not. Role owners can change this in the permission tree.
The gallery uses fictional data and its appearance controls do not save settings.

## One catalogue for people and agents

### Select and radio choices

**Widget library → Forms → Select** combines native, locally searchable and
server-search dropdown examples. `Select` and `SearchSelect` remain separate,
compatible exports: native `Select` uses `onChange(event)`; `SearchSelect` uses
`onChange(value, option)`. Use the native control for short lists and searchable
options for larger lists. For remote search, forward the supplied `signal`, scope
and filter at the API, then limit the returned results. The old `search-select`
gallery URL redirects to `select`, and catalogue lookups accept the old ID.

**Widget library → Forms → Radio group** provides `RadioGroup` for a small set of
mutually exclusive choices. Use `variant="default"` for standard radios or
`variant="cards"` for richer choices with descriptions. `orientation="horizontal"`
wraps inline options and cards; vertical is the default. It inherits palette,
light/dark mode and layout spacing, and uses native arrow-key and Space selection.

Supply a visible `label` (or `aria-label`), a stable `name` and options shaped as
`{value,label,description?,disabled?}`. Values must be unique, non-empty strings
or finite numbers; zero is supported. Labels/descriptions can contain display
content, but must not contain links or other interactive controls. Omitted names
receive a unique generated native group name. Supply your own name when reading
`FormData`. `disabled` applies to a group or individual option and disabled values
are omitted from submission.

`value`/`onChange(value,option)` controls selection; `defaultValue` provides an
uncontrolled initial choice and resets automatically with the form. Controlled
forms reset their state in `onReset`. Combine `required`, `validate` and
`validationMessages` with SDK `Form`. Custom validators receive the selected
**string**, or an empty string for no choice, plus the form data. Feedback appears
when leaving the group or submitting and then updates as the choice changes.
The forwarded ref targets the first enabled radio. Keep saves and authorization
in the caller and handle server failures explicitly; the widget does not persist.

### Switch sizes

**Widget library → Forms → Switch & checkbox** demonstrates `Switch` in
`size="sm"`, `"md"` and `"lg"`. Medium is the default and keeps the existing track
dimensions. Small fits compact settings; large gives important controls more
presence. Both the track and thumb scale together, including right-to-left layouts.
Every size inherits the app palette, light/dark mode, focus and reduced-motion
settings. Use a visible `label`, optional `hint`, controlled `checked` and
`onChange(checked)`; `disabled` prevents changes. Size does not change the callback
or checkbox behavior.

### Calendar

**Widget library → Scheduling → Calendar** provides month, week, day and agenda
views through the lazy-loaded [FullCalendar React engine](https://fullcalendar.io/docs/react).
Use the SDK `Calendar` export rather than importing or configuring another calendar
in generated modules. It inherits the app palette, appearance and control spacing.
Navigation includes previous/next, Today, a date input and a view selector. The
agenda covers the current month and is useful on narrow screens; week/day views
include all-day rows and a scrollable 24-hour timeline.

Provide local `events` with `{id,title,start,end?,allDay?,tone?,description?}` or
`loadEvents({start,end,timeZone,signal})` returning an event array. Keep the loader
stable with `useCallback`, forward `signal`, and fetch events overlapping the
visible range: `event.start < range.end && event.end > range.start`, accounting for
default duration when an event omits its end. Include events beginning before the
requested range. Range ends and event ends are **exclusive**. A three-day all-day
event starting September 26 ends September 29. Return unique stable IDs; zero is
valid. Invalid responses show an error instead of silently losing records.

All-day events use `YYYY-MM-DD` strings so their dates do not shift with time zone.
Timed events use ISO date-times (prefer explicit offsets for instants) or `Date`
objects. `timeZone` accepts `local` (default), `UTC` or an IANA zone; `locale`
controls calendar labels. Monday starts the week by default (`firstDay={1}`),
and `weekends={false}` hides Saturday/Sunday. `initialDate` and `initialView` apply
at mount. Use a React key to reset navigation, and `reloadKey` to refetch after a
save or tenant/filter change without resetting the current period.

`onEventClick` receives the original event for a detail dialog. `onDateClick`
receives `{date,allDay}` from a cell or the keyboard-accessible Add event button.
Use the date input to choose a date before Add event. Optional `onRangeSelect`
receives `{start,end,allDay}` for a selected date/time range. Callers own their
dialogs, permissions and saves; the widget does not persist, drag-move or resize
events. Read-only permits navigation/details but suppresses creation callbacks.
Disabled prevents interaction. The gallery's creation form only changes local
example data and its server toggle simulates cancellable range requests.

`loading`, `error` and `onRetry` cover external state; built-in remote loading has
busy feedback and retry. Earlier requests are aborted, and even a loader ignoring
abort cannot replace a newer result. `height` defaults to 640px and
`maxEventsPerDay` to three, with overflow popovers. Navigation/date controls are
labelled and event details can be opened by keyboard. Read the calendar catalogue
example for a server integration; always enforce tenant and event access at the API.

### WYSIWYG editor

**Widget library → Forms → WYSIWYG editor** uses CKEditor 5, the same engine as
Cloudgate React's notes and documentation. Import `RichTextEditor` (also exported
as `WysiwygEditor`) for editing and `RichTextContent` for formatted HTML display.
The editor and its CSS load only when the editor is mounted; rendering rich text
does not load the editing engine. Both components render content after mounting
in the browser, so server-rendered markup starts empty.

Pass controlled HTML with `value` and `onChange(html, summary)`. Summary includes
`text`, `words`, `characters` and `hasContent`. Toolbars are `basic`, `standard`
(default), `full` or `none`. Full adds fonts, highlights, alignment, indentation,
code blocks and horizontal rules to headings, formatting, links, lists, quotes,
tables and images. Changing toolbar configuration recreates the editor and resets
undo history. Toolbar controls wrap on narrow screens and inherit the app palette
and light/dark mode, including popup panels.

Use `label`, `hint`, `name`, `required`, `maxLength` and `validate(html, formData)`
inside `Form`. The named value is HTML; validation checks meaningful text or an
image, not HTML tag length. `maxLength` counts Unicode text characters. Invalid
submissions focus the editor. `disabled` omits its value from FormData; `readOnly`
hides the toolbar and retains the submitted value without validation. Omitting
`onChange` also makes it read-only. The caller restores controlled state on reset.
`loading` supplies skeletons; `onError` reports initialization failures and the
retry UI preserves the controlled draft. Use `onPendingChange` to disable saving
while the editor starts or an image is uploading.

Images can be inserted by URL. To enable file uploads, pass
`uploadImage(file, { signal, onProgress })` returning `Promise<{ url }>` from your
own authenticated endpoint. Forward the cancellation signal and optionally call
`onProgress({ loaded, total })`. There is no assumed storage service or base64
embedding. Server-side validation and authorization remain the caller's job.

Both output and `RichTextContent` use a DOMPurify allowlist that retains supported
rich-text formatting while removing executable HTML, unsafe URLs and arbitrary
CSS. This widget is for rich content, not arbitrary HTML page embedding. Sanitize
and authorize content again on the server before storage or publication; do not
pass untrusted content directly to `dangerouslySetInnerHTML`.

The default `licenseKey="GPL"` matches Cloudgate React. CKEditor has its own
[GPL/commercial licensing requirements](https://ckeditor.com/docs/ckeditor5/latest/getting-started/licensing/license-key-and-activation.html);
provide an applicable commercial `licenseKey` when required by the consuming app.
No premium CKEditor package or cloud editing service is included.

### Buttons

`Button` and `IconButton` support `primary`, `secondary`, `neutral`, `success`,
`warning`, `danger`, `info`, `ghost` and `link` variants. Choose the intent with
`variant`, then optionally set `appearance="solid"`, `"soft"` or `"outline"`.
Omitting appearance retains the existing primary, secondary, ghost and danger
styles; new semantic variants default to soft. Ghost and link ignore appearance.
The link variant is still a native button; use `TextLink` for navigation.

Use `size="sm" | "md" | "lg"`, `icon`, `iconPosition="start" | "end"` and
`fullWidth` to fit the layout. `loading` shows a spinner in the icon position,
sets `aria-busy` and disables the button. `disabled` prevents interaction without
a spinner. Buttons default to `type="button"`; use `type="submit"` in forms.
Icon-only buttons require a descriptive `label`. Card action descriptors also
accept the new variants and `appearance`.

Colours and readable foregrounds come from the app's palette, including custom
palettes and dark mode. The Buttons gallery shows every style, size, icon placement
and busy/disabled state. Its controls only update local example feedback.

### App cards

**Widget library → Cards** includes an interactive gallery and 18 purpose-built
patterns, alongside the existing `Card` and `MetricCard`:

| Use case | Components |
| --- | --- |
| Commerce | ProductCard, PricingCard, OrderCard |
| Learning and content | CourseCard, ArticleCard, FileCard |
| Dashboards | MetricChartCard, GoalCard |
| Work and activity | ProjectCard, TaskCard, TimelineCard, NotificationCard, IntegrationCard |
| People | ProfileCard, TestimonialCard, JobCard |
| Bookings and events | ListingCard, EventCard |

Use `CardGrid` for responsive lists, with stable React keys and an optional numeric
`minCardWidth` (260px by default). `Timeline` renders connected entries from an
ordered `items` array with stable `id` values. Each card accepts `loading`,
`error`, `onRetry`, `empty`, `disabled`, extra `children` and `footer` content.
Loading uses skeletons; error and empty states withhold record actions. Built-in
controls respect disabled state; custom slots must handle their own permissions.
Surfaces, spacing, colours and controls inherit the app's theme, palette and layout.
Animations respect reduced motion; numeric counters and metric charts support
`animate={false}`.

Use string `title` (or `name` for identity/plan/file cards, `orderNumber` for orders)
and `headingLevel` (2–6, default 3). `titleHref` links just the title. Cards containing
buttons must not be wrapped in a link. Media cards accept `image={{src,alt,position?}}`
or a custom `media` slot. Images load lazily and have a fallback on failure.

`action` and `secondaryAction` accept
`{label,onClick?,href?,icon?,variant?,disabled?,loading?}`. The caller owns async saves,
pending state and errors. Pass controlled `saved`/`onSavedChange` for saved products
and listings, and `checked`/`onCheckedChange` for tasks. Gallery actions use local
fictional data; connect them to authorized application APIs before deployment.
See the `card-grid-actions` and `activity-timeline` recipes for composition.

Prices are numbers with `currency` and optional `locale`; zero is valid and a missing
price displays an em dash. `OrderCard` item `amount` is the complete line total;
the caller supplies `total` including tax/shipping. `MetricChartCard` combines a
counter and a line/bar chart with an accessible, exportable data table. `GoalCard`
clamps the progress bar while preserving the actual count above its target.

### Table patterns

DataTable owns its outer border, rounded corners, background, toolbar, footer and scroll region. Place it in a plain layout container with min-width: 0; do not wrap it in another bordered or padded table card, or add a second overflow container. Keep keyboard focus outlines visible. The inner scroll region has square corners between the toolbar and footer. Verify wide and narrow layouts, horizontal scrolling and the Columns menu.

The Tables menu has six focused examples, all using the same composable `DataTable`:

| Example | Configuration |
| --- | --- |
| Static table | Local `rows`, search, sort, pagination and Excel |
| Lazy loading | `loadRows`, numbered pages, load-more or infinite scrolling |
| Selection & bulk actions | `selectable`, `bulkActions`, IDs retained across pages |
| Row selection | `rowSelectable`, `activeRowId`, connected detail widgets |
| Expandable subtables | `renderExpandedRow`, lazy parent-scoped child tables |
| Advanced filters | `filterFields`, AND/OR conditions and removable chips |

Use **Row selection** when clicking a record should load other widgets on the page.
Enable `rowSelectable` on any DataTable, including remote tables and subtables.
The active row has a highlighted background, leading marker and pressed circle
button. Native table semantics are preserved. Click a plain cell or use the circle
button with Enter/Space; Up/Down and Home/End move activation within the loaded
view, skipping rows excluded by `getRowCanActivate`. `getRowLabel` supplies readable
names. Embedded buttons, links, checkbox labels, editors and expansion controls
keep their own behavior. Mark other custom interactive content with
`data-row-selection-ignore` to opt it out of row activation.

Control the ID with `activeRowId` and `onActiveRowChange(id,row)`, or initialize
uncontrolled state with `defaultActiveRowId`. Null means no active record; numeric
zero is valid. Selecting the active row again keeps it active without repeating the
callback. Sorting, paging, search and refresh preserve its ID; filtering it out
does not prove it was deleted. Clear controlled state after deleting the selected
record, or reset/key both the table and its details when changing tenant/dataset.
The callback fires on user activation, not on data refresh, so load authoritative
details by ID and refresh those widgets after relevant mutations.

Single active-row state is independent of `selectable`/`selectedIds` bulk
checkboxes, subtables and Excel's selected-row scope. They can be composed together.
For detail requests, use an AbortController and ignore obsolete responses, clear
old content while a new record loads, and provide loading/error/retry states.
Keying the details by active ID prevents the prior user's content flashing during
the next request. Enforce permissions and tenant scope at each detail endpoint.
Read the `row-selection-table` catalogue example for a complete cancellable loader.

Enable the advanced filter builder with `filterFields={[{key:'amount',label:'Amount',type:'number'}]}`.
Types are `text`, `number`, `date`, and `select` (with `{value,label}` options).
Conditions are edited as a draft and applied together; Cancel preserves the active filters.
Use `advancedFilters`/`onAdvancedFiltersChange` for controlled state or `defaultAdvancedFilters`
for an initial value: `{match:'all',rules:[{field:'amount',type:'number',operator:'between',value:100,valueTo:500}]}`.
`match:'any'` uses OR. Date values use `YYYY-MM-DD`; ranges include both endpoints.
Local rows filter before sorting and paging. Server `loadRows` and `loadExportRows`
receive `advancedFilters` with the rest of the query. Validate field/operator allowlists,
values, tenant scope and permissions at the server; the browser filter is not authorization.
Changing filters resets to page one and aborts the previous request. Excel's all-results
scope uses the same active query; selected export retains the explicit selection across filters.

### Additional charts

The SDK includes 28 chart components. The original LineChart, BarChart and DonutChart
remain compatible. The following 25 components load the Apache ECharts SVG engine only
when used:

| Family | Components |
| --- | --- |
| Trends | AreaChart, StackedAreaChart, StepLineChart, ComboChart, CandlestickChart |
| Comparison | HorizontalBarChart, StackedBarChart, PercentBarChart, PieChart, RoseChart, RadarChart, WaterfallChart, RangeBarChart, FunnelChart |
| Distribution | HeatmapChart, CalendarHeatmap, Histogram, BoxPlotChart |
| Relationships | ScatterChart, BubbleChart, SankeyChart, GraphChart |
| Hierarchy | TreemapChart, SunburstChart |
| Monitoring | GaugeChart |

All additional charts inherit palette and appearance tokens, resize to their containers,
animate by default and respect reduced motion. They accept `label`, `height` (320px),
`loading`, `error`, `animate`, `duration` and `showDataTable`. Keep the accessible data
table enabled: it supplies sorting, paging and Excel export alongside pointer tooltips.
Legends use keyboard-operable buttons. Read each chart's catalogue entry for its typed
data shape and executable example; specialized charts do not all use `series`.

Use ordered categories for trend charts; non-negative magnitudes for percent, pie and
radar comparisons. Radar spokes use independent data-derived ranges. Histograms accept
raw observations and compute equal-width bins. Box plots derive quartiles, Tukey whiskers
and outliers from raw samples. Waterfalls support deductions across zero and explicit
absolute totals. Sankey requires an acyclic flow; GraphChart supports cycles.
Hierarchy parents sum their children; exported group rows are subtotals, not additional
observations. Gauge arcs clamp to their bounds while retaining the actual value in the
readout and table. Aggregate dense datasets at the API before plotting them.

`src/widgets/catalog.js` is the source of truth for props, examples, recipes and
implementation guidance. The gallery, CLI and read-only MCP tools consume it.
TypeScript declarations are in `widgets.d.ts`. Examples are compiled by the tests
so broken imports and JSX fail the package checks.

Run from a project that has the SDK installed (these commands need no network):

```sh
node node_modules/@cloudgatedevs/cloudgate-client-react/src/widgets/cli.mjs version
node node_modules/@cloudgatedevs/cloudgate-client-react/src/widgets/cli.mjs guide
node node_modules/@cloudgatedevs/cloudgate-client-react/src/widgets/cli.mjs search table
node node_modules/@cloudgatedevs/cloudgate-client-react/src/widgets/cli.mjs widget data-table
node node_modules/@cloudgatedevs/cloudgate-client-react/src/widgets/cli.mjs recipe remote-table-edit
```

The package also supplies the `cloudgate-widgets` and `cloudgate-widgets-mcp` bins.
MCP clients can launch the latter with `node` and the installed package's absolute
`src/widgets/mcp.mjs` path as its argument. Tools: `search_widgets`, `get_widget`,
`get_widget_recipe`, `get_widget_guidelines`. Responses include the installed SDK
version. It only returns shipped documentation: no credentials, application data,
filesystem mutation or network access. Protocol: newline-delimited MCP stdio.
This is separate from the older Cloudweb page-builder cookbook.

### Administrative record editors

The installed `get_widget_guidelines` / CLI `guide` includes the shared record
editor rules. Use these alongside the widget APIs for policies, permissions,
provider settings and other operational forms. Composition examples demonstrate
widgets; they do not define your backend's mutation or financial contracts.

- Read and validate the detail document, record identity, scope and revision.
  Show inherited values, explicit overrides and effective values with their source.
  Preserve explicit `false` and `0`. Reset removes a record override; it must not
  overwrite a shared template. Keep unsupported rules and migration-managed
  records read-only, with a reason. Enforce these rules on the server too.
- Bind drafts and frozen before/after reviews to the record and type/revision.
  Track request generations, including A → B → A selection changes. Late success,
  error and cleanup handlers must not modify another editor or its loading state.
  Use exact server-compatible decimal and integer bounds, without lossy coercion.
- Await the mutation and validate its documented receipt and identity. Separate
  an accepted write from a subsequent read failure. Refresh reads without
  resubmitting writes. Reconcile uncertain outcomes through authoritative reads
  or documented server idempotency before enabling another attempt.
- Keep recoverable drafts scoped to app, tenant, record and revision. Clear them
  on discard, accepted save and reverting all edits. Reject stale or malformed
  recovery data. Avoid secret persistence and unsupported browser-history patches.
- Test actual SDK components and real client/state composition with controlled
  transports. Include late responses, remounts, async options, reset/revert,
  read-only changes and accepted-write/failed-refresh. Confirm signed-in browser
  reads and review/cancel without mutating live financial or configuration data.

Shared navigation and modal behavior belong in the SDK. Sidebar groups are visual
organization, not URL namespaces; follow the README's route ownership rules and
verify both page content and the active link. Nested `Dialog`/`Modal` layering is
managed by the SDK; do not copy either implementation or add app z-index patches.
Business policy resolution, permissions and migration ownership belong on the
server; the app supplies its DTO mapping and operator workflow.

## Text styles

**Widget library → Foundations → Text styles** provides an interactive type scale
with editable preview text, tone/alignment controls and copyable React code.
The SDK exports `Heading`, `Text`, `Paragraph`, `TextLink`, `TextList`, `Blockquote`
and `InlineCode` from `/react/widgets`. No new font or dependency is needed.

`Heading level={1…6}` controls the semantic element (default 2). Its optional
`size` is `display` or `h1` through `h6`, independent of level. Preserve a logical
heading hierarchy and use size for visual emphasis. Display/page-title styles
adapt to smaller screens; other sizes use rem units and inherit the app font.

`Paragraph` renders a paragraph. `Text` defaults to an inline span and also
supports `as="p|div|small|strong|em"`. Both accept `variant="body|lead|small|caption|
label|overline"`, `weight`, `tone`, `align` and optional `measure` (65ch line length).
Explicit alignment or measure makes inline Text display as a block.
Text labels are display styles; keep using labelled input widgets for form fields.
Use `tone="muted"` for supporting copy, `accent` for brand emphasis, or semantic
tones with meaningful status wording. Colors follow light/dark and custom palettes.

`TextLink` takes native anchor props. `TextList` accepts native `li` children and
optional `ordered`/`compact`; `Blockquote` supports `attribution` and native `cite`.
`InlineCode` is for short code references; use `CodeEditor` for multiline source.
All components forward native attributes and refs. They have no outer margins;
use your layout's spacing tokens to arrange them. Density adjusts spacing around
text while keeping the type scale readable.

## Icon library

**Widget library → Foundations → Icon library** browses the installed Lucide
collection. Search by component name or keywords (for example, “home”, “email” or
“delete”), filter categories, and preview size, stroke width and theme accent.
Select a tile to copy its export name or ready-to-use React code. Results are
paginated after searching the complete collection and use the page's normal scroll.

`IconLibrary` is also exported from `/react/widgets`. Its optional `initialSearch`,
`defaultIcon` and `onSelect({name, icon})` props let modules reuse the browser as an
icon picker. The full registry loads on demand; its contents match the app's
installed `lucide-react` version. No additional icon package is required.

For normal UI, use named imports from `lucide-react`, then pass the component to
`Button` or `IconButton` via `icon`. Give icon-only buttons a descriptive `label`.
Use `aria-hidden="true"` for decorative icons beside text. Inherit `currentColor`
or the `--accent-text` theme token; keep stroke widths and control sizes consistent.
The shipped icon catalogue entry and agent guidelines include this pattern.

## Code display and editing

Use `CodeEditor` for snippets, source previews and code fields. It uses the same
CodeMirror integration as Cloudgate React, loaded on demand. Pass `value`,
`language` and a descriptive `label`. Read-only is the default; for editing set
`readOnly={false}` and provide `onChange` with controlled state. The widget never
executes code. It supports JSX/TSX, JavaScript/TypeScript, JSON, HTML, CSS, Python,
SQL and plain text. Line numbers, folding, search, copying and line wrapping are
included. Tab moves focus out of the editor. Source grows to `maxHeight` and then
scrolls; wheel events can continue to the page at its boundaries. Colours inherit
the current palette, including nested gallery appearance previews.

## Form validation

`Input`, `Textarea` and `Select` validate native constraints (`required`, field
`type`, length, pattern, range and step). Untouched fields stay quiet; blur or an
invalid submit reveals an inline error, and corrections update it while typing.
Errors are linked through `aria-describedby` and `aria-invalid`. Required fields
include a visible indicator. Disabled and read-only controls skip validation.

Wrap named fields in `Form`. Its `onSubmit(data, event)` receives `FormData` only
when valid; native navigation is prevented and the first invalid field is focused.
SDK fields show inline feedback; ordinary native controls still use their browser
validation. Always give fields `name` attributes to include them in `FormData`.
Use `data.get(name)` or `data.getAll(name)` for repeated names. Regular HTML forms
also work with SDK fields and browser constraint validation.

For a custom rule, pass `validate(value, formData)`, returning an error string or
`undefined`. Rules are synchronous; dependent fields revalidate when other fields
change inside `Form`. Run asynchronous/server checks in your submission handler
and pass server messages via `error`; clear those messages in your own change/reset
handlers. Backend validation remains required. Customize built-in wording with
`validationMessages` keys `required`, `email`, `url`, `invalid`, `minLength`,
`maxLength`, `pattern`, `min`, `max` and `step`.

`Button type="reset"` clears touched feedback and restores uncontrolled defaults.
For controlled fields, also restore your values in `Form`'s `onReset`. The gallery
includes a working **Form validation** example and matching agent cookbook entry.

## Compact floating labels

Pass `labelPlacement="floating"` to `Input`, `Select`, `SearchSelect` or `Textarea`
to keep its label in the top border. Labels remain visible for empty fields and
date inputs, and retain their native label association, required marker, and
validation feedback. Existing fields default to labels above the control.

```jsx
<Select label="Show" labelPlacement="floating" value={status}
  options={statusOptions} onChange={event => setStatus(event.target.value)} />
<Input label="From" labelPlacement="floating" type="date" />
```

Use these in wrapping table toolbars with a gap between fields; control heights
still follow the SDK density setting. The label notch uses the input surface
token in light and dark themes. If the host overrides that surface, set
`--cgw-floating-label-bg` to the matching CSS color. This option does not change
filter values or filtering behavior.

Shared app adapters may also use `className="cgw-field--floating"` with a native
SDK `label`. `SearchSelect` forwards this field class to its inner input shell.
This lets an app prepare its markup while still on an older SDK without passing
an unknown prop to native controls. The floating appearance requires the updated
SDK stylesheet; applications should not copy that styling into their own CSS.

## Searchable dropdowns

Use `SearchSelect` for a search input with a dropdown. Pass `options` for local
filtering by label and description, or `loadOptions({search, limit, signal})`
for remote search. The loader returns an array of `{value, label, description?,
disabled?}`; values must be unique, nonempty strings or finite numbers. Zero is
valid. Server results keep their order and are not filtered again in the browser.

Remote search is debounced (300 ms by default), cancels superseded requests and
ignores late responses. Forward `signal` to your API client. Apply search,
permissions and tenant scoping on the server before limiting the results; do not
download the entire dataset. `limit` defaults to 50; this is a bounded result list,
not a paginated dropdown. Use `minSearchLength` to require typing before fetching.
Loading, no matches and retry feedback are built in. Change `reloadKey` after an
edit or when the lookup's tenant/filter context changes.

`onChange(value, option)` receives the selected ID and option, or `('', null)` on
clear. Use controlled `value` or uncontrolled `defaultValue`. A preselected remote
ID needs `selectedOption` with its label. Typing only changes the search; Escape
or blur restores the committed selection. Arrow keys move through enabled options
and Enter selects. The popup flips to fit the viewport and works inside dialogs.

For a destination picker where editing must invalidate the previous choice, set
`clearSelectionOnSearch`. The SDK clears the ID with `onChange('', null)` on the
first edit while preserving the typed text and input focus. Free text still needs
a new selection before submission. The default remains `false` for existing
pickers that restore their choice on Escape or blur.

Use `onSearchChange(search)` for immediate query notifications (for example, to
reset paging); it runs on each edit before the remote-search debounce, after the
SDK stores the input text. Do not clear controlled values in an ancestor's
`onInputCapture` handler, which can erase the current keystroke before the SDK
receives it. Query callbacks do not run for selecting or clearing an option.

Set `name` to submit the ID in `FormData`. `required` checks a committed selection,
so free text cannot satisfy it. Custom `validate` receives the ID as a string and
uses the shared form validation behavior. The **Searchable select** gallery page
has local, simulated-server and dialog examples, plus an API integration snippet.

## Table data contract

Use `rows` for local data or `loadRows` for server data. The loader receives
`{page, pageSize, search, sort, filters, signal}` and must return `{rows, total}`.
Pages start at 1; total is the count after filtering, before pagination. Search is
debounced and changing search/sort/filters resets pagination. Requests are aborted
when superseded and late results are ignored even if a loader ignores the signal.
Pass the signal to fetch. Use `pagination="load-more"` or `"infinite"` for lazy
incremental loading; both keep a manual Load more fallback. Infinite mode observes
the bottom of the scrollable table. Stable unique row IDs are required.

The server must authorize, scope, filter and sort the query, allowlist sort keys,
and limit page size. Do not fetch everything to implement remote paging. A change
to `reloadKey` reloads page 1 after edits. Selection can be controlled across pages;
the caller owns removing stale selected IDs after external deletions.

### Expandable subtables

Pass `renderExpandedRow={row => <ProjectTasks projectId={row.id} />}`. Inside the
child component, render another `DataTable` with local `rows` or a parent-scoped
`loadRows`. Content only mounts when expanded and visible, so remote children load
on demand; collapsing or paging away aborts the child loader and resets its local
state. Each subtable has independent search, sorting, pagination and selection.
Expansion uses keyboard-accessible buttons with `aria-expanded` and labelled regions.
Use `getRowLabel` for readable names and `getRowCanExpand` to omit leaf-row toggles.
Optional `expandedIds` / `onExpandedChange` control which parents are expanded.

### Selection and bulk actions

Combine `selectable` with `bulkActions` to show useful actions when rows are selected:

```jsx
<DataTable columns={columns} loadRows={loadProjects} selectable
  bulkActions={[{
    id: 'pause', label: 'Pause',
    onAction: async ids => { await pauseProjects(ids); },
  }]} />
```

Each action has a unique `id`, `label`, `onAction(ids)` and optional `icon`, `variant`
and `disabled`. IDs include selections on other pages or outside the current filter.
The header checkbox only selects loaded visible rows, never all matching server
records. Selected children and parents remain independent.

Return/await the mutation promise. While pending, selection changes and other bulk
actions are disabled. Throw an error on failure: the table shows it and retains the
selection for retry. Success clears submitted IDs and refreshes remote rows; use
`clearSelectionOnSuccess: false` or `refreshOnSuccess: false` to opt out (for example,
an export). Local mode requires the caller to update its `rows`. A controlled
`selectedIds` must be updated in `onSelectionChange`, including after success.
For APIs with partial failures, reconcile per-ID results in your handler before
resolving; the table cannot infer them. Only offer authorized actions, and enforce
permissions and tenant boundaries on the server for every submitted ID.

Selection and expansion persist across search/page/filter changes. Reset controlled
IDs or key the table when switching tenants or unrelated datasets. The gallery
demonstrates lazy project tasks and working Activate/Pause actions on sample data.
The `subtables-bulk-actions` cookbook recipe includes the server integration pattern.

### Excel export

Every `DataTable`, including subtables, has an **Excel** button by default. The
animated export dialog offers **All filtered results**, **Current page** (or loaded
rows for incremental tables) and **Selected rows** when a selection exists. Export
does not change the query, scroll position or selection. Subtables have their own
button; child rows are not silently mixed into a parent's worksheet.

The workbook contains visible data columns with styled, frozen headers, sensible
column widths and typed numbers, booleans and dates. Strings remain literal text,
including strings beginning with `=`. Row controls and actions are omitted.
Only the underlying value/accessor is exported, not React markup. Use:

```jsx
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'amount', label: 'Revenue', exportFormat: '$#,##0.00' },
  { key: 'created', label: 'Created', exportValue: row => new Date(row.created) },
  { key: 'internal', label: 'Internal reference', exportable: false },
];
<DataTable label="Projects" exportFileName="Project report" columns={columns} loadRows={loadProjects} />
```

Column options include `exportLabel` and `exportWidth` (Excel character widths).
Set the table's `exportable={false}` to omit the feature. The writer loads only
when someone creates an export, and no spreadsheet service receives the data.

For remote all-results exports, `loadRows` receives sequential pages of the current
page size with the same search/sort/filters and a separate abort signal. Cancel or
closing the dialog aborts export requests. Failed, overlapping or incomplete pages
produce an error rather than a partial download. Use stable server ordering.
Client exports support at most 50,000 rows; narrow filters for larger datasets.

Remote selected exports use the latest loaded snapshots of selected records across
pages and filters. For fresh selected records, externally preselected IDs, or a
special export endpoint, supply `loadExportRows(query)`, returning a row array.
The query contains `scope` (`all`, `page` or `selected`), `selectedIds`, the current
table query and `signal`. Authorize every requested row on the server. An unresolved
selected ID produces an error instead of being silently omitted. Reset selection
when switching tenant/data scope, as with bulk actions.

The shared back-office `Table` and charts' **View data table** also include Excel
export for the rows provided to those views, labelled **Rows currently shown**.
They do not own server pagination and therefore do not claim to export unseen pages.

## Appearance and accessibility

Widgets inherit the app's neutral, foreground, primary and secondary tokens;
primary button text uses `--accent-fg` and accent text uses `--accent-text`.
Density, light/dark/system mode and typography follow app appearance settings.
Semantic tones adapt for dark mode. Focus indicators, form labels, native inputs,
keyboard tabs, dialog focus management and reduced-motion behaviour are included.
Charts expose labelled, focusable points and a readable data table. Null line
values are gaps, negative bars have a zero baseline, and zero-total donuts show an
empty state. Aggregate large chart datasets before rendering.

### Motion and loading

`MetricCard` animates numeric `value` props. Supply `formatValue` for currency,
percentages or units; existing strings/React nodes stay static. Use the standalone
`CountUp` for other numeric displays. Updates continue from the displayed value,
including decreases, and screen readers receive the final value without frame-by-frame
announcements. The default duration is 700 ms; pass `animate={false}` to opt out.

Line charts reveal from left to right, bars grow from zero (including negative
values), and donut charts sweep around the ring while the total counts up. They
animate on load and changed data, not hover or equivalent data objects. All chart
components accept `animate` and `duration` (650 ms for line/bar, 750 ms for donut).
Reduced motion skips JavaScript animation and shimmer; pending frames cancel on
unmount or preference changes. The library's Replay animation button demonstrates
the entrance behaviour without reloading the page.

Use `loading` on `Card`, `MetricCard` and charts. `WidgetSkeleton` also exports
`card`, `metric`, `chart` and `donut` variants with an accessible loading label.
Keep `Skeleton` for custom placeholder shapes. Tables show row skeletons, a busy
line and spinners during initial, paginated, refresh and incremental requests.
Vertical scroll chains to the page when a table fits or reaches its boundary;
do not add wheel handlers that cancel this native behaviour.

For standalone apps, the shared stylesheet supplies default tokens. Set the same
`data-theme`/`data-density` attributes and RGB-channel variables on the document
root to integrate your own appearance settings. Dialogs use a body portal and
therefore inherit the document's appearance, not a local preview override.

### Modal dialogs

Import `Dialog` from `@cloudgatedevs/cloudgate-client-react/react/widgets` for
modal forms, confirmations and record details. It is already included in the
widget picker as **Dialog**. Use `open`, `onClose`, an accessible `title`, and
optional `description`, `footer` and `size` (`sm`, `md`, `lg`, `xl`). Keep it
mounted while toggling `open` so exit animation and focus restoration can finish.

`Dialog` and the existing `Modal` from the main `/react` entry share automatic
layer management. A child opens above its parent, including mixed nesting in
either direction. Closing the child restores focus to its opener. Do not add
application z-index overrides to make nested SDK dialogs work. Keep the parent
open and render the child within its React subtree when it belongs to that record.

Theme settings include eight coordinated palettes and an editable, named custom
palette. Brand, workspace tint and success/warning/error/info colours are saved
per app and environment. The custom palette is retained when a preset is selected.
The Widget Library's preview palette selector uses the same definitions without
saving anything. Existing installations retain their primary/secondary colours.

Use `PALETTE_PRESETS` and `paletteVariables(values, dark)` from
`@cloudgatedevs/cloudgate-client-react/platform` for custom previews. These generate
neutral surfaces, readable text, button foregrounds, semantic colours and chart
series. Prefer inherited `--cgw-success`, `--cgw-warning`, `--cgw-danger`,
`--cgw-info` and `--cgw-chart-1` through `--cgw-chart-6` over hardcoded colours.
`theme_custom_palette` stores a JSON string with `{name, colors}`; the seven
colour keys are listed by `PALETTE_COLOR_KEYS`. This is public appearance data.

Preset inspiration: [Happy Hues](https://www.happyhues.co/palettes/12)
([Citrus & Mint](https://www.happyhues.co/palettes/14),
[Rosewater](https://www.happyhues.co/palettes/17)) and
[Radix's accent and neutral guidance](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette).
The SDK adapts these pairings for workspace surfaces and accessible text in both modes.

## Adding a widget

1. Implement a provider-independent component under `src/react/widgets`.
2. Export it in that folder's `index.jsx`, add `widgets.d.ts` declarations and
   scoped CSS using inherited theme variables.
3. Add its id/name/category to `src/widgets/widget-index.js`, its catalogue
   props/example and an interactive `WidgetLibrary` demo. The sidebar uses this
   lightweight index; examples remain in the lazy-loaded catalogue.
4. Add tests for behaviour, then check narrow screens, keyboard, loading/empty/
   error/disabled states, dark mode, all four layout presets and a light custom accent.
5. Run `npm test`, `npm run build`, and inspect `npm pack --dry-run` before release.

## Timelines

Find the dedicated **Scheduling → Timeline** page for activity, project history,
order tracking and milestones. The existing `Timeline` export now supports
`variant="activity"`, `cards` (the original default) and `alternating`, plus
`orientation="horizontal"` for milestone tracks. Alternating collapses to a
single column on phones; horizontal scrolling remains inside the widget.
`TimelineCard` remains available for standalone events.

Supply `items` in the desired order with stable, unique string IDs and titles.
Entries accept all TimelineCard fields, plus expandable `details` and milestone
`state` (`complete`, `current`, `upcoming`, `blocked`). State supplies a default
icon, colour and visible label; `current` also exposes `aria-current="step"`.
Supply at most one current step. Completion is never inferred from dates.

`groupByDay` adds contiguous date headings to vertical timelines without sorting
records. `locale` and `timeZone` control formatting and grouping. Use ISO date-times
with offsets; date-only dates keep their calendar day. Explicit `time` overrides
the displayed date text. Invalid dates are grouped as Undated, and invalid zones
or duplicate IDs produce an actionable error instead of a rendering failure.

Pass `hasMore` and an `onLoadMore` callback returning your API request promise.
Append and deduplicate records in the caller and update `hasMore` when paging
finishes. The widget guards duplicate requests, shows busy feedback, and retains
loaded events after a rejected request. Use `loading`, `error`, `onRetry` and
`disabled` for other states. There is no built-in endpoint or cursor management;
authorize and scope every request, abort it on unmount, and key the widget when
the tenant/project changes. Expandable details stay mounted while collapsed.
Custom content remains responsible for its own disabled state and permissions.

## Tab styles

`Tabs` supports `variant="segmented"` (the existing default), `underline`,
`pills`, `outline` and `enclosed`. Find working examples under **Navigation → Tabs**.
Use underline for page sections, segmented for view switches, pills for an
accented selection, outline for separate options, and enclosed for a connected
tab strip and content surface. Styles inherit palette, spacing and reduced motion.

Set `orientation="vertical"` to put tabs beside the panel, `size="sm"|"md"|"lg"`
for control sizing, and `fullWidth` to share horizontal space. Overflow stays
inside the tab strip on narrow screens. On phones the vertical list sits above
its panel so labels and content remain readable. Icons, counts and disabled items work
with every style. Horizontal keyboard navigation respects inherited RTL direction.

`value` and `onChange` remain controlled. Supply unique stable string item values
and an enabled selection. Items with `content` create accessible tabs and connected
panels; when no items have content, Tabs renders a group of view-toggle buttons.
Use actual links for navigation between routes.

Arrow keys activate tabs by default, skipping disabled items and wrapping around.
Vertical tabs use Up/Down; horizontal tabs use Left/Right. Home/End move to the
first/last enabled item. `activationMode="manual"` moves focus only until Enter
or Space is pressed. Use this for panels with expensive or remote content.

`keepMounted` defaults to true, retaining hidden form state. Set it to false to
mount only the active panel's contents, cancel panel requests on unmount, and
keep important draft state in the caller. `disabled` blocks the whole control
while retaining the current panel. Neither disabled tabs nor hidden panels replace
server authorization.

## Scrum and kanban boards

Use `ScrumBoard` (or its `KanbanBoard` alias) for tasks, content pipelines, sales
stages and learning workflows. The gallery is under **Scheduling → Scrum board**.
It includes board/list views, local multi-term search, assignee filtering, priority
labels, tags, avatars, due dates, checklist/comment counts and advisory WIP limits.
All surfaces follow the app palette, display mode and spacing settings.

Pass controlled `columns` and `cards` with stable, unique string IDs. Every card
needs a valid `columnId`; array order defines ordering within each column. Use
`onCardsChange(nextCards, move)` for both drag/drop and the accessible Move dialog.
`move` contains `card`, `cardId`, `fromColumnId`, `toColumnId`, `fromIndex` and
`toIndex` (insertion index after removing the moving card). Custom fields and
hidden filtered records are preserved. The callback may return a promise: save
through your authorized API, then update cards; throw on failure. While pending,
the board blocks competing moves and shows saving feedback. Failed saves show an
error and do not internally mutate cards. There is no built-in backend or storage.

Use `onCardClick(card)` and `onAddCard(columnId)` for your own details/create flows.
`readOnly` hides creation and movement while preserving browsing and details;
`disabled` blocks interactions. Load data in the caller and pass `loading`,
`error` and `onRetry`. Key the board when switching tenants or datasets. WIP limits
are visual guidance; authorize writes and enforce business rules on the server.

Drag the grip with a pointer or touch, or use the Move button to choose a column
and exact position using the keyboard. `maxColumnHeight` defaults to 560 pixels;
list view has no column height cap and wraps on phones. `renderCard(card)` can
replace the contents; keep it presentational when `onCardClick` is supplied.
See the `scrum-board` catalogue example for complete imports and integration.

## Layout and spacing

Widget categories live under the expandable Widget library item in the main
back-office sidebar. The normal menu search also finds widgets. Each example
has a URL such as `/backoffice/widgets/data-table`; browser history, refresh,
breadcrumbs and the mobile navigation drawer follow that selection. All widget
and recipe routes require `backoffice.widgets.view`.

The saved `theme_density` setting now selects a complete layout: `wide` (centred,
up to 1,600 px, relaxed), `content` (centred, up to 1,120 px, comfortable),
`compact` (full width, tight spacing), or `flex` (full width, balanced spacing).
Older `comfortable` values read as `content`; no data migration is needed.
The root font size stays unchanged. Touch devices retain at least 44 px controls.

Widgets inherit `--cg-section-gap`, `--cg-card-padding`, `--cg-control-height`
and `--cg-cell-padding`. Use these spacing tokens in custom module layouts so
cards, controls and tables respond consistently. The back-office `app-content`
wrapper owns the maximum width; avoid adding a fixed-width wrapper to each page.
For a scoped preview, use `<div className="cgw-theme" data-density="compact">`.
Omit `data-density` to inherit the app setting. The gallery preview never saves
appearance changes; use Administration → Theme to save the installation layout.
# Build assistant widget references

Build chat includes an optional **Add widgets** picker. Search by component or capability, select up to twelve references, and describe each one's purpose (for example, a users list and monthly registrations). **Add another** creates a separate instance of the same widget. Choose **Page: Auto**, **Public page**, or **Back office**, then describe the goal in the message. References supplement files and dictated prompts; they never limit the assistant to this library.

The picker reads the SDK installed in the target Build workspace. Package builds generate `src/widgets/picker-manifest.json`, also exported as `@cloudgatedevs/cloudgate-client-react/widgets/manifest`. `cloudgate-widgets manifest` returns the same data-only metadata, SDK version, canonical IDs and a content fingerprint. The runtime validates references against the installed catalogue and retains the resolved names, purposes and version in chat history. Changes to a linked SDK invalidate the fingerprint even without a version bump; review updated references before resending a kept draft.

Agents should read documentation for each distinct selected widget before implementation, use existing SDK components where suitable, and build custom public or back-office experiences freely. Public layouts retain the application's sign-in and data-access rules. A chart associated with a remote table should use authorized aggregates over the complete filtered dataset, rather than just the current page of rows.
