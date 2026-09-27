const appearances = {
  // Keep the alert accent when the shared .card polish applies its border color.
  info: { value: 'info', label: 'Info', badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300', panel: '!border-l-sky-500 bg-sky-500/5' },
  success: { value: 'success', label: 'Success', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', panel: '!border-l-emerald-500 bg-emerald-500/5' },
  warning: { value: 'warning', label: 'Warning', badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300', panel: '!border-l-amber-500 bg-amber-500/5' },
  danger: { value: 'danger', label: 'Danger', badge: 'bg-red-500/10 text-red-700 dark:text-red-300', panel: '!border-l-red-500 bg-red-500/5' },
};

export function notificationAppearance(style) {
  const key = typeof style === 'string' ? style.trim().toLowerCase() : '';
  return Object.hasOwn(appearances, key) ? appearances[key] : appearances.info;
}
