import { forwardRef, useId, useRef, useState, useLayoutEffect } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { DialogLayerContext, useDialogLayer } from '../components/useDialogLayer.js';
import { useAnimatedNumber } from './motion.js';
import { useFieldValidation } from './Form.jsx';
import { buttonClassName } from './button-model.js';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  LoaderCircle,
  SearchX,
  X,
} from "lucide-react";

const cx = (...values) => values.filter(Boolean).join(" ");
export const Button = forwardRef(function Button(
  {
    variant = "primary",
    appearance,
    size = "md",
    fullWidth = false,
    loading = false,
    disabled,
    icon: Icon,
    iconPosition = 'start',
    children,
    className,
    type = "button",
    ...props
  },
  ref,
) {
  const adornment = loading ? <LoaderCircle className="cgw-spin" size={16} aria-hidden="true" />
    : Icon && <Icon size={16} aria-hidden="true" />;
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({variant,appearance,size,fullWidth,className})}
    >
      {iconPosition !== 'end' && adornment}
      {children}
      {iconPosition === 'end' && adornment}
    </button>
  );
});
export const IconButton = forwardRef(function IconButton(
  { label, icon, className, ...props },
  ref,
) {
  return (
    <Button
      variant="ghost"
      {...props}
      ref={ref}
      icon={icon}
      aria-label={label}
      title={label}
      className={cx("cgw-icon-button", className)}
    />
  );
});
export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className,
  ...props
}) {
  return (
    <span
      {...props}
      className={cx("cgw-badge", `cgw-tone--${tone}`, className)}
    >
      {dot && <span className="cgw-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
export function Card({
  title,
  description,
  action,
  footer,
  children,
  className,
  loading = false,
  ...props
}) {
  return (
    <section {...props} className={cx("cgw-card", className)} aria-busy={loading || undefined}>
      {(title || description || action) && (
        <header className="cgw-card-head">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="cgw-card-body">{loading ? <WidgetSkeleton variant="card" /> : children}</div>
      {!loading && footer && <footer className="cgw-card-foot">{footer}</footer>}
    </section>
  );
}
export function CountUp({ value, formatValue, animate = true, duration = 700, loading = false, className }) {
  const number = Number.isFinite(value) ? value : 0;
  const displayed = useAnimatedNumber(number, { animate: animate && !loading, duration });
  const format = formatValue || (n => n.toLocaleString(undefined, { maximumFractionDigits: Number.isInteger(number) ? 0 : 2 }));
  const final = format(number);
  return <span className={cx('cgw-count-up', className)} aria-busy={loading || undefined}>
    <span className="cgw-sr-only">{loading ? 'Loading value' : final}</span>
    {loading ? <Skeleton width="5ch" height="1em" /> : <span aria-hidden="true">{format(displayed)}</span>}
  </span>;
}
export function MetricCard({
  label,
  value,
  description,
  trend,
  tone = "neutral",
  icon: Icon,
  loading = false,
  formatValue,
  animate = true,
  duration = 700,
  children,
  className,
  onClick,
  selected,
}) {
  // A clickable metric is one button with one outline: never wrap a card in a bordered button.
  const Root = onClick ? "button" : "section";
  return (
    <Root
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick && selected != null ? Boolean(selected) : undefined}
      className={cx("cgw-card cgw-metric", onClick && "cgw-metric--action", selected && "is-selected", className)}
      aria-busy={loading || undefined}
    >
      <div className="cgw-metric-top">
        <span>{label}</span>
        {Icon && (
          <span className="cgw-metric-icon">
            <Icon size={18} aria-hidden="true" />
          </span>
        )}
      </div>
      {loading ? (
        <WidgetSkeleton variant="metric" label={`Loading ${typeof label === 'string' ? label : 'metric'}`} />
      ) : (
        <strong className="cgw-metric-value">{typeof value === 'number' ? <CountUp {...{ value, formatValue, animate, duration }} /> : value}</strong>
      )}
      {!loading && <div className="cgw-metric-description">
        {trend != null && (
          <Badge tone={tone}>
            {String(trend).startsWith("-") ? (
              <ArrowDownRight size={13} />
            ) : (
              <ArrowUpRight size={13} />
            )}
            {trend}
          </Badge>
        )}
        {description && <span>{description}</span>}
      </div>}
      {!loading && children}
    </Root>
  );
}
function FieldShell({ id, label, hint, error, required, children, className }) {
  return (
    <div className={cx("cgw-field", error && "cgw-field--error", className)}>
      {label && <label htmlFor={id}>{label}{required && <span className="cgw-required" aria-hidden="true"> *</span>}</label>}
      {children}
      {(error || hint) && (
        <p
          id={`${id}-help`}
          className="cgw-field-help"
          role={error ? "alert" : undefined}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
const fieldProps = (id, hint, error, props) => ({
  ...props,
  id,
  "aria-invalid": error ? true : props["aria-invalid"],
  "aria-describedby":
    [props["aria-describedby"], (hint || error) && `${id}-help`]
      .filter(Boolean)
      .join(" ") || undefined,
});
export const Input = forwardRef(function Input(
  { label, hint, error, validate, validationMessages, id: suppliedId, className, icon: Icon, endAdornment, ...props },
  ref,
) {
  const uid = useId(),
    id = suppliedId || uid;
  const validation = useFieldValidation({ id, error, validate, validationMessages, props }, ref);
  error = validation.error;
  return (
    <FieldShell {...{ id, label, hint, error, className }} required={props.required}>
      <div className="cgw-input-wrap">
        {Icon && <Icon size={16} aria-hidden="true" />}
        <input
          {...fieldProps(id, hint, error, props)}
          {...validation.bindings}
          className="cgw-input"
        />
        {endAdornment && <span className="cgw-input-end">{endAdornment}</span>}
      </div>
    </FieldShell>
  );
});
export const Textarea = forwardRef(function Textarea(
  { label, hint, error, validate, validationMessages, id: suppliedId, className, ...props },
  ref,
) {
  const uid = useId(),
    id = suppliedId || uid;
  const validation = useFieldValidation({ id, error, validate, validationMessages, props }, ref);
  error = validation.error;
  return (
    <FieldShell {...{ id, label, hint, error, className }} required={props.required}>
      <textarea
        rows={4}
        {...fieldProps(id, hint, error, props)}
        {...validation.bindings}
        className="cgw-input"
      />
    </FieldShell>
  );
});
export const Select = forwardRef(function Select(
  {
    label,
    hint,
    error,
    validate,
    validationMessages,
    id: suppliedId,
    className,
    options = [],
    placeholder,
    ...props
  },
  ref,
) {
  const uid = useId(),
    id = suppliedId || uid;
  const validation = useFieldValidation({ id, error, validate, validationMessages, props }, ref);
  error = validation.error;
  return (
    <FieldShell {...{ id, label, hint, error, className }} required={props.required}>
      <div className="cgw-select-wrap">
        <select
          {...fieldProps(id, hint, error, props)}
          {...validation.bindings}
          className="cgw-input"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={15} aria-hidden="true" />
      </div>
    </FieldShell>
  );
});
export const Checkbox = forwardRef(function Checkbox(
  { label, hint, indeterminate = false, className, ...props },
  ref,
) {
  const local = useRef(null);
  useLayoutEffect(() => {
    if (local.current) local.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className={cx("cgw-check", className)}>
      <input
        {...props}
        type="checkbox"
        ref={(node) => {
          local.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        aria-checked={indeterminate ? "mixed" : props.checked}
      />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
});
export function Switch({
  label,
  hint,
  checked,
  onChange,
  disabled,
  size = "md",
  className,
  id: suppliedId,
  ...props
}) {
  const uid = useId(),
    id = suppliedId || uid;
  return (
    <div className="cgw-switch-field">
      <div>
        <label htmlFor={id}>{label}</label>
        {hint && <p id={`${id}-help`}>{hint}</p>}
      </div>
      <button
        {...props}
        id={id}
        type="button"
        className={cx("cgw-switch", `cgw-switch--${size}`, className)}
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? `${id}-help` : undefined}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
      >
        <span className="cgw-switch-thumb" />
      </button>
    </div>
  );
}
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue = String,
  hint,
  id: suppliedId,
  ...props
}) {
  const uid = useId(),
    id = suppliedId || uid;
  const percent =
    max > min
      ? Math.max(0, Math.min(100, ((Number(value) - min) / (max - min)) * 100))
      : 0;
  return (
    <div className="cgw-field cgw-slider">
      <div className="cgw-row cgw-between">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{formatValue(value)}</output>
      </div>
      <input
        {...props}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        aria-valuetext={formatValue(value)}
        aria-describedby={hint ? `${id}-help` : undefined}
        style={{ "--cgw-range": `${percent}%` }}
      />
      {hint && (
        <p id={`${id}-help`} className="cgw-field-help">
          {hint}
        </p>
      )}
    </div>
  );
}
export {Tabs} from './Tabs.jsx';
export function Alert({ title, children, tone = "info", action, onDismiss }) {
  return (
    <div
      className={`cgw-alert cgw-tone--${tone}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <Info size={18} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        {children && <div className="cgw-alert-content">{children}</div>}
        {action}
      </div>
      {onDismiss && (
        <IconButton label="Dismiss message" icon={X} onClick={onDismiss} />
      )}
    </div>
  );
}
export function EmptyState({
  title = "Nothing here yet",
  description,
  icon: Icon = SearchX,
  action,
}) {
  return (
    <div className="cgw-empty">
      <span className="cgw-empty-icon">
        <Icon size={24} aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Skeleton({
  width = "100%",
  height = "1rem",
  className,
  style,
}) {
  return (
    <span
      className={cx("cgw-skeleton", className)}
      aria-hidden="true"
      style={{ width, height, ...style }}
    />
  );
}
/** Ready-made placeholders follow the geometry of the widget they replace. */
export function WidgetSkeleton({ variant = 'card', label = 'Loading content', height, className }) {
  return <div className={cx('cgw-widget-skeleton', `cgw-widget-skeleton--${variant}`, className)} role="status" aria-label={label} aria-busy="true" style={{ height }}>
    {variant === 'metric' ? <><Skeleton width="65%" height="2.25rem" /><Skeleton width="80%" height="1rem" /></> :
      variant === 'chart' ? <><div className="cgw-skeleton-legend"><Skeleton width="5rem" /><Skeleton width="4rem" /></div>
        <div className="cgw-skeleton-plot">{[36, 58, 47, 75, 64, 90, 78, 100].map((size, index) => <Skeleton key={index} width="100%" height={`${size}%`} />)}</div>
        <div className="cgw-skeleton-legend"><Skeleton width="25%" /><Skeleton width="25%" /></div></> :
      variant === 'donut' ? <div className="cgw-skeleton-donut-layout"><span className="cgw-skeleton cgw-skeleton-ring" /><div>{[1, 2, 3].map(n => <Skeleton key={n} width="100%" />)}</div></div> :
      <><Skeleton width="45%" height="1.25rem" /><Skeleton height="6rem" /><Skeleton width="85%" /><Skeleton width="60%" /></>}
  </div>;
}
export function Progress({
  value = 0,
  max = 100,
  label,
  showValue = true,
  tone = "accent",
  animate = true,
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value)
    ? Math.max(0, Math.min(value, safeMax))
    : 0;
  return (
    <div className={`cgw-progress cgw-tone--${tone}`}>
      <div className="cgw-row cgw-between">
        <span>{label}</span>
        {showValue && <CountUp value={(safeValue / safeMax) * 100} formatValue={n => `${Math.round(n)}%`} animate={animate} duration={300} />}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
      >
        <span style={{ width: `${(safeValue / safeMax) * 100}%`, transition: animate ? undefined : 'none' }} />
      </div>
    </div>
  );
}
/** Uses the same Radix presence and animation classes as the SDK's other modals. */
export function Dialog({
  open,
  onClose,
  onCloseAutoFocus,
  title,
  description,
  children,
  footer,
  size = "md",
}) {
  const { token, layer, release } = useDialogLayer(open);
  const [last, setLast] = useState(null),
    returnFocus = useRef(null);
  useLayoutEffect(() => {
    if (open) setLast({ title, description, children, footer });
  }, [open, title, description, children, footer]);
  const content = open ? { title, description, children, footer } : last;
  return (
    <DialogLayerContext.Provider value={token}>
    <RadixDialog.Root
      open={!!open}
      onOpenChange={(value) => {
        if (!value) onClose?.();
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="dialog-backdrop cgw-dialog-backdrop" style={{ zIndex: layer }} />
        <RadixDialog.Content
          className={`modal-panel cgw-dialog cgw-dialog--${size}`}
          style={{ zIndex: layer + 1 }}
          onOpenAutoFocus={() => {
            returnFocus.current = document.activeElement;
          }}
          onCloseAutoFocus={(event) => {
            release();
            onCloseAutoFocus?.(event);
            const handled = event.defaultPrevented;
            event.preventDefault();
            setLast(null);
            if (!handled && returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
          onEscapeKeyDown={(e) => {
            if (!onClose) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (!onClose) e.preventDefault();
          }}
        >
          <header className="cgw-dialog-head">
            <div>
              <RadixDialog.Title>{content?.title}</RadixDialog.Title>
              <RadixDialog.Description
                className={content?.description ? "" : "cgw-sr-only"}
              >
                {content?.description || content?.title}
              </RadixDialog.Description>
            </div>
            <RadixDialog.Close asChild>
              <IconButton label="Close dialog" icon={X} disabled={!onClose} />
            </RadixDialog.Close>
          </header>
          <div className="cgw-dialog-body">{content?.children}</div>
          {content?.footer && (
            <footer className="cgw-dialog-foot">{content.footer}</footer>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
    </DialogLayerContext.Provider>
  );
}

/**
 * A collapsible section. The header is one full-width button (chevron, title, muted subtitle); optional
 * actions sit outside the button. With lazy (default) the children mount on first open and then stay
 * mounted, so a closed section costs nothing and a loader placed inside runs when the user opens it.
 */
export function Disclosure({
  title,
  subtitle,
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  actions,
  lazy = true,
  icon: Icon,
  className,
  id: suppliedId,
}) {
  const uid = useId(),
    id = suppliedId || uid;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen === undefined ? internalOpen : !!controlledOpen;
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const toggle = () => {
    if (controlledOpen === undefined) setInternalOpen(!open);
    onOpenChange?.(!open);
  };
  return (
    <section className={cx("cgw-disclosure", open && "cgw-disclosure--open", className)}>
      <div className="cgw-disclosure-header">
        <button
          type="button"
          id={`${id}-trigger`}
          className="cgw-disclosure-trigger"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={toggle}
        >
          <ChevronRight size={16} aria-hidden="true" className="cgw-disclosure-chevron" />
          {Icon && <Icon size={16} aria-hidden="true" />}
          <span className="cgw-disclosure-title">{title}</span>
          {subtitle && <span className="cgw-disclosure-subtitle">{subtitle}</span>}
        </button>
        {actions && <div className="cgw-disclosure-actions">{actions}</div>}
      </div>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-trigger`}
        className="cgw-disclosure-panel"
        hidden={!open}
      >
        {(!lazy || mounted) && children}
      </div>
    </section>
  );
}
