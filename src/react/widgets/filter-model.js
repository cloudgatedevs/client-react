export const EMPTY_ADVANCED_FILTERS = { match: 'all', rules: [] };
export const FILTER_OPERATORS = {
  text: [['contains','Contains'],['equals','Equals'],['startsWith','Starts with'],['empty','Is empty'],['notEmpty','Is not empty']],
  number: [['equals','Equals'],['gte','At least'],['lte','At most'],['between','Between'],['empty','Is empty']],
  date: [['on','On'],['before','Before'],['after','After'],['between','Between'],['empty','Is empty']],
  select: [['in','Is any of'],['notIn','Is none of'],['empty','Is empty']],
};
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function validateFilters(filters, fields) {
  return filters.rules.map(rule => {
    const field = fields.find(item => item.key === rule.field);
    if (!field) return 'Choose a field.';
    if (!(FILTER_OPERATORS[field.type || 'text'] || []).some(([op]) => op === rule.operator)) return 'Choose a valid condition.';
    if (['empty','notEmpty'].includes(rule.operator)) return '';
    if (field.type === 'select') return Array.isArray(rule.value) && rule.value.length && rule.value.every(value => field.options?.some(option => option.value === value)) ? '' : 'Choose one or more values.';
    const values = rule.operator === 'between' ? [rule.value, rule.valueTo] : [rule.value];
    if (values.some(value => value == null || String(value).trim() === '')) return 'Enter a value.';
    if (field.type === 'number' && values.some(value => !Number.isFinite(Number(value)))) return 'Enter a valid number.';
    if (field.type === 'date' && values.some(value => !validDate(value))) return 'Enter a valid date.';
    if (rule.operator === 'between' && (field.type === 'number' ? Number(rule.value) > Number(rule.valueTo) : rule.value > rule.valueTo)) return 'The end must be greater than or equal to the start.';
    return '';
  });
}
export function matchesAdvancedFilters(row, columns, filters = EMPTY_ADVANCED_FILTERS) {
  if (!filters.rules?.length) return true;
  const matches = rule => {
    const column = columns.find(item => item.key === rule.field);
    if (!column) return false;
    const raw = column.accessor ? column.accessor(row) : row[rule.field];
    const empty = raw == null || String(raw).trim() === '';
    if (rule.operator === 'empty') return empty;
    if (rule.operator === 'notEmpty') return !empty;
    if (empty) return false;
    if (raw instanceof Date && !Number.isFinite(raw.getTime())) return false;
    const value = rule.type === 'number' ? Number(raw) : rule.type === 'date' ? String(raw instanceof Date ? raw.toISOString() : raw).slice(0,10) : String(raw).toLocaleLowerCase();
    const expected = rule.type === 'number' ? Number(rule.value) : String(rule.value ?? '').toLocaleLowerCase();
    if (rule.type === 'number' && (!Number.isFinite(value) || !Number.isFinite(expected))) return false;
    if (rule.type === 'date' && !validDate(value)) return false;
    switch (rule.operator) {
      case 'contains': return String(value).includes(expected);
      case 'startsWith': return String(value).startsWith(expected);
      case 'equals': case 'on': return value === expected;
      case 'gte': return value >= expected;
      case 'lte': return value <= expected;
      case 'before': return value < expected;
      case 'after': return value > expected;
      case 'between': return value >= expected && value <= (rule.type === 'number' ? Number(rule.valueTo) : String(rule.valueTo));
      case 'in': return Array.isArray(rule.value) && rule.value.some(item => String(item).toLocaleLowerCase() === String(raw).toLocaleLowerCase());
      case 'notIn': return Array.isArray(rule.value) && !rule.value.some(item => String(item).toLocaleLowerCase() === String(raw).toLocaleLowerCase());
      default: return false;
    }
  };
  return filters.match === 'any' ? filters.rules.some(matches) : filters.rules.every(matches);
}
