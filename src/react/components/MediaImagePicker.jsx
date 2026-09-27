import { useEffect, useState } from 'react';
import { Check, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { MEDIA_FOLDERS } from '../../platform/features.js';
import { useCloudgate } from '../context.jsx';
import { Modal } from './forms.jsx';
import { ErrorNote, Pager, Spinner } from './ui.jsx';

const PAGE_SIZE = 24;

function Thumbnail({ file }) {
  const [failed, setFailed] = useState(false);
  return <span className="media-picker-thumbnail media-checker">
    {failed ? <ImageIcon size={26} aria-hidden="true" /> : <img src={file.thumbUrl || file.url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
  </span>;
}

export function MediaImagePicker({ open, label, value, onClose, onSelect }) {
  const { client } = useCloudgate();
  const [folder, setFolder] = useState(MEDIA_FOLDERS[1]);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(null);
  const [files, setFiles] = useState({ loading: true, items: [], total: 0, error: null });

  useEffect(() => {
    setSelected(null);
    if (!open) return;
    const controller = new AbortController();
    let active = true;
    setFiles({ loading: true, items: [], total: 0, error: null });
    client.files.list({ path: folder, skip: page * PAGE_SIZE, take: PAGE_SIZE, signal: controller.signal })
      .then(result => {
        if (!active) return;
        if (!Array.isArray(result?.items)) throw new Error('The media server returned an unexpected image list.');
        const count = Number(result.total ?? result.totalCount ?? result.items.length);
        const total = Number.isFinite(count) ? Math.max(0, count) : result.items.length;
        if (page > 0 && result.items.length === 0 && page * PAGE_SIZE >= total) {
          setPage(Math.max(0, Math.ceil(total / PAGE_SIZE) - 1));
          return;
        }
        setFiles({ loading: false, items: result.items, total, error: null });
      })
      .catch(error => { if (active) setFiles({ loading: false, items: [], total: 0, error }); });
    return () => { active = false; controller.abort(); };
  }, [client, open, folder, page, revision]);

  const changePage = next => { setSelected(null); setPage(next); };
  const canUse = selected && !files.loading && !files.error && files.items.some(file => file.url === selected.url);
  return <Modal open={open} title={`Choose ${label?.toLowerCase() || 'image'}`} description="Select an existing image from this app’s media library." onClose={onClose}>
    <div className="media-picker-toolbar">
      <label htmlFor="branding-image-folder" className="label">Folder</label>
      <select id="branding-image-folder" className="input" value={folder} onChange={event => { setSelected(null); setFolder(event.target.value); setPage(0); }}>
        <option value={MEDIA_FOLDERS[1]}>Branding</option>
        <option value={MEDIA_FOLDERS[0]}>Media</option>
      </select>
      <button type="button" className="btn-ghost" aria-label="Refresh images" disabled={files.loading} onClick={() => setRevision(count => count + 1)}>
        <RefreshCw size={15} aria-hidden="true" />
      </button>
    </div>
    <div className="media-picker-content" aria-busy={files.loading}>
      {files.loading ? <Spinner /> : files.error ? <div className="space-y-3">
        <ErrorNote error={files.error} />
        <button type="button" className="btn-ghost" onClick={() => setRevision(count => count + 1)}>Try again</button>
      </div> : files.items.length ? <div className="media-picker-grid" role="group" aria-label="Available images">
        {files.items.map(file => <button key={file.id ?? file.fileId ?? file.url} type="button" className="media-picker-tile"
          aria-label={`Select ${file.name || 'image'}`} aria-pressed={selected?.url === file.url}
          disabled={!/^https?:\/\//i.test(file.url || '')} onClick={() => setSelected(file)}>
          <Thumbnail file={file} />
          {selected?.url === file.url && <span className="media-picker-check"><Check size={13} aria-hidden="true" /></span>}
          <span className="media-picker-name" title={file.name}>{file.name || 'Image'}</span>
          {file.url === value && <span className="media-picker-current">Current image</span>}
        </button>)}
      </div> : <div className="media-picker-empty" role="status">
        <ImageIcon size={30} aria-hidden="true" />
        <strong>No images in this folder</strong>
        <p>Try the other folder, or close this window and upload an image.</p>
      </div>}
    </div>
    {!files.loading && !files.error && files.total > 0 && <div className="media-picker-pagination">
      <Pager page={page} pages={Math.max(1, Math.ceil(files.total / PAGE_SIZE))} total={files.total}
        from={page * PAGE_SIZE + 1} to={Math.min(files.total, (page + 1) * PAGE_SIZE)} noun="images" onPage={changePage} />
    </div>}
    <div className="media-picker-footer">
      <p title={selected?.name}>{selected?.name || 'Choose an image to continue.'}</p>
      <div>
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" disabled={!canUse} onClick={() => { if (canUse) onSelect(selected); }}>Use image</button>
      </div>
    </div>
  </Modal>;
}
