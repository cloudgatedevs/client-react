import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from 'lucide-react';

const ToastContext = createContext(null);
/** Returns null outside a ToastProvider, so optional callers can skip toasts instead of crashing. */
export const useToast = () => useContext(ToastContext);

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: OctagonAlert };
let counter = 0;

/** Transient, non-blocking messages stacked above the bottom-right corner. Mount once, near the app root. */
export function ToastProvider({ children, max = 4 }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback(id => setToasts(current => current.filter(item => item.id !== id)), []);
  const toast = useCallback(({ id, title, description, tone = 'info', duration = 8000, action, icon } = {}) => {
    const key = id ?? `toast-${++counter}`;
    setToasts(current => [...current.filter(item => item.id !== key), { id: key, title, description, tone, duration, action, icon }].slice(-max));
    return key;
  }, [max]);
  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  return <ToastContext.Provider value={value}>
    {children}
    {typeof document !== 'undefined' && createPortal(
      <div className="cg-toaster" aria-label="Notifications">{toasts.map(item => <Toast key={item.id} {...item} onDismiss={() => dismiss(item.id)} />)}</div>,
      document.body)}
  </ToastContext.Provider>;
}

function Toast({ title, description, tone, duration, action, icon, onDismiss }) {
  const timer = useRef();
  const start = useCallback(() => { if (duration > 0) timer.current = setTimeout(onDismiss, duration); }, [duration, onDismiss]);
  const pause = () => clearTimeout(timer.current);
  useEffect(() => { start(); return pause; }, [start]);
  const Icon = icon || icons[tone] || Info;
  return <div className={`cg-toast cg-toast--${tone}`} role="status" aria-live="polite" onMouseEnter={pause} onMouseLeave={start} onFocus={pause} onBlur={start}>
    <Icon size={18} className="cg-toast-icon" aria-hidden="true" />
    <div className="cg-toast-text">
      {title && <p className="cg-toast-title">{title}</p>}
      {description && <p className="cg-toast-desc">{description}</p>}
      {action && <button type="button" className="cg-toast-action" onClick={() => { action.onClick?.(); onDismiss(); }}>{action.label}</button>}
    </div>
    <button type="button" className="cg-toast-close" aria-label="Dismiss" onClick={onDismiss}><X size={14} /></button>
  </div>;
}
