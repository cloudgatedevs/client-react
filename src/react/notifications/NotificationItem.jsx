import { fmtDate } from '../components/ui.jsx';
import { NotificationStyleBadge } from './NotificationStyleBadge.jsx';
import { NotificationReadStatus } from './NotificationReadStatus.jsx';

export function NotificationItem({ item, truncate = true }) {
  return <div className="flex items-start gap-2.5 px-3.5 py-2.5">
    <NotificationStyleBadge style={item.style} compact />
    <div className="min-w-0 flex-1">
      <p className={`break-words text-[13px] leading-[18px] ${truncate ? 'line-clamp-2' : ''} ${item.isRead ? 'font-medium' : 'font-semibold'}`}>{item.title}</p>
      <p className={`mt-0.5 whitespace-pre-wrap break-words text-xs leading-[18px] text-mist-muted ${truncate ? 'line-clamp-2' : ''}`}>{item.body}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        {item.creationTime
          ? <time className="min-w-0 text-[10px] leading-[14px] text-mist-dim" dateTime={item.creationTime}>{fmtDate(item.creationTime)}</time>
          : <span className="text-[10px] leading-[14px] text-mist-dim">Just now</span>}
        <NotificationReadStatus isRead={item.isRead} />
      </div>
    </div>
  </div>;
}
