import { useCloudgate } from '../context.jsx';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { DEFAULT_SETTINGS, normalizeSettings, paletteVariables, fontVariables } from '../../platform/appearance-model.js';
import cloudgateIcon from '../assets/cloudgate-icon.svg';
import { applyBrandingMetadata } from './branding-metadata.js';

export const SettingsContext = createContext(null);
export function SettingsProvider({ children, publicAccess = false }) {
  const { client } = useCloudgate();
  const settingsApi = client.appearance;
  const [walletSettings, setWalletSettings] = useState(null);
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
          setWalletSettings(value.walletSettings ?? null);
          setSavedRevision(value.revision);
          setAllowSelfRegistration(value.allowSelfRegistration === true);
        }
      })
      .catch((err) => {
        if (active) { setError(err); setWalletSettings(null); }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, settingsApi, publicAccess]);
  // Re-check feature availability when returning from the Cloudgate management tab.
  useEffect(() => {
    let active = true;
    const refresh = () => {
      (publicAccess ? settingsApi.getPublic() : settingsApi.get())
        .then(value => { if (active) setWalletSettings(value.walletSettings ?? null); })
        .catch(() => { if (active) setWalletSettings(null); });
    };
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [publicAccess, settingsApi]);
  const saveWalletSettings = useCallback(async (input) => {
    const value = await client.wallet.updateSettings(input);
    setWalletSettings(value);
    return value;
  }, [client]);
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
    return () => media.removeEventListener('change', apply);
  }, [settings]);
  useEffect(() => {
    // Preserve the published branding while settings load, including on a failed read.
    if (!loading && !error) applyBrandingMetadata(document, settings, cloudgateIcon);
  }, [settings, loading, error]);
  const save = useCallback(async (values) => {
    const value = await settingsApi.save(values, savedRevision);
    setSettings(normalizeSettings(value.values));
    setSavedRevision(value.revision);
    setError(null);
    return value.values;
  }, [savedRevision, settingsApi]);
  return (
    <SettingsContext.Provider
      value={{ settings, walletSettings, saveWalletSettings, allowSelfRegistration, loading, error, save, reload: () => setRevision((v) => v + 1) }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
export const useSettings = () => useContext(SettingsContext);
