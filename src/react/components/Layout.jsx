import { useCloudgate } from '../context.jsx';
import { Suspense, useEffect, useId, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuthContext } from '../auth/index.js';
import { useSettings } from '../settings/SettingsProvider.jsx';
import { PoweredByCloudgate } from '../integrations/CloudgateAbout.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { Brand } from './Brand';
import { NotificationBell } from '../notifications/NotificationBell.jsx';
import { routeTitle, backTargetFor } from './navConfig';
import { PageSkeleton } from './ScreenLoader';
import { SidebarNavigation, useNavigationPreferences } from './SidebarNavigation.jsx';
import { navigationTrail } from './navigation.js';
import { DeveloperDock } from './DeveloperDock.jsx';
import { EmailVerificationPrompt } from './EmailVerificationPrompt.jsx';
import { usePermissions, filterPermissionNavigation, RequirePagePermission } from '../auth/permissions.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { ErrorBoundary } from '../widgets/ErrorBoundary.jsx';

export function Layout({ developerMode = true }) {
  const { can } = usePermissions();
  const showDeveloperDock = developerMode && can(P.DeveloperAccess) && import.meta.env?.VITE_CLOUDGATE_BUILD_PREVIEW !== 'true';
  const { navigation: allNavigation, identity, client, basePath, backofficePath, publicWebsite } = useCloudgate();
  const navigation = filterPermissionNavigation(allNavigation, can, basePath);
  const { currentUser } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const sidebarId = useId();
  const preferenceKey = `cloudgate.navigation.v1:${JSON.stringify([client.config.apiUrl, client.auth.tenancyName, identity?.webAppId || client.config.webAppId, identity?.environment || client.config.environment, currentUser?.user?.id])}`;
  const [preferences, updatePreferences] = useNavigationPreferences(preferenceKey);
  const location = useLocation();
  // Inside the Build preview frame, tell the developer workspace which page is showing, so its address bar
  // follows navigation and a prompt about "this page" carries the route. Only the path is sent.
  useEffect(() => {
    if (import.meta.env?.VITE_CLOUDGATE_BUILD_PREVIEW !== 'true' || window.parent === window) return;
    window.parent.postMessage({ type: 'cloudgate:build-preview-route', path: `${window.location.pathname}${window.location.search}`.slice(0, 300) }, '*');
  }, [location.pathname, location.search]);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const main = useRef(null);
  const routePath = location.pathname.slice(basePath.length) || '/';
  const back = backTargetFor(routePath) ? backofficePath(backTargetFor(routePath)) : null;
  const environment = identity?.environment || '';
  const isProduction = ['prod', 'production'].includes(environment);
  const trail = navigationTrail(location.pathname, navigation);
  useEffect(() => {
    setOpen(false);
    setQuery('');
    main.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const close = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, []);
  const sidebar = (
    <>
      <div className="sidebar-brand">
        <Brand />
      </div>
      <SidebarNavigation {...{ navigation, preferences, updatePreferences, query, setQuery }} onNavigate={() => { setOpen(false); setQuery(''); }} />
      <div className="sidebar-footer">
        <PoweredByCloudgate
          onOpen={() => {
            navigate(backofficePath('/about'));
            setOpen(false);
          }}
          className="sidebar-powered"
        />
      </div>
    </>
  );
  return (
    <div className={`app-shell flex h-[100dvh] w-full overflow-hidden ${showDeveloperDock ? 'has-developer-dock' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside id={sidebarId} aria-label="Sidebar" aria-hidden={preferences.hidden || undefined} ref={element => { if (element) element.inert = preferences.hidden; }}
        data-collapsed={preferences.hidden} className="app-sidebar hidden shrink-0 flex-col lg:flex">
        <div className="sidebar-content">{sidebar}</div>
      </aside>
      <div className="workspace-shell flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="workspace-bar hidden shrink-0 items-center justify-between gap-4 lg:flex">
          <div className="workspace-location">
            <button type="button" className="sidebar-toggle" aria-label={preferences.hidden ? 'Show sidebar' : 'Hide sidebar'}
              aria-expanded={!preferences.hidden} aria-controls={sidebarId}
              onClick={() => updatePreferences(previous => ({ ...previous, hidden: !previous.hidden }))}>
              {preferences.hidden ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <nav aria-label="Breadcrumb" className="workspace-breadcrumb">
              <span className="breadcrumb-app">{settings.app_name}</span>
              {(trail.length ? trail : [{ label: routeTitle(routePath) }]).map((item, index, items) => <span key={item.id || item.to || item.label} className="breadcrumb-part">
                <ChevronRight size={12} aria-hidden="true" />
                <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>
              </span>)}
            </nav>
          </div>
          <div className="flex items-center gap-3">{publicWebsite && settings.enable_public_website === 'true' && <Link to="/" className="btn-ghost btn-sm">View website</Link>}<NotificationBell /><span className={`environment-pill ${isProduction ? 'is-production' : ''}`}>
            <span aria-hidden="true" />{environment ? (isProduction ? 'Production' : 'Sandbox') : 'Connecting…'}
          </span><AccountMenu /></div>
        </header>
        <header className="app-bar flex shrink-0 items-center gap-2 border-b border-ink-700 bg-ink-850 lg:hidden">
          {back ? (
            <button
              className="btn-ghost p-2"
              aria-label="Go back"
              onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate(back))}
            >
              <ChevronLeft size={21} />
            </button>
          ) : null}
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button className="btn-ghost p-2" aria-label="Open menu">
                <Menu size={21} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="dialog-backdrop fixed inset-0 z-40" />
              <Dialog.Content className="app-drawer fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col bg-ink-850 outline-none">
                <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Back office navigation.
                </Dialog.Description>
                <Dialog.Close className="icon-button absolute right-3 top-3 p-2 text-mist-muted" aria-label="Close menu">
                  <X size={19} />
                </Dialog.Close>
                {sidebar}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <p className="min-w-0 flex-1 truncate px-1 text-base font-semibold">
            {trail.at(-1)?.label || routeTitle(routePath)}
          </p>
          <NotificationBell />
          <AccountMenu />
        </header>
        <main ref={main} tabIndex={-1} className="app-main flex-1 overflow-y-auto" id="main-content">
          <div className="app-content">
            <EmailVerificationPrompt />
            <Suspense fallback={<PageSkeleton />}>
              <div key={location.pathname} className="page-transition">
                <ErrorBoundary resetKey={location.pathname} title="This page could not be displayed"
                  description="Something went wrong while rendering this page. The navigation still works, and you can try again.">
                  <RequirePagePermission><Outlet /></RequirePagePermission>
                </ErrorBoundary>
              </div>
            </Suspense>
            {settings.footer_note && (
              <footer className="mt-10 border-t border-ink-700 pt-5 text-xs text-mist-dim">
                {settings.footer_note}
              </footer>
            )}
          </div>
        </main>
      </div>
      {showDeveloperDock && <DeveloperDock />}
    </div>
  );
}
