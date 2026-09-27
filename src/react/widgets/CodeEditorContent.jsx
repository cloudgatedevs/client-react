import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';

const languages = {
  jsx: () => javascript({ jsx: true }), tsx: () => javascript({ jsx: true, typescript: true }),
  javascript, typescript: () => javascript({ typescript: true }), json, html, css, python, sql,
};
// CSS variables keep nested palette previews and saved appearance changes in sync,
// without remounting the editor or losing its selection.
const highlighting = syntaxHighlighting(HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.operatorKeyword], color: 'rgb(var(--accent-text))' },
  { tag: [tags.string, tags.regexp], color: 'rgb(var(--cgw-success))' },
  { tag: [tags.number, tags.bool, tags.null], color: 'rgb(var(--cgw-warning))' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.tagName, tags.typeName], color: 'rgb(var(--cgw-info))' },
  { tag: [tags.propertyName, tags.attributeName], color: 'rgb(var(--accent-text))' },
  { tag: [tags.comment, tags.meta], color: 'rgb(var(--mist-dim))', fontStyle: 'italic' },
  { tag: [tags.punctuation, tags.operator], color: 'rgb(var(--mist-muted))' },
  { tag: tags.invalid, color: 'rgb(var(--cgw-danger))', textDecoration: 'underline wavy' },
]));

export default function CodeEditorContent({ value, onChange, language, label, readOnly, lineNumbers, lineWrapping, minHeight, maxHeight }) {
  const extensions = useMemo(() => [
    languages[language]?.() || [], highlighting,
    ...(lineWrapping ? [EditorView.lineWrapping] : []),
    EditorView.contentAttributes.of({ 'aria-label': label, 'aria-readonly': String(readOnly), role: 'textbox', 'aria-multiline': 'true', tabindex: '0', spellcheck: 'false' }),
  ], [language, label, readOnly, lineWrapping]);
  const setup = useMemo(() => ({
    lineNumbers, foldGutter: true, highlightActiveLine: !readOnly, highlightActiveLineGutter: !readOnly,
    autocompletion: !readOnly, bracketMatching: true, syntaxHighlighting: false,
    highlightSelectionMatches: true, searchKeymap: true,
  }), [lineNumbers, readOnly]);
  return <CodeMirror value={value} onChange={readOnly ? undefined : onChange} extensions={extensions}
    theme="none" readOnly={readOnly} editable={!readOnly} indentWithTab={false}
    minHeight={minHeight} maxHeight={maxHeight} basicSetup={setup} />;
}
