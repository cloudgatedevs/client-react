import { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { validateControl } from './validation.js';

const FormContext = createContext(null);

// Composite controls submit a hidden ID while their visible input holds a label.
export function useFormValue(value) {
  const context = useContext(FormContext);
  useEffect(() => { context?.revalidate(); }, [context, value]);
}

/** Native form data and shared field validation, without browser validation popups. */
export const Form = forwardRef(function Form({ onSubmit, onReset, children, ...props }, ref) {
  const fields = useRef(new Map());
  const context = useMemo(() => ({
    register(id, field) {
      fields.current.set(id, field);
      return () => fields.current.delete(id);
    },
    revalidate() { fields.current.forEach(field => field.check(false)); },
  }), []);
  function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    fields.current.forEach(field => {
      if (field.control()?.form === form) field.check(true);
    });
    // Includes native controls mixed into an SDK form, in DOM order.
    const firstInvalid = Array.from(form.elements).find(control => control.willValidate && !control.validity.valid);
    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.reportValidity?.();
      return;
    }
    onSubmit?.(new FormData(form), event);
  }
  function reset(event) {
    onReset?.(event);
    if (!event.defaultPrevented) fields.current.forEach(field => field.reset());
  }
  return <FormContext.Provider value={context}>
    <form {...props} ref={ref} noValidate onSubmit={submit} onReset={reset}>{children}</form>
  </FormContext.Provider>;
});

/** Used by Input, Textarea and Select; preserves their native event/ref API. */
export function useFieldValidation({ id, error, validate, validationMessages, props }, forwardedRef) {
  const form = useContext(FormContext);
  const control = useRef(null);
  const touched = useRef(false);
  const options = useRef(null);
  options.current = { error, validate, validationMessages, props };
  const [issue, setIssue] = useState();
  const check = useCallback((show) => {
    if (!control.current) return;
    if (show) touched.current = true;
    const problem = validateControl(control.current, options.current);
    setIssue(touched.current ? problem : undefined);
    return problem;
  }, []);
  const reset = useCallback(() => {
    touched.current = false;
    setIssue(undefined);
    control.current?.setCustomValidity('');
    // Native reset updates uncontrolled values after the reset event finishes.
    queueMicrotask(() => check(false));
  }, [check]);
  const setRef = useCallback(node => {
    control.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  useEffect(() => form?.register(id, { check, reset, control: () => control.current }), [form, id, check, reset]);
  useEffect(() => {
    const element = control.current;
    const nativeForm = element?.form;
    // Fields also support ordinary HTML forms and their native reset buttons.
    const resetIfAllowed = event => queueMicrotask(() => {
      if (!event.defaultPrevented) reset();
    });
    if (!form) nativeForm?.addEventListener('reset', resetIfAllowed);
    return () => { if (!form) nativeForm?.removeEventListener('reset', resetIfAllowed); };
  }, [form, reset]);
  useEffect(() => {
    check(false);
  }, [check, error, validate, validationMessages, props.value, props.required, props.type,
    props.minLength, props.maxLength, props.pattern, props.min, props.max, props.step, props.disabled, props.readOnly]);
  return {
    error: error || issue,
    bindings: {
      ref: setRef,
      onBlur(event) {
        check(true);
        options.current.props.onBlur?.(event);
      },
      onChange(event) {
        options.current.props.onChange?.(event);
        check(false);
        form?.revalidate();
      },
      onInvalid(event) {
        event.preventDefault();
        check(true);
        const element = control.current;
        if (!element?.form || element.form.querySelector('input:invalid, select:invalid, textarea:invalid') === element) element?.focus();
        options.current.props.onInvalid?.(event);
      },
    },
  };
}
