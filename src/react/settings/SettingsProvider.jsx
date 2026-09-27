import { useCloudgate } from '../context.jsx';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { DEFAULT_SETTINGS, normalizeSettings, paletteVariables, fontVariables } from '../../platform/appearance-model.js';
import cloudgateIcon from '../assets/cloudgate-icon.svg';

const SettingsContext = createContext(null);
export function SettingsProvider({ children, publicAccess = false }) {
  const { client } = useCloudgate();
  const settingsApi = client.appearance;
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(null);
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (publicAccess ? settingsApi.getPublic() : settingsApi.get())
      .then((value) => {
        if (active) {
          setSettings(value.values);
          setSavedRevision(value.revision);
          setAllowSelfRegistration(value.allowSelfRegistration === true);
        }
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, settingsApi, publicAccess]);
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      root.dataset.theme =
        settings.theme_mode === 'system' ? (media.matches ? 'dark' : 'light') : settings.theme_mode;
      root.dataset.density = settings.theme_density;
      const variables = { ...paletteVariables(settings, root.dataset.theme === 'dark'), ...fontVariables(settings) };
      for (const [key, value] of Object.entries(variables)) root.style.setProperty(key, value);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', `rgb(${variables['--ink-950']})`);
    };
    apply();
    media.addEventListener('change', apply);
    document.title = `${settings.app_name} · ${settings.app_tagline || 'Back office'}`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', settings.app_description || 'Cloudgate administration');
    let icon = document.querySelector('link[rel="icon"][data-app-brand]');
    const href = settings.app_icon_url || settings.app_logo_url || cloudgateIcon;
    if (href) {
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        icon.dataset.appBrand = 'true';
        document.head.appendChild(icon);
      }
      icon.href = href;
    } else icon?.remove();
    return () => media.removeEventListener('change', apply);
  }, [settings]);
  const save = useCallback(async (values) => {
    const value = await settingsApi.save(values, savedRevision);
    setSettings(normalizeSettings(value.values));
    setSavedRevision(value.revision);
    setError(null);
    return value.values;
  }, [savedRevision, settingsApi]);
  return (
    <SettingsContext.Provider
      value={{ settings, allowSelfRegistration, loading, error, save, reload: () => setRevision((v) => v + 1) }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
export const useSettings = () => useContext(SettingsContext);
