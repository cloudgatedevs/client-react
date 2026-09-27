import { useEffect, useId, useRef, useState } from 'react';
import { NOTIFICATION_STYLES, validateNotification } from '../../platform/notification-admin.js';
import { notificationAppearance } from '../../platform/notification-appearance.js';
import { Modal, Field, Notice } from '../components/forms.jsx';
import { ErrorNote } from '../components/ui.jsx';
import { NotificationItem } from './NotificationItem.jsx';
import { RecipientPicker } from './RecipientPicker.jsx';

const empty = { title: '', body: '', style: 'info', actionUrl: '', actionLabel: '' };
export function NotificationComposer({ open, client, environment, onClose, onSent }) {
  const [draft, setDraft] = useState(empty), [audience, setAudience] = useState('user'), [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState(''), [page, setPage] = useState(0), [users, setUsers] = useState(null), [searching, setSearching] = useState(false), [searchError, setSearchError] = useState(null);
  const [lookupOpen, setLookupOpen] = useState(false), [lookupRevision, setLookupRevision] = useState(0);
  const [review, setReview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  const lock = useRef(false), mounted = useRef(true), id = useId();
  const environmentName = environment === 'prod' ? 'Production' : 'Sandbox';
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (open) setReview(false); }, [open]);
  useEffect(() => { if (!open || review || audience !== 'user') setLookupOpen(false); }, [open, review, audience]);
  useEffect(() => {
    if (!open || !lookupOpen || review || audience !== 'user' || selected) return;
    const controller = new AbortController();
    setUsers(null); setSearching(true); setSearchError(null);
    const timer = setTimeout(async () => {
      try {
        const value = await client.users.list({ filter: filter.trim(), skip: page * 10, take: 10 }, { signal: controller.signal });
        if (!Array.isArray(value?.items) || !Number.isInteger(value.totalCount) || value.totalCount < 0) throw new Error('Could not load app users.');
        if (!controller.signal.aborted) setUsers(value);
      } catch (failure) { if (!controller.signal.aborted) setSearchError(failure); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [client, open, lookupOpen, review, audience, selected, filter, page, lookupRevision]);
  const values = { ...draft, allUsers: audience === 'all', ...(audience === 'user' ? { userId: Number(selected?.id) } : {}), environment };
  const problem = validateNotification(values);
  const edit = (key, value) => { setDraft(current => ({ ...current, [key]: value })); setError(null); };
  const submit = async event => {
    event.preventDefault();
    if (lock.current) return;
    if (problem) { setError(new Error(problem)); return; }
    if (!review) { setReview(true); setError(null); return; }
    lock.current = true; setBusy(true); setError(null);
    try {
      const result = await client.notificationAdmin.send(values);
      if (mounted.current) {
        setDraft(empty); setSelected(null); setAudience('user'); setFilter(''); setPage(0); setReview(false);
        onSent(result);
      }
    } catch (failure) {
      if (mounted.current) setError(failure);
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  return <Modal open={open} title={review ? 'Review notification' : 'Create notification'} description={`Send to app users in this tenant · ${environmentName}`} onClose={busy ? undefined : onClose}
    onEscapeKeyDown={event => { if (lookupOpen) { event.preventDefault(); setLookupOpen(false); } }}>
    <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
      {review ? <div className="space-y-4">
        <Notice>{audience === 'all' ? `This sends to every current app user in this tenant in ${environmentName}.` : `Recipient: ${selected?.email || selected?.name} · ${environmentName}`}</Notice>
        <div className="rounded-lg border border-ink-700" role="group" aria-label="Notification preview">
          <NotificationItem item={{ ...draft, isRead: false }} truncate={false} />
        </div>
        {draft.actionUrl.trim() && <p className="break-all text-xs text-mist-muted">{draft.actionLabel.trim() || 'Open'} · {draft.actionUrl.trim()}</p>}
      </div> : <fieldset disabled={busy} className="min-w-0 space-y-4">
        <Field id={`${id}-audience`} label="Recipients">
          <select id={`${id}-audience`} className="input w-full" value={audience} onChange={event => { setAudience(event.target.value); setError(null); }}><option value="user">One app user</option><option value="all">All app users</option></select>
        </Field>
        {audience === 'all' ? <Notice>Every current app user in this tenant will receive this notification in {environmentName}, including users who are offline.</Notice> :
          <RecipientPicker selected={selected} onSelect={user => { setSelected(user); setError(null); }}
            expanded={lookupOpen} onExpandedChange={setLookupOpen} filter={filter} onFilterChange={value => { setFilter(value); setPage(0); }}
            page={page} onPageChange={setPage} users={users} searching={searching} error={searchError} onRetry={() => setLookupRevision(value => value + 1)} />}
        <Field id={`${id}-style`} label="Alert style"><select id={`${id}-style`} className="input w-full" value={draft.style} onChange={event => edit('style', event.target.value)}>{NOTIFICATION_STYLES.map(style => <option key={style} value={style}>{notificationAppearance(style).label}</option>)}</select></Field>
        <Field id={`${id}-title`} label="Title"><input id={`${id}-title`} className="input w-full" required maxLength={160} value={draft.title} onChange={event => edit('title', event.target.value)} placeholder="Your report is ready" /></Field>
        <Field id={`${id}-body`} label="Message" hint="Plain text, up to 4,000 characters."><textarea id={`${id}-body`} className="input w-full" required rows={3} maxLength={4000} value={draft.body} onChange={event => edit('body', event.target.value)} /></Field>
        <Field id={`${id}-url`} label="Action link (optional)" hint="Use a /path in the receiving app or an HTTP(S) URL."><input id={`${id}-url`} className="input w-full" maxLength={2048} value={draft.actionUrl} onChange={event => edit('actionUrl', event.target.value)} placeholder="/reports" /></Field>
        <Field id={`${id}-label`} label="Action label (optional)"><input id={`${id}-label`} className="input w-full" maxLength={80} value={draft.actionLabel} onChange={event => edit('actionLabel', event.target.value)} placeholder="View report" /></Field>
      </fieldset>}
      <ErrorNote error={error} />
      {error && (!error.status || error.status >= 500) && review && <Notice>Delivery may have completed. Close this dialog and refresh sent history before sending again. Your draft is kept.</Notice>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-ink-700 pt-4">
        <button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>Close</button>
        {review && <button type="button" className="btn-ghost" disabled={busy} onClick={() => setReview(false)}>Back to edit</button>}
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Sending…' : review ? `Send in ${environmentName}` : 'Review notification'}</button>
      </div>
    </form>
  </Modal>;
}
