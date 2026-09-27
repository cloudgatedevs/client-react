import { useCallback, useEffect, useRef, useState } from 'react';
import Uppy from '@uppy/core';
import Dashboard from '@uppy/react/lib/Dashboard.js';
import Webcam from '@uppy/webcam';
import Cropper from 'react-easy-crop';
import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';
import '@uppy/webcam/dist/style.css';
import 'react-easy-crop/react-easy-crop.css';
import { useAuthContext } from '../auth/index.js';
import { Modal } from './forms.jsx';
import { ErrorNote, Spinner } from './ui.jsx';
import { PROFILE_PICTURE_MAX_BYTES, PROFILE_PICTURE_TYPES } from '../../platform/profile.js';
import { getCroppedJpegBlob } from './profilePictureCrop.js';

function PicturePicker({ onSelect, onError }) {
  const [uppy, setUppy] = useState(null);
  const callbacks = useRef({ onSelect, onError });
  callbacks.current = { onSelect, onError };
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const instance = new Uppy({
      autoProceed: false,
      restrictions: { maxNumberOfFiles: 1, maxFileSize: PROFILE_PICTURE_MAX_BYTES, allowedFileTypes: PROFILE_PICTURE_TYPES },
    }).use(Webcam, { modes: ['picture'] });
    instance.on('file-added', file => callbacks.current.onSelect(file.data));
    instance.on('restriction-failed', (_file, error) => callbacks.current.onError(error));
    setUppy(instance);
    return () => { observer.disconnect(); instance.destroy(); };
  }, []);
  return uppy ? <div className="profile-picture-picker"><Dashboard uppy={uppy} height={280} width="100%" theme={dark ? 'dark' : 'light'}
    hideUploadButton proudlyDisplayPoweredByUppy note="PNG, JPEG, WebP or GIF · Up to 5 MB" /></div> : <Spinner />;
}

export function ProfilePictureDialog({ open, onClose, returnFocusRef }) {
  const { currentUser, updateProfilePicture } = useAuthContext();
  const [selected, setSelected] = useState(null), [crop, setCrop] = useState({ x: 0, y: 0 }), [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null), [error, setError] = useState(null), [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const submitting = useRef(false), mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (selected) URL.revokeObjectURL(selected); }, [selected]);
  const choose = useCallback(file => {
    setError(null); setCrop({ x: 0, y: 0 }); setZoom(1); setArea(null);
    setSelected(URL.createObjectURL(file));
  }, []);
  const cropComplete = useCallback((_percent, pixels) => setArea(pixels), []);
  const imageError = () => { setError(new Error('This image could not be opened. Choose another photo.')); setSelected(null); };
  const save = async remove => {
    if (submitting.current || (!remove && (!selected || !area))) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      const file = remove ? null : await getCroppedJpegBlob(selected, area);
      if (!mounted.current) return;
      await updateProfilePicture(file);
      if (mounted.current) onClose();
    } catch (failure) { if (mounted.current) setError(failure); }
    finally { submitting.current = false; if (mounted.current) setBusy(false); }
  };
  return <Modal open={open} title={confirmRemove ? 'Remove profile picture?' : selected ? 'Adjust profile photo' : 'Change profile picture'}
    description={confirmRemove ? 'Your initials will appear until you add another photo.' : selected ? 'Drag to reposition your photo, then zoom to fit the circle.' : 'Choose a photo or take one with your camera, then crop it before saving.'}
    onClose={busy ? undefined : onClose} returnFocusRef={returnFocusRef}
    onAfterClose={() => { setSelected(null); setCrop({ x: 0, y: 0 }); setZoom(1); setArea(null); setError(null); setConfirmRemove(false); }}>
    <ErrorNote error={error} />
    {confirmRemove ? <div className="flex justify-end gap-2">
      <button className="btn-ghost" disabled={busy} onClick={() => { setConfirmRemove(false); setError(null); }}>Cancel</button>
      <button className="btn-primary" disabled={busy} onClick={() => save(true)}>{busy ? 'Removing…' : 'Remove photo'}</button>
    </div> : <>
      {selected ? <>
        <div className={`profile-picture-crop${busy ? ' profile-picture-crop-busy' : ''}`}>
          <Cropper image={selected} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
            onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={cropComplete}
            mediaProps={{ onError: imageError, alt: 'Photo to crop' }}
            keyboardStep={10} />
        </div>
        <div className="space-y-2"><label className="flex justify-between text-sm" htmlFor="profile-photo-zoom"><span>Zoom</span><span>{Math.round(zoom * 100)}%</span></label>
          <input id="profile-photo-zoom" aria-label="Zoom" className="profile-picture-zoom" type="range" min="1" max="3" step="0.05" value={zoom} disabled={busy} onChange={event => setZoom(Number(event.target.value))} />
        </div>
      </> : <PicturePicker onSelect={choose} onError={setError} />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {selected ? <button className="btn-ghost" disabled={busy} onClick={() => { setSelected(null); setError(null); setArea(null); }}>Choose another photo</button>
          : currentUser?.user?.photoUrl ? <button className="btn-ghost" onClick={() => { setConfirmRemove(true); setError(null); }}>Remove photo</button> : <span />}
        <div className="flex gap-2"><button className="btn-ghost" disabled={busy} onClick={onClose}>Cancel</button>
          {selected && <button className="btn-primary" disabled={busy || !area} aria-busy={busy} onClick={() => save(false)}>{busy ? 'Saving…' : 'Save photo'}</button>}
        </div>
      </div>
    </>}
  </Modal>;
}
