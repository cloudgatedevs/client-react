import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Terminal, ChevronUp, ChevronDown, LockKeyhole, RefreshCw, ExternalLink, Info, Sparkles } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { useAuthContext } from '../auth/index.js';
import { isDeveloperWorkspaceMessage } from '../../platform/developer-workspace.js';
import { AgentDockIcons } from '../agents/AgentDock.jsx';
import { useAgents } from '../agents/AgentsProvider.jsx';
import { ErrorBoundary } from '../widgets/ErrorBoundary.jsx';
import { version as sdkVersion } from '../../../package.json';

const sdkSource = import.meta.env?.VITE_CLOUDGATE_SDK_SOURCE === 'local' ? 'local' : 'npm';

export function DeveloperDock() {
  const { client, backofficePath } = useCloudgate();
  const { currentUser } = useAuthContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false), [launch, setLaunch] = useState(null);
  // error: { kind: 'connect' | 'access' | 'setup' | 'ended' | 'slow' | 'failed', message }
  const [status, setStatus] = useState('idle'), [error, setErrorState] = useState(null);
  const setError = (message, kind = 'failed') => setErrorState(message ? { kind, message } : null);
  const [sdkUpdate, setSdkUpdate] = useState(false);
  useEffect(() => {
    setSdkUpdate(false);
    if (!currentUser || import.meta.env?.VITE_CLOUDGATE_BUILD_PREVIEW === 'true') return;
    const controller = new AbortController(); let checked = 0, pending = false;
    const check = async () => {
      if (pending || Date.now() - checked < 60 * 60 * 1000) return;
      pending = true; checked = Date.now();
      try {
        const value = await client.developerWorkspace.sdkStatus({ runningVersion: sdkVersion, sdkSource }, { signal: controller.signal });
        if (!controller.signal.aborted) setSdkUpdate(value.updateAvailable === true);
      } catch { /* Older or temporarily unavailable servers must not interrupt the app. */ }
      finally { pending = false; }
    };
    void check(); const timer = setInterval(check, 60 * 60 * 1000);
    window.addEventListener('focus', check);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', check); };
  }, [client, currentUser?.user?.id]);
  const frame = useRef(null), abort = useRef(null), generation = useRef(0), closing = useRef(null), toggle = useRef(null), minimize = useRef(null);
  // A workspace page asked for before the workspace was ready; it is sent once the frame reports ready.
  const pendingPath = useRef(null);
  const reset = () => {
    clearTimeout(closing.current); pendingPath.current = null;
    generation.current++; abort.current?.abort(); setLaunch(null); setStatus('idle'); setOpen(false); setError('');
  };
  const end = () => {
    if (!launch || !frame.current?.contentWindow) { reset(); return; }
    setStatus('ending');
    frame.current.contentWindow.postMessage({ source: 'cloudgate-app', type: 'end' }, launch.frameOrigin);
    // Keep the frame alive until it has initiated revocation and acknowledged the message.
    closing.current = setTimeout(reset, 5000);
  };
  useEffect(() => { reset(); return () => { generation.current++; abort.current?.abort(); clearTimeout(closing.current); }; }, [client, currentUser?.user?.id]);
  const start = async () => {
    abort.current?.abort(); abort.current = new AbortController();
    const attempt = ++generation.current;
    setLaunch(null); setStatus('connecting'); setError('');
    try {
      const result = await client.developerWorkspace.open({ returnUrl: window.location.href, sdkVersion, sdkSource }, { signal: abort.current.signal });
      if (attempt === generation.current) setLaunch(result);
    } catch (err) {
      if (attempt !== generation.current) return;
      setStatus('error');
      if (err?.code === 'developer-controller-required' || err?.body?.code === 'developer-controller-required') setError(err.message, 'setup');
      else if (err?.status === 403 && err?.body?.code === 'developer-link-required') {
        // Tell someone who never connected a Cloudgate account how to connect, rather than to reconnect.
        let linked = true;
        try { linked = (await client.accountLink.get({ signal: abort.current?.signal }))?.linked === true; } catch { /* keep the server's message */ }
        if (attempt !== generation.current) return;
        setError(err.message, linked ? 'access' : 'connect');
      } else setError(err?.message || 'Developer mode could not be opened.');
    }
  };
  useEffect(() => {
    if (!launch) return;
    const receive = event => {
      if (!isDeveloperWorkspaceMessage(event, frame.current?.contentWindow, launch.frameOrigin)) return;
      if (event.data.type === 'environment') {
        if (['prod', 'sbx'].includes(event.data.environment)) setLaunch(value => value ? { ...value, environment: event.data.environment } : value);
      } else if (event.data.type === 'sdk-update') { setSdkUpdate(event.data.updateAvailable === true); }
      else if (event.data.type === 'ready') {
        setStatus('ready'); setError('');
        if (pendingPath.current) { event.source.postMessage({ source: 'cloudgate-app', type: 'navigate', path: pendingPath.current }, launch.frameOrigin); pendingPath.current = null; }
      }
      else if (event.data.type === 'ended') { reset(); }
      else {
        setStatus('error');
        if (event.data.type === 'expired') setError('Your developer session ended. Open developer mode again to continue.', 'ended');
        else setError('Cloudgate could not open this developer session. Try again.');
        setLaunch(null);
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [launch]);
  useEffect(() => {
    if (status !== 'connecting' || !launch) return;
    const timeout = setTimeout(() => {
      // A slow handshake does not mean the session failed. Keep its frame alive so
      // a delayed ready message can finish connecting without launching again.
      setError('Cloudgate is still loading. You can keep waiting for this session, or reconnect if it does not finish.', 'slow');
      setStatus('waiting');
    }, 45000);
    return () => clearTimeout(timeout);
  }, [status, launch?.frameUrl]);
  useEffect(() => {
    if (!open) return;
    minimize.current?.focus();
    const keydown = event => { if (event.key === 'Escape' && !event.defaultPrevented) setOpen(false); };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); toggle.current?.focus(); };
  }, [open]);
  const show = () => { setOpen(true); if (!launch && status !== 'connecting') void start(); };
  // Opens the workspace on one of its pages, such as the agents page.
  const showAt = path => {
    if (launch && status === 'ready' && frame.current?.contentWindow) frame.current.contentWindow.postMessage({ source: 'cloudgate-app', type: 'navigate', path }, launch.frameOrigin);
    else pendingPath.current = path;
    show();
  };
  // Agents created or changed in the workspace show in the bar as soon as it closes.
  const agents = useAgents(), refreshAgents = agents?.refresh, wasOpen = useRef(false);
  useEffect(() => { if (wasOpen.current && !open) refreshAgents?.(); wasOpen.current = open; }, [open]);
  const openTab = async () => {
    const destination = window.open('about:blank', '_blank');
    if (!destination) { setError('Allow popups to open the developer workspace in a new tab.'); return; }
    destination.opener = null;
    try {
      const result = await client.developerWorkspace.open({ returnUrl: window.location.href, sdkVersion, sdkSource });
      const url = new URL(result.frameUrl); const params = new URLSearchParams(url.hash.slice(1));
      params.set('standalone', '1'); url.hash = params.toString(); destination.location.replace(url.href);
    } catch (err) { destination.close(); setError(err.message || 'The developer workspace could not open.'); }
  };
  if (import.meta.env?.VITE_CLOUDGATE_BUILD_PREVIEW === 'true') return null;
  return <>
    {/* A click anywhere on the bar toggles the workspace; the buttons inside are the keyboard targets. */}
    <div className="developer-dock" onClick={() => open ? setOpen(false) : show()}>
      <button ref={toggle} type="button" aria-expanded={open} aria-controls="cloudgate-developer-panel">
        <Terminal size={16} /><span>Developers</span><span className="developer-dock-status">{launch ? launch.projectName : 'Cloudgate workspace'}</span>
        {sdkUpdate && <span className="developer-sdk-update" title="Cloudgate SDK update available — open Info & updates" aria-label="Cloudgate SDK update available"><Info size={14} /></span>}
        <ChevronUp size={16} className="developer-dock-chevron" aria-hidden="true" />
      </button>
      <ErrorBoundary fallback={null}><AgentDockIcons disabled={open} onDisabledClick={() => setOpen(false)} onCreate={() => showAt('/flows/agents')} /></ErrorBoundary>
      <button type="button" className="developer-dock-ai" title="Build with AI in the Cloudgate developer workspace">
        <Sparkles size={13} aria-hidden="true" /><span>Build with AI</span>
      </button>
    </div>
    {createPortal(<>
        <div className="developer-backdrop" data-state={open ? 'open' : 'closed'} aria-hidden="true" onClick={() => setOpen(false)} />
        <section role="dialog" aria-labelledby="cloudgate-developer-title" aria-describedby="cloudgate-developer-description"
          aria-hidden={!open} inert={open ? undefined : ''} data-state={open ? 'open' : 'closed'} id="cloudgate-developer-panel" className="developer-panel">
          <header className="developer-panel-header">
            <div><h2 id="cloudgate-developer-title"><Terminal size={17} />Developer workspace</h2>
              <p id="cloudgate-developer-description">{launch ? `${launch.projectName} · ${launch.appName}` : 'Build and monitor the APIs behind your application.'}</p></div>
            <span className="developer-project-lock" title={launch?.controllerId ? `Controller: /${launch.controllerPath}` : 'All accessible controllers in this tenant'}><LockKeyhole size={12} />{launch?.controllerId ? `Controller: ${launch.controllerName || launch.controllerPath}` : 'All controllers'}</span>
            {launch && <span className={`developer-env ${launch.environment === 'prod' ? 'is-production' : ''}`}>{launch.environment === 'prod' ? 'Production' : 'Sandbox'}</span>}
            {launch && <button type="button" className="developer-icon" onClick={openTab} aria-label="Open developer workspace in new tab"><ExternalLink size={16} /></button>}
            <button ref={minimize} type="button" className="developer-icon" onClick={() => setOpen(false)} aria-label="Minimize developer workspace"><ChevronDown size={20} /></button>
          </header>
          <div className="developer-panel-body">
            {status === 'connecting' && <div className="developer-connecting" role="status"><RefreshCw size={16} className="animate-spin" />Connecting to Cloudgate…</div>}
            {status === 'ending' && <div className="developer-connecting" role="status">Ending developer session…</div>}
            {error && <div className="developer-recovery" data-kind={error.kind}><Terminal size={28} />
              {error.kind === 'slow' ? <>
                <h2>Developer workspace is still loading</h2>
                <p role="status">{error.message}</p>
                <div><button className="btn-primary" onClick={() => { setError(''); setStatus('connecting'); }}>Keep waiting</button><button className="btn-ghost" onClick={start}>Reconnect</button></div>
              </> : error.kind === 'connect' ? <>
                <h2>Connect your Cloudgate account</h2>
                <p role="alert">Developer mode opens Cloudgate, where you build this app's APIs and workflows, with the permissions of your Cloudgate account.</p>
                <p>Connect your Cloudgate account in your profile, then open developer mode again.</p>
                <div><button className="btn-primary" onClick={() => { end(); navigate(backofficePath('/profile')); }}>Connect Cloudgate account</button><button className="btn-ghost" onClick={start}>Try again</button></div>
              </> : error.kind === 'access' ? <>
                <h2>Developer access unavailable</h2>
                <p role="alert">{error.message}</p>
                <p>Your Cloudgate account is connected. Developer mode also needs developer access in this app and access to this Cloudgate project.</p>
                <div><button className="btn-primary" onClick={start}>Try again</button><button className="btn-ghost" onClick={() => { end(); navigate(backofficePath('/profile')); }}>Open my profile</button></div>
              </> : <>
                <h2>{error.kind === 'ended' ? 'Developer session ended' : error.kind === 'setup' ? 'Developer mode is not set up' : 'Developer mode could not open'}</h2>
                <p role="alert">{error.message}</p>
                <div><button className="btn-primary" onClick={start}>{error.kind === 'ended' ? 'Open again' : 'Try again'}</button></div>
              </>}
            </div>}
            {launch && <iframe ref={frame} title="Cloudgate developer workspace" src={launch.frameUrl}
              allow="microphone" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" />}
          </div>
        </section>
      </>, document.body)}
  </>;
}
