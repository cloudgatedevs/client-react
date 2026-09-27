// "Powered by Cloudgate SDK" badge + About page for the back office. Same file in every App Store
// app (Shop, POS, Booking, Jobs), self-contained like CloudgateWorkflowLogs.jsx: plain React,
// its own stylesheet, no router or UI-kit dependency.
//
//   <PoweredByCloudgate onOpen={…} />     sidebar badge (with the SDK version); opens the About page
//   <AppVersion />                         "v1.2.3" from template.json, for public footers
//   <CloudgateAbout />                     the page: app + version, tenancy, hub links
//
// Everything shown comes from the build's .env (the values the App Store filled in) plus the
// manifest (template.json) and the signed-in IdP profile — nothing is fetched from workflows.
import React, { useEffect, useState, useId } from 'react';
import { ArrowUpRight, BookOpen, Boxes, Globe, LayoutDashboard, Mail, ShoppingBag, Users, Workflow } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { getProfileDisplayName } from '../../platform/profile.js';
import { version as sdkVersion } from '../../../package.json';
const hostOf = url => { try { return new URL(url).host; } catch { return url || '—'; } };

/** Small "v1.2.3" label for footers; renders nothing when the manifest has no version. */
export function AppVersion({ prefix = 'v', className = '', title }) {
  const { metadata } = useCloudgate();
  const appVersion = metadata.version;
  title ??= `${metadata.name || 'App'} version ${appVersion}`;
  if (!appVersion) return null;
  return <span className={`cg-version ${className}`} title={title}>{prefix}{appVersion}</span>;
}

/** Cloudgate's mark, inline so the badge never depends on a public asset path. */
export const CloudgateMark = ({ size = 18 }) => {
  const gradient = useId();
  return (
  <svg width={size} height={size} viewBox="0 0 128.78 174.18" aria-hidden="true" focusable="false">
    <defs><linearGradient id={gradient} x1="4.59" y1="154.92" x2="116.69" y2="42.82" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#3f5efb" /><stop offset="1" stopColor="#ec2f4b" /></linearGradient></defs>
    <path fill={`url(#${gradient})`} d="M115.38,142.37A12.77,12.77,0,0,0,99.13,139a77.88,77.88,0,0,1-75.06,0,12.8,12.8,0,0,0-12.23,22.5,103.6,103.6,0,0,0,99.53,0A12.82,12.82,0,0,0,115.38,142.37Zm.67-100.19a24.73,24.73,0,0,1-4.74.45A25.19,25.19,0,0,1,86.14,17.48a25.76,25.76,0,0,1,.17-2.93A61.58,61.58,0,0,0,24.48,120.09a61.57,61.57,0,0,0,91.57-77.91ZM83.3,99.69A36,36,0,1,1,97.62,71,35.86,35.86,0,0,1,83.3,99.69Z" />
    <path fill="#3f5efb" d="M128.78,17.48A17.46,17.46,0,0,1,111.55,35h-.24A17.48,17.48,0,0,1,93.85,18.5c0-.33,0-.68,0-1a17.48,17.48,0,1,1,35,0Z" />
  </svg>
  );
};

/**
 * Sidebar badge. Pass `onOpen` to open the in-app About page (a button), or `href` to make it a
 * plain link (e.g. "/admin/about" in apps that use the router).
 */
export function PoweredByCloudgate({ onOpen, href, className = '', showVersion = true }) {
  const title = `Cloudgate SDK v${sdkVersion} — about this app and Cloudgate`;
  const inner = <><CloudgateMark size={16} /><span><small>Powered by</small><strong>Cloudgate SDK</strong></span>{showVersion ? <em className="cg-powered-version">v{sdkVersion}</em> : null}</>;
  if (href) return <a className={`cg-powered ${className}`} href={href} title={title}>{inner}</a>;
  return <button type="button" className={`cg-powered ${className}`} onClick={onOpen} title={title}>{inner}</button>;
}

const HUB_LINKS = [
  { label: 'Cloudgate hub', text: 'Your tenant home: controllers, apps, users and billing.', path: '/', icon: Globe },
  { label: 'Web Apps dashboard', text: 'Traffic, sessions and releases for this and your other apps.', path: '/web-apps/dashboard', icon: LayoutDashboard },
  { label: 'App Store', text: 'Update this app when a new version is published, or install another.', path: '/web-apps/app-store', icon: ShoppingBag },
  { label: 'Workflows', text: 'Optional application-specific workflow actions.', path: '/flows/workflows', icon: Workflow },
  { label: 'App users', text: 'The identity provider accounts that sign in to this app.', path: '/web-apps/users', icon: Users },
  { label: 'Email delivery', text: 'Tenant-wide email settings; custom SMTP is optional.', path: '/flows/identity/email-settings', icon: Mail },
];

export function CloudgateAbout({ appName, appVersion, description, showTitle = true }) {
  const { client, metadata, identity } = useCloudgate();
  appName ??= metadata.name; appVersion ??= metadata.version; description ??= metadata.description;
  const { auth } = client;
  const { idpBaseUrl: hubUrl, apiUrl: idpApiUrl, projectPath, gatewayUrl } = client.config;
  const isProduction = identity?.environment === 'prod';
  const preview = false;
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (preview) return undefined;
    let alive = true;
    const token = String(auth.authHeader?.()?.Authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return undefined;
    client.profile.get().then((p) => { if (alive && p && typeof p === 'object') setProfile(p); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const facts = [
    ['Tenancy', auth.tenancyName || '—'],
    ['Environment', isProduction ? 'Production' : 'Sandbox'],
    ['Controller', projectPath ? `/${projectPath}` : '—'],
    ['Workflow gateway', hostOf(gatewayUrl)],
    ['Identity provider', hostOf(idpApiUrl)],
    ['Signed in as', profile ? `${getProfileDisplayName(profile)}${profile.email ? ` · ${profile.email}` : ''}${profile.role ? ` (${profile.role})` : ''}` : preview ? 'Preview administrator' : '—'],
  ];

  return (
    <div className="cg-about">
      {showTitle ? <h2>About</h2> : null}
      <section className="cg-about-hero">
        <div className="cg-about-hero-mark"><CloudgateMark size={40} /></div>
        <div className="cg-about-hero-text">
          <p className="cg-about-eyebrow">Powered by Cloudgate</p>
          <h3>{appName || 'This app'} <span className="cg-about-version">v{appVersion || '—'}</span></h3>
          <p>{description || 'Built on Cloudgate: sign-in through the tenant identity provider, workflow actions for application data, tenant email delivery and hosted publishing.'}</p>
        </div>
      </section>

      <div className="cg-about-grid">
        <section className="cg-about-card">
          <h4>Your Cloudgate tenancy</h4>
          <p className="cg-about-muted">The Cloudgate connection and published environment for this application.</p>
          <dl>
            {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          {preview ? <p className="cg-about-note">Local preview: this copy runs against a simulated backend and is not connected to a Cloudgate tenancy.</p> : null}
        </section>

        <section className="cg-about-card">
          <h4>Cloudgate hub</h4>
          <p className="cg-about-muted">{hubUrl ? <>Manage the tenancy at <a href={hubUrl} target="_blank" rel="noreferrer">{hostOf(hubUrl)}</a>. These links open the hub in a new tab; a Cloudgate account for the tenancy is required.</> : 'The hub URL is not configured for this build (VITE_IDP_BASE_URL).'}</p>
          <ul className="cg-about-links">
            {HUB_LINKS.map(({ label, text, path, icon: Icon }) => (
              <li key={path}>
                <a href={hubUrl ? `${hubUrl}${path}` : undefined} target="_blank" rel="noreferrer" aria-disabled={!hubUrl} onClick={(e) => { if (!hubUrl) e.preventDefault(); }}>
                  <span className="cg-about-link-icon"><Icon size={16} /></span>
                  <span><strong>{label}</strong><small>{text}</small></span>
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </li>
            ))}
            <li>
              <a href="https://cloudgate.dev" target="_blank" rel="noreferrer">
                <span className="cg-about-link-icon"><BookOpen size={16} /></span>
                <span><strong>cloudgate.dev</strong><small>Documentation, platform terms and support.</small></span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </section>
      </div>

      <section className="cg-about-card">
        <h4>What Cloudgate provides for this app</h4>
        <ul className="cg-about-facts">
          <li><Boxes size={15} /><span><strong>Platform features.</strong> Identity, branding, notifications, files, email and Wallet readiness use native Cloudgate APIs. Your own workflows are optional.</span></li>
          <li><Users size={15} /><span><strong>Identity.</strong> Sign-in, roles and password recovery come from the tenant identity provider; role permissions control back-office access.</span></li>
          <li><ShoppingBag size={15} /><span><strong>Payments.</strong> Check readiness, browse payments and create sandbox checkouts here. Manage providers and payouts in the Cloudgate hub.</span></li>
          <li><Mail size={15} /><span><strong>Email.</strong> Customer emails go out through Cloudgate delivery by default, or your own SMTP server when enabled under Settings.</span></li>
          <li><Globe size={15} /><span><strong>Hosting.</strong> Publish app releases through Cloudgate. Shared back-office features are versioned through the Cloudgate npm client.</span></li>
        </ul>
      </section>
    </div>
  );
}
