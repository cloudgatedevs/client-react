import { usePermissions } from '../auth/permissions.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { RefreshCw, RotateCcw, Save } from 'lucide-react';
import { EMAIL_TEMPLATE_FIELDS, EMAIL_TEMPLATE_MAX_LENGTH, validateEmailTemplate } from '../../platform/email-template.js';
import { useCloudgate } from '../context.jsx';
import { Badge, ErrorNote, PageHead, Spinner } from '../components/ui.jsx';
import { Notice } from '../components/forms.jsx';
import { DEFAULT_EMAIL_TEMPLATE, emailTemplatePreview } from './emailTemplatePreview.js';

const editorValues = value => ({ ...value, templateHtml: value.templateHtml || DEFAULT_EMAIL_TEMPLATE });
export function EmailTemplate() {
  const { can } = usePermissions();
  const { client } = useCloudgate();
  const [saved, setSaved] = useState(null), [draft, setDraft] = useState({ templateEnabled: false, templateHtml: '' });
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(null), [notice, setNotice] = useState(''), [beforeRestore, setBeforeRestore] = useState(null);
  const pending = useRef(null), lock = useRef(false), editor = useRef(null), gutter = useRef(null);
  const id = useId(), previewHtml = useDeferredValue(draft.templateHtml);
  const preview = useMemo(() => emailTemplatePreview(previewHtml, client.config), [previewHtml, client.config]);
  const load = useCallback(async () => {
    pending.current?.abort();
    const request = new AbortController(); pending.current = request;
    setLoading(true); setSaved(null); setError(null); setNotice(''); setBeforeRestore(null);
    try {
      const value = await client.emailTemplate.get({ signal: request.signal });
      if (!request.signal.aborted) { setSaved(editorValues(value)); setDraft(editorValues(value)); }
    } catch (failure) { if (!request.signal.aborted) setError(failure); }
    finally { if (!request.signal.aborted) setLoading(false); }
  }, [client]);
  useEffect(() => { load(); return () => pending.current?.abort(); }, [load]);
  const change = values => { setDraft(current => ({ ...current, ...values })); setNotice(''); setBeforeRestore(null); };
  const resetEditorPosition = () => requestAnimationFrame(() => {
    if (!editor.current) return;
    editor.current.setSelectionRange(0, 0); editor.current.scrollLeft = 0; editor.current.scrollTop = 0;
    if (gutter.current) gutter.current.scrollTop = 0;
  });
  const dirty = saved && (saved.templateEnabled !== draft.templateEnabled || saved.templateHtml !== draft.templateHtml);
  const problem = validateEmailTemplate(draft);
  const save = async event => {
    event.preventDefault();
    if (lock.current || !saved || !dirty || problem) return;
    lock.current = true; setBusy(true); setError(null); setNotice('');
    const request = new AbortController(); pending.current = request;
    try {
      const value = await client.emailTemplate.update(draft, { signal: request.signal });
      if (!request.signal.aborted) {
        setSaved(editorValues(value)); setDraft(editorValues(value)); setBeforeRestore(null);
        setNotice(value.templateEnabled ? 'Custom email template saved and enabled for this tenant.' : 'Template saved. App-user emails use the standard Cloudgate layout.');
      }
    } catch (failure) {
      if (!request.signal.aborted) { setError(failure); if ([401, 403, 404].includes(failure.status)) setSaved(null); }
    } finally { lock.current = false; if (!request.signal.aborted) setBusy(false); }
  };
  const insert = field => {
    const input = editor.current, token = '${' + field + '}';
    const start = input.selectionStart, end = input.selectionEnd;
    change({ templateHtml: draft.templateHtml.slice(0, start) + token + draft.templateHtml.slice(end) });
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + token.length, start + token.length); });
  };
  return <div className="space-y-5">
    <PageHead title="Email template" subtitle="Customize the layout of emails sent to your app users.">
      <button type="button" className="btn-ghost" onClick={load} disabled={loading || busy || !!dirty}><RefreshCw size={14} /> Reload settings</button>
    </PageHead>
    <Notice>This layout applies to all apps in your Cloudgate tenant, across sandbox and production: password resets, verification, invitations and send-email messages.</Notice>
    {loading ? <Spinner /> : <>
      <ErrorNote error={error} />
      <Notice>{notice}</Notice>
      <form className="card p-4 sm:p-5" onSubmit={save}>
        <fieldset disabled={!can(P.EmailTemplateEdit) || busy || !saved} className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-semibold">
              <input type="checkbox" role="switch" className="h-4 w-4 accent-accent" checked={draft.templateEnabled} aria-describedby={`${id}-help`} onChange={event => change({ templateEnabled: event.target.checked })} /> Use custom template
            </label>
            <Badge tone={saved?.templateEnabled ? 'green' : 'gray'}>{saved ? (saved.templateEnabled ? 'Custom layout active' : 'Standard layout active') : 'Not loaded'}</Badge>
          </div>
          <p id={`${id}-help`} className="mt-1 text-sm leading-relaxed text-mist-muted">Enable to wrap every app-user email in your HTML. Include <code>{'${body}'}</code> for the message and its action link. Disable to use Cloudgate’s standard layout; your saved HTML is kept.</p>
          <div className="email-template-toolbar mt-5">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Insert merge field">
              <span className="mr-1 text-xs text-mist-dim">Insert field</span>
              {EMAIL_TEMPLATE_FIELDS.map(field => <button key={field} type="button" className="email-merge-field" aria-label={`Insert ${field} field`} onMouseDown={event => event.preventDefault()} onClick={() => insert(field)}>{'${' + field + '}'}</button>)}
            </div>
            <button type="button" className="btn-ghost shrink-0" onClick={() => { setBeforeRestore(draft.templateHtml); setDraft(current => ({ ...current, templateHtml: DEFAULT_EMAIL_TEMPLATE })); resetEditorPosition(); setNotice('Default restored in the editor. Save changes to apply it.'); }}><RotateCcw size={14} /> Restore default</button>
            {beforeRestore !== null && <button type="button" className="btn-ghost" onClick={() => { change({ templateHtml: beforeRestore }); resetEditorPosition(); }}>Undo restore</button>}
          </div>
          <div className="email-template-grid mt-4">
            <div className="min-w-0">
              <label htmlFor={`${id}-html`} className="mb-2 block text-xs font-semibold text-mist-muted">Template HTML</label>
              <div className="email-template-editor">
                <pre ref={gutter} aria-hidden="true" className="email-template-lines">{draft.templateHtml.split('\n').map((_, index) => index + 1).join('\n')}</pre>
                <textarea ref={editor} id={`${id}-html`} aria-describedby={`${id}-fields ${id}-validation`} aria-invalid={!!problem} value={draft.templateHtml} onChange={event => change({ templateHtml: event.target.value })} onScroll={event => { gutter.current.scrollTop = event.target.scrollTop; }} spellCheck={false} wrap="off" />
              </div>
              <p className="mt-2 text-xs text-mist-dim">{draft.templateHtml.length.toLocaleString()} / {EMAIL_TEMPLATE_MAX_LENGTH.toLocaleString()} characters</p>
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold text-mist-muted">Live preview <span className="font-normal">— sample password reset</span></p>
              <iframe key={preview} className="email-template-preview" title="Email preview" sandbox="" referrerPolicy="no-referrer" srcDoc={preview} />
              <p className="mt-2 text-xs text-mist-dim">Preview of your draft. No email is sent. Email clients may render it differently.</p>
            </div>
          </div>
          <p id={`${id}-fields`} className="mt-4 text-xs leading-relaxed text-mist-dim">Title and subTitle come from the message; recipient fields from the app user. Logo, tenant name and year come from Cloudgate. Unknown fields become empty. Use public image URLs. Changes require the Edit email template permission.</p>
          <p id={`${id}-validation`} className="mt-2 text-sm text-red-400" role={problem ? 'alert' : undefined}>{problem}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-700 pt-4">
            <button type="submit" className="btn-primary" disabled={!dirty || !!problem || busy}><Save size={14} />{busy ? 'Saving…' : 'Save changes'}</button>
            {dirty && <><button type="button" className="btn-ghost" onClick={() => { setDraft(saved); setBeforeRestore(null); setNotice(''); resetEditorPosition(); }}>Discard changes</button><span className="text-xs text-mist-dim">Unsaved changes</span></>}
          </div>
        </fieldset>
      </form>
    </>}
  </div>;
}
