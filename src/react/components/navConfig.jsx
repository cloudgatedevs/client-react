import { Users, ChartNoAxesCombined, Palette, PanelTop, Mail, Images, Activity, Wallet, Bell, MessagesSquare, Settings2 } from 'lucide-react';
import { navigationTrail } from './navigation.js';
import { WIDGET_NAV } from './widgetNavigation.js';
import { SDK_PAYMENT_ROUTES } from '../routing.js';

export const PLATFORM_NAV = [WIDGET_NAV, {
  id: 'cloudgate-administration', label: 'Administration', icon: Settings2, section: 'platform',
  children: [
    { to: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
    { to: '/logs', label: 'Logs', icon: Activity },
    { id: 'payments', label: 'Payments', icon: Wallet, keywords: ['billing', 'wallet'], children: [
      { to: SDK_PAYMENT_ROUTES.overview, label: 'Overview', icon: Wallet, end: true },
      { to: SDK_PAYMENT_ROUTES.history, label: 'All payments', icon: Wallet, keywords: ['transactions', 'history'] },
      { to: SDK_PAYMENT_ROUTES.test, label: 'Test payment', icon: Wallet, keywords: ['sandbox', 'checkout'] },
    ] },
    { id: 'people', label: 'People & access', icon: Users, children: [
      { to: '/users', label: 'Users', icon: Users },
      { to: '/roles', label: 'Roles', icon: Users, keywords: ['permissions', 'access'] },
      { to: '/registration', label: 'Settings', icon: Settings2, keywords: ['registration', 'sign up', 'signup', 'self-registration', 'allow', 'email verification', 'reminder'] },
    ] },
    { id: 'messaging', label: 'Messaging', icon: MessagesSquare, children: [
      { to: '/app-notifications', label: 'App notifications', icon: Bell, keywords: ['send', 'create', 'broadcast', 'recipients', 'read receipts'] },
      { to: '/smtp', label: 'SMTP settings', icon: Mail, keywords: ['email', 'delivery'] },
      { to: '/email-template', label: 'Email template', icon: Mail, keywords: ['email', 'html', 'layout', 'reset', 'verification', 'invitation'] },
    ] },
    { to: '/media', label: 'Media server', icon: Images, keywords: ['files', 'images', 'uploads'] },
    { to: '/appearance', label: 'Branding', icon: PanelTop },
    { to: '/theme', label: 'Theme', icon: Palette },
    { to: '/settings', label: 'Settings', icon: Settings2, keywords: ['website', 'public', 'home'] },
  ],
}];
export const routeTitle = (path, navigation = PLATFORM_NAV) =>
  path === '/account/settings' ? 'Account settings' : path === '/profile' ? 'My account' : path === '/about' ? 'About us'
    : path === '/notifications' ? 'Notifications'
    : navigationTrail(path, navigation).at(-1)?.label || 'Back office';
export const backTargetFor = (path) => (path === '/profile' ? '/' : null);
