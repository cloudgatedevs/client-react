import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { notificationAppearance } from '../../platform/notification-appearance.js';

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

export function NotificationStyleBadge({ style, compact = false }) {
  const appearance = notificationAppearance(style);
  const Icon = icons[appearance.value];
  if (compact) return <span role="img" aria-label={appearance.label} title={appearance.label}
    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${appearance.badge}`}>
    <Icon size={15} aria-hidden="true" />
  </span>;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${appearance.badge}`}>
    <Icon size={12} aria-hidden="true" />{appearance.label}
  </span>;
}
