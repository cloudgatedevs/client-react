import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useFieldValidation, useFormValue } from './Form.jsx';

/** Native radio semantics, with the same feedback and validation as SDK fields. */
export const RadioGroup = forwardRef(function RadioGroup({
  options = [], value, defaultValue = '', onChange, name, id: suppliedId,
  label, hint, error, required = false, disabled = false, validate, validationMessages,
  variant = 'default', orientation = 'vertical', className = '', onBlur,
  'aria-label': ariaLabel, 'aria-describedby': describedBy,
}, forwardedRef) {
  const uid = useId(), id = suppliedId || uid;
  const group = useRef(null);
  const anchor = useRef(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const controlled = value !== undefined;
  const selected = controlled ? value : internalValue;
  const resetValue = useRef(defaultValue);
  resetValue.current = defaultValue;
  const firstEnabled = options.findIndex(option => !option.disabled);
  const seen = new Set();
  for (const option of options) {
    const key = String(option.value);
    if (!['string', 'number'].includes(typeof option.value) || !key.trim() ||
        (typeof option.value === 'number' && !Number.isFinite(option.value)) || seen.has(key)) {
      throw new Error('RadioGroup options need unique, non-empty string or finite number values.');
    }
    seen.add(key);
  }
  // The validation anchor is one native radio, but custom rules receive the
  // group's checked value (including the value just chosen in a change event).
  const validateSelection = useCallback((_value, data) =>
    validate?.(group.current?.querySelector('input:checked')?.value || '', data), [validate, options]);
  const validation = useFieldValidation({ id, error, validate: validateSelection, validationMessages,
    props: { value: selected, required, disabled, onBlur } }, forwardedRef);
  const setAnchor = useCallback(node => {
    // A reordered/disabled first option must not leave custom validity on the
    // former anchor, otherwise a corrected group could still block submission.
    anchor.current?.setCustomValidity('');
    anchor.current = node;
    validation.bindings.ref(node);
  }, [validation.bindings.ref]);
  useFormValue(selected);
  useEffect(() => {
    const form = group.current?.form;
    const reset = event => queueMicrotask(() => {
      if (!event.defaultPrevented && !controlled) setInternalValue(resetValue.current);
    });
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, [controlled]);
  const issue = validation.error;
  const helpId = hint || issue ? `${id}-help` : undefined;
  const description = [describedBy, helpId].filter(Boolean).join(' ') || undefined;
  return <fieldset ref={group} id={id} disabled={disabled}
    className={`cgw-field cgw-radio-group ${issue ? 'cgw-field--error' : ''} ${className}`}
    role="radiogroup" aria-label={ariaLabel} aria-describedby={description}
    aria-required={required || undefined} aria-invalid={!!issue || undefined}>
    {label && <legend>{label}{required && <span className="cgw-required" aria-hidden="true"> *</span>}</legend>}
    <div className={`cgw-radio-options cgw-radio-options--${orientation} cgw-radio-options--${variant}`}>
      {options.map((option, index) => {
        const optionId = `${id}-option-${encodeURIComponent(String(option.value))}`;
        return <label key={String(option.value)} className="cgw-radio-option" htmlFor={optionId}>
          <input type="radio" id={optionId} name={name || `${uid}-options`} value={option.value}
            checked={selected != null && String(selected) === String(option.value)} required={required}
            disabled={disabled || option.disabled} ref={index === firstEnabled ? setAnchor : undefined}
            aria-labelledby={`${optionId}-label`}
            aria-invalid={!!issue || undefined}
            aria-describedby={[description, option.description ? `${optionId}-description` : undefined].filter(Boolean).join(' ') || undefined}
            onChange={event => {
              if (disabled || option.disabled || !event.target.checked) return;
              if (!controlled) setInternalValue(option.value);
              onChange?.(option.value, option);
              validation.bindings.onChange(event);
            }}
            onBlur={event => {
              if (!group.current?.contains(event.relatedTarget)) validation.bindings.onBlur(event);
            }} onInvalid={validation.bindings.onInvalid} />
          <span className="cgw-radio-content"><span id={`${optionId}-label`}>{option.label}</span>
            {option.description && <small id={`${optionId}-description`}>{option.description}</small>}
          </span>
        </label>;
      })}
    </div>
    {helpId && <p id={helpId} className="cgw-field-help" role={issue ? 'alert' : undefined}>{issue || hint}</p>}
  </fieldset>;
});
