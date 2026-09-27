export const PAYMENT_STATUSES = ['Pending', 'Succeeded', 'Failed', 'Expired', 'Partially refunded', 'Refunded'];
export const paymentStatusTone = status => ({ 0: 'amber', 1: 'green', 2: 'red', 3: 'gray', 4: 'violet', 5: 'gray' }[status] || 'gray');
export function paymentAmount(value, currency) {
  try {
    const format = new Intl.NumberFormat(undefined, { style: 'currency', currency: String(currency).toUpperCase() });
    return format.format(value / 10 ** format.resolvedOptions().maximumFractionDigits);
  } catch { return `${value} ${currency || ''}`.trim(); }
}
export function amountInMinorUnits(value, currency) {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  const match = /^(\d+)(?:\.(\d+))?$/.exec(String(value).trim());
  if (!match || (match[2] || '').length > digits) throw new Error(`Enter an amount with at most ${digits} decimal places.`);
  const amount = Number(match[1] + (match[2] || '').padEnd(digits, '0'));
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Enter an amount greater than zero.');
  return amount;
}
