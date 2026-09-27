/** Validate native constraints plus a synchronous, application-defined rule. */
export function validateControl(control, { error, validate, validationMessages = {} } = {}) {
  if (!control) return undefined;
  control.setCustomValidity('');
  if (!control.willValidate) return undefined;
  const value = control.value;
  const validity = control.validity;
  const message = (key, fallback) => validationMessages[key] || fallback;
  let problem = error || undefined;
  if (!problem && (validity.valueMissing || (control.required && !value.trim()))) {
    problem = message('required', 'This field is required.');
  }
  if (!problem && validity.typeMismatch) {
    problem = control.type === 'email'
      ? message('email', 'Enter a valid email address.')
      : message('url', 'Enter a valid URL, including https://.');
  }
  if (!problem && validity.badInput) problem = message('invalid', 'Enter a valid value.');
  // Native minlength/maxlength may not flag programmatically supplied values.
  const hasLength = control.tagName === 'TEXTAREA' || ['text', 'search', 'email', 'url', 'tel', 'password'].includes(control.type);
  if (!problem && value && hasLength && control.minLength >= 0 && value.length < control.minLength) {
    problem = message('minLength', `Use at least ${control.minLength} characters.`);
  }
  if (!problem && hasLength && control.maxLength >= 0 && value.length > control.maxLength) {
    problem = message('maxLength', `Use no more than ${control.maxLength} characters.`);
  }
  if (!problem && validity.patternMismatch) problem = message('pattern', 'Use the requested format.');
  if (!problem && validity.rangeUnderflow) problem = message('min', `Enter a value of ${control.min} or greater.`);
  if (!problem && validity.rangeOverflow) problem = message('max', `Enter a value of ${control.max} or less.`);
  if (!problem && validity.stepMismatch) problem = message('step', `Use increments of ${control.step || 1}.`);
  if (!problem && validate) {
    problem = validate(value, control.form ? new FormData(control.form) : undefined) || undefined;
  }
  control.setCustomValidity(problem ? (typeof problem === 'string' ? problem : 'Check this field.') : '');
  return problem;
}
