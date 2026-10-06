import { useEffect, useState } from 'react';
import { CalendarClock, UserCheck, Zap } from 'lucide-react';
import { useAgents } from './AgentsProvider.jsx';
import { useCloudgate } from '../context.jsx';
import { Modal } from '../components/forms.jsx';
import { useToast } from '../components/Toaster.jsx';
import { WATCH_INTERVALS, describeCadence, localScheduleToUtc, rankWorkflows, utcScheduleToLocal, watchWidgetKey } from '../../platform/agent-watch.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * "Watch settings — {agent}": what the agent should look for in one workflow, and when it looks.
 * - When this runs: a watch on every run, for actions (create, update, delete) that run whoever triggers them.
 * - On a schedule: the agent fetches the data itself on a cadence, for reads that otherwise only run when
 *   someone opens the page. It alerts the team only when the instruction's condition is met.
 */
export function AgentWatchDialog() {
  const agents = useAgents();
  const { identity, client } = useCloudgate();
  const toaster = useToast();
  const watch = agents?.available ? agents.watch : null;
  const [workflows, setWorkflows] = useState(null);
  const [urls, setUrls] = useState({});
  const [chosenUrls, setChosenUrls] = useState([]);
  const [supportsGroups, setSupportsGroups] = useState(false);
  const [endpointId, setEndpointId] = useState('');
  const [filter, setFilter] = useState('');
  const [mode, setMode] = useState('runs');
  const [prompt, setPrompt] = useState('');
  const [sandbox, setSandbox] = useState(true), [production, setProduction] = useState(true);
  const [interval, setIntervalMinutes] = useState(60), [time, setTime] = useState('08:00'), [day, setDay] = useState(1);
  const [allowRuns, setAllowRuns] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(null);
  const api = agents?.api;
  // The agent list refreshes while the dialog is open; read the live copy for its abilities.
  const agent = watch ? agents.agents.find(item => item.id === watch.agent.id) || watch.agent : null;
  const environment = /^prod/i.test(String(identity?.environment || client?.config?.environment || '')) ? 'Production' : 'Sandbox';
  const widgetKey = watchWidgetKey(watch);

  useEffect(() => {
    if (!watch) return undefined;
    let stopped = false;
    setWorkflows(null); setError(null); setEndpointId(''); setPrompt(''); setAllowRuns(false); setFilter(''); setChosenUrls([]);
    // An element that declares its workflow resolves to it. Anything else is matched against all of the app's
    // workflows, best match first, with the ones this page called ranked up. A call elsewhere on the page
    // does not establish a match for this widget: unmatched workflows must never become a default choice.
    Promise.all([api.watchResolve(watch.targets), watch.auto ? api.watchWorkflows() : null]).then(([result, all]) => {
      if (stopped) return;
      const items = result?.items || [];
      const resolved = [...new Map(items.flatMap(item => item.workflows || []).map(workflow => [workflow.endpointId, workflow])).values()];
      const found = watch.auto
        ? rankWorkflows(all?.items || resolved, { ...watch.auto, calledIds: resolved.map(workflow => workflow.endpointId) })
          .filter(workflow => workflow.matched || resolved.some(item => item.endpointId === workflow.endpointId))
        : resolved;
      // Remember the call the page made for each workflow: a schedule replays it.
      const calls = {};
      for (const item of items) {
        const url = watch.targets.find(target => (target.key || target.path) === item.key)?.url;
        if (url) for (const workflow of item.workflows || []) {
          calls[workflow.endpointId] ??= [];
          if (!calls[workflow.endpointId].includes(url)) calls[workflow.endpointId].push(url);
        }
      }
      setUrls(calls); setWorkflows(found); setSupportsGroups(result?.supportsRequestGroups === true);
      const suggested = watch.auto ? found.find(workflow => workflow.matched) : found[0];
      select(found, watch.endpointId && found.some(workflow => workflow.endpointId === watch.endpointId) ? watch.endpointId : suggested?.endpointId || '', watch.mode, calls);
    }).catch(failure => { if (!stopped) { setWorkflows([]); setError(failure?.message || 'The workflow could not be found.'); } });
    return () => { stopped = true; };
  }, [watch]);

  const mine = (workflow, kind) => workflow?.[kind]?.find(item => item.agentId === agent?.id &&
    (kind !== 'schedules' || !watch?.scheduleId || item.id === watch.scheduleId) &&
    (kind !== 'schedules' || !widgetKey || item.widgetKey === widgetKey) &&
    (kind !== 'schedules' || watch?.scheduleId || item.isProduction == null || item.isProduction === (environment === 'Production')));

  function select(list, id, wanted, calls = urls) {
    const workflow = list.find(item => item.endpointId === id);
    setEndpointId(id);
    const live = mine(workflow, 'watches'), scheduled = mine(workflow, 'schedules');
    const inputs = scheduled?.sampleUrls?.length ? scheduled.sampleUrls : calls[id] || [];
    // Multiple observed requests may belong to several widgets. Let the user choose, never silently take one.
    setChosenUrls(scheduled?.sampleUrls?.length || inputs.length === 1 ? inputs : []);
    // Reads default to a schedule, actions to a watch on every run; what already exists wins.
    load(workflow, wanted || (scheduled && !live ? 'schedule' : live ? 'runs' : watch?.auto?.kind !== 'action' && workflow?.method === 'GET' ? 'schedule' : 'runs'));
  }

  function load(workflow, next, keepText = '') {
    setMode(next); setError(null);
    const live = mine(workflow, 'watches'), scheduled = mine(workflow, 'schedules');
    if (next === 'schedule') {
      setPrompt(scheduled?.prompt || keepText);
      setIntervalMinutes(scheduled?.intervalMinutes || 60);
      const local = utcScheduleToLocal({ timeOfDayUtcMinutes: scheduled?.timeOfDayUtcMinutes, dayOfWeek: scheduled?.dayOfWeek });
      setTime(local.time || '08:00'); setDay(local.day ?? 1);
    } else {
      setPrompt(live?.watchPrompt || keepText);
      setSandbox(live ? live.watchSandbox : true); setProduction(live ? live.watchProduction : true);
    }
  }

  // Nothing below may assume an agent once the dialog has closed: the Modal keeps this component mounted.
  const selected = watch && agent ? workflows?.find(workflow => workflow.endpointId === endpointId) : null;
  const live = mine(selected, 'watches'), scheduled = mine(selected, 'schedules');
  const wrongEnvironment = scheduled?.isProduction != null && scheduled.isProduction !== (environment === 'Production');
  const needle = filter.trim().toLowerCase();
  // The selected workflow stays listed whatever the filter says, so the select never shows a stale choice.
  const shown = (workflows || []).filter(workflow => !needle || workflow.endpointId === endpointId || `${workflow.method} ${workflow.route} ${workflow.name || ''}`.toLowerCase().includes(needle));
  const others = [...new Set([...(selected?.watches || []), ...(selected?.schedules || [])].filter(item => item.agentId !== agent?.id).map(item => item.agentName))];
  const canWatch = agents?.canWatch === true;
  const needsTools = mode === 'schedule' && agent?.canRunWorkflows === false;
  // A workflow that starts with a sign-in check is run as the app user who created the schedule.
  const needsSignIn = mode === 'schedule' && selected?.requiresSignIn === true;
  const name = selected?.name || selected?.route || 'this workflow';
  const cadence = { intervalMinutes: interval, ...(interval >= 1440 ? localScheduleToUtc({ time, day: interval === 10080 ? day : undefined }) : {}) };

  async function run(action, done) {
    if (!selected || busy) return;
    setBusy(true); setError(null);
    try { await action(); done?.(); }
    catch (failure) { setError(failure?.message || 'This could not be saved.'); }
    finally { setBusy(false); }
  }
  const finish = title => () => { toaster?.toast({ tone: 'success', duration: 5000, title }); agents.watchChanged(); agents.closeWatch(); };

  function save() {
    if (mode === 'schedule') {
      if (prompt.trim().length < 3) { setError(`Say what ${agent.name} should look for. A scheduled check only alerts when that is met.`); return; }
      if (needsTools && !allowRuns) { setError(`Allow ${agent.name} to run workflows to schedule this check.`); return; }
      // After saving, the request is tried once exactly as the agent will run it, so a check that cannot read
      // its workflow is known now rather than at the first alert.
      let tried = null;
      run(async () => {
        const saved = await api.watchScheduleSet({ id: scheduled?.id, agentId: agent.id, endpointId: selected.endpointId, prompt, ...cadence,
          ...(chosenUrls.length ? { sampleUrls: chosenUrls } : {}), widgetKey, widgetLabel: watch.label, enableWorkflowRuns: needsTools && allowRuns });
        const id = saved?.schedules?.find(item => item.agentId === agent.id && (!widgetKey || item.widgetKey === widgetKey))?.id;
        if (id) { try { tried = await api.watchScheduleTest(id); } catch { tried = null; } }
      }, () => {
        agents.refresh(); agents.watchChanged(); agents.closeWatch();
        const title = `${agent.name} will check ${name} ${describeCadence(cadence).toLowerCase()}`;
        if (!tried) toaster?.toast({ tone: 'success', duration: 5000, title });
        else if (tried.ok) toaster?.toast({ tone: 'success', duration: 7000, title, description: `Tried it now: the workflow answered${tried.signedIn ? ', signed in as you' : ''}.` });
        else toaster?.toast({ tone: 'warning', duration: 12000, title: `Saved, but ${name} answered ${tried.statusCode} when tried`, description: tried.statusCode === 401 || tried.statusCode === 403 ? 'The check could not sign in to this workflow. It will report that instead of your condition.' : 'The check will report this failure instead of your condition until the workflow answers.' });
      });
      return;
    }
    if (!sandbox && !production) { setError('Choose at least one environment to watch.'); return; }
    run(() => api.watchSet({ agentId: agent.id, endpointId: selected.endpointId, attached: true, watchPrompt: prompt, watchSandbox: sandbox, watchProduction: production }), finish(`${agent.name} is watching ${name}`));
  }
  const stop = () => mode === 'schedule'
    ? run(() => api.watchScheduleDelete(scheduled.id), finish(`${agent.name} stopped checking ${name}`))
    : run(() => api.watchSet({ agentId: agent.id, endpointId: selected.endpointId, attached: false }), finish(`${agent.name} stopped watching ${name}`));
  const runNow = () => run(() => api.watchScheduleRun(scheduled.id), () => toaster?.toast({ tone: 'info', duration: 6000, title: `${agent.name} is checking ${name} now`, description: 'A message arrives in the chat only if the condition is met.' }));

  const current = mode === 'schedule' ? scheduled : live;
  const requestOptions = [...new Set([...(urls[endpointId] || []), ...(scheduled?.sampleUrls || [])])];
  const missingInputs = mode === 'schedule' && requestOptions.length > 0 && chosenUrls.length === 0;
  return <Modal open={Boolean(watch)} onClose={() => { if (!busy) agents.closeWatch(); }}
    title={`Watch settings — ${agent?.name || 'Agent'}`}
    description={`Tell ${agent?.name || 'the agent'} what to look for in this workflow and what to do when a condition is met. Actions you prescribe here are carried out automatically with the agent's tools.`}
    footer={<div className="cg-watch-foot">
      <button type="button" className="btn-ghost" disabled={busy} onClick={() => agents.closeWatch()}>Cancel</button>
      {current && canWatch && <button type="button" className="btn-ghost cg-watch-remove" disabled={busy} onClick={stop}>{mode === 'schedule' ? 'Stop checking' : 'Stop watching'}</button>}
      {mode === 'schedule' && scheduled && <button type="button" className="btn-ghost" disabled={busy} onClick={runNow}>Run now</button>}
      <button type="button" className="btn-primary" disabled={busy || !selected || !canWatch || missingInputs || (mode === 'schedule' && (!supportsGroups || wrongEnvironment))} onClick={save}>{busy ? 'Saving…' : mode === 'schedule' ? 'Save schedule' : 'Save instructions'}</button>
    </div>}>
    <div className="cg-watch-form">
      {workflows === null && <p className="cg-agents-muted">Finding the workflow…</p>}
      {workflows?.length === 0 && !error && <p className="cg-agents-error" role="alert">No workflow available for {watch?.label ? `“${watch.label}”` : 'this item'}. The agent can only watch items with a matching workflow.</p>}
      {workflows?.length > 0 && (workflows.length > 1 || !selected) && <label className="cg-watch-field">
        <span>{watch?.auto ? `Workflow behind “${watch.label}”` : watch?.page ? 'Workflow used by this page' : 'Workflow'}</span>
        {workflows.length > 8 && <input className="input" type="search" value={filter} placeholder="Filter workflows…" aria-label="Filter workflows" disabled={busy} onChange={event => setFilter(event.target.value)} />}
        <select className="input" value={endpointId} disabled={busy} onChange={event => select(workflows, event.target.value)}>
          <option value="" disabled>Choose a workflow used by this page…</option>
          {shown.map(workflow => <option key={workflow.endpointId} value={workflow.endpointId}>{workflow.method === 'ANY' ? '' : `${workflow.method} `}/{workflow.route}{workflow.name ? ` · ${workflow.name}` : ''}{mine(workflow, 'watches') || mine(workflow, 'schedules') ? ' (watching)' : ''}</option>)}
        </select>
      </label>}
      {watch?.auto && workflows?.length > 0 && !selected && <p className="cg-agents-muted">This widget combines or shares page data. Choose its workflow, then the requests and values the agent should check.</p>}
      {watch?.auto && selected && <p className="cg-agents-muted">Best match first. Check that this is the workflow behind it before saving.</p>}
      {selected && <>
        {workflows.length === 1 && <p className="cg-watch-route"><strong>{selected.name || 'Workflow'}</strong><code>{selected.method === 'ANY' ? '' : `${selected.method} `}/{selected.route}</code></p>}
        <div className="cg-watch-modes" role="radiogroup" aria-label={`When ${agent.name} looks`}>
          <button type="button" role="radio" aria-checked={mode === 'runs'} disabled={busy} onClick={() => load(selected, 'runs', prompt)}>
            <Zap size={15} aria-hidden="true" /><span><strong>When this runs</strong><small>Every time the workflow is called. Best for actions.{live ? ' Active.' : ''}</small></span>
          </button>
          <button type="button" role="radio" aria-checked={mode === 'schedule'} disabled={busy} onClick={() => load(selected, 'schedule', prompt)}>
            <CalendarClock size={15} aria-hidden="true" /><span><strong>On a schedule</strong><small>{agent.name} fetches the data itself. Best for lists and totals.{scheduled ? ' Active.' : ''}</small></span>
          </button>
        </div>
        <label className="cg-watch-field">
          <span className="sr-only">Instructions</span>
          <textarea className="input" rows={5} maxLength={mode === 'schedule' ? 3500 : 2000} value={prompt} disabled={busy || !canWatch} onChange={event => setPrompt(event.target.value)}
            placeholder={mode === 'schedule'
              ? 'e.g. Alert us when more than 20 withdrawals are pending, or when any has waited longer than 2 hours. Say which ones.'
              : 'e.g. Monitor the transactions in this workflow. If any transaction amount exceeds 5000, raise a critical insight and create a support ticket with the transaction details.'} />
        </label>
        {mode === 'schedule' ? <>
          {wrongEnvironment && <p className="cg-agents-error" role="alert">Open this app in {scheduled.isProduction ? 'Production' : 'Sandbox'} to edit this check.</p>}
          {!supportsGroups && <p className="cg-agents-error" role="alert">The Cloudgate server needs an update before this SDK can save widget checks with their request inputs.</p>}
          {requestOptions.length > 0 && <fieldset className="cg-watch-requests" disabled={busy || !canWatch}>
            <legend>Requests to check together</legend>
            <p className="cg-agents-muted">Choose the inputs used by this widget. The agent evaluates the selected responses together using your instructions.</p>
            {requestOptions.length > 1 && <button type="button" className="btn-ghost" onClick={() => setChosenUrls(chosenUrls.length === requestOptions.length ? [] : requestOptions)}> {chosenUrls.length === requestOptions.length ? 'Clear selection' : 'Select all requests'}</button>}
            {requestOptions.map(url => <label key={url} className="cg-watch-consent"><input type="checkbox" checked={chosenUrls.includes(url)} onChange={event => setChosenUrls(old => event.target.checked ? [...old, url] : old.filter(item => item !== url))} /><code>{url}</code></label>)}
            {missingInputs && <p className="cg-agents-muted">Select at least one request.</p>}
          </fieldset>}
          {widgetKey && <p className="cg-agents-muted">For “{watch.label}”. If the response contains several values, name the fields or total to watch in your instructions. Other widgets keep their own checks.</p>}
          <div className="cg-watch-cadence">
            <label className="cg-watch-field"><span>Check</span>
              <select className="input" value={interval} disabled={busy || !canWatch} onChange={event => setIntervalMinutes(Number(event.target.value))}>
                {WATCH_INTERVALS.map(option => <option key={option.minutes} value={option.minutes}>{option.label}</option>)}
              </select>
            </label>
            {interval === 10080 && <label className="cg-watch-field"><span>On</span>
              <select className="input" value={day} disabled={busy || !canWatch} onChange={event => setDay(Number(event.target.value))}>{DAYS.map((label, index) => <option key={label} value={index}>{label}</option>)}</select>
            </label>}
            {interval >= 1440 && <label className="cg-watch-field"><span>At</span>
              <input type="time" className="input" value={time} disabled={busy || !canWatch} onChange={event => setTime(event.target.value || '08:00')} />
            </label>}
          </div>
          <p className="cg-agents-muted">Checks the {environment} data this app shows, even when nobody has the page open. Everyone in {agent.name}'s chat is alerted only when your condition is met.{scheduled?.lastRunAtUtc ? '' : ' Use Run now after saving to try it.'}</p>
          {needsSignIn && <div className="cg-watch-notice cg-watch-notice--info" role="note"><UserCheck size={16} aria-hidden="true" /><div><strong>This check signs in as you</strong><p>The workflow only answers a signed-in user, so each check runs with your app account and sees what you can see. It stops working if your account is removed.</p></div></div>}
          {needsTools && <label className="cg-watch-consent"><input type="checkbox" checked={allowRuns} disabled={busy || !canWatch} onChange={event => setAllowRuns(event.target.checked)} /> Allow {agent.name} to run workflows. This adds the Testing tools to the agent.</label>}
        </> : <fieldset className="cg-watch-env" disabled={busy || !canWatch}>
          <legend>Watch traffic from</legend>
          <label><input type="checkbox" checked={sandbox} onChange={event => setSandbox(event.target.checked)} /> Sandbox</label>
          <label><input type="checkbox" checked={production} onChange={event => setProduction(event.target.checked)} /> Production</label>
        </fieldset>}
        {others.length > 0 && <p className="cg-agents-muted">Also watched by {others.join(', ')}.</p>}
        {!canWatch && <p className="cg-agents-muted">Attaching an agent needs a linked Cloudgate account that can approve agent actions.</p>}
      </>}
      {error && <p className="cg-agents-error" role="alert">{error}</p>}
    </div>
  </Modal>;
}
