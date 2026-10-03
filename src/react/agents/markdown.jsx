import { Fragment } from 'react';

/**
 * Renders the Markdown subset agents write (headings, lists, quotes, fenced code, bold, italics, inline
 * code, links) as React elements. Nothing is injected as HTML, and links open only http(s) or relative paths.
 */
export function Markdown({ text, className = '' }) {
  const blocks = parseBlocks(String(text ?? ''));
  if (!blocks.length) return null;
  return <div className={`cg-md ${className}`}>{blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)}</div>;
}

function parseBlocks(source) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    const fence = /^\s*```/.exec(line);
    if (fence) {
      const code = [];
      index++;
      while (index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index++]);
      index++;
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }
    const heading = /^\s{0,3}(#{1,6})\s+(.*)$/.exec(line);
    if (heading) { blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() }); index++; continue; }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ''));
      blocks.push({ type: 'quote', text: quote.join(' ') });
      continue;
    }
    const bullet = /^\s*([-*•]|\d+[.)])\s+/.exec(line);
    if (bullet) {
      const ordered = /\d/.test(bullet[1]);
      const items = [];
      while (index < lines.length) {
        const match = /^\s*([-*•]|\d+[.)])\s+(.*)$/.exec(lines[index]);
        if (match) { items.push(match[2]); index++; }
        else if (lines[index].trim() && /^\s{2,}/.test(lines[index]) && items.length) { items[items.length - 1] += ' ' + lines[index].trim(); index++; }
        else break;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !/^\s*(```|#{1,6}\s|>|([-*•]|\d+[.)])\s)/.test(lines[index])) paragraph.push(lines[index++].trim());
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}

function renderBlock(block) {
  switch (block.type) {
    case 'code': return <pre className="cg-md-code"><code>{block.text}</code></pre>;
    case 'heading': { const Tag = `h${Math.min(6, block.level + 2)}`; return <Tag className="cg-md-heading">{renderInline(block.text)}</Tag>; }
    case 'quote': return <blockquote className="cg-md-quote">{renderInline(block.text)}</blockquote>;
    case 'list': { const Tag = block.ordered ? 'ol' : 'ul'; return <Tag className="cg-md-list">{block.items.map((item, index) => <li key={index}>{renderInline(item)}</li>)}</Tag>; }
    default: return <p className="cg-md-p">{renderInline(block.text)}</p>;
  }
}

// A fresh expression per call: nested emphasis recurses, and a shared global regex would lose its place and loop.
const inlinePattern = () => /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)|(\[[^\]]+\]\([^)\s]+\))/g;

export function renderInline(text) {
  const parts = [];
  let last = 0, match, key = 0;
  const source = String(text ?? ''), pattern = inlinePattern();
  while ((match = pattern.exec(source))) {
    if (match.index > last) parts.push(source.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('`')) parts.push(<code key={key++} className="cg-md-inline-code">{token.slice(1, -1)}</code>);
    else if (token.startsWith('**') || token.startsWith('__')) parts.push(<strong key={key++}>{renderInline(token.slice(2, -2))}</strong>);
    else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      const href = safeHref(link[2]);
      parts.push(href ? <a key={key++} href={href} target={href.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer">{link[1]}</a> : link[1]);
    } else parts.push(<em key={key++}>{renderInline(token.slice(1, -1))}</em>);
    last = match.index + token.length;
  }
  if (last < source.length) parts.push(source.slice(last));
  return parts.length === 1 ? parts[0] : parts;
}

function safeHref(value) {
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? value : null; } catch { return null; }
}
