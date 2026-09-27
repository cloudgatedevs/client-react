import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useCloudgate } from "../context.jsx";
import {
  ArrowRight,
  ArrowUpRight,
  Blocks,
  BookOpen,
  Check,
  CheckCheck,
  Code2,
  Copy,
  CreditCard,
  Eye,
  LayoutDashboard,
  Layers,
  MousePointer2,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  WandSparkles,
} from "lucide-react";
import {
  Alert,
  Badge,
  BarChart,
  Button,
  Card,
  Checkbox,
  CodeEditor,
  DataTable,
  Dialog,
  DonutChart,
  EmptyState,
  Form,
  IconButton,
  IconLibrary,
  Input,
  LineChart,
  MetricCard,
  Progress,
  Select,
  SearchSelect,
  WidgetSkeleton,
  Slider,
  Switch,
  Tabs,
  Textarea,
} from "../widgets/index.jsx";
import {
  widgets,
  widgetRecipes,
  widgetGuidelines,
} from "../../widgets/catalog.js";
import {
  paletteVariables,
  PALETTE_PRESETS,
  parseCustomPalette,
  LAYOUT_PRESETS,
} from "../../platform/appearance-model.js";
import { useSettings } from "../settings/SettingsProvider.jsx";
import { WidgetTypography } from './WidgetTypography.jsx';
import { WidgetCharts } from './WidgetCharts.jsx';
import { WidgetCards } from './WidgetCards.jsx';
import { WidgetButtons } from './WidgetButtons.jsx';
import { WidgetRichText } from './WidgetRichText.jsx';
import { WidgetCalendar } from './WidgetCalendar.jsx';
import { WidgetScrumBoard } from './WidgetScrumBoard.jsx';
import { WidgetTabs } from './WidgetTabs.jsx';
import { WidgetTimeline } from './WidgetTimeline.jsx';
import { WidgetRadio } from './WidgetRadio.jsx';
import { WidgetRowSelection } from './WidgetRowSelection.jsx';
import { cardIndex } from '../../widgets/card-index.js';
import { advancedChartIndex } from '../../widgets/chart-index.js';

const revenue = [
  { label: "Apr", revenue: 14500, previous: 11200 },
  { label: "May", revenue: 18200, previous: 13700 },
  { label: "Jun", revenue: 16300, previous: 12900 },
  { label: "Jul", revenue: 21400, previous: 15100 },
  { label: "Aug", revenue: 19800, previous: 16900 },
  { label: "Sep", revenue: 24680, previous: 18800 },
];
const channels = [
  { label: "Direct", value: 54 },
  { label: "Search", value: 31 },
  { label: "Referral", value: 15 },
];
const projectNames = [
  "Brand studio",
  "Customer portal",
  "Analytics dashboard",
  "Commerce toolkit",
  "Mobile experience",
  "Knowledge base",
  "Launch campaign",
  "Partner hub",
];
const sampleRows = Array.from({ length: 137 }, (_, index) => ({
  id: index + 1,
  name:
    projectNames[index % 8] +
    (index >= 8 ? ` ${Math.floor(index / 8) + 1}` : ""),
  owner: ["Morgan Ellis", "Alex Chen", "Jamie Brooks", "Sam Rivera"][index % 4],
  status: index % 5 === 0 ? "Paused" : "Active",
  amount: Math.round((37 + index * 13.4) * 100) / 100,
  created: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
}));
const columns = [
  {
    key: "name",
    label: "Project",
    render: (value) => (
      <span className="cgw-demo-project">
        <span>
          <Layers size={15} />
        </span>
        <strong>{value}</strong>
      </span>
    ),
  },
  { key: "owner", label: "Owner" },
  {
    key: "status",
    label: "Status",
    render: (value) => (
      <Badge tone={value === "Active" ? "success" : "neutral"} dot>
        {value}
      </Badge>
    ),
  },
  {
    key: "amount",
    label: "Revenue",
    exportFormat: '$#,##0.00',
    align: "right",
    render: (value) => (
      <span className="cgw-tabular">
        $
        {value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    ),
  },
];
const money = (n) => "$" + Math.round(n).toLocaleString();
function CopyButton({ text, label = "Copy code" }) {
  const [status, setStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied");
    } catch {
      setStatus("Select and copy the code below");
    }
  }
  return (
    <span className="cgw-row">
      <Button
        size="sm"
        variant="secondary"
        icon={status === "Copied" ? Check : Copy}
        onClick={copy}
      >
        {status === "Copied" ? "Copied" : label}
      </Button>
      {status && status !== "Copied" && (
        <span role="status" className="cgw-muted">
          {status}
        </span>
      )}
    </span>
  );
}
function CodeSample({ code }) {
  return <CodeEditor value={code} language="jsx" label="React code example" />;
}
function CodeEditorDemo({ state }) {
  const [code, setCode] = useState('{\n  "name": "Northstar studio",\n  "enabled": true,\n  "members": 24,\n  "tags": ["design", "product"]\n}');
  const [readOnly, setReadOnly] = useState(false);
  return <div className="cgw-stack">
    <Switch label="Read only" checked={readOnly} onChange={setReadOnly} />
    <CodeEditor label="Project configuration" language="json" value={state === 'empty' ? '' : code}
      onChange={setCode} readOnly={readOnly || state === 'disabled'} loading={state === 'loading'} />
  </div>;
}
function ValidationDemo({ state, advanced = false }) {
  const [saved, setSaved] = useState(false);
  const disabled = state === 'disabled';
  return <Form className="cgw-demo-form" onChange={() => setSaved(false)} onReset={() => setSaved(false)} onSubmit={() => setSaved(true)}>
    <Input name="name" label="Project name" defaultValue="Northstar studio" required minLength={3} maxLength={60}
      disabled={disabled} hint="3–60 characters. Try “admin” to see a custom rule."
      validate={value => value.trim().toLowerCase() === 'admin' ? 'Choose a project name other than “admin”.' : undefined}
      error={state === 'error' ? 'This project name is already in use.' : undefined} />
    <Input name="email" label="Contact email" type="email" required disabled={disabled} placeholder="you@example.com"
      hint="Validation appears after you leave a field or submit." />
    {advanced ? <>
      <Input name="website" label="Website" type="url" disabled={disabled} placeholder="https://example.com" hint="Optional. Include https:// when entering a website." />
      <Input name="seats" label="Team size" type="number" defaultValue="5" required min={1} max={100} step={1} disabled={disabled} />
      <Select name="plan" label="Plan" required disabled={disabled} defaultValue="" placeholder="Choose a plan"
        options={[{value:'starter',label:'Starter'}, {value:'team',label:'Team'}]} />
    </> : <SearchSelect name="project" label="Search your workspace" placeholder="Search projects…" disabled={disabled}
      options={projectNames.map((label, index) => ({value:index + 1, label}))} />}
    <Textarea name="description" label="Description" defaultValue="A shared space to create, collaborate and launch."
      minLength={10} maxLength={240} hint="Optional. Use 10–240 characters when adding a description." disabled={disabled} />
    <div className="cgw-row">
      <Button type="submit" disabled={disabled}>Validate form</Button>
      <Button type="reset" variant="secondary" disabled={disabled}>Reset</Button>
    </div>
    {saved && <Alert tone="success" title="All fields are valid">This example doesn’t save data.</Alert>}
  </Form>;
}
function SelectDemo({ state }) {
  const [period, setPeriod] = useState('30');
  const [local, setLocal] = useState(''), [remote, setRemote] = useState('');
  const [remoteOption, setRemoteOption] = useState();
  const [requests, setRequests] = useState(0), [saved, setSaved] = useState(''), [dialog, setDialog] = useState(false);
  const localOptions = projectNames.map((label, index) => ({value:index + 1, label, description:index === 6 ? 'Archived project' : 'Workspace project', disabled:index === 6}));
  async function loadOptions({ search, limit, signal }) {
    setRequests(count => count + 1);
    await new Promise((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 450);
      if (signal.aborted) abort(); else signal.addEventListener('abort', abort, {once:true});
    });
    if (state === 'error') throw new Error('Sample search service unavailable.');
    return state === 'empty' ? [] : sampleRows.filter(row => `${row.name} ${row.owner}`.toLowerCase().includes(search.toLowerCase())).slice(0, limit)
      .map(row => ({value:row.id, label:row.name, description:row.owner}));
  }
  return <div className="cgw-stack">
    <Card title="Standard select" description="A native dropdown for short lists, with familiar keyboard and mobile controls.">
      <Select label="Reporting period" value={state === 'empty' ? '' : period} onChange={event => setPeriod(event.target.value)}
        disabled={state === 'disabled'} placeholder="Choose a period…"
        error={state === 'error' ? 'Choose a reporting period.' : undefined}
        options={state === 'empty' ? [] : [{value:'7', label:'Last 7 days'}, {value:'30', label:'Last 30 days'}, {value:'90', label:'Last 90 days'}]}
        hint="Reports update for the selected period." />
    </Card>
    <div className="cgw-demo-chart-grid">
      <Card title="Searchable select" description="Filter local options by name or description. Use the arrow keys to choose.">
        <Form className="cgw-stack" onReset={() => {setLocal(''); setSaved('');}} onSubmit={data => setSaved(`Selected project ID: ${data.get('project')}`)}>
          <SearchSelect name="project" label="Project" value={local} onChange={setLocal} required disabled={state === 'disabled'}
            options={state === 'empty' ? [] : localOptions} placeholder="Search projects…" />
          <div className="cgw-row"><Button type="submit" size="sm" disabled={state === 'disabled'}>Use project</Button><Button type="reset" size="sm" variant="secondary">Reset</Button></div>
          {saved && <p className="cgw-muted" role="status">{saved}</p>}
        </Form>
      </Card>
      <Card title="Server-side search" description="A simulated API filters 137 projects before returning results.">
        <SearchSelect label="Search the project directory" value={remote} onChange={(id, option) => {setRemote(id); setRemoteOption(option);}}
          selectedOption={remoteOption} loadOptions={loadOptions} reloadKey={state} limit={10} debounceMs={300}
          disabled={state === 'disabled'} placeholder="Search projects or owners…" hint="Searches are debounced. The API returns up to 10 matches." />
        <p className="cgw-muted">{requests} search requests</p>
      </Card>
    </div>
    <Button variant="secondary" onClick={() => setDialog(true)}>Open dialog example</Button>
    <Dialog open={dialog} onClose={() => setDialog(false)} title="Choose a project" description="Searchable dropdowns also work inside dialogs.">
      <SearchSelect label="Dialog project" options={localOptions} placeholder="Find a project…" />
    </Dialog>
  </div>;
}
function ProjectTasks({ project, remote }) {
  const [requests, setRequests] = useState(0);
  const taskColumns = [
    { key: "name", label: "Task" },
    { key: "owner", label: "Assigned to" },
    { key: "status", label: "Status", render: value => <Badge tone={value === "Done" ? "success" : "info"} dot>{value}</Badge> },
  ];
  const tasks = ["Discovery & planning", "Design direction", "Core implementation", "Content review", "Accessibility review", "Quality checks", "Launch preparation"]
    .map((name, index) => ({ id: `${project.id}-task-${index + 1}`, name, owner: project.owner, status: index < 2 ? "Done" : "In progress" }));
  async function loadTasks({ signal, ...query }) {
    setRequests(count => count + 1);
    await new Promise((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 420);
      if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
    });
    const { queryRows } = await import("../widgets/table-model.js");
    return queryRows(tasks, taskColumns, query);
  }
  return <>
    <div className="cgw-subtable-heading">
      <div><strong>Tasks · {project.name}</strong><p>Search, sort and page through this project’s tasks independently.</p></div>
      <Badge>{remote ? `${requests} subtable requests` : "Local subtable"}</Badge>
    </div>
    <DataTable label={`${project.name} tasks`} columns={taskColumns} rows={remote ? undefined : tasks}
      loadRows={remote ? loadTasks : undefined} pageSize={3} pageSizes={[3, 5, 10]} searchPlaceholder="Search tasks…" />
  </>;
}
const tableIds = ['data-table', 'lazy-table', 'selection-table', 'row-selection-table', 'subtable', 'advanced-table'];
const filterFields = [
  {key:'name',label:'Project',type:'text'},
  {key:'owner',label:'Owner',type:'text'},
  {key:'status',label:'Status',type:'select',options:[{value:'Active',label:'Active'},{value:'Paused',label:'Paused'}]},
  {key:'amount',label:'Revenue',type:'number'},
  {key:'created',label:'Created',type:'date'},
];
function TableDemo({ state = "ready", variant = 'data-table' }) {
  const isStatic = variant === 'data-table', selection = variant === 'selection-table', subtable = variant === 'subtable', advanced = variant === 'advanced-table';
  const demoColumns = advanced ? [...columns, {key:'created',label:'Created'}] : columns;
  const [mode, setMode] = useState("pages"),
    [status, setStatus] = useState(""),
    [remote, setRemote] = useState(!isStatic),
    [editing, setEditing] = useState(null),
    [data, setData] = useState(sampleRows),
    [revision, setRevision] = useState(0),
    [requests, setRequests] = useState(0);
  async function updateSelected(ids, nextStatus) {
    await new Promise(resolve => setTimeout(resolve, 450));
    setData(previous => previous.map(row => ids.includes(row.id) ? { ...row, status: nextStatus } : row));
  }
  async function loadRows({ signal, ...query }) {
    setRequests((count) => count + 1);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(done, 420);
      function done() {
        signal.removeEventListener("abort", aborted);
        resolve();
      }
      function aborted() {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      }
      if (signal.aborted) aborted();
      else signal.addEventListener("abort", aborted, { once: true });
    });
    if (state === "error")
      throw new Error(
        "The sample service is unavailable. Switch to Ready to try again.",
      );
    const { queryRows } = await import("../widgets/table-model.js");
    return queryRows(state === "empty" || state === "loading" ? [] : data, demoColumns, query);
  }
  return (
    <div className="cgw-stack">
      {!isStatic && <div className="cgw-demo-controls">
        {variant === 'lazy-table' && <Select
          label="Loading pattern"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          options={[
            { value: "pages", label: "Pagination" },
            { value: "load-more", label: "Load more" },
            { value: "infinite", label: "Infinite scroll" },
          ]}
        />}
        <Switch
          label="Simulated server"
          checked={remote}
          onChange={setRemote}
        />
        <span className="cgw-muted">{requests} page requests</span>
      </div>}
      {selection && <p className="cgw-muted">Select projects across pages, then activate or pause them together.</p>}
      {subtable && <p className="cgw-muted">Expand a project to load its tasks. Each subtable has its own search, sorting and pages.</p>}
      {advanced && <p className="cgw-muted">Combine text, status, revenue and date conditions. Filters also apply to Excel exports.</p>}
      <DataTable
        key={`${mode}-${remote}-${state}`}
        label="Sample projects"
        columns={demoColumns}
        rows={state === "empty" ? [] : data}
        loadRows={remote ? loadRows : undefined}
        pageSize={5}
        pageSizes={[5, 10, 25]}
        pagination={mode}
        filters={{ status }}
        reloadKey={revision}
        selectable={selection}
        filterFields={advanced ? filterFields : undefined}
        getRowLabel={row => row.name}
        renderExpandedRow={subtable ? row => <ProjectTasks project={row} remote={remote} /> : undefined}
        bulkActions={[
          { id: "activate", label: "Activate", icon: Play, onAction: ids => updateSelected(ids, "Active") },
          { id: "pause", label: "Pause", icon: Pause, onAction: ids => updateSelected(ids, "Paused") },
        ]}
        loading={state === "loading"}
        error={
          !remote && state === "error"
            ? new Error("Sample loading error. Switch to Ready to continue.")
            : undefined
        }
        toolbar={
          <Select
            aria-label="Filter projects by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              { value: "Active", label: "Active" },
              { value: "Paused", label: "Paused" },
            ]}
          />
        }
        rowActions={(row) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing({ ...row })}
            aria-label={`Edit ${row.name}`}
          >
            Edit
          </Button>
        )}
      />
      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit sample project"
        description="Changes apply only to this example."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="cgw-demo-project-form">
              Save changes
            </Button>
          </>
        }
      >
        <form
          id="cgw-demo-project-form"
          className="cgw-stack"
          onSubmit={(event) => {
            event.preventDefault();
            setData((previous) =>
              previous.map((row) => (row.id === editing.id ? editing : row)),
            );
            setRevision((value) => value + 1);
            setEditing(null);
          }}
        >
          <Input
            label="Project name"
            required
            value={editing?.name || ""}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          />
          <Select
            label="Status"
            value={editing?.status || "Active"}
            onChange={(e) => setEditing({ ...editing, status: e.target.value })}
            options={[
              { value: "Active", label: "Active" },
              { value: "Paused", label: "Paused" },
            ]}
          />
        </form>
      </Dialog>
    </div>
  );
}
function WidgetDemo({ id, state, onChoose }) {
  const [value, setValue] = useState(64),
    [enabled, setEnabled] = useState({ sm: true, md: true, lg: true }),
    [open, setOpen] = useState(false),
    [notice, setNotice] = useState(true),
    [text, setText] = useState("Northstar studio");
  const disabled = state === "disabled",
    loading = state === "loading";
  if (id === 'row-selection-table') return <WidgetRowSelection state={state} />;
  if (tableIds.includes(id)) return <TableDemo key={id} state={state} variant={id} />;
  if (id==='wysiwyg') return <WidgetRichText key={state} state={state} />;
  if (id==='calendar') return <WidgetCalendar key={state} state={state} />;
  if (id==='scrum-board') return <WidgetScrumBoard key={state} state={state} />;
  if (id==='timeline') return <WidgetTimeline key={state} state={state} />;
  if (advancedChartIndex.some(chart=>chart.id===id)) return <WidgetCharts id={id} state={state} />;
  if (id==='cards' || cardIndex.some(card=>card.id===id)) return <WidgetCards id={id} state={state} onChoose={onChoose} />;
  if (id === "icons") return <IconLibrary />;
  if (id === "typography") return <WidgetTypography />;
  if (id === "code-editor") return <CodeEditorDemo state={state} />;
  if (id === "select") return <SelectDemo state={state} />;
  if (id === "radio") return <WidgetRadio key={state} state={state} />;
  if (id === "input" || id === "form") return <ValidationDemo state={state} advanced={id === 'form'} />;
  if (["line-chart", "bar-chart", "donut-chart"].includes(id)) {
    if (state === "error")
      return (
        <Alert title="Could not load this chart" tone="danger">
          Switch to Ready to see the sample chart.
        </Alert>
      );
    if (id === "donut-chart")
      return (
        <DonutChart
          label="Acquisition channels"
          data={state === "empty" ? [] : channels}
          loading={loading}
        />
      );
    const Chart = id === "line-chart" ? LineChart : BarChart;
    return (
      <Chart
        label="Revenue comparison"
        data={state === "empty" ? [] : revenue}
        series={[
          { key: "revenue", label: "This period" },
          { key: "previous", label: "Previous period" },
        ]}
        formatValue={money}
        loading={loading}
      />
    );
  }
  switch (id) {
    case "metric-card":
      return (
        <div className="cgw-demo-metrics">
          <MetricCard
            label="Total revenue"
            value={24680}
            formatValue={money}
            trend="+12.8%"
            tone="success"
            description="vs. previous period"
            icon={CreditCard}
            loading={loading}
          />
          <MetricCard
            label="Active customers"
            value={1842}
            trend="+8.2%"
            tone="success"
            description="vs. previous period"
            icon={Users}
            loading={loading}
          />
          <MetricCard
            label="Response time"
            value={128}
            formatValue={n => `${Math.round(n)} ms`}
            trend="-18.4%"
            tone="success"
            description="faster than last week"
            icon={TrendingUp}
            loading={loading}
          />
        </div>
      );
    case "card":
      return (
        <Card
          title="A home for your next idea"
          loading={loading}
          description="Bring the whole project together."
          action={<Badge tone="accent">Workspace</Badge>}
          footer={
            <div className="cgw-row cgw-between">
              <span className="cgw-muted">Everything in one place</span>
              <Button size="sm" onClick={() => setOpen(true)}>
                Explore <ArrowRight size={14} />
              </Button>
            </div>
          }
        >
          <div className="cgw-demo-card-art">
            <Layers size={36} />
            <p>Make something remarkable.</p>
          </div>
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            title="Your workspace"
          >
            <EmptyState
              title="Ready for your next idea"
              description="Combine cards, tables and charts to create a useful module."
            />
          </Dialog>
        </Card>
      );
    case "button":
      return <WidgetButtons state={state} />;
    case "slider":
      return (
        <div className="cgw-demo-form cgw-stack">
          <Slider
            label="Monthly capacity"
            value={value}
            onChange={setValue}
            formatValue={(n) => n + "%"}
            disabled={disabled}
            hint="Use the arrow keys for precise adjustments."
          />
          <Progress label="Allocated capacity" value={value} />
        </div>
      );
    case "switch":
      return (
        <div className="cgw-demo-form cgw-stack">
          <Card title="Switch sizes" description="Three sizes to fit your interface. Each switch works independently.">
            <div className="cgw-stack">
              {[
                ["sm", "Small", "For compact toolbars and dense settings."],
                ["md", "Medium · default", "For everyday forms and preferences."],
                ["lg", "Large", "For prominent settings and larger layouts."],
              ].map(([size, label, hint]) => (
                <Switch
                  key={size}
                  size={size}
                  label={label}
                  hint={hint}
                  checked={enabled[size]}
                  onChange={(checked) => setEnabled((current) => ({ ...current, [size]: checked }))}
                  disabled={disabled}
                />
              ))}
            </div>
          </Card>
          <Checkbox
            label="Include project activity"
            hint="A summary of changes and milestones."
            defaultChecked
            disabled={disabled}
          />
          <Checkbox
            label="Some projects selected"
            indeterminate
            disabled={disabled}
          />
        </div>
      );
    case "tabs":
      return <WidgetTabs key={state} state={state} />;
    case "dialog":
      return (
        <div className="cgw-demo-dialog">
          <div className="cgw-empty-icon">
            <Layers size={24} />
          </div>
          <h3>A little space to focus</h3>
          <p>Consistent motion, a focused task, and a clear next step.</p>
          <Button onClick={() => setOpen(true)}>
            Open example dialog <ArrowUpRight size={14} />
          </Button>
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            title="Create a workspace"
            description="Give your next idea a place to grow."
            footer={
              <>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setOpen(false)}>Create workspace</Button>
              </>
            }
          >
            <Input
              label="Workspace name"
              value={text}
              onChange={(e) => setText(e.target.value)}
              hint="You can change this later."
            />
          </Dialog>
        </div>
      );
    case "badge":
      return (
        <div className="cgw-demo-badges">
          {["neutral", "accent", "success", "warning", "danger", "info"].map(
            (tone, index) => (
              <Badge key={tone} tone={tone} dot>
                {
                  [
                    "Draft",
                    "Featured",
                    "Active",
                    "Pending",
                    "Failed",
                    "In progress",
                  ][index]
                }
              </Badge>
            ),
          )}
        </div>
      );
    case "alert":
      return (
        <div className="cgw-stack">
          <Alert title="Your changes are saved" tone="success">
            Everything is up to date and ready for your team.
          </Alert>
          {notice ? (
            <Alert
              title="Complete your workspace setup"
              tone="info"
              onDismiss={() => setNotice(false)}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setNotice(false)}
                >
                  Got it
                </Button>
              }
            >
              Add a project to start bringing your ideas together.
            </Alert>
          ) : (
            <Button variant="secondary" onClick={() => setNotice(true)}>
              Show message again
            </Button>
          )}
          <Alert title="Something needs your attention" tone="warning">
            Review the details before continuing.
          </Alert>
          <Alert title="Could not save changes" tone="danger">
            Please try again in a moment.
          </Alert>
        </div>
      );
    case "empty-state":
      return (
        <EmptyState
          title="Your first project starts here"
          description="A fresh canvas for your next big idea. Create a project to get started."
          icon={Layers}
          action={
            <Button
              onClick={() => setText("Project created")}
              icon={text === "Project created" ? Check : undefined}
            >
              {text === "Project created" ? text : "Create project"}
            </Button>
          }
        />
      );
    case "skeleton":
      return (
        <div className="cgw-demo-chart-grid">
          <Card title="Card placeholder"><WidgetSkeleton /></Card>
          <Card title="Chart placeholder"><WidgetSkeleton variant="chart" height="220px" /></Card>
          <MetricCard label="Metric placeholder" value={24680} loading />
          <Card title="Distribution placeholder"><WidgetSkeleton variant="donut" height="180px" /></Card>
        </div>
      );
    case "progress":
      return (
        <div className="cgw-demo-form cgw-stack">
          <Slider label="Adjust progress" value={value} onChange={setValue} />
          <Progress label="Workspace setup" value={value} />
          <Progress label="Storage used" value={82} tone="warning" />
          <Progress label="Completed tasks" value={100} tone="success" />
        </div>
      );
    default:
      return null;
  }
}
function Overview({ onChoose }) {
  return (
    <>
      <div className="cgw-library-hero">
        <div>
          <span className="cgw-eyebrow">
            <Sparkles size={13} /> Made to work together
          </span>
          <h2>
            Great interfaces.
            <br />
            <span>One shared language.</span>
          </h2>
          <p>
            Thoughtful building blocks for your next module. Consistent by
            design, flexible by nature.
          </p>
          <Button onClick={() => onChoose("data-table")}>
            Explore the data table <ArrowRight size={15} />
          </Button>
        </div>
        <div className="cgw-hero-composition">
          <div className="cgw-hero-orbit" />
          <MetricCard
            label="Monthly revenue"
            value={24680}
            formatValue={money}
            trend="+12.8%"
            tone="success"
            description="vs. last month"
            icon={TrendingUp}
          />
          <div className="cgw-hero-note">
            <span className="cgw-hero-check">
              <Check size={16} />
            </span>
            <div>
              <strong>Designed for your app</strong>
              <span>Every theme. Every appearance.</span>
            </div>
          </div>
        </div>
      </div>
      <div className="cgw-library-section-head">
        <div>
          <h2>See the system in action</h2>
          <p>Real components, composed into a small dashboard.</p>
        </div>
        <Badge tone="neutral">Sample data</Badge>
      </div>
      <div className="cgw-demo-metrics">
        <MetricCard
          label="Total revenue"
          value={24680}
          formatValue={money}
          icon={CreditCard}
          trend="+12.8%"
          tone="success"
          description="vs. last month"
        />
        <MetricCard
          label="Customers"
          value={1842}
          icon={Users}
          trend="+8.2%"
          tone="success"
          description="vs. last month"
        />
        <MetricCard
          label="Conversion rate"
          value={4.28}
          formatValue={n => `${n.toFixed(2)}%`}
          icon={MousePointer2}
          trend="+0.6%"
          tone="success"
          description="vs. last month"
        />
      </div>
      <div className="cgw-demo-chart-grid">
        <Card
          title="Revenue over time"
          description="A steady picture of your growth."
          action={<Badge tone="accent">6 months</Badge>}
        >
          <LineChart
            label="Sample revenue"
            data={revenue}
            series={[
              { key: "revenue", label: "Revenue" },
              { key: "previous", label: "Previous period" },
            ]}
            formatValue={money}
          />
        </Card>
        <Card title="Acquisition" description="Where customers find you.">
          <DonutChart label="Sample acquisition" data={channels} />
        </Card>
      </div>
      <DataTable
        label="Recent sample projects"
        columns={columns}
        rows={sampleRows.slice(0, 8)}
        pageSize={5}
        pageSizes={[5, 10]}
      />
      <div className="cgw-library-section-head">
        <div>
          <h2>Start with a pattern</h2>
          <p>Useful combinations, ready to adapt to your module.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChoose("recipes")}>
          View recipes <ArrowRight size={14} />
        </Button>
      </div>
      <div className="cgw-recipe-grid">
        {widgetRecipes.map((recipe, index) => (
          <button
            key={recipe.id}
            type="button"
            onClick={() => onChoose(`recipe:${recipe.id}`)}
          >
            <span className="cgw-recipe-number">0{index + 1}</span>
            <h3>{recipe.name}</h3>
            <p>{recipe.description}</p>
            <ArrowUpRight size={18} />
          </button>
        ))}
      </div>
    </>
  );
}
export function WidgetLibrary() {
  const appearance = useSettings()?.settings;
  const { backofficePath } = useCloudgate();
  const navigate = useNavigate();
  const route = (useParams()["*"] || "").replace(/\/+$/, "");
  const selected = route.startsWith("recipes/")
    ? `recipe:${route.slice(8)}`
    : route || "overview";
  const [tab, setTab] = useState("preview"),
    [state, setState] = useState("ready"),
    [theme, setTheme] = useState("app"),
    [density, setDensity] = useState("app"),
    [palette, setPalette] = useState("app"),
    [motionRun, setMotionRun] = useState(0);
  const widget = widgets.find((widget) => widget.id === selected),
    recipe = widgetRecipes.find((recipe) => `recipe:${recipe.id}` === selected);
  useEffect(() => {
    setTab("preview");
    setState("ready");
  }, [selected]);
  function choose(id) {
    const suffix =
      id === "overview" ? "" : `/${id.replace(/^recipe:/, "recipes/")}`;
    navigate(backofficePath(`/widgets${suffix}`));
  }
  const savedCustom = parseCustomPalette(appearance?.theme_custom_palette);
  const previewColors = palette === 'custom' ? savedCustom?.colors : PALETTE_PRESETS.find(item => item.id === palette)?.colors;
  const [systemDark, setSystemDark] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const isDark =
    theme === "dark" ||
    (theme === "app" && (appearance.theme_mode === 'dark' || (appearance.theme_mode === 'system' && systemDark)));
  const previewStyle = paletteVariables({ ...appearance, ...previewColors }, isDark);
  const availableStates = ['wysiwyg','calendar','scrum-board'].includes(selected) ? ['ready','loading','empty','error','disabled','readonly'] : selected==='timeline' || cardIndex.some(card=>card.id===selected) ? ['ready','loading','empty','error','disabled'] : selected === "select" ? ["ready", "empty", "error", "disabled"] : selected === "code-editor" ? ["ready", "loading", "empty", "disabled"] : [
    ...tableIds,
    ...advancedChartIndex.map(chart=>chart.id),
    "line-chart",
    "bar-chart",
    "donut-chart",
  ].includes(selected)
    ? ["ready", "loading", "empty", "error"]
    : ["input", "radio", "form"].includes(selected)
      ? ["ready", "disabled", "error"]
      : ["button", "metric-card", "card"].includes(selected)
        ? ["ready", "loading", ...(selected === "button" ? ["disabled"] : [])]
        : ["slider", "switch", "tabs"].includes(selected)
          ? ["ready", "disabled"]
          : ["ready"];
  if (selected === 'search-select') return <Navigate to={backofficePath('/widgets/select')} replace />;
  if (
    !widget &&
    !recipe &&
    !["overview", "recipes", "guidelines"].includes(selected)
  )
    return <Navigate to={backofficePath("/widgets")} replace />;
  return (
    <div className="cgw-library">
      <header className="cgw-library-head" data-detail={!!widget || !!recipe || undefined}>
        <div>
          <div className="cgw-eyebrow">
            <Blocks size={14} /> Cloudgate design system
          </div>
          <h1>Widget library</h1>
          <p>Build beautifully. Stay consistent.</p>
        </div>
        <div className="cgw-row">
          <Badge tone="accent">{widgets.length} building blocks</Badge>
          <Button
            variant="secondary"
            size="sm"
            icon={BookOpen}
            onClick={() => choose("guidelines")}
          >
            Usage guide
          </Button>
        </div>
      </header>
      <div className="cgw-library-layout">
        <section className="cgw-library-main" aria-label="Widget documentation">
          <div className="cgw-library-appearance">
            <span>
              <Palette size={14} /> Preview appearance
            </span>
            <div>
              <Select
                aria-label="Preview theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                options={[
                  { value: "app", label: "App theme" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
              <Select
                aria-label="Preview palette"
                value={palette}
                onChange={(e) => setPalette(e.target.value)}
                options={[
                  { value: "app", label: "App palette" },
                  ...PALETTE_PRESETS.map(item => ({value: item.id, label: item.name})),
                  ...(savedCustom ? [{value:'custom', label:savedCustom.name}] : []),
                ]}
              />
              <Select
                aria-label="Preview layout"
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                options={[
                  { value: "app", label: "App layout" },
                  ...LAYOUT_PRESETS.map(({ value, label }) => ({
                    value,
                    label,
                  })),
                ]}
              />
            </div>
          </div>
          <div
            className="cgw-theme cgw-library-canvas"
            data-theme={theme === "app" ? undefined : theme}
            data-density={density === "app" ? undefined : density}
            style={previewStyle}
          >
            {selected === "overview" && <Overview onChoose={choose} />}
            {widget && (
              <>
                <div className="cgw-widget-title">
                  <div className="cgw-widget-heading-row"><h2>{widget.name}</h2><span className="cgw-widget-category">{widget.category}</span></div>
                  <p>{widget.description}</p>
                </div>
                <div className="cgw-widget-toolbar">
                  <Tabs
                    label="Widget documentation"
                    value={tab}
                    onChange={setTab}
                    items={[
                      { value: "preview", label: "Preview", icon: Eye },
                      { value: "code", label: "Code", icon: Code2 },
                      { value: "api", label: "API", icon: BookOpen },
                    ]}
                  />
                  <div className="cgw-widget-options">
                  {tab === 'preview' && state === 'ready' && ['metric-card', 'line-chart', 'bar-chart', 'donut-chart', 'progress', ...advancedChartIndex.map(chart=>chart.id), ...cardIndex.map(card=>card.id)].includes(selected) &&
                    <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setMotionRun(run => run + 1)}>Replay animation</Button>}
                  {tab === "preview" && availableStates.length > 1 && (
                    <Select
                      aria-label="Example state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      options={availableStates.map((value) => ({
                        value,
                        label: value[0].toUpperCase() + value.slice(1),
                      }))}
                    />
                  )}
                  </div>
                </div>
                {tab === "preview" && (
                  <div className="cgw-widget-preview">
                    <WidgetDemo
                      key={`${widget.id}-${motionRun}`}
                      id={widget.id}
                      state={state}
                      onChoose={choose}
                    />
                  </div>
                )}
                {tab === "code" && <><div className="cgw-widget-exports">{widget.exports.map(name => <code key={name}>{name}</code>)}</div><CodeSample code={widget.example} /></>}
                {tab === "api" && (
                  <div className="cgw-api-list">
                    {widget.props.map((prop) => (
                      <div key={prop.name}>
                        <code>{prop.name}</code>
                        <div>
                          <code>{prop.type}</code>
                          <p>{prop.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="cgw-widget-note">
                  <CheckCheck size={15} />
                  <span>
                    Inherits your app’s appearance. Keyboard accessible. Reduced
                    motion supported.
                  </span>
                </div>
              </>
            )}
            {(selected === "recipes" || recipe) && (
              <>
                <div className="cgw-widget-title">
                  <span className="cgw-eyebrow">Compositions</span>
                  <h2>
                    {recipe ? recipe.name : "A head start for your next module"}
                  </h2>
                  <p>
                    {recipe
                      ? recipe.description
                      : "Complete patterns that bring the widgets together. Adapt the data layer to your app."}
                  </p>
                </div>
                {recipe ? (
                  <>
                    <div className="cgw-row cgw-recipe-links">
                      {recipe.widgets.map((id) => (
                        <Button
                          key={id}
                          size="sm"
                          variant="secondary"
                          onClick={() => choose(id)}
                        >
                          {widgets.find((widget) => widget.id === id)?.name}
                        </Button>
                      ))}
                    </div>
                    <CodeSample code={recipe.code} />
                  </>
                ) : (
                  <div className="cgw-recipe-grid">
                    {widgetRecipes.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => choose(`recipe:${item.id}`)}
                      >
                        <WandSparkles size={20} />
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                        <ArrowUpRight size={18} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {selected === "guidelines" && (
              <>
                <div className="cgw-widget-title">
                  <span className="cgw-eyebrow">Build with confidence</span>
                  <h2>One library. A consistent app.</h2>
                  <p>
                    Use these building blocks in public pages, custom modules
                    and the back office.
                  </p>
                </div>
                <CodeSample
                  code={
                    "import { Button, Card, DataTable } from '@cloudgatedevs/cloudgate-client-react/react/widgets';\nimport '@cloudgatedevs/cloudgate-client-react/react/styles.css';"
                  }
                />
                <div className="cgw-guide">
                  <h3>Shared implementation guide</h3>
                  <CopyButton text={widgetGuidelines} label="Copy guide" />
                  {widgetGuidelines.split("\n\n").map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
