import { useSettings } from './SettingsProvider.jsx';
import { useCloudgate } from '../context.jsx';

export function useWalletAvailability(environment, includeComingSoon = false) {
  const state = useSettings();
  const { client, identity } = useCloudgate();
  const env = environment ?? identity?.environment ?? client.config.environment;
  return !state?.loading && !state?.error && (state?.walletSettings?.availableCountries || ['ZA']).includes(state?.walletSettings?.countryCode) && (state?.walletSettings?.enabled === true || includeComingSoon && state?.walletSettings?.comingSoon === true) &&
    state.walletSettings.production === /^prod/i.test(env);
}
