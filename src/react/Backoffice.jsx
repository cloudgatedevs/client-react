import { Children, cloneElement, isValidElement, lazy, Suspense, useMemo } from 'react';
import { createRoutesFromChildren, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CloudgateProvider } from './context.jsx';
import { AuthProvider, RequireAuth, RequireAdmin } from './auth/index.js';
import { SettingsProvider } from './settings/SettingsProvider.jsx';
import { NotificationsProvider } from './notifications/NotificationsProvider.jsx';
import { ToastProvider } from './components/Toaster.jsx';
import { Layout } from './components/Layout.jsx';
import { ScreenLoader } from './components/ScreenLoader.jsx';
import { PLATFORM_NAV } from './components/navConfig.jsx';
import { assertNoPlatformRouteConflicts, collectRoutePaths, legacyPaymentRedirects, normalizeBackofficeBasePath, scopeNavigation, scopedBackofficePath, SDK_PAYMENT_ROUTES } from './routing.js';
import { PublicHomeGate } from './PublicHomeGate.jsx';
const page = (load, name) => lazy(() => load().then(module => ({ default: module[name] })));
const RoleManagement = page(() => import('./pages/RoleManagement.jsx'), 'RoleManagement');
const UserManagement = page(() => import('./pages/UserManagement.jsx'), 'UserManagement');
const Analytics = page(() => import('./pages/Analytics.jsx'), 'Analytics');
const Appearance = page(() => import('./pages/Appearance.jsx'), 'Appearance');
const Smtp = page(() => import('./pages/Smtp.jsx'), 'Smtp');
const Media = page(() => import('./pages/Media.jsx'), 'Media');
const Payments = page(() => import('./pages/Payments.jsx'), 'Payments');
const PaymentList = page(() => import('./pages/PaymentList.jsx'), 'PaymentList');
const TestPayment = page(() => import('./pages/TestPayment.jsx'), 'TestPayment');
const Logs = page(() => import('./pages/Logs.jsx'), 'Logs');
const Notifications = page(() => import('./pages/Notifications.jsx'), 'Notifications');
const About = page(() => import('./pages/About.jsx'), 'About');
const AccountSettings = page(() => import('./pages/AccountSettings.jsx'), 'AccountSettings');
const Profile = page(() => import('./pages/Profile.jsx'), 'Profile');
const Registration = page(() => import('./pages/Registration.jsx'), 'Registration');
const EmailTemplate = page(() => import('./pages/EmailTemplate.jsx'), 'EmailTemplate');
const AppNotifications = page(() => import('./pages/AppNotifications.jsx'), 'AppNotifications');
const WebsiteSettings = page(() => import('./pages/WebsiteSettings.jsx'), 'WebsiteSettings');
const WidgetLibrary = page(() => import('./pages/WidgetLibrary.jsx'), 'WidgetLibrary');
function Workspace({ sharedSettings }) {
  const content = <ToastProvider><NotificationsProvider><Suspense fallback={<ScreenLoader />}><Outlet /></Suspense></NotificationsProvider></ToastProvider>;
  return sharedSettings ? content : <SettingsProvider>{content}</SettingsProvider>;
}
const relativeRoutes = children => Children.map(children, child => isValidElement(child) ? cloneElement(child,
  { ...(typeof child.props.path === 'string' ? { path: child.props.path.replace(/^\//, '') } : {}) },
  child.props.children ? relativeRoutes(child.props.children) : child.props.children) : child);
const navigationPaths = items => items.flatMap(item => item.children ? navigationPaths(item.children) : item.to ? [item.to] : []);
function LegacyRedirect({ to }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
}
/** Mount inside your router. Children are your application's own Route elements. */
export function CloudgateBackoffice({ client, metadata, navigation = [], children, fallback = '/profile', developerMode = true, agents = true, basePath = '', publicHome, publicRoutes }) {
  const navigate = useNavigate();
  const base = normalizeBackofficeBasePath(basePath);
  if (publicHome && !base) throw new Error('Set a back office basePath when providing a public home page.');
  if (publicRoutes && !publicHome) throw new Error('Provide a public home page when adding public website routes.');
  const nav = useMemo(() => scopeNavigation([...navigation, ...PLATFORM_NAV], base), [navigation, base]);
  const path = value => scopedBackofficePath(base, value);
  const appRoutes = relativeRoutes(children);
  const platformRoutes = <>
      <Route path="roles" element={<RoleManagement />} /><Route path="users" element={<UserManagement />} /><Route path="sample-users" element={<Navigate to={path('/users')} replace />} />
      <Route path="account/settings" element={<AccountSettings />} /><Route path="profile" element={<Profile />} /><Route path="analytics" element={<Analytics />} />
      <Route path="registration" element={<Registration />} />
      <Route path="email-template" element={<EmailTemplate />} />
      <Route path="app-notifications" element={<AppNotifications />} />
      <Route path="appearance" element={<Appearance key="appearance" />} /><Route path="theme" element={<Appearance key="theme" theme />} />
      <Route path="smtp" element={<Smtp />} /><Route path="media" element={<Media />} /><Route path={SDK_PAYMENT_ROUTES.overview.slice(1)} element={<Payments />} />
      <Route path={SDK_PAYMENT_ROUTES.history.slice(1)} element={<PaymentList />} /><Route path={SDK_PAYMENT_ROUTES.test.slice(1)} element={<TestPayment />} />
      <Route path="logs" element={<Logs />} /><Route path="notifications" element={<Notifications />} /><Route path="about" element={<About />} />
      <Route path="settings" element={<WebsiteSettings />} />
      <Route path="widgets/*" element={<WidgetLibrary />} />
  </>;
  const unscoped = value => base && (value === base || value.startsWith(`${base}/`)) ? value.slice(base.length) || '/' : value;
  const appPaths = [...collectRoutePaths(createRoutesFromChildren(appRoutes)), ...navigationPaths(navigation).map(unscoped)];
  assertNoPlatformRouteConflicts(appPaths, collectRoutePaths(createRoutesFromChildren(platformRoutes)));
  const paymentRedirects = legacyPaymentRedirects(appPaths);
  const routes = <Routes>
    <Route path={base || '/'} element={<RequireAuth />}><Route element={<RequireAdmin />}><Route element={<Workspace sharedSettings={!!publicHome} />}><Route element={<Layout developerMode={developerMode} agents={agents} />}>
      {appRoutes}
      {platformRoutes}
      {paymentRedirects.map(({ from, to }) => <Route key={from} path={from.slice(1)} element={<LegacyRedirect to={path(to)} />} />)}
      <Route path="*" element={<Navigate to={path(fallback)} replace />} />
    </Route></Route></Route></Route>
    {publicHome && <Route element={<PublicHomeGate />}>
      <Route path="/" element={publicHome} />
      {publicRoutes}
    </Route>}
    {base && [...new Set([...navigationPaths([...navigation, ...PLATFORM_NAV]), ...paymentRedirects.map(({ from }) => from), '/profile', '/account/settings', '/about', '/notifications', '/sample-users'])]
      .filter(value => value !== '/' && value !== base && !value.startsWith(`${base}/`)).map(value => <Route key={value} path={value} element={<LegacyRedirect to={path(value)} />} />)}
    <Route path="*" element={<Navigate to={publicHome ? '/' : path(fallback)} replace />} />
  </Routes>;
  return <CloudgateProvider client={client} metadata={metadata} navigation={nav} basePath={base} publicWebsite={!!publicHome}><AuthProvider publicAccess={!!publicHome} onLogoutRedirect={publicHome ? () => navigate('/', { replace: true }) : undefined}>
    {publicHome ? <SettingsProvider publicAccess>{routes}</SettingsProvider> : routes}
  </AuthProvider></CloudgateProvider>;
}
