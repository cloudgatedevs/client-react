const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
export function filterOptions(options, search) {
  const words = normalize(search).trim().split(/\s+/).filter(Boolean);
  return options.filter(option => words.every(word => normalize(`${option.label} ${option.description || ''}`).includes(word)));
}
export function validateOptions(options) {
  if (!Array.isArray(options)) throw new Error('loadOptions must return an array of options.');
  const keys = new Set();
  for (const option of options) {
    if (!option || !['string', 'number'].includes(typeof option.value) || String(option.value) === '' ||
      (typeof option.value === 'number' && !Number.isFinite(option.value)) || typeof option.label !== 'string' || keys.has(String(option.value))) {
      throw new Error('Options need unique, non-empty values and string labels.');
    }
    keys.add(String(option.value));
  }
  return options;
}
