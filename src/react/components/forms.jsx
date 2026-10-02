import * as Dialog from '@radix-ui/react-dialog';
import { useLayoutEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { DialogLayerContext, useDialogLayer } from './useDialogLayer.js';

export const Field = ({ label, id, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="label" htmlFor={id}>
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-mist-dim">{hint}</p>}
  </div>
);
export const Notice = ({ children, error = false }) =>
  children ? (
    <div
      role={error ? 'alert' : 'status'}
      className={`feedback-note flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${error ? 'border-red-500/20 bg-red-500/5 text-red-600' : 'border-accent/15 bg-accent/5 text-mist-muted'}`}
    >
      <Info size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  ) : null;
// The heading and the footer stay in place; only the body scrolls. Pass the action buttons as footer, or leave
// them as the last row of the content (or of its form), which then sticks to the bottom of the body.
export function Modal({ open, title, description, onClose, onAfterClose, returnFocusRef, onEscapeKeyDown, footer, children }) {
  const { token, layer, release } = useDialogLayer(open);
  // Callers clear their form model on close. Retain the last committed content
  // just long enough for Radix's exit animation, then release it.
  const [lastContent, setLastContent] = useState(null);
  const returnFocus = useRef(null);
  useLayoutEffect(() => {
    if (open) setLastContent({ title, description, footer, children });
  }, [open, title, description, footer, children]);
  const content = open ? { title, description, footer, children } : lastContent;
  return (
    <DialogLayerContext.Provider value={token}>
    <Dialog.Root
      open={!!open}
      onOpenChange={(value) => {
        if (!value) onClose?.();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop fixed inset-0" style={{ zIndex: layer }} />
        <Dialog.Content
          className="modal-panel card fixed left-1/2 top-1/2 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden outline-none"
          style={{ zIndex: layer + 1 }}
          onOpenAutoFocus={() => { returnFocus.current = document.activeElement; }}
          onCloseAutoFocus={(event) => {
            release();
            event.preventDefault();
            setLastContent(null);
            const target = returnFocusRef?.current || returnFocus.current;
            if (target?.isConnected) target.focus();
            onAfterClose?.();
          }}
          onEscapeKeyDown={(e) => {
            onEscapeKeyDown?.(e);
            if (!onClose) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (!onClose) e.preventDefault();
          }}
        >
          <div className="modal-heading flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold tracking-tight">{content?.title}</Dialog.Title>
              <Dialog.Description className={content?.description ? 'mt-1 text-sm text-mist-muted' : 'sr-only'}>
                {content?.description || content?.title}
              </Dialog.Description>
            </div>
            <Dialog.Close disabled={!onClose} className="btn-ghost p-2" aria-label="Close dialog">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="modal-body">{content?.children}</div>
          {content?.footer && <footer className="modal-foot">{content.footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    </DialogLayerContext.Provider>
  );
}
