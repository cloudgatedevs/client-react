import { usePermissions } from '../auth/permissions.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { MEDIA_FOLDERS } from '../../platform/features.js';
import { useCloudgate } from '../context.jsx';
import { useRef, useState } from 'react';
import { Upload, RefreshCw, Copy, ExternalLink, Trash2, Image as ImageIcon } from 'lucide-react';

import { useSettings } from '../settings/SettingsProvider.jsx';
import { PageHead, useAsync, Spinner, ErrorNote, Pager } from '../components/ui.jsx';
import { Modal, Notice } from '../components/forms.jsx';

const PAGE_SIZE = 24;
export function Media() {
  const { can } = usePermissions();
  const { client } = useCloudgate();
  const { list: listImages, upload: uploadImage, delete: deleteImage } = client.files;
  const { settings, error: settingsError, loading: settingsLoading } = useSettings();
  const [folder, setFolder] = useState(MEDIA_FOLDERS[0]);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);
  const [notice, setNotice] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const input = useRef(null);
  const lock = useRef(false);
  const files = useAsync(async () => {
    const value = await listImages({ path: folder, skip: page * PAGE_SIZE, take: PAGE_SIZE });
    if (!Array.isArray(value?.items)) throw new Error('The media server returned an unexpected file list.');
    const total = Number(value.total ?? value.totalCount ?? 0);
    if (page > 0 && value.items.length === 0) setPage(Math.max(0, Math.ceil(total / PAGE_SIZE) - 1));
    return { ...value, total };
  }, [folder, page]);
  const used = (file) =>
    [settings.app_logo_url, settings.app_icon_url]
      .filter(Boolean)
      .some((url) => url === file.url || url === file.thumbUrl);
  const upload = async (selected) => {
    if (!selected.length || lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    setNotice('');
    let count = 0;
    try {
      for (const file of selected) {
        await uploadImage(file, folder);
        count++;
        setNotice(`Uploaded ${count} of ${selected.length} images.`);
      }
    } catch (err) {
      setFailure(err);
    } finally {
      lock.current = false;
      setBusy(false);
      files.reload();
    }
  };
  const remove = async () => {
    if (!pendingDelete || lock.current || used(pendingDelete) || settingsError || settingsLoading) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await deleteImage(pendingDelete.id ?? pendingDelete.fileId);
      setPendingDelete(null);
      setNotice('Image deleted.');
      files.reload();
    } catch (err) {
      setFailure(err);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Public image URL copied.');
    } catch {
      setFailure(new Error('Unable to copy. Open the image and copy its URL from the address bar.'));
    }
  };
  const total = files.data?.total || 0;
  return (
    <div className="space-y-5">
      <PageHead title="Media server" subtitle="Upload and manage the images stored for this application.">
        <button className="btn-ghost" onClick={files.reload} disabled={busy || files.loading}>
          <RefreshCw size={16} />
          Refresh
        </button>
        <button className="btn-primary" onClick={() => input.current?.click()} disabled={!can(P.MediaUpload) || busy}>
          <Upload size={16} />
          {busy ? 'Working…' : 'Upload images'}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          aria-label="Upload images"
          disabled={!can(P.MediaUpload) || busy}
          onChange={(e) => {
            upload(Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />
      </PageHead>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="media-folder" className="label">
          Folder
        </label>
        <select
          id="media-folder"
          className="input"
          value={folder}
          disabled={busy}
          onChange={(e) => {
            setFolder(e.target.value);
            setPage(0);
          }}
        >
          <option value={MEDIA_FOLDERS[0]}>Media</option>
          <option value={MEDIA_FOLDERS[1]}>Branding</option>
        </select>
        <span className="text-xs text-mist-dim">Images up to 10 MB · Public image URLs</span>
      </div>
      <ErrorNote error={files.error || (!pendingDelete ? failure : null)} />
      <Notice>{notice}</Notice>
      {settingsError && (
        <Notice error>
          Branding settings could not be loaded. Deletion is disabled until the images in use can be checked.
        </Notice>
      )}
      {files.loading ? (
        <Spinner />
      ) : files.data?.items.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {files.data.items.map((file) => (
            <article className="card overflow-hidden" key={file.id ?? file.fileId}>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="media-checker grid aspect-[4/3] place-items-center overflow-hidden"
              >
                <img
                  src={file.thumbUrl || file.url}
                  alt={file.name || 'Uploaded image'}
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </a>
              <div className="space-y-3 p-4">
                <div>
                  <p className="truncate text-sm font-medium" title={file.name}>
                    {file.name || 'Image'}
                  </p>
                  <p className="mt-1 text-xs text-mist-dim">
                    {used(file)
                      ? 'Used in application branding'
                      : file.size
                        ? `${Math.ceil(file.size / 1024)} KB`
                        : 'Stored image'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-ghost btn-sm" onClick={() => copy(file.url)}>
                    <Copy size={14} />
                    Copy URL
                  </button>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost btn-sm"
                    aria-label={`Open ${file.name}`}
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    className="btn-danger btn-sm ml-auto"
                    disabled={!can(P.MediaDelete) || busy || used(file) || settingsLoading || !!settingsError}
                    title={
                      used(file) ? 'Remove this image from Appearance before deleting it.' : 'Delete image'
                    }
                    aria-label={`Delete ${file.name}`}
                    onClick={() => {
                      setFailure(null);
                      setPendingDelete(file);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        !files.error && (
          <div className="card flex flex-col items-center gap-3 p-12 text-center">
            <ImageIcon className="text-mist-dim" size={36} />
            <h2 className="font-semibold">No images in this folder</h2>
            <p className="text-sm text-mist-muted">Upload your first image to get started.</p>
          </div>
        )
      )}
      {!files.loading && (
        <Pager
          page={page}
          pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          from={total ? page * PAGE_SIZE + 1 : 0}
          to={Math.min(total, (page + 1) * PAGE_SIZE)}
          noun="images"
          onPage={setPage}
        />
      )}
      <Modal
        open={!!pendingDelete}
        title="Delete image?"
        onClose={
          busy
            ? undefined
            : () => {
                setPendingDelete(null);
                setFailure(null);
              }
        }
      >
        <p className="break-all text-sm">{pendingDelete?.name}</p>
        <p className="text-sm text-mist-muted">
          This permanently removes the file from the media server. Any other pages using its public URL will
          lose the image.
        </p>
        <ErrorNote error={failure} />
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" disabled={busy} onClick={() => setPendingDelete(null)}>
            Cancel
          </button>
          <button className="btn-danger" disabled={!can(P.MediaDelete) || busy} onClick={remove}>
            {busy ? 'Deleting…' : 'Delete image'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
