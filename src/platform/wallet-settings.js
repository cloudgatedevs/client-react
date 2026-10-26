export function readWalletSettings(value, environment) {
  const production = /^prod/i.test(environment);
  if (value == null) return { enabled: false, countryCode: '', production };
  if (typeof value.enabled !== 'boolean' || typeof value.countryCode !== 'string' || value.production !== production)
    throw new Error('The user wallet settings could not be verified.');
  const countries = Array.isArray(value.availableCountries) ? value.availableCountries.filter(code => /^[A-Z]{2}$/.test(code)) : ['ZA'];
  return { enabled: value.enabled && countries.includes(value.countryCode), countryCode: value.countryCode, production,
    configuredEnabled: value.configuredEnabled ?? value.enabled, platformEnabled: value.platformEnabled === true,
    comingSoon: value.comingSoon === true && !value.enabled,
    availabilityMessage: typeof value.availabilityMessage === 'string' ? value.availabilityMessage : '', availableCountries: countries };
}
