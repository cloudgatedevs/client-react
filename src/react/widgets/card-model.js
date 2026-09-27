export const cardNumber = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
export function cardPercent(value, max = 100) {
  const number = cardNumber(value), total = cardNumber(max);
  return number === null || total === null || total <= 0 ? null : Math.max(0, Math.min(100, number / total * 100));
}
export function cardMoney(value, currency = 'USD', locale) {
  if (cardNumber(value) === null) return '—';
  try { return new Intl.NumberFormat(locale, {style:'currency',currency}).format(value); }
  catch { return `${value.toLocaleString(locale)} ${currency}`; }
}
export function cardInitials(name) {
  return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase() || '?';
}
export function cardDate(value, locale) {
  if (!value) return null;
  // Date-only values must not shift into the previous day in western time zones.
  const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(value), date=new Date(dateOnly ? `${value}T12:00:00Z` : value);
  if (!Number.isFinite(date.getTime()) || (dateOnly && date.toISOString().slice(0,10)!==value)) return null;
  const options=dateOnly ? {timeZone:'UTC'} : {};
  return {day:new Intl.DateTimeFormat(locale,{...options,day:'2-digit'}).format(date),
    month:new Intl.DateTimeFormat(locale,{...options,month:'short'}).format(date),
    label:new Intl.DateTimeFormat(locale,{...options,dateStyle:'long'}).format(date)};
}
