import { widgetIndex } from "./widget-index.js";
import { tableExamples } from './table-examples.js';
import { advancedChartWidgets } from './chart-catalog.js';
import { cardWidgets, cardGalleryWidget } from './card-catalog.js';
import { richTextWidget } from './rich-text-catalog.js';
import { calendarWidget } from './calendar-catalog.js';
import { scrumWidget } from './scrum-catalog.js';
import { tabsWidget } from './tabs-catalog.js';
import { selectWidget } from './select-catalog.js';
import { radioWidget } from './radio-catalog.js';
import { timelineWidget } from './timeline-catalog.js';
import { recordEditorGuidance } from './record-editor-guidance.js';
import { adminStylingGuidance } from './admin-styling-guidance.js';
const widgetMetadata = Object.fromEntries(widgetIndex.map(widget => [widget.id, widget]));
const scrumGuidelines = `Use ScrumBoard (KanbanBoard alias) for task boards, sales pipelines, course progress and editorial workflows. Read scrum-board before building; do not add a separate drag-and-drop UI. Supply controlled columns/cards with unique string IDs and valid columnId values. Array order defines the order within columns. onCardsChange(nextCards,move) handles both drops and the accessible Move dialog. Return an async save promise, authorize on the server and update cards after success; throw on failure. move.toIndex is the destination index after removing the moving card. Keep custom metadata and hidden filtered cards intact. Pass loading/error/onRetry from your own loader; the widget does not fetch or save automatically. onCardClick and onAddCard(columnId) open your application's details and creation flows. Read-only permits browsing/details but hides mutations; backend permissions remain required. WIP limits are advisory. Use the grip for pointer/touch drag or the Move button for keyboard column/position selection. List view is a compact alternative on phones. Key the board when switching tenant or data set scope. renderCard is presentational content, with no nested controls when onCardClick is supplied.`;

/** The gallery, CLI and MCP tools all read this catalogue. Examples are compiled in tests. */
export const widgetImport = "@cloudgatedevs/cloudgate-client-react/react/widgets";
export const widgetGuidelines = `The back office already surfaces Cloudgate AI agents: one icon per agent in the bottom bar with a notification badge, and a chat bubble (findings, replies, reports) mounted by the SDK layout, plus toasts from ToastProvider. Users attach an agent by dragging its icon onto the page, so name the workflow behind what you build: pass feed='controller/route' to every DataTable that loads from the gateway, and spread agentWatchProps({ route, method, label }) (from '@cloudgatedevs/cloudgate-client-react/react/widgets') onto cards or charts fed by one route and onto every button or form submit that calls a create, update or delete workflow. Do not build application-level agent chat, alert panels or toast systems; call useAgents() or useToast() from '@cloudgatedevs/cloudgate-client-react/react' when a page needs them.

Use the installed @cloudgatedevs/cloudgate-client-react package as the source of truth. Read its package.json version and exports before choosing components. Import reusable React widgets from @cloudgatedevs/cloudgate-client-react/react/widgets and the shared stylesheet once from @cloudgatedevs/cloudgate-client-react/react/styles.css. These widgets work without authentication, a router, or a Cloudgate provider.

${scrumGuidelines}

${recordEditorGuidance}

${adminStylingGuidance}

Use Timeline for connected activity feeds, release histories, delivery progress and milestones. Read the timeline entry and activity-timeline recipe. Keep TimelineCard for a standalone event card. Choose variant='activity' for a compact feed, 'cards' for rich entries or 'alternating' for a centred vertical history. orientation='horizontal' works for milestone progress; the widget keeps overflow inside its track and adapts alternating entries on phones. Supply unique stable string IDs in the desired chronological order; the widget never sorts or infers completion from dates. Date-only values stay on their calendar day, timed values should include ISO offsets, and locale/timeZone control formatting and optional contiguous groupByDay headings. Supply state='complete'|'current'|'upcoming'|'blocked' for meaningful progress labels; at most one current step. Provide loading, error/onRetry and disabled states. Optional details stay mounted while collapsed. onLoadMore must return the authorized API request promise; append/deduplicate by ID in your caller and update hasMore. Failures retain entries and support retry. Scope all requests to the tenant/project, abort caller requests on unmount and key Timeline when scope changes. Built-in actions respect disabled; custom children must enforce their own interactions and server permissions.

Use Tabs for in-page sections and view switches. Read the tabs example to choose segmented (default), underline, pills, outline or enclosed. Reuse the same component with orientation='vertical', size, fullWidth and icons/counts; do not build another tab implementation. Provide unique stable string values and an enabled controlled value/onChange. Supplying content connects labelled panels; omitting all content creates a button group, not route links. Use real navigation links for routes. Automatic activation works for local panels; activationMode='manual' moves focus with arrows and opens with Enter/Space, suitable for expensive panels. keepMounted defaults true to retain hidden form state; false lazily mounts only the active contents and loses panel-local edits. Keep important drafts in caller state and abort pending loads on unmount. Horizontal tabs scroll within the strip, vertical labels wrap, and arrow navigation respects orientation and inherited text direction. Apply server permissions independently of disabled tabs.

Use Heading, Paragraph and Text for consistent typography. Heading level (1–6, default 2) controls the document structure; size (display or h1–h6) only controls appearance. Keep one page title and a logical heading hierarchy, regardless of visual size. Paragraph renders p; Text defaults to span and has body, lead, small, caption, label and overline variants. Text label is display text, not a form label; use labelled SDK fields in forms. Use tone='muted' for supporting copy and tone='accent' for brand emphasis. Semantic tones still need meaningful text, not color alone. Use measure for readable 65ch paragraphs when appropriate. TextLink renders an anchor, TextList wraps native li children, Blockquote accepts attribution/cite, and InlineCode is for short code references. Use CodeEditor for multiline source. Inherit typography and palette tokens, and use layout spacing around text; these components have no default outer margins. Do not add another font or reduce root font size for compact layouts.

Use the existing lucide-react collection for consistent icons. The Icon library (icons) entry documents a searchable browser of the installed collection, with exact component names and copyable snippets. In app modules use named imports such as import { Search } from 'lucide-react'; do not import the complete icons registry or another icon package. Use Button icon={Search}, or IconButton icon={Search} label="Search projects". Decorative SVGs next to visible labels should use aria-hidden="true"; standalone meaningful icons need an accessible name. Inherit currentColor or --accent-text rather than hardcoding a brand color. Prefer 16–20px for controls and 24px for standalone icons, with a consistent 2px stroke. IconLibrary itself loads the full registry only for browsing/picking, so do not render it just to show a single icon.

This library provides optional building blocks, primarily for back-office tooling. User-selected references express preferred ingredients, never an exclusive set of allowed components. Public websites and custom back-office experiences may use bespoke components whenever the library does not fit. Preserve the requested design and existing application shell. Public layout does not imply anonymous data access: retain the website sign-in policy and server permissions. For each selected canonical widget ID, read its props, example and relevant recipe before coding; reuse that documentation during the turn. Prefer shared widgets when suitable without copying their implementation. A table and related chart must share authorized data/filter semantics; use dataset-wide server aggregates rather than the current table page for charts. Inspect real fields and endpoints, and label any prototype data. Preserve the app's layout and appearance settings. Use inherited --ink-*, --mist*, --accent, --accent-fg, --accent-text and --secondary tokens; do not hardcode light backgrounds or brand colors. Use semantic Badge/Alert tones and text, not color alone. Use --cg-section-gap and --cg-card-padding for custom layout spacing. Inherit the saved wide, content, compact or flex layout; do not shrink root type or add fixed page-width wrappers. Widgets already respond to --cg-control-height and --cg-cell-padding. Respect reduced motion. Keep public widgets independent of back-office permissions.

DataTable owns its outer border, rounded corners, background, toolbar, footer and scroll region. Place it in a plain layout container with min-width: 0; do not wrap it in another bordered or padded table card, or add a second overflow container. Keep keyboard focus outlines visible. The inner scroll region has square corners between the toolbar and footer. Verify wide and narrow layouts, horizontal scrolling and the Columns menu.

Use DataTable density='compact' for dense operational lists: about 30px rows with a smaller toolbar and footer. Sub tables inside an expanded row are always compact. Do not write application CSS to shrink table padding, badges, toolbars or row height. Anchors rendered inside table cells are styled as links automatically (accent colour, underlined): render a real anchor or router link for every cell that navigates, including the first column of a row that also activates on click, and do not restyle it. For compact table header filters, pass labelPlacement="floating" and a visible label to Input, Select or SearchSelect in the DataTable toolbar. The label stays in the top border even for empty values; do not duplicate it in an outer wrapper or replace it with a placeholder. Keep filters in a wrapping toolbar alongside search and actions rather than a separate filter block above the table. Omit labelPlacement to retain ordinary form labels. className on Input, Select and Textarea is applied to the field wrapper, not to the control: never pass a class that draws a border, background or padding there, because the control already has its own and the result is a box inside a box. Use Disclosure for collapsible sections instead of bare details and summary elements or a hand-rolled toggle; it mounts its children on first open, so place the data loader inside it and do not ask the user to press a second Load control. NetworkGraph draws its own bordered canvas with a zoom and pan hint: place it directly in a card and do not add another frame or wheel handler. The back-office Layout wraps every routed page in an ErrorBoundary and DataTable wraps each expanded row in one, so a render error shows a retry alert instead of a blank application; wrap other independent sections (a card, a tab panel, a dialog body) in ErrorBoundary with a resetKey, and never rely on it to hide a defect: every new sub table or cell renderer needs a test that renders it with real-shaped rows.

DataTable supports local rows OR loadRows (not both). loadRows receives {page, pageSize, search, sort, filters, signal}; page starts at 1, sort is null or {key,direction:'asc'|'desc'}. Return {rows,total}, where total is the count AFTER filtering and BEFORE pagination. Forward the AbortSignal to fetch. Map sort/filter keys to the server's allowlist, apply tenant scoping and permissions on the server, and translate page to skip/take if needed. Never download the whole dataset to simulate server pagination. Use stable unique getRowId values. Changing reloadKey resets to page 1; use this after create/edit/delete. Use pagination='load-more' or 'infinite' for incremental loading; page-sized requests are merged by row ID. Search is debounced. Avoid permanent loading on failures; show an actionable retry.

For subtables use renderExpandedRow={row => <ChildTable parentId={row.id} />}; child content mounts only while expanded and visible. Put a nested DataTable inside ChildTable with a parent-scoped loadRows and forward its signal. Do not fetch children from the parent render or preload all children. Search, pagination and selection stay independent. getRowCanExpand can hide expansion for leaf rows, and getRowLabel supplies readable accessible names. With selectable, supply bulkActions [{id,label,onAction: async ids => ...}] or handle controlled selectedIds/onSelectionChange in your own UI. Actions receive ALL selected IDs across pages and filters, never just visible records; the header checkbox selects only loaded visible rows. Await the real mutation and throw on failures. Pending actions prevent duplicate submits; failures retain selection, success clears submitted IDs and refreshes by default. For exports use clearSelectionOnSuccess:false and refreshOnSuccess:false. Gate offered actions by permissions and authorize every ID on the server. Reset controlled selection/expansion or key the table when changing tenant or dataset scope.

DataTable includes real .xlsx export by default, including nested tables. Do not add a duplicate CSV/Excel button. The dialog offers all filtered results, loaded/current-page rows and selected rows. Exports use only visible data columns, never row actions or child tables. Set column.exportValue(row) for display-derived fields, exportFormat for Excel number/date formats, exportLabel/exportWidth for workbook presentation, or exportable:false for excluded columns. Raw/accessor values preserve number, boolean and Date types; strings are never treated as formulas. Remote all-results exports reuse loadRows in page-sized, cancellable requests and stop with an error if paging is incomplete or changes. Remote selected exports use the latest loaded snapshots of selected records, even across filters. Use loadExportRows({scope,selectedIds,page,pageSize,search,sort,filters,signal}) returning an array for a dedicated endpoint or preselected IDs not loaded in the table; enforce the same server permissions. Client exports are limited to 50,000 rows; narrow filters or build a server export for larger datasets. Set exportable:false to omit the feature and exportFileName to customize the filename.

Use Button and IconButton for consistent actions. Button variant is primary, secondary, neutral, success, warning, danger, info, ghost or link. Primary is the main action, secondary/neutral are supporting actions, and semantic variants convey intent with clear labels. appearance='solid'|'soft'|'outline' changes visual emphasis without changing intent; omitting it preserves each variant's default. Ghost and link stay quiet and ignore appearance: ghost is a transparent button with an outline (icon-only IconButton stays bare), link looks like a link. A labelled action must never look like plain text, so do not remove the border of a button in application CSS and do not hand-roll borderless text buttons; use ghost or secondary for minor actions such as Remove, Refresh or Reset. Link is a button style for actions; use TextLink or an anchor for navigation. Use loading while awaiting a mutation and disabled when unavailable. iconPosition='end' moves the icon or spinner after the label; fullWidth fits forms and cards. IconButton shares the variants, appearances, sizes and loading states. Avoid one-off button CSS and hardcoded colours; semantic fills and foregrounds adapt to custom palettes and dark mode. A danger button does not itself confirm or authorize a destructive operation.

Use Input/Select labels, accessible names on IconButton, descriptive Dialog titles, named Tabs, and chart labels. Use render(value,row) for table cells and accessor(row) for sortable/searchable derived values. Select and Input use native change events; Switch and Slider receive the new value directly. Slider and Switch are controlled. Tabs is controlled and supports arrow/Home/End navigation. Dialog is controlled with open/onClose and uses the SDK's shared entrance/exit animations, focus trap and focus restoration. Keep Dialog mounted while open changes so exit animation can finish.

Charts take plain data and series descriptors; formatValue formats ticks, tooltips and the accessible data table. Line gaps represent missing values; bars support negative numbers. Donut ignores negative/non-numeric values and displays an empty state if the positive total is zero. Keep series reasonably small and aggregate dense time series at the API. Never present sample gallery data as real customer data.

Use the saved palette's --cgw-success, --cgw-warning, --cgw-danger and --cgw-info for status colours and --cgw-chart-1 through --cgw-chart-6 for chart series. For a scoped appearance preview, import paletteVariables and PALETTE_PRESETS from the platform entry. Preserve the saved theme_custom_palette when applying a built-in palette; do not replace the user's named custom palette or save preview settings automatically.

For a clickable metric or filter tile pass onClick (and selected for the active one) to MetricCard: it becomes one button with one outline. Never wrap a card or metric in a bordered button or link. Pass numeric values and formatValue to MetricCard (or use CountUp on its own) for count-up animation; preformatted ReactNode values remain static. Charts animate on meaningful data changes, not hover or equivalent data. Use loading on cards, metrics and charts, and loadRows or loading on tables instead of building custom spinners. WidgetSkeleton offers card, metric, chart and donut shapes. Animations respect prefers-reduced-motion and can be disabled with animate={false}. Never block wheel events or contain vertical overscroll on tables; page scrolling must continue when the table cannot scroll further.

Use CodeEditor for source previews, snippets and code fields rather than a plain pre/textarea or another editor dependency. It uses CodeMirror with palette-aware syntax colours, line numbers, folding, search and copy. Set language and a descriptive label; readOnly defaults to true. Editing requires readOnly={false}, value and onChange. Never execute source to display it. The editor loads lazily, respects its maxHeight and lets wheel scrolling continue to the page. Tab moves focus out of the editor.

Use Form with named Input, Textarea and Select fields for validated submission. Put constraints directly on the fields: required, type, minLength, maxLength, pattern, min, max and step. Errors appear after blur or submit, then update as the user corrects them. Form onSubmit(data,event) receives native FormData only when valid; it prevents native navigation and focuses the first error. Custom validate(value,formData) rules are synchronous and return an error string or undefined; use formData for cross-field rules. Use error for server validation messages and clear them in your change/reset handler. Use validationMessages to customize built-in wording. Reset buttons clear validation and uncontrolled values; restore controlled state yourself in onReset. Client validation never replaces backend validation. Keep async saves, pending state and server errors in your submission handler.

Use RadioGroup for a small set of mutually exclusive choices. Read radio before building. Use native radios, a visible label, unique option values and a stable form name. variant='cards' adds descriptive choice cards; orientation='horizontal' wraps inline options. onChange receives the original value and option, while custom validate receives the selected string. Controlled forms reset their value in onReset; uncontrolled defaultValue resets automatically. Use disabled at group or option level. Native arrow and Space keys provide keyboard selection.

The Select library page combines native Select and SearchSelect. Use Select for short lists and read event.target.value from its native onChange event. Use SearchSelect for searchable dropdowns. Pass options for local filtering, or loadOptions({search,limit,signal}) returning an array of {value,label,description?,disabled?}. Forward signal to fetch; scope and search at the API before limiting results. Do not fetch all records or filter a remote result page again. Requests debounce and stale responses are ignored. Keep values unique and nonempty; numeric zero is valid. onChange(value,option) receives the selected ID, not a native event; clearing emits ('',null). Pass selectedOption to label a preselected remote ID. Change reloadKey when tenant/filter context changes or records are edited. Use name and required inside Form to submit and validate the selected ID, not the typed search. Customize debounceMs, minSearchLength and limit for the endpoint. Read the shipped select example and map its placeholder API route to the real application endpoint.

Use rowSelectable on DataTable for a single active record that drives related widgets. Read row-selection-table. Control activeRowId (null for none, zero is valid) and handle onActiveRowChange(id,row). This is independent of bulk selectedIds and Excel selected exports. The ID persists across paging, filtering and refresh; clear it on deletion or tenant/dataset changes. Load authorized details by ID, key the detail component, abort superseded requests, ignore late responses and show loading/error/retry. Embedded links, edit controls, checkboxes and expansion buttons must keep their own interactions.

The six table patterns (data-table, lazy-table, selection-table, row-selection-table, subtable, advanced-table) all compose DataTable. Read the focused example before building. Enable advanced filtering with filterFields [{key,label,type,options?}]: text, number, date or select. The query also includes advancedFilters {match:'all'|'any',rules:[{field,type,operator,value?,valueTo?}]}; forward it in loadRows and loadExportRows. Dates are YYYY-MM-DD, ranges are inclusive, multi-select values are arrays. Validate every field, operator and value on the server; apply AND/OR before counting and paging. Filter changes reset pagination and abort stale requests. Do not add another filter builder or Excel control.

Charts now include 25 additional typed exports. Search by the chart name and read its data shape; specialized charts do not all use data/series. Use Histogram for raw observations, BoxPlotChart for quartiles/outliers, ScatterChart/BubbleChart for relationships, WaterfallChart for cumulative changes, and RangeBarChart for intervals. SankeyChart requires acyclic positive flows; GraphChart supports cycles. Hierarchy group rows are subtotals. PercentBarChart requires non-negative measures. GaugeChart clamps the arc while preserving the actual reading. The advanced renderer loads on demand and inherits appearance tokens; do not import ECharts directly in generated modules. Keep showDataTable enabled for an accessible, exportable alternative to pointer tooltips. Aggregate dense data at the API and supply meaningful labels and consistent units.

Use the app card patterns before building custom cards. Search product-card, course-card, metric-chart-card, timeline-card, article-card, profile-card, project-card, task-card, event-card, pricing-card, file-card, testimonial-card, job-card, listing-card, goal-card, notification-card, integration-card or order-card. Compose lists with CardGrid and stable keys; minCardWidth is a responsive minimum, not a fixed page width. Timeline accepts ordered items with stable IDs; the caller sorts and loads activity. Set headingLevel to fit the surrounding document. Use image={{src,alt,position?}} for real media or media for custom content. Missing/failed images have a fallback. Never wrap a card containing controls in an anchor; use titleHref and explicit actions. action/secondaryAction take {label,onClick?,href?,icon?,variant?,disabled?,loading?}; own the mutation, await it, surface errors and supply pending state. Saved state and task completion are controlled through saved/onSavedChange and checked/onCheckedChange. Do not claim a purchase, reservation or integration succeeded before the real API confirms it. Supply loading, error/onRetry, empty and disabled states; custom children/footer manage their own permissions and disabled state. Numeric prices use currency/locale and keep zero valid; missing prices are unknown, not free. Order items.amount is a complete line total and total is supplied by the caller, including tax and shipping. MetricChartCard combines CountUp with a line/bar chart; keep showDataTable enabled and use consistent units. GoalCard clamps only the progress bar, retaining the actual value. All card surfaces, gaps, text, statuses and motion inherit the app's appearance. Read card-grid-actions and activity-timeline recipes for composition and async handling.

Use RichTextEditor (WysiwygEditor alias) for editable formatted content and RichTextContent for safe HTML display. Read the wysiwyg example before implementing notes, descriptions, articles or lesson content; do not add another editing library. Pass controlled value/onChange HTML, label and an appropriate basic/standard/full toolbar. Use name, required, maxLength and validate(html,formData) with Form. Required checks meaningful content, maxLength counts text characters, and named form values are HTML. Disable saves through onPendingChange while startup or uploads are pending. File uploads require your own uploadImage(file,{signal,onProgress}) returning {url}; forward signal, authorize the endpoint and validate files on the server. Without an adapter use image URLs. Use readOnly for viewing without a toolbar, disabled to omit form data and loading for skeletons. Render user content with RichTextContent, never raw dangerouslySetInnerHTML; sanitize and authorize again on the server. CKEditor loads on demand in the browser and uses the same GPL licenseKey default as Cloudgate React; configure the consuming app's applicable license. No premium plugins or upload service are assumed.

Use Calendar for event schedules, bookings, lessons and milestones. Read the calendar example; do not import another calendar engine directly. Choose local events or a stable loadEvents({start,end,timeZone,signal}) returning events for the visible range. Forward signal and fetch overlapping events, including ones starting before the range. Both range ends and event ends are exclusive. All-day dates are YYYY-MM-DD; timed events should carry explicit ISO offsets for unambiguous instants. Use stable unique IDs. Configure locale, timeZone, firstDay and weekends. onEventClick gets the original record; onDateClick and onRangeSelect open your own authorized creation flow, with no assumed persistence. Add event plus Go to date supports keyboard creation; agenda is useful on narrow screens. Change reloadKey after saves or when tenant/filter scope changes. Supply loading, errors and readOnly/disabled as appropriate; backend permissions remain required. initialDate/initialView apply on mount; key the widget to reset navigation. Do not claim a booking succeeded until the real API confirms it.

For each feature, verify loading, empty, error, disabled/read-only, narrow screen, keyboard, light/dark/system, compact density, custom palettes (including pale primary colours) and reduced motion. UI permission checks improve usability; enforce every read/write on the backend too. The React widget catalogue is distinct from the legacy Cloudweb page-builder cookbook: do not use widgetBuilderConfig or page-builder JSON for React modules. If this installed SDK lacks a needed export, use existing supported components or explain the required SDK upgrade; never invent an API or silently install a new SDK version.`;

const example = (imports, body) =>
  `import { ${imports} } from '${widgetImport}';\n\n${body}`;
const prop = (name, type, description) => ({ name, type, description });
export const widgets = [
  {
    ...widgetMetadata["typography"],
    exports: ["Heading", "Text", "Paragraph", "TextLink", "TextList", "Blockquote", "InlineCode"],
    description: "A shared type scale for headings, paragraphs, labels and supporting text, with links, lists, quotes and inline code. Inherits your app’s font, palette and layout.",
    props: [
      prop("Heading: level / size", "1–6 / 'display' | 'h1'…'h6'", "Level defaults to 2 and selects the semantic heading element. Size defaults to that level; change appearance without changing the document structure. Display and h1 sizes adapt to narrow screens."),
      prop("Heading: balance", "boolean", "Balances heading line breaks where supported. Defaults to true."),
      prop("Text / Paragraph: variant", "'body' | 'lead' | 'small' | 'caption' | 'label' | 'overline'", "Body is the default. Paragraph always renders p; Text defaults to span. Labels are display text, not replacements for form labels."),
      prop("Text: as", "'span' | 'p' | 'div' | 'small' | 'strong' | 'em'", "Choose the appropriate native text element. Use Heading for headings. Explicit align or measure makes inline text display as a block."),
      prop("Heading / Text / Paragraph: tone / align", "'default' | 'muted' | 'accent' | 'success' | 'warning' | 'danger' | 'info' / 'start' | 'center' | 'end'", "Theme-aware foreground colors and logical text alignment. Status meaning should also be conveyed in words."),
      prop("Text / Paragraph: weight / measure", "'normal' | 'medium' | 'semibold' | 'bold' / boolean", "Optional weight override. measure limits the text block to 65ch; no width limit by default."),
      prop("TextLink", "Native anchor props", "Underlined, keyboard-focusable link. Supply href and descriptive text. New-tab links include noopener/noreferrer."),
      prop("TextList: ordered / compact / children", "boolean / boolean / ReactNode", "Bullets by default; ordered renders ol. Pass native li children. Supports nested TextList and start/reversed for ordered lists."),
      prop("Blockquote: attribution / cite", "ReactNode / string", "Styled quotation with optional source text and the native cite URL."),
      prop("InlineCode", "Native code props", "Short code references, with inherited colors and safe text rendering. Use CodeEditor for multiline snippets."),
      prop("Native props / refs", "HTML attributes", "Pass className, style, id, accessibility attributes and forwarded refs. No outer margins; compose with layout spacing."),
    ],
    example: example("Heading, Text, Paragraph, TextLink, TextList, Blockquote, InlineCode", `export default function Example() {
  return <article className="cgw-stack">
    <header>
      <Text variant="overline" tone="accent">Project workspace</Text>
      <Heading level={1}>Your next chapter starts here.</Heading>
    </header>
    <Paragraph variant="lead" tone="muted" measure>
      Everything your team needs to turn an idea into something useful.
    </Paragraph>
    <section className="cgw-stack" aria-labelledby="next-steps">
      <Heading id="next-steps" level={2} size="h4">A few good next steps</Heading>
      <Paragraph>Start with a <strong>clear goal</strong> and give your project a name in <InlineCode>project.name</InlineCode>.</Paragraph>
      <TextList ordered>
        <li>Choose your starting point.</li>
        <li>Invite your team.</li>
        <li>Publish when you are ready.</li>
      </TextList>
      <Blockquote attribution="The product team">Small, thoughtful details add up.</Blockquote>
      <Paragraph variant="small"><TextLink href="#next-steps">Review the next steps</TextLink></Paragraph>
      <Text variant="caption" tone="muted">Last updated today</Text>
    </section>
  </article>;
}`),
  },
  {
    ...widgetMetadata["icons"],
    exports: ["IconLibrary"],
    description: "Browse the installed Lucide icon collection. Search names and keywords, filter categories, preview size and stroke, and copy ready-to-use React code.",
    props: [
      prop("initialSearch", "string", "Initial search text. Matches component names, readable names and common keywords; filters the whole collection before pagination."),
      prop("defaultIcon", "string", "Initial Lucide component name. Defaults to Sparkles; unknown names fall back to Sparkles."),
      prop("onSelect", "({name,icon}) => void", "Optional callback when a tile is selected. Returns the exact installed export name and the React component, suitable for Button's icon prop."),
      prop("className", "string", "Additional class for the library container. Inherits appearance tokens; the collection loads on demand."),
    ],
    example: `import { Search, Plus, Settings } from 'lucide-react';\n${example("Button, IconButton, IconLibrary", `export default function Example() {
  return <div className="cgw-stack">
    <div className="cgw-row">
      <Search size={20} strokeWidth={2} aria-hidden="true" />
      <span>Find a project</span>
      <Button icon={Plus}>New project</Button>
      <IconButton icon={Settings} label="Project settings" />
    </div>
    <IconLibrary initialSearch="arrow" defaultIcon="ArrowRight" />
  </div>;
}`)}`,
  },
  selectWidget,
  radioWidget,
  {
    ...widgetMetadata["code-editor"],
    exports: ["CodeEditor"],
    description: "Syntax-highlighted code with line numbers, folding, search, copy and optional editing. Powered by CodeMirror, with inherited palette colours.",
    props: [
      prop("value / onChange", "string / (value:string) => void", "Source text and controlled edit callback. No code is executed."),
      prop("language", "'jsx' | 'tsx' | 'javascript' | 'typescript' | 'json' | 'html' | 'css' | 'python' | 'sql' | 'text'", "Syntax mode. Defaults to jsx."),
      prop("label", "string", "Accessible editor name. Defaults to Code; give each editor a descriptive name."),
      prop("readOnly", "boolean", "Defaults to true. Set false and supply onChange for editing. Selection, copy and search remain available in read-only mode."),
      prop("lineNumbers / lineWrapping / copyable", "boolean", "All default to true. The toolbar lets readers toggle line wrapping."),
      prop("loading", "boolean", "Show a skeleton while loading source. The editor itself is loaded on demand."),
      prop("minHeight / maxHeight", "string", "CSS lengths, default 120px / 480px. Grows with source up to maxHeight, then scrolls."),
    ],
    example: `import { useState } from 'react';\n${example("CodeEditor", `export default function Example() {
  const [source, setSource] = useState('{\\n  "enabled": true,\\n  "limit": 25\\n}');
  return (
    <CodeEditor
      label="Project configuration"
      language="json"
      value={source}
      onChange={setSource}
      readOnly={false}
    />
  );
}`)}`,
  },
  {
    ...widgetMetadata["data-table"],
    exports: ["DataTable"],
    description:
      "Searchable, sortable records with lazy subtables, bulk actions, Excel export and server pagination.",
    props: [
      prop(
        "columns",
        "Column<T>[]",
        "key, label, accessor(row)?, render(value,row)?, sortable?, searchable?, compare?, align?, width?.",
      ),
      prop("rows", "T[]", "Local records. Omit when loadRows is provided."),
      prop(
        "loadRows",
        "(query) => Promise<{rows:T[],total:number}>",
        "Server query includes page (1-based), pageSize, search, sort, filters and AbortSignal.",
      ),
      prop(
        "getRowId",
        "(row:T) => string | number",
        "Stable unique row ID. Defaults to row.id.",
      ),
      prop(
        "pagination",
        "'pages' | 'load-more' | 'infinite'",
        "Defaults to numbered pages; infinite scroll also retains a Load more button.",
      ),
      prop(
        "pageSize / pageSizes",
        "number / number[]",
        "Initial page size (10) and page size options ([10,25,50]).",
      ),
      prop(
        "initialSort",
        "{key:string,direction:'asc'|'desc'} | null",
        "Initial sort; clicking a header cycles ascending, descending, none.",
      ),
      prop(
        "filters",
        "Record<string, unknown>",
        "JSON-serializable server filters. Local mode supports exact values or arrays of values.",
      ),
      prop(
        "reloadKey",
        "string | number",
        "Change after a mutation to reload page 1.",
      ),
      prop(
        "searchable / debounceMs",
        "boolean / number",
        "Search enabled by default, with 300ms debounce.",
      ),
      prop(
        "selectable / selectedIds / onSelectionChange",
        "boolean / RowId[] / (ids) => void",
        "Selection persists across pages and filters. The header selects only loaded visible rows. Control IDs when changing dataset or tenant scope.",
      ),
      prop("bulkActions", "TableBulkAction[]", "{id,label,icon?,variant?,disabled?,onAction(ids),clearSelectionOnSuccess?,refreshOnSuccess?}. Receives every selected ID. Await success or throw; busy/error feedback is built in. Success clears submitted IDs and refreshes unless opted out."),
      prop("defaultHiddenColumns", "string[]", "Column keys that start hidden. The user shows them from the Columns menu; use it for long or secondary columns so the default view fits without horizontal scrolling. Read once on mount."),
      prop("rowSelectable / activeRowId / defaultActiveRowId", "boolean / RowId | null", "Enable one active highlighted row for connected widgets. The user selects by clicking the row, which is highlighted; no radio column is drawn. Set activeRowIndicator only when a visible radio mark per row is wanted. Never add your own radio or checkbox column for single selection. activeRowId controls it; defaultActiveRowId initializes internal state. Null means none, zero is valid. The active ID persists across pagination, search and refresh; clear controlled state when deleting the record or changing dataset/tenant."),
      prop("onActiveRowChange", "(id:RowId, row:T) => void", "Fires when the user activates a different row. Store its ID to load related detail widgets; abort obsolete requests and handle loading/error states. Re-clicking the active row keeps it active. Independent of bulk selection and Excel's selected scope."),
      prop("getRowCanActivate", "(row:T) => boolean", "Optional predicate for active-row interaction. Plain cells activate; embedded links, controls, expansion buttons and elements marked data-row-selection-ignore retain their own actions. Native activation buttons support Enter/Space and Up/Down/Home/End within the loaded view."),
      prop("density", "'comfortable' | 'compact'", "compact gives about 30px rows with a smaller toolbar and footer for dense operational lists. Sub tables in expanded rows are always compact."),
      prop("renderExpandedRow", "(row:T) => ReactNode", "Return a nested DataTable or detail component. Mounted only while expanded and visible; child loaders are lazy and abort on collapse. Each subtable owns its query and selection."),
      prop("getRowCanExpand / getRowLabel", "(row) => boolean / (row) => string | number", "Optional leaf-row predicate and readable row name for expansion and selection controls. All rows are expandable by default; names default to IDs."),
      prop("expandedIds / onExpandedChange", "RowId[] / (ids) => void", "Optional controlled expansion across pages. Collapsing or paging away unmounts child content, resetting its local state."),
      prop("exportable / exportFileName", "boolean / string", "Excel export is enabled by default. Download all filtered results, loaded/current-page rows or selected rows as .xlsx, using visible columns only. Subtables export independently."),
      prop("loadExportRows", "(TableExportQuery) => Promise<T[]>", "Optional export-specific loader. Receives scope ('all', 'page', 'selected'), selectedIds, current query and signal. Default all-results loading pages through loadRows; selected remote records use retained snapshots. Limited to 50,000 rows."),
      prop("Column exportable / exportValue / exportFormat", "boolean / (row) => scalar | Date / string", "Omit a column with exportable:false. exportValue supplies a derived scalar; exportFormat is an Excel format such as '$#,##0.00'. Also supports exportLabel and exportWidth (characters)."),
      prop(
        "toolbar / rowActions",
        "ReactNode / (row) => ReactNode",
        "Compose filter controls and accessible row actions.",
      ),
      prop(
        "loading / error / onRetry",
        "boolean / Error / () => void",
        "Local data state overrides. Remote errors already show retry.",
      ),
      prop(
        "onQueryChange",
        "(query) => void",
        "Observe table queries for diagnostics; do not fetch a second copy here.",
      ),
      prop(
        "label / searchPlaceholder / emptyTitle / emptyDescription",
        "string",
        "Accessible table label and user-facing messages.",
      ),
    ],
    example: `import { useState } from 'react';\n${example("DataTable, Badge", `const columns = [
  {key:'name', label:'Project'},
  {key:'status', label:'Status', render: value => <Badge tone={value === 'Active' ? 'success' : 'neutral'}>{value}</Badge>},
];
export default function Example() {
  const [projects, setProjects] = useState([
    {id:1, name:'Brand studio', status:'Active', tasks:[{id:'1-1', name:'Design review'}, {id:'1-2', name:'Launch preparation'}]},
    {id:2, name:'Customer portal', status:'Paused', tasks:[{id:'2-1', name:'Accessibility review'}]},
  ]);
  function updateStatus(ids, status) {
    setProjects(rows => rows.map(row => ids.includes(row.id) ? {...row, status} : row));
  }
  return <DataTable label="Projects" columns={columns} rows={projects} selectable
    getRowLabel={row => row.name} getRowCanExpand={row => row.tasks.length > 0}
    bulkActions={[
      {id:'activate', label:'Activate', onAction: ids => updateStatus(ids, 'Active')},
      {id:'pause', label:'Pause', onAction: ids => updateStatus(ids, 'Paused')},
    ]}
    renderExpandedRow={row => <DataTable label={row.name + ' tasks'}
      columns={[{key:'name', label:'Task'}]} rows={row.tasks} pageSize={5} />} />;
}`)}`,
  },
  {
    ...widgetMetadata["line-chart"],
    exports: ["LineChart"],
    description:
      "A responsive trend chart with subtle area fills, series controls and accessible values.",
    props: [
      prop(
        "data",
        "Record<string,unknown>[]",
        "One record per x-axis label; null values form gaps.",
      ),
      prop(
        "series",
        "{key:string,label:string}[]",
        "Keys of numeric measures and their display names.",
      ),
      prop("xKey", "string", "Defaults to label."),
      prop("label", "string", "Accessible chart title."),
      prop("formatValue", "(number) => string", "Axis and value formatter."),
      prop("height", "number", "SVG viewBox height (260 default)."),
      prop("animate / duration", "boolean / number", "Reveal on load and data changes; true / 650 ms by default. Reduced motion skips animation."),
      prop(
        "loading / showDataTable",
        "boolean",
        "Loading skeleton / expandable data table (enabled by default).",
      ),
    ],
    example: example(
      "LineChart",
      `export default function Example() {\n  return <LineChart label="Monthly revenue" data={[{label:'Jan', revenue:2400}, {label:'Feb', revenue:3200}, {label:'Mar', revenue:2800}]} series={[{key:'revenue', label:'Revenue'}]} formatValue={n => '$' + Math.round(n).toLocaleString()} />;\n}`,
    ),
  },
  {
    ...widgetMetadata["bar-chart"],
    exports: ["BarChart"],
    description:
      "Compare grouped measures, including positive and negative values.",
    props: [
      prop(
        "data / series / xKey",
        "Same as LineChart",
        "Grouped bars with a zero baseline; missing values are omitted.",
      ),
      prop(
        "label / formatValue / height / loading / showDataTable / animate / duration",
        "Same as LineChart",
        "Supports keyboard focus and an accessible data table.",
      ),
    ],
    example: example(
      "BarChart",
      `export default function Example() {\n  return <BarChart label="Orders by channel" data={[{label:'Web', current:125, previous:90}, {label:'Mobile', current:180, previous:135}]} series={[{key:'current',label:'This month'}, {key:'previous',label:'Last month'}]} />;\n}`,
    ),
  },
  {
    ...widgetMetadata["donut-chart"],
    exports: ["DonutChart"],
    description:
      "A clear breakdown with a focusable ring, totals and percentage legend.",
    props: [
      prop(
        "data",
        "Record<string,unknown>[]",
        "Positive finite values contribute to the total.",
      ),
      prop("labelKey / valueKey", "string", "Defaults to label / value."),
      prop("animate / duration", "boolean / number", "Sweep segments and count the total; true / 750 ms by default. Reduced motion skips animation."),
      prop(
        "label / formatValue / loading / showDataTable",
        "string / function / boolean / boolean",
        "Accessible name, formatter and states.",
      ),
    ],
    example: example(
      "DonutChart",
      `export default function Example() {\n  return <DonutChart label="Traffic sources" data={[{label:'Direct',value:64}, {label:'Search',value:28}, {label:'Referral',value:8}]} />;\n}`,
    ),
  },
  {
    ...widgetMetadata["metric-card"],
    exports: ["MetricCard", "CountUp"],
    description:
      "A focused headline number with context, an optional icon and a semantic trend.",
    props: [
      prop(
        "label / value / description",
        "ReactNode",
        "Metric title, prominent value and supporting context.",
      ),
      prop(
        "onClick / selected",
        "() => void / boolean",
        "Make the whole metric one button (a filter tile). selected draws the active outline and sets aria-pressed. Never wrap a metric or card in your own bordered button or link: that draws two outlines.",
      ),
      prop(
        "trend / tone",
        "ReactNode / Tone",
        "Explicit trend text and semantic tone. The caller decides whether an increase is good.",
      ),
      prop("icon", "React component", "Optional lucide-compatible icon."),
      prop("loading", "boolean", "Display a skeleton instead of the value."),
      prop("formatValue", "(number) => string", "Pass value as a number to animate currency, percentages or counts. ReactNode/string values stay static."),
      prop("animate / duration", "boolean / number", "Count from zero on mount and from the current value on updates. True / 700 ms by default; honours reduced motion."),
      prop("CountUp", "{value:number, formatValue?, animate?, duration?, loading?, className?}", "Standalone animated number. Accessible text always exposes the final formatted value."),
      prop(
        "children",
        "ReactNode",
        "Optional extra content such as a progress indicator.",
      ),
    ],
    example: example(
      "MetricCard",
      `export default function Example() {\n  return <MetricCard label="Monthly revenue" value={24680} formatValue={n => '$' + Math.round(n).toLocaleString()} trend="+12.8%" tone="success" description="vs. last month" />;\n}`,
    ),
  },
  {
    ...widgetMetadata["card"],
    exports: ["Card"],
    description:
      "A flexible surface with a consistent header, content area and optional footer.",
    props: [
      prop("loading", "boolean", "Show a shaped card skeleton and withhold stale content/footer while data loads."),
      prop(
        "title / description / action",
        "ReactNode",
        "Header title, supporting text and trailing action.",
      ),
      prop(
        "children / footer",
        "ReactNode",
        "Body and optional separated footer.",
      ),
      prop(
        "className / ...sectionProps",
        "HTML attributes",
        "Compose layouts without changing the shared visual language.",
      ),
    ],
    example: example(
      "Card, Button",
      `export default function Example() {\n  return <Card title="Your workspace" description="A place for your next idea." footer={<Button>Open workspace</Button>}><p>Everything you need to move your project forward.</p></Card>;\n}`,
    ),
  },
  {
    ...widgetMetadata["button"],
    exports: ["Button", "IconButton"],
    description:
      "Primary, secondary and semantic actions with solid, soft and outline styles, icons and busy states.",
    props: [
      prop(
        "variant",
        "'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'ghost' | 'link'",
        "Primary is the default. Secondary is a supporting neutral action. Semantic colours inherit the palette. Link is a button style, not a navigation anchor.",
      ),
      prop("appearance", "'solid' | 'soft' | 'outline'", "Optional emphasis override for coloured variants. Existing defaults are preserved; semantic variants default soft. Ghost and link ignore this option."),
      prop("size", "'sm' | 'md' | 'lg'", "Medium is the default."),
      prop("fullWidth", "boolean", "Fill the available width, wrapping long labels when needed."),
      prop(
        "loading / disabled",
        "boolean",
        "Prevents repeat submissions; loading exposes aria-busy.",
      ),
      prop("icon", "React component", "Optional leading icon."),
      prop("iconPosition", "'start' | 'end'", "Defaults start. Positions the icon or loading spinner before or after the label."),
      prop(
        "label (IconButton)",
        "string",
        "Required accessible label, also shown as a title.",
      ),
      prop(
        "type / ...buttonProps",
        "HTML button attributes",
        "Defaults to type=button; explicitly use submit in forms.",
      ),
    ],
    example: `import { useState } from 'react';
import { ArrowRight, Check, Trash2 } from 'lucide-react';
${example('Button, IconButton', `export default function Example() {
  const [message,setMessage]=useState('');
  return <div className="cgw-stack">
    <div className="cgw-row">
      <Button onClick={()=>setMessage('Primary action selected.')}>Primary</Button>
      <Button variant="secondary" onClick={()=>setMessage('Secondary action selected.')}>Secondary</Button>
      <Button variant="neutral" onClick={()=>setMessage('Neutral action selected.')}>Neutral</Button>
      <Button variant="success" appearance="solid" icon={Check} onClick={()=>setMessage('Success action selected.')}>Approve</Button>
      <Button variant="warning" appearance="soft" onClick={()=>setMessage('Warning action selected.')}>Review</Button>
      <Button variant="danger" appearance="outline" icon={Trash2} onClick={()=>setMessage('Delete requested. Confirm before performing a real deletion.')}>Delete</Button>
      <Button variant="info" onClick={()=>setMessage('Information action selected.')}>Information</Button>
      <Button variant="ghost" onClick={()=>setMessage('Options selected.')}>Options</Button>
      <Button variant="link" onClick={()=>setMessage('Details selected.')}>View details</Button>
      <IconButton variant="danger" appearance="soft" icon={Trash2} label="Remove item" onClick={()=>setMessage('Remove requested in this example.')} />
      <Button loading variant="success" appearance="solid">Saving</Button>
      <Button disabled variant="secondary">Unavailable</Button>
    </div>
    <Button fullWidth icon={ArrowRight} iconPosition="end" onClick={()=>setMessage('Continue selected.')}>Continue</Button>
    <p role="status">{message}</p>
  </div>;
}`)}`,
  },
  {
    ...widgetMetadata["input"],
    exports: ["Input", "Textarea"],
    description:
      "Labelled fields with built-in validation, custom rules, hints and accessible error messages.",
    props: [
      prop(
        "label / hint / error",
        "ReactNode",
        "Accessible label, helper text or validation error.",
      ),
      prop("icon (Input)", "React component", "Leading icon."),
      prop("labelPlacement", "'above' | 'floating'", "Defaults to above. Use floating for compact table filters: the persistent label sits in the top border without changing validation or native input behavior."),
      prop("required / type / minLength / maxLength / min / max / step / pattern", "Native constraints", "Checked on blur and submit. After blur, feedback updates while typing. Optional empty values remain valid."),
      prop("validate", "(value:string, formData?:FormData) => string | undefined", "Synchronous custom rule. Return an error or undefined. formData allows cross-field checks."),
      prop("validationMessages", "Record<string,string>", "Override required, email, url, invalid, minLength, maxLength, pattern, min, max or step messages."),
      prop(
        "value / onChange / ...inputProps",
        "Native HTML attributes",
        "Native event callback; supports type, required, disabled, autoComplete, min/max etc.",
      ),
    ],
    example: example("Form, Input, Textarea, Button", `export default function Example() {
  return (
    <Form className="cgw-stack" onSubmit={data => console.log(data.get('name'))}>
      <Input name="name" label="Project name" required minLength={3} maxLength={60} />
      <Input name="email" label="Email address" type="email" required />
      <Textarea name="description" label="Description" maxLength={240} />
      <Button type="submit">Save project</Button>
    </Form>
  );
}`),
  },
  {
    ...widgetMetadata["form"],
    exports: ["Form"],
    description: "Validate fields before submission, focus the first error and submit native FormData. Works with controlled and uncontrolled fields.",
    props: [
      prop("onSubmit", "(data:FormData, event:FormEvent) => void", "Called only when valid. Native navigation is prevented. Read values with data.get(name), data.getAll(name) or Object.fromEntries(data)."),
      prop("onReset", "(event:FormEvent) => void", "Clears validation feedback. Native reset restores uncontrolled defaults; reset your own state for controlled fields."),
      prop("children", "ReactNode", "Use named Input, Textarea and Select fields. Native controls still participate in constraint checks."),
      prop("...formProps / ref", "Native form attributes", "Class names, accessibility attributes and a forwarded HTMLFormElement ref."),
    ],
    example: example("Form, Input, Select, Button", `export default function Example() {
  return (
    <Form className="cgw-stack" onSubmit={data => console.log(Object.fromEntries(data))}>
      <Input name="email" label="Email address" type="email" required />
      <Input name="confirmEmail" label="Confirm email" type="email" required
        validate={(value, data) => value === data?.get('email') ? undefined : 'Email addresses must match.'} />
      <Input name="seats" label="Team size" type="number" required min={1} max={100} defaultValue="5" />
      <Select name="plan" label="Plan" required placeholder="Choose a plan" defaultValue=""
        options={[{value: 'starter', label: 'Starter'}, {value: 'team', label: 'Team'}]} />
      <Button type="submit">Save settings</Button>
      <Button type="reset" variant="secondary">Reset</Button>
    </Form>
  );
}`),
  },
  {
    ...widgetMetadata["slider"],
    exports: ["Slider"],
    description:
      "A native range control with a visible value and keyboard support.",
    props: [
      prop(
        "label / value / onChange",
        "string / number / (value:number) => void",
        "Controlled slider. Callback receives a number.",
      ),
      prop("min / max / step", "number", "Defaults to 0 / 100 / 1."),
      prop(
        "formatValue",
        "(value:number) => string",
        "Visible value and aria-valuetext.",
      ),
      prop(
        "hint / disabled",
        "string / boolean",
        "Supporting text and disabled state.",
      ),
    ],
    example: `import { useState } from 'react';\n${example("Slider", `export default function Example() {\n  const [value, setValue] = useState(60);\n  return <Slider label="Monthly capacity" value={value} onChange={setValue} formatValue={n => n + '%'} />;\n}`)}`,
  },
  {
    ...widgetMetadata["switch"],
    exports: ["Switch", "Checkbox"],
    description:
      "Binary choices with three switch sizes, clear labels, helper text and native checkbox selection.",
    props: [
      prop(
        "Switch: label / hint / checked / onChange",
        "string / string / boolean / (checked:boolean) => void",
        "Controlled switch uses a boolean callback.",
      ),
      prop(
        "Switch: size",
        "'sm' | 'md' | 'lg'",
        "Sizes the track and thumb together. Defaults to md; sm fits compact settings and lg suits prominent controls.",
      ),
      prop(
        "Checkbox: label / hint / checked / onChange",
        "ReactNode / string / boolean / native event",
        "Checkbox uses event.target.checked.",
      ),
      prop(
        "Checkbox: indeterminate",
        "boolean",
        "Shows mixed selection with aria-checked=mixed.",
      ),
      prop("disabled", "boolean", "Prevents interaction."),
    ],
    example: `import { useState } from 'react';\n${example("Switch, Checkbox", `export default function Example() {\n  const [settings, setSettings] = useState({ activity: true, email: true, notifications: false });\n  const update = key => checked => setSettings(current => ({ ...current, [key]: checked }));\n  return (\n    <div className="cgw-stack">\n      <Switch size="sm" label="Activity badges" checked={settings.activity} onChange={update('activity')} />\n      <Switch size="md" label="Email updates" hint="A weekly summary of activity." checked={settings.email} onChange={update('email')} />\n      <Switch size="lg" label="Enable notifications" checked={settings.notifications} onChange={update('notifications')} />\n      <Checkbox label="Include project activity" defaultChecked />\n    </div>\n  );\n}`)}`,
  },
  tabsWidget,
  {
    ...widgetMetadata["dialog"],
    exports: ["Dialog"],
    description:
      "An animated modal with focus trapping, Escape dismissal, focus restoration and automatic stacking above existing SDK dialogs. Use Dialog for modal forms, confirmations and record details; nested Dialog and legacy Modal share the same layer stack.",
    props: [
      prop(
        "open / onClose",
        "boolean / () => void",
        "Keep mounted and toggle open so the closing animation can complete.",
      ),
      prop(
        "title / description",
        "ReactNode",
        "Accessible heading and optional supporting text.",
      ),
      prop(
        "size",
        "'sm' | 'md' | 'lg' | 'xl'",
        "Medium default; max-height stays within viewport.",
      ),
      prop(
        "children / footer",
        "ReactNode",
        "Scrollable body and pinned action area.",
      ),
    ],
    example: `import { useState } from 'react';\n${example("Dialog, Button", `export default function Example() {\n  const [open, setOpen] = useState(false);\n  return <><Button onClick={() => setOpen(true)}>Open dialog</Button><Dialog open={open} onClose={() => setOpen(false)} title="Ready to continue?" description="Review your changes before saving." footer={<Button onClick={() => setOpen(false)}>Done</Button>}><p>Your changes are ready.</p></Dialog></>;\n}`)}`,
  },
  {
    ...widgetMetadata["badge"],
    exports: ["Badge"],
    description: "Subtle status labels that remain readable in every theme.",
    props: [
      prop(
        "tone",
        "'neutral'|'accent'|'success'|'warning'|'danger'|'info'",
        "Semantic status, neutral by default.",
      ),
      prop("dot", "boolean", "Optional status dot; always pair it with text."),
      prop("children", "ReactNode", "Short descriptive status label."),
    ],
    example: example(
      "Badge",
      `export default function Example() {\n  return <div className="cgw-row"><Badge tone="success" dot>Active</Badge><Badge tone="warning" dot>Pending</Badge><Badge tone="danger" dot>Failed</Badge></div>;\n}`,
    ),
  },
  {
    ...widgetMetadata["alert"],
    exports: ["Alert"],
    description: "Contextual feedback with an optional action and dismissal.",
    props: [
      prop(
        "title / children / action",
        "ReactNode",
        "Heading, explanation and action.",
      ),
      prop("tone", "Tone", "Defaults to info; danger uses role=alert."),
      prop("onDismiss", "() => void", "Optional dismiss action."),
    ],
    example: example(
      "Alert, Button",
      `export default function Example() {\n  return <Alert tone="warning" title="A little attention needed" action={<Button variant="secondary" size="sm">Review settings</Button>}>Your changes are saved. Complete the setup when you are ready.</Alert>;\n}`,
    ),
  },
  {
    ...widgetMetadata["empty-state"],
    exports: ["EmptyState"],
    description: "A useful next step when a list, chart or module has no data.",
    props: [
      prop(
        "title / description",
        "string",
        "Clear explanation of the empty state.",
      ),
      prop("icon", "React component", "Optional icon."),
      prop("action", "ReactNode", "An appropriate next step."),
    ],
    example: example(
      "EmptyState, Button",
      `export default function Example() {\n  return <EmptyState title="Your first project starts here" description="Create a project to bring your ideas together." action={<Button>Create project</Button>} />;\n}`,
    ),
  },
  {
    ...widgetMetadata["disclosure"],
    exports: ["Disclosure"],
    description: "A collapsible section with a full-width header, chevron and padded content; content can load on first open.",
    props: [
      prop("title / subtitle", "ReactNode", "Header text; the muted subtitle stays on the same line and truncates."),
      prop("defaultOpen / open / onOpenChange", "boolean / (open:boolean) => void", "Uncontrolled by default; pass open and onOpenChange to control it."),
      prop("lazy", "boolean", "Defaults to true: children mount on first open and stay mounted, so a closed section costs nothing and a loader inside runs when the user opens it."),
      prop("actions", "ReactNode", "Optional controls at the right of the header, outside the toggle button."),
      prop("icon / className", "React component / string", "Optional leading icon and wrapper class."),
    ],
    example: example(
      "Disclosure, Button",
      `export default function Example() {\n  return <Disclosure title="History coverage" subtitle="3 of 3 wallets loaded" actions={<Button size="sm" variant="secondary">Refresh</Button>}>\n    <p>Mounted when the section is first opened.</p>\n  </Disclosure>;\n}`,
    ),
  },
  {
    ...widgetMetadata["error-boundary"],
    exports: ["ErrorBoundary"],
    description: "Contains a render error to one section and shows a retry alert, so a broken cell, sub table or card does not blank the whole page.",
    props: [
      prop("children", "ReactNode", "The section to protect."),
      prop("title / description", "string", "Text of the default danger alert."),
      prop("fallback", "ReactNode | (error, reset) => ReactNode", "Replaces the default alert."),
      prop("resetKey", "unknown", "Changing it (a route path, a record id) clears a caught error."),
      prop("onError", "(error, info) => void", "Report the error to logging."),
    ],
    example: example(
      "ErrorBoundary, Card",
      `export default function Example({ accountId }) {\n  return <ErrorBoundary resetKey={accountId} title="Balances could not be displayed">\n    <Card title="Balances">Balances for {accountId}</Card>\n  </ErrorBoundary>;\n}`,
    ),
  },
  {
    ...widgetMetadata["skeleton"],
    exports: ["Skeleton", "WidgetSkeleton"],
    description: "A quiet loading placeholder that respects reduced motion.",
    props: [
      prop("width / height", "CSS length", "Defaults to 100% / 1rem."),
      prop("WidgetSkeleton", "{variant?, label?, height?, className?}", "Ready-made card, metric, chart or donut geometry with an accessible loading status. Uses the same theme-aware shimmer."),
      prop(
        "className / style",
        "string / CSSProperties",
        "Optional shape overrides. Put role=status on the parent loading region.",
      ),
    ],
    example: example(
      "WidgetSkeleton",
      `export default function Example() {\n  return <WidgetSkeleton variant="chart" height="260px" label="Loading revenue" />;\n}`,
    ),
  },
  {
    ...widgetMetadata["progress"],
    exports: ["Progress"],
    description:
      "Determinate progress with an accessible value and optional percentage.",
    props: [
      prop("animate", "boolean", "Animate percentage changes (300 ms) and the bar width. Defaults to true; honours reduced motion."),
      prop(
        "label / value / max",
        "string / number / number",
        "Provide a label; value clamped to 0..max (100 default).",
      ),
      prop(
        "tone / showValue",
        "Tone / boolean",
        "Accent and visible percentage by default.",
      ),
    ],
    example: example(
      "Progress",
      `export default function Example() {\n  return <Progress label="Project setup" value={72} tone="success" />;\n}`,
    ),
  },
];

const tableWidget = widgets.find(widget => widget.id === 'data-table');
widgets.push({
  ...widgetMetadata['network-graph'],
  exports: ['NetworkGraph'],
  description: 'Force-directed relationship graph for wallets, counterparties, accounts or services. Nodes carry a category (legend + colour from --cgw-chart-*), a size and a resolved display label; edges carry weight, direction arrows and an optional dashed style. The focus node is pinned at the centre; nodes are draggable and the view pans/zooms. Selection is controlled so a table or details panel can share it. Includes an accessible node/edge data table.',
  props: [
    prop('nodes', 'NetworkGraphNode[]', 'Unique id per node. label is the resolved display name (person, business, account). sublabel is always drawn under the name, so put the identifier the reader needs without hovering there (wallet address; 0x addresses are shortened to start…end). details is an optional [{label,value}] list shown in the hover tooltip for resolved nodes (email, wallet type, KYC level); leave it out for unresolved nodes — the tooltip then only appears when the label had to be shortened. category maps to categories; size scales the node (event count).'),
    prop('edges', 'NetworkGraphEdge[]', "source/target reference node ids. weight scales stroke width; direction 'forward' (default), 'both' or 'none' controls arrowheads; dashed marks non-transfer relations; label shows in the tooltip."),
    prop('categories', 'NetworkGraphCategory[]', 'Ordered legend entries; colours follow --cgw-chart-1…6. Node categories missing here are added automatically.'),
    prop('focusId / selectedId / onSelect / onEdgeSelect', "string | null / string | null / (id, node) => void / (source, target, edge) => void", 'focusId pins the subject at the centre of the canvas (re-centred on resize) and enlarges it; every other node is laid out by the force simulation and can be dragged. selectedId is controlled: clicking a node calls onSelect(id); clicking empty canvas calls onSelect(null).'),
    prop('layout / maxLabelLength / height', "'force' | 'circular' / number / number", "Force by default; circular for small static sets. Labels truncate (0x addresses keep start and end). Height defaults to 360px."),
    prop('label / loading / error / showDataTable / animate', 'string / boolean / Error | string / boolean / boolean', 'Accessible name, loading skeleton, caller error, expandable nodes+edges tables (keep enabled) and animation that respects reduced motion (layout animation off too).'),
  ],
  example: example('NetworkGraph', `export default function Example({ counterparties, subject, selected, onSelect }) {
  const categories = [{ id: 'personal', label: 'Personal' }, { id: 'business', label: 'Business' }, { id: 'private', label: 'Private' }, { id: 'unknown', label: 'Unknown wallet' }, { id: 'contract', label: 'Contract' }];
  const details = row => row.displayName ? [{ label: 'Email', value: row.email }, { label: 'Wallet type', value: row.walletCategory }] : undefined;
  const nodes = [{ id: subject.address, label: subject.displayName, sublabel: subject.address, details: details(subject), category: subject.walletCategory, size: subject.eventCount }]
    .concat(counterparties.map(row => ({ id: row.address, label: row.displayName ?? 'Unknown wallet', sublabel: row.address, details: details(row), category: row.isContract ? 'contract' : (row.walletCategory ?? 'unknown').toLowerCase(), size: row.events.length })));
  const edges = counterparties.flatMap(row => [
    row.inbound ? { source: row.address, target: subject.address, weight: row.inbound, label: row.inbound + ' transfers in' } : null,
    row.outbound ? { source: subject.address, target: row.address, weight: row.outbound, label: row.outbound + ' transfers out' } : null,
    row.contractCalls ? { source: subject.address, target: row.address, weight: row.contractCalls, direction: 'none', dashed: true, label: row.contractCalls + ' calls' } : null,
  ].filter(Boolean));
  return <NetworkGraph label="Counterparty network" focusId={subject.address} nodes={nodes} edges={edges} categories={categories}
    selectedId={selected} onSelect={onSelect} height={420} />;
}`),
});
widgets.push(...advancedChartWidgets);
widgets.push(cardGalleryWidget,...cardWidgets);
widgets.push(richTextWidget);
widgets.push(calendarWidget);
widgets.push(scrumWidget);
widgets.push(timelineWidget);
tableWidget.props.push(
  prop('filterFields', 'TableFilterField[]', 'Enable the filter builder with {key,label,type,options?}. Types: text, number, date, select. Keys match column keys/accessors; select options are {value,label}.'),
  prop('advancedFilters / defaultAdvancedFilters / onAdvancedFiltersChange', 'AdvancedTableFilters / callback', "{match:'all'|'any',rules:[{field,type,operator,value?,valueTo?}]}. Controlled or internal state. Operators depend on type. Date values use YYYY-MM-DD; between is inclusive. Filter changes reset pagination and are included in loadRows and Excel queries."),
);
Object.assign(tableWidget, tableExamples['data-table']);
for (const id of ['lazy-table','selection-table','row-selection-table','subtable','advanced-table']) {
  widgets.push({...widgetMetadata[id],exports:['DataTable'],props:tableWidget.props,...tableExamples[id]});
}

export const widgetRecipes = [
  {
    id:'card-grid-actions', name:'Product cards with async actions',
    description:'Responsive product cards with real pending/error handling and controlled saved items.',
    widgets:['cards','product-card','alert'],
    code:`import { useState } from 'react';
${example('CardGrid, ProductCard, Alert', `function Product({product, addToCart, saved, onSavedChange}) {
  const [pending,setPending]=useState(false), [error,setError]=useState(''), [added,setAdded]=useState(false);
  async function add() {
    if (pending) return;
    setPending(true); setError(''); setAdded(false);
    try { await addToCart(product.id); setAdded(true); }
    catch (err) { setError(err.message || 'Could not add this item.'); }
    finally { setPending(false); }
  }
  return <div className="cgw-stack"><ProductCard title={product.name} description={product.description}
    price={product.price} currency={product.currency} image={product.image} available={product.available}
    saved={saved} onSavedChange={onSavedChange} action={{label:added?'Add another':'Add to cart',loading:pending,onClick:add}}
    footer={added ? <span role="status">Added to your cart.</span> : undefined} />
    {error && <Alert tone="danger">{error}</Alert>}</div>;
}
// addToCart must await the real API and throw on failure. Saved IDs are owned by the caller.
export default function Products({products, addToCart, savedIds, onSavedChange}) {
  return <CardGrid minCardWidth={280}>{products.map(product=><Product key={product.id}
    product={product} addToCart={addToCart} saved={savedIds.includes(product.id)}
    onSavedChange={saved=>onSavedChange(product.id,saved)} />)}</CardGrid>;
}
`)}`,
  },
  {
    id:'activity-timeline', name:'Activity timeline',
    description:'Turn already ordered activity records into accessible, connected timeline cards.',
    widgets:['timeline'],
    code:example('Timeline', `// Load, authorize and sort the records in your app before rendering.
export default function Activity({events, loading = false}) {
  return <Timeline label="Project activity" loading={loading} emptyTitle="No activity yet"
    items={events.map(event=>({id:event.id, title:event.title, description:event.description,
      dateTime:event.createdAt, time:new Date(event.createdAt).toLocaleString(),
      actor:event.actorName, actorAvatar:event.actorAvatar, status:event.status,
      tone:event.status==='Completed'?'success':'neutral', titleHref:event.href}))} />;
}`),
  },
  {
    id: "subtables-bulk-actions",
    name: "Lazy subtables and bulk actions",
    description: "Load children on expansion and apply actions to selections across server pages.",
    widgets: ["data-table"],
    code: example("DataTable", `// Adapt these routes to your app. Authorize parent access and every selected ID on the server.
async function loadPage(url, {page, pageSize, search, sort, filters, signal}) {
  const params = new URLSearchParams({page:String(page), pageSize:String(pageSize), search});
  if (sort) { params.set('sort', sort.key); params.set('direction', sort.direction); }
  if (filters.status) params.set('status', filters.status);
  const response = await fetch(url + '?' + params, {signal, credentials:'same-origin'});
  if (!response.ok) throw new Error('Could not load records.');
  return response.json(); // {rows, total}; filter and page on the server
}
function Tasks({projectId}) {
  return <DataTable label="Project tasks" columns={[{key:'name',label:'Task'}, {key:'status',label:'Status'}]}
    pageSize={5} loadRows={query => loadPage('/api/projects/' + encodeURIComponent(projectId) + '/tasks', query)} />;
}
async function pauseProjects(ids) {
  const response = await fetch('/api/projects/bulk-status', {
    method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ids, status:'Paused'}),
  });
  if (!response.ok) throw new Error('Could not pause the selected projects.');
  // Resolve only when ALL submitted IDs succeeded. Handle per-ID failures here if your API returns them.
}
export default function Projects({canEdit = false}) {
  return <DataTable label="Projects" columns={[{key:'name',label:'Project'}, {key:'status',label:'Status'}]}
    loadRows={query => loadPage('/api/projects', query)} getRowLabel={row => row.name}
    renderExpandedRow={row => <Tasks projectId={row.id} />}
    selectable={canEdit} bulkActions={canEdit ? [{id:'pause', label:'Pause', onAction:pauseProjects}] : []} />;
}`),
  },
  {
    id: "remote-table-edit",
    name: "Remote table with editing",
    description:
      "Server pagination, status filtering, an edit dialog and refresh after saving.",
    widgets: ["data-table", "dialog", "input", "select", "button"],
    code: `import { useState } from 'react';\n${example("DataTable, Dialog, Input, Select, Button", `const columns = [{key:'name',label:'Name'}, {key:'status',label:'Status'}];\n// Adapt these app-specific endpoints and validate permissions on the server.\nasync function loadRows({page, pageSize, search, sort, filters, signal}) {\n  const params = new URLSearchParams({page:String(page), pageSize:String(pageSize), search, status:filters.status || ''});\n  if (sort) { params.set('sort', sort.key); params.set('direction', sort.direction); }\n  const response = await fetch('/api/projects?' + params, {signal, credentials:'same-origin'});\n  if (!response.ok) throw new Error('Could not load projects. Please try again.');\n  return response.json(); // { rows: Project[], total: filtered count }\n}\nexport default function ProjectList({canEdit = false}) {\n  const [status, setStatus] = useState(''), [editing, setEditing] = useState(null);\n  const [revision, setRevision] = useState(0), [saving, setSaving] = useState(false), [error, setError] = useState('');\n  async function save(event) {\n    event.preventDefault(); setSaving(true); setError('');\n    try {\n      const response = await fetch('/api/projects/' + encodeURIComponent(editing.id), {method:'PATCH', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:editing.name})});\n      if (!response.ok) throw new Error('Could not save your changes.');\n      setEditing(null); setRevision(n => n + 1);\n    } catch (err) { setError(err.message); } finally { setSaving(false); }\n  }\n  return <><DataTable label="Projects" columns={columns} loadRows={loadRows} filters={{status}} reloadKey={revision}\n    toolbar={<Select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)} options={[{value:'',label:'All statuses'},{value:'Active',label:'Active'},{value:'Paused',label:'Paused'}]} />}\n    rowActions={canEdit ? row => <Button size="sm" variant="ghost" onClick={() => {setEditing({...row}); setError('');}}>Edit {row.name}</Button> : undefined} />\n    <Dialog open={!!editing} onClose={saving ? undefined : () => setEditing(null)} title="Edit project"><form onSubmit={save} className="cgw-stack"><Input label="Project name" required value={editing?.name || ''} onChange={e => setEditing({...editing,name:e.target.value})} error={error} /><Button type="submit" loading={saving}>Save changes</Button></form></Dialog></>;\n}`)}`,
  },
  {
    id: "dashboard",
    name: "Metrics dashboard",
    description:
      "Compose cards, a period filter, trends and a channel breakdown. Connect the period to your API.",
    widgets: ["metric-card", "line-chart", "donut-chart", "select", "card"],
    code: `import { useState } from 'react';\n${example("Card, MetricCard, LineChart, DonutChart, Select", `export default function Dashboard({summary, trend, channels, onPeriodChange, loading}) {\n  const [period, setPeriod] = useState('30');\n  return <div className="cgw-stack"><Select label="Period" value={period} onChange={e => {setPeriod(e.target.value); onPeriodChange?.(e.target.value);}} options={[{value:'7',label:'Last 7 days'}, {value:'30',label:'Last 30 days'}]} />\n    <MetricCard label="Revenue" value={summary?.revenue ?? '—'} description="For the selected period" loading={loading} />\n    <Card title="Revenue over time"><LineChart label="Revenue over time" data={trend} series={[{key:'revenue',label:'Revenue'}]} loading={loading} /></Card>\n    <Card title="Channels"><DonutChart label="Channels" data={channels} loading={loading} /></Card></div>;\n}`)}`,
  },
  {
    id: "permission-settings",
    name: "Permission-aware settings",
    description:
      "A readable form that becomes editable with a grant; server authorization remains required.",
    widgets: ["card", "input", "switch", "button", "alert"],
    code: `import { useState } from 'react';\n${example("Card, Input, Switch, Button, Alert", `export default function ModuleSettings({initialValues, canEdit, onSave}) {\n  const [form, setForm] = useState(initialValues), [saving, setSaving] = useState(false), [message, setMessage] = useState(null);\n  async function submit(event) {\n    event.preventDefault(); if (!canEdit || saving) return; setSaving(true); setMessage(null);\n    try { await onSave(form); setMessage({tone:'success',text:'Settings saved.'}); }\n    catch (err) { setMessage({tone:'danger',text:err.message || 'Could not save settings.'}); }\n    finally { setSaving(false); }\n  }\n  return <Card title="Module settings" description={canEdit ? 'Manage how this module works.' : 'You have read-only access.'}><form onSubmit={submit} className="cgw-stack">\n    <Input label="Module name" value={form.name} disabled={!canEdit || saving} onChange={e => setForm({...form,name:e.target.value})} required />\n    <Switch label="Email updates" checked={form.updates} disabled={!canEdit || saving} onChange={updates => setForm({...form,updates})} />\n    {message && <Alert tone={message.tone}>{message.text}</Alert>}\n    {canEdit && <Button type="submit" loading={saving}>Save settings</Button>}\n  </form></Card>;\n}`)}`,
  },
];
export const widgetCatalog = {
  schemaVersion: 1,
  importPath: widgetImport,
  stylesheet: "@cloudgatedevs/cloudgate-client-react/react/styles.css",
  widgets,
  recipes: widgetRecipes,
};
export function searchWidgets(query = "") {
  const synonyms = {
    paginated: "pagination",
    paginate: "pagination",
    paging: "pagination",
    tables: "table",
    charts: "chart",
    dropdown: "select",
    dropdowns: "select",
    modal: "dialog",
    modals: "dialog",
    pie: "donut",
  };
  const terms = query
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((term) => synonyms[term] || term);
  return widgets.filter((widget) =>
    terms.every((term) =>
      `${widget.id} ${widget.name} ${widget.category} ${widget.description} ${widget.exports.join(" ")} ${widget.props.map((prop) => prop.name + " " + prop.description).join(" ")} ${widget.id === "data-table" ? "lazy loading filter selection grid pagination" : widget.id === "donut-chart" ? "pie breakdown" : ""}`
        .toLowerCase()
        .includes(term),
    ),
  );
}
export const getWidget = (id) =>
  widgets.find((widget) => widget.id === (id === 'search-select' ? 'select' : id) || widget.exports.includes(id));
export const getWidgetRecipe = (id) =>
  widgetRecipes.find((recipe) => recipe.id === id);
