import { Check } from 'lucide-react';

export function NotificationReadStatus({ isRead }) {
  return <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] leading-[14px] ${isRead ? 'font-normal text-mist-dim' : 'font-semibold text-accent'}`}>
    {isRead ? <Check size={12} aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
    {isRead ? 'Read' : 'New'}
  </span>;
}
