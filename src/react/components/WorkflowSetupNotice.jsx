import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { RefreshCw, Workflow, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCloudgate } from '../context.jsx';
import { useAuthContext } from '../auth/index.js';
import { workflowSetupError } from '../../platform/workflow-setup.js';

const labels = { ready: 'Ready', missing: 'Missing', inactive: 'Inactive', unpublished: 'Not published', 'release-required': 'Release required' };

export function WorkflowSetupNotice() {
  const { client, metadata, identity, backofficePath } = useCloudgate();
  const { currentUser } = useAuthContext();
  const [status, setStatus] = useState(null), [error, setError] = useState('');
  const [checking, setChecking] = useState(false), [applying, setApplying] = useState(false);
  const [open, setOpen] = useState(false), [confirmed, setConfirmed] = useState(false), [result, setResult] = useState(null);
  const generation = useRef(0), scopeRevision = useRef(0), abort = useRef(null), mounted = useRef(true);
  const supported = !!(metadata?.id && metadata?.workflows?.file && client.workflowSetup);
  const check = useCallback(async () => {
    if (!supported || !currentUser) return;
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    const attempt = ++generation.current;
    setChecking(true); setError(''); setConfirmed(false);
    try {
      const value = await client.workflowSetup.status(metadata, { signal: controller.signal });
      if (attempt === generation.current) setStatus(value);
    } catch (err) {
      if (attempt === generation.current && !controller.signal.aborted) { setStatus(null); setError(workflowSetupError(err)); }
    } finally { if (attempt === generation.current) setChecking(false); }
  }, [client, metadata.id, metadata.workflows?.file, currentUser?.user?.id, identity?.webAppId, identity?.environment, supported]);
  useEffect(() => {
    mounted.current = true; setStatus(null); setResult(null); setOpen(false); setApplying(false); void check();
    return () => { mounted.current = false; scopeRevision.current++; generation.current++; abort.current?.abort(); };
  }, [check]);
  const apply = async () => {
    if (!confirmed || !status?.canApply || applying || checking) return;
    const attempt = scopeRevision.current;
    setApplying(true); setError(''); setResult(null);
    try {
      const value = await client.workflowSetup.apply(metadata, { revision: status.revision, confirmOverwrite: true });
      if (!mounted.current || attempt !== scopeRevision.current) return;
      setResult(value); await check();
    } catch (err) {
      if (mounted.current && attempt === scopeRevision.current) {
        setStatus(null); setConfirmed(false);
        setError(`${workflowSetupError(err)} Check the current status before retrying.`);
      }
    } finally { if (mounted.current && attempt === scopeRevision.current) setApplying(false); }
  };
  if (!supported) return null;
  const missing = status?.status === 'missing', update = status?.status === 'update-available';
  const attention = missing || update || status?.status === 'release-required' || status?.configurationRequired;
  const title = missing ? 'This app’s workflows are not ready' : update ? 'Workflow update available'
    : status?.status === 'release-required' ? 'Workflows need a production release'
      : status?.configurationRequired ? 'Set this app’s workflow controller' : 'App workflows';
  const openDeveloper = () => { setOpen(false); window.dispatchEvent(new Event('cloudgate:open-developer')); };
  return <>
    <section className={`workflow-setup-notice ${attention || error ? 'needs-attention' : ''}`} aria-label="App workflows">
      <Workflow size={17} aria-hidden="true" />
      <div><strong>{checking ? 'Checking app workflows…' : title}</strong>
        {error ? <p role="status">{error}</p> : attention && <p>{missing
          ? 'Import the app’s workflow package or repair its missing actions to enable its business features.'
          : update ? `Version ${status.catalogVersion} is available. Review the changes before updating.`
            : status.configurationRequired ? `Use ${status.projectPath} as this app’s workflow controller.`
              : 'The workflows are prepared in sandbox. Use Developers to review and release them.'}</p>}
      </div>
      <button type="button" className="btn-ghost btn-sm" disabled={checking || applying} onClick={() => { setOpen(true); setConfirmed(false); void check(); }}>
        {missing ? 'Set up workflows' : 'Manage workflows'}
      </button>
    </section>
    <Dialog.Root open={open} onOpenChange={value => { if (!applying) setOpen(value); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop fixed inset-0 z-50" />
        <Dialog.Content className="workflow-setup-dialog card fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 space-y-4 p-6">
          <Dialog.Title className="text-lg font-semibold">{metadata.name || 'App'} workflows</Dialog.Title>
          <Dialog.Description className="text-sm text-mist-muted">
            Check and install the backend for this app. Imports and updates publish workflow candidates to sandbox.
            Production uses Cloudgate’s release approval process.
          </Dialog.Description>
          <Dialog.Close className="icon-button absolute right-3 top-3" disabled={applying} aria-label="Close workflow setup"><X size={18} /></Dialog.Close>
          {checking && <p role="status" className="flex items-center gap-2"><RefreshCw size={16} className="animate-spin" />Checking workflows…</p>}
          {error && <p role="alert" className="text-sm">{error}</p>}
          {status && <>
            <p className="text-sm">Controller: <strong>{status.projectPath}</strong> · {status.environment === 'prod' ? 'Production' : 'Sandbox'} · Package {status.catalogVersion}
              {status.installedVersion ? ` · Installed ${status.installedVersion}` : ' · Installed version not recorded'}</p>
            <ul className="workflow-setup-routes" aria-label="Workflow status">{status.workflows.map((item, index) => <li key={`${item.route}:${index}`}>
              <span>{item.name || item.route}</span><span>{labels[item.state] || item.state}</span>
            </li>)}</ul>
            {status.configurationRequired && <p className="text-sm">Set <code>VITE_CLOUDGATE_API_PROJECT="{status.projectPath}"</code> in your env file and restart the app after setup.</p>}
            <p className="text-sm text-mist-muted">Updating replaces matching workflow definitions, including custom edits. Existing databases and channel credentials are kept. Database schema migrations must be reviewed separately.</p>
            {status.canApply ? <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={confirmed} disabled={applying || checking} onChange={event => setConfirmed(event.target.checked)} />
              I have reviewed this package and want to {status.controllerId ? 'update' : 'import'} its workflows in sandbox.
            </label> : <p className="text-sm">Your linked Cloudgate account needs permission to import and edit these workflow resources.</p>}
          </>}
          {result && <div role="status" className="text-sm space-y-2"><p>{result.publishedWorkflowCount} workflows published to sandbox.</p>
            {result.warnings?.map(message => <p key={message}>{message}</p>)}</div>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary" onClick={apply} disabled={!status?.canApply || !confirmed || checking || applying}>
              {applying ? 'Applying workflows…' : status?.controllerId ? 'Update workflows' : 'Import workflows'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => void check()} disabled={checking || applying}>Check again</button>
            <button type="button" className="btn-ghost" onClick={openDeveloper} disabled={applying}>Open Developers</button>
            {!applying && <Link className="btn-ghost" to={backofficePath('/profile')} onClick={() => setOpen(false)}>Profile</Link>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
