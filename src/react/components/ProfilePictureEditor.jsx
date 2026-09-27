import { lazy, Suspense, useEffect, useState } from 'react';
import { Modal } from './forms.jsx';
import { Spinner } from './ui.jsx';

const Editor = lazy(() => import('./ProfilePictureDialog.jsx').then(module => ({ default: module.ProfilePictureDialog })));

export function ProfilePictureEditor({ open, onClose, returnFocusRef }) {
  const [visited, setVisited] = useState(open);
  useEffect(() => { if (open) setVisited(true); }, [open]);
  // Keep the modal controller mounted so Radix can finish its exit animation.
  // Its portal (including the camera/picker) still unmounts once closed.
  return open || visited ? <Suspense fallback={<Modal open={open} title="Change profile picture" onClose={onClose} returnFocusRef={returnFocusRef}><Spinner /></Modal>}>
    <Editor open={open} onClose={onClose} returnFocusRef={returnFocusRef} />
  </Suspense> : null;
}
