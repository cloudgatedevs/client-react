import { usePermissions } from '../auth/permissions.jsx';
import { BACKOFFICE_PERMISSIONS as P } from '../../platform/backoffice-permissions.js';
import { MEDIA_FOLDERS } from '../../platform/features.js';
import { useCloudgate } from '../context.jsx';
import { useEffect, useRef, useState } from 'react';
import { Save, RotateCcw, Upload, Images } from 'lucide-react';
import { useSettings } from '../settings/SettingsProvider.jsx';
import {
  PALETTE_COLOR_KEYS,
  paletteVariables,
  LAYOUT_PRESETS,
  normalizeDensity,
  isHex,
  validateSettings,
} from '../../platform/appearance-model.js';

import { PageHead, ErrorNote, Spinner } from '../components/ui.jsx';
import { Field, Notice } from '../components/forms.jsx';
import { PalettePicker } from '../settings/PalettePicker.jsx';
import { MediaImagePicker } from '../components/MediaImagePicker.jsx';

const appearanceKeys = [
  'app_name',
  'app_tagline',
  'app_description',
  'app_logo_url',
  'app_icon_url',
  'app_url',
  'support_email',
  'footer_note',
];
const themeKeys = [
  'theme_mode',
  'theme_density',
  ...PALETTE_COLOR_KEYS,
  'theme_custom_palette',
];
export function Appearance({ theme = false }) {
  const { can } = usePermissions();
  const canEdit = can(theme ? P.ThemeEdit : P.BrandingEdit);
  const { client } = useCloudgate();
  const uploadImage = client.files.upload;
  const { settings, loading, error, save, reload } = useSettings();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);
  const [notice, setNotice] = useState('');
  const [imagePicker, setImagePicker] = useState(null);
  const lock = useRef(false);
  useEffect(() => {
    setForm(settings);
  }, [settings]);
  const keys = theme ? themeKeys : appearanceKeys;
  const dirty = keys.some((key) => form[key] !== settings[key]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const set = (key, value) => {
    setNotice('');
    setForm((old) => ({ ...old, [key]: value }));
  };
  const upload = async (key, file) => {
    if (!canEdit || !can(P.MediaUpload) || !file || lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const result = await uploadImage(file, MEDIA_FOLDERS[1]);
      if (!result?.url)
        throw new Error('The image service did not return an image URL.');
      set(key, result.url);
    } catch (err) {
      setFailure(err);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    const problem = validateSettings(form);
    if (problem) {
      setFailure(new Error(problem));
      return;
    }
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await save(
        Object.fromEntries(keys.map((key) => [key, form[key].trim()])),
      );
      setNotice(theme ? 'Theme saved.' : 'Appearance saved.');
    } catch (err) {
      setFailure(err);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  if (loading) return <Spinner />;
  return (
    <div className="space-y-6">
      <PageHead
        title={theme ? 'Theme' : 'Appearance'}
        subtitle={
          theme
            ? 'Set the colours, display mode and layout for this back office.'
            : 'Make the application your own with a name, logo and contact details.'
        }
      />
      <ErrorNote error={error || failure} />
      {error && (
        <button className="btn-ghost" onClick={reload}>
          Retry loading settings
        </button>
      )}
      <Notice>{notice}</Notice>
      <form onSubmit={submit} className="appearance-form">
        <fieldset
          disabled={!canEdit || busy || !!error}
          className="card min-w-0 space-y-5 p-5 sm:p-6"
        >
          {theme ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Display mode" id="theme-mode">
                  <select
                    id="theme-mode"
                    className="input"
                    value={form.theme_mode}
                    onChange={(e) => set('theme_mode', e.target.value)}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">Use system setting</option>
                  </select>
                </Field>
              </div>
              <fieldset className="layout-choices">
                <legend className="label">Layout &amp; spacing</legend>
                <div className="layout-choices-grid">
                  {LAYOUT_PRESETS.map((preset) => (
                    <label key={preset.value} className="layout-choice">
                      <span
                        className="layout-mini"
                        data-layout={preset.value}
                        aria-hidden="true"
                      >
                        <i />
                        <span>
                          <b>
                            {Array.from(
                              { length: preset.value === 'compact' ? 5 : 3 },
                              (_, index) => (
                                <em key={index} />
                              ),
                            )}
                          </b>
                        </span>
                      </span>
                      <span className="layout-choice-heading">
                        <strong>{preset.label}</strong>
                        <input
                          type="radio"
                          name="theme-density"
                          value={preset.value}
                          aria-label={preset.label}
                          aria-describedby={`layout-${preset.value}-description`}
                          checked={
                            normalizeDensity(form.theme_density) ===
                            preset.value
                          }
                          onChange={() => set('theme_density', preset.value)}
                        />
                      </span>
                      <p id={`layout-${preset.value}-description`}>
                        {preset.description}
                      </p>
                    </label>
                  ))}
                </div>
                <p className="layout-preview-note mt-3">
                  Changes are shown in the preview. Save to apply the layout
                  across the back office.
                </p>
              </fieldset>
              <PalettePicker key={JSON.stringify(settings)} value={form} onChange={patch => { setNotice(''); setForm(old => ({...old, ...patch})); }} />
            </>
          ) : (
            <>
              <Field label="Application name" id="app_name">
                <input
                  className="input"
                  id="app_name"
                  required
                  maxLength={120}
                  value={form.app_name}
                  onChange={(e) => set('app_name', e.target.value)}
                />
              </Field>
              <Field label="Tagline" id="app_tagline">
                <input
                  className="input"
                  id="app_tagline"
                  maxLength={120}
                  value={form.app_tagline}
                  onChange={(e) => set('app_tagline', e.target.value)}
                />
              </Field>
              <Field label="Description" id="app_description">
                <textarea
                  className="input min-h-24"
                  id="app_description"
                  maxLength={500}
                  value={form.app_description}
                  onChange={(e) => set('app_description', e.target.value)}
                />
              </Field>
              {[
                ['Logo', 'app_logo_url'],
                ['Browser icon', 'app_icon_url'],
              ].map(([label, key]) => (
                <Field
                  label={label}
                  id={key}
                  key={key}
                  hint="Choose an existing image, upload one up to 10 MB, or paste its public URL."
                >
                  <div className="flex items-center gap-3">
                    {form[key] && /^https?:\/\//i.test(form[key]) && (
                      <img
                        src={form[key]}
                        alt={`${label} preview`}
                        className="h-12 w-12 rounded-lg border border-ink-700 object-contain"
                      />
                    )}
                    <input
                      id={key}
                      type="url"
                      className="input min-w-0 flex-1"
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={!can(P.MediaView)}
                      aria-label={`Choose existing ${label.toLowerCase()}`}
                      onClick={() => setImagePicker({ key, label })}
                    >
                      <Images size={15} aria-hidden="true" />
                      Choose existing
                    </button>
                    <label className="btn-ghost w-fit cursor-pointer">
                      <Upload size={15} />
                      Upload
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        aria-label={`Upload ${label.toLowerCase()}`}
                        disabled={!can(P.MediaUpload)}
                        onChange={(e) => {
                          upload(key, e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {form[key] && (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => set(key, '')}
                      >
                        Remove {label.toLowerCase()}
                      </button>
                    )}
                  </div>
                </Field>
              ))}
              <Field label="Application URL" id="app_url">
                <input
                  className="input"
                  id="app_url"
                  type="url"
                  value={form.app_url}
                  onChange={(e) => set('app_url', e.target.value)}
                  placeholder="https://your-app.example.com"
                />
              </Field>
              <Field label="Support email" id="support_email">
                <input
                  className="input"
                  id="support_email"
                  type="email"
                  value={form.support_email}
                  onChange={(e) => set('support_email', e.target.value)}
                />
              </Field>
              <Field label="Footer note" id="footer_note">
                <input
                  className="input"
                  id="footer_note"
                  maxLength={300}
                  value={form.footer_note}
                  onChange={(e) => set('footer_note', e.target.value)}
                />
              </Field>
            </>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-ink-700 pt-5">
            <button className="btn-primary" disabled={!dirty || busy}>
              <Save size={16} />
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            <button
              className="btn-ghost"
              type="button"
              disabled={!dirty || busy}
              onClick={() => {
                setForm(settings);
                setFailure(null);
              }}
            >
              <RotateCcw size={15} />
              Reset changes
            </button>
            {dirty && (
              <span className="text-xs text-mist-dim">Unsaved changes</span>
            )}
          </div>
        </fieldset>
        <aside className="appearance-preview space-y-3">
          <p className="label">Preview</p>
          <ThemePreview settings={form} />
          <p className="text-xs leading-relaxed text-mist-dim">
            Saved settings apply to everyone using this installation.
          </p>
        </aside>
      </form>
      <MediaImagePicker
        open={!!imagePicker}
        label={imagePicker?.label}
        value={imagePicker ? form[imagePicker.key] : ''}
        onClose={() => setImagePicker(null)}
        onSelect={(file) => {
          set(imagePicker.key, file.url);
          setFailure(null);
          setImagePicker(null);
        }}
      />
    </div>
  );
}
function ThemePreview({ settings }) {
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const dark =
    settings.theme_mode === 'dark' ||
    (settings.theme_mode === 'system' && systemDark);
  const density = normalizeDensity(settings.theme_density);
  const preset = LAYOUT_PRESETS.find((item) => item.value === density);
  const variables = paletteVariables(settings, dark);
  const primary = isHex(settings.theme_primary)
    ? settings.theme_primary
    : '#4f46e5';
  return (
    <>
      <div
        className="theme-preview overflow-hidden rounded-[18px] border border-ink-700 shadow-panel"
        data-density={density}
        style={{
          ...variables,
          colorScheme: dark ? 'dark' : 'light',
          background: 'rgb(var(--ink-850))',
          color: 'rgb(var(--mist))',
          '--preview-line': 'rgb(var(--ink-700))',
        }}
      >
        <div className="flex items-center gap-3 border-b border-[var(--preview-line)] p-5">
          {settings.app_logo_url &&
          /^https?:\/\//.test(settings.app_logo_url) ? (
            <img
              src={settings.app_logo_url}
              alt=""
              className="h-9 w-9 rounded object-contain"
            />
          ) : (
            <span
              className="grid h-9 w-9 place-items-center rounded-lg font-bold"
              style={{
                background: primary,
                color: `rgb(${variables['--accent-fg']})`,
              }}
            >
              {(settings.app_name || 'A')[0]}
            </span>
          )}
          <div>
            <strong className="block">
              {settings.app_name || 'Application'}
            </strong>
            <small className="opacity-60">
              {settings.app_tagline || 'Back office'}
            </small>
          </div>
        </div>
        <div className="theme-preview-body">
          <div className="theme-preview-content">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-50">
              Dashboard
            </p>
            <div className="theme-preview-metrics">
              {['Users', 'Activity'].map((label) => (
                <div key={label}>
                  <small className="opacity-60">{label}</small>
                  <p className="mt-1 text-xl font-semibold">128</p>
                </div>
              ))}
            </div>
            <div className="theme-preview-rows">
              {['Website refresh', 'Customer portal', 'Monthly report'].map(
                (name) => (
                  <div key={name} className="theme-preview-row">
                    <span>{name}</span>
                    <span style={{color: 'rgb(var(--cgw-success))', opacity: 1}}>Ready</span>
                  </div>
                ),
              )}
            </div>
            <span
              className="theme-preview-action"
              style={{
                background: primary,
                color: `rgb(${variables['--accent-fg']})`,
              }}
            >
              Primary action
            </span>
            <div
              className="h-1.5 rounded-full"
              style={{
                background: isHex(settings.theme_secondary)
                  ? settings.theme_secondary
                  : '#7c3aed',
              }}
            />
            <div className="palette-preview-statuses">{[['success','Healthy'],['warning','Pending'],['danger','Error'],['info','Info']].map(([tone,label]) => <span key={tone} style={{color: 'rgb(var(--cgw-' + tone + '))', background: 'rgb(var(--cgw-' + tone + ') / .08)'}}>{label}</span>)}</div>
            <p className="text-xs opacity-60">
              {settings.footer_note || 'Your workspace, your brand.'}
            </p>
          </div>
        </div>
      </div>
      <p className="layout-preview-note">
        <strong>{preset.label}</strong> · {preset.detail}
      </p>
    </>
  );
}
