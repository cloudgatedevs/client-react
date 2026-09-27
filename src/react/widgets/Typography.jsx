import { forwardRef } from 'react';

const cx = (...values) => values.filter(Boolean).join(' ');
const headingSizes = ['display', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const textVariants = ['body', 'lead', 'small', 'caption', 'label', 'overline'];
const textElements = ['span', 'p', 'div', 'small', 'strong', 'em'];
function appearance(tone, align, weight) {
  return cx(tone && `cgw-type-tone--${tone}`, align && `cgw-type-align--${align}`, weight && `cgw-type-weight--${weight}`);
}

/** Visual size never changes the heading's document level. */
export const Heading = forwardRef(function Heading({ level = 2, size, tone, align, balance = true, className, children, ...props }, ref) {
  const rank = [1, 2, 3, 4, 5, 6].includes(level) ? level : 2;
  const Element = `h${rank}`;
  return <Element {...props} ref={ref} className={cx('cgw-heading', `cgw-heading--${headingSizes.includes(size) ? size : `h${rank}`}`, balance && 'cgw-type-balance', appearance(tone, align), className)}>{children}</Element>;
});

export const Text = forwardRef(function Text({ as = 'span', variant = 'body', tone, align, weight, measure = false, className, children, ...props }, ref) {
  const Element = textElements.includes(as) ? as : 'span';
  return <Element {...props} ref={ref} className={cx('cgw-text', `cgw-text--${textVariants.includes(variant) ? variant : 'body'}`, appearance(tone, align, weight), measure && 'cgw-type-measure', className)}>{children}</Element>;
});

export const Paragraph = forwardRef(function Paragraph(props, ref) {
  return <Text {...props} as="p" ref={ref} />;
});

export const TextLink = forwardRef(function TextLink({ className, target, rel, children, ...props }, ref) {
  const relationship = target === '_blank' ? [...new Set(`${rel || ''} noopener noreferrer`.trim().split(/\s+/))].join(' ') : rel;
  return <a {...props} ref={ref} target={target} rel={relationship} className={cx('cgw-text-link', className)}>{children}</a>;
});

export const TextList = forwardRef(function TextList({ ordered = false, compact = false, tone, className, children, ...props }, ref) {
  const Element = ordered ? 'ol' : 'ul';
  return <Element {...props} ref={ref} className={cx('cgw-text-list', compact && 'cgw-text-list--compact', appearance(tone), className)}>{children}</Element>;
});

export const Blockquote = forwardRef(function Blockquote({ attribution, className, children, ...props }, ref) {
  return <blockquote {...props} ref={ref} className={cx('cgw-blockquote', className)}>
    <div>{children}</div>{attribution && <footer>— {attribution}</footer>}
  </blockquote>;
});

export const InlineCode = forwardRef(function InlineCode({ className, children, ...props }, ref) {
  return <code {...props} ref={ref} className={cx('cgw-inline-code', className)}>{children}</code>;
});
