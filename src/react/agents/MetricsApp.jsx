import { useState } from 'react';
import { BellRing, ExternalLink, Smartphone } from 'lucide-react';
import { Modal } from '../components/forms.jsx';
import { Tabs } from '../widgets/Tabs.jsx';
import { METRICS_APP_STORES } from './metricsAppStores.js';
import { STORE_LOGOS } from './storeLogos.js';

const QUIET = 4; // the blank margin a scanner needs around a QR code, in modules

/** A store link as a QR code. Always dark on white, whatever the theme, so every phone camera reads it. */
export function StoreQr({ store, size = 188 }) {
  const side = store.size + QUIET * 2;
  return <svg className="cg-metrics-qr" role="img" aria-label={`QR code for the Cloudgate Metrics app on ${store.label}`}
    width={size} height={size} viewBox={`${-QUIET} ${-QUIET} ${side} ${side}`} shapeRendering="crispEdges">
    <rect x={-QUIET} y={-QUIET} width={side} height={side} fill="#fff" />
    <path d={store.path} fill="#000" />
  </svg>;
}

/** Where to get the Cloudgate Metrics app: one tab per store, each with a QR code to scan and a link to open. */
export function MetricsAppDialog({ open, onClose }) {
  const [storeId, setStoreId] = useState(METRICS_APP_STORES[0].id);
  const store = METRICS_APP_STORES.find(item => item.id === storeId) || METRICS_APP_STORES[0];
  const Logo = STORE_LOGOS[store.id];
  return <Modal open={open} onClose={onClose} title="Get agent alerts on your phone"
    description="Your AI agents keep watching when you are away from this screen. The Cloudgate Metrics app brings their alerts to your phone.">
    <div className="cg-metrics-app">
      <Tabs label="App store" variant="segmented" fullWidth value={store.id} onChange={setStoreId}
        items={METRICS_APP_STORES.map(item => ({ value: item.id, label: item.label, icon: STORE_LOGOS[item.id] }))} />
      <div className="cg-metrics-app-store" key={store.id}>
        <StoreQr store={store} />
        <div className="cg-metrics-app-steps">
          <p className="cg-metrics-app-lead"><BellRing size={15} aria-hidden="true" />Never miss what your agents find</p>
          <ol>
            <li>Point your phone camera at the code.</li>
            <li>Install Cloudgate Metrics from {store.label} ({store.device}).</li>
            <li>Sign in with the Cloudgate account connected under your profile and allow notifications.</li>
          </ol>
          <a className="cg-metrics-app-link" href={store.url} target="_blank" rel="noopener noreferrer">
            <Logo size={15} />Open {store.label}<ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  </Modal>;
}

/** The phone button that sits next to the agents in the bar and opens the download dialog. */
export function MetricsAppButton({ disabled = false, onDisabledClick }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="cg-agent-dock-item cg-agent-dock-app" aria-label="Download Metrics app" aria-haspopup="dialog"
      aria-disabled={disabled || undefined} data-disabled={disabled || undefined}
      onClick={event => { event.stopPropagation(); if (disabled) onDisabledClick?.(); else setOpen(true); }}>
      <Smartphone size={14} aria-hidden="true" />
      {!disabled && <span className="cg-agent-dock-tip" role="tooltip">Download Metrics app · agent alerts on your phone</span>}
    </button>
    <MetricsAppDialog open={open && !disabled} onClose={() => setOpen(false)} />
  </>;
}
