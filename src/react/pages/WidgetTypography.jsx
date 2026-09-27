import { useRef, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { Blockquote, Button, CodeEditor, Heading, InlineCode, Paragraph, Select, Tabs, Text, Textarea, TextLink, TextList } from '../widgets/index.jsx';

const styles = [
  {id:'display', name:'Display', group:'headings', size:'display', level:1, use:'Hero and landing-page titles'},
  ...[1,2,3,4,5,6].map((level, index) => ({id:`h${level}`, name:`Heading ${level}`, group:'headings', size:`h${level}`, level,
    use:['Page title', 'Major section', 'Section title', 'Card title', 'Subsection', 'Small subsection'][index]})),
  {id:'lead', name:'Lead paragraph', group:'body', variant:'lead', use:'Introductions and summaries', sample:'A little context makes the next step feel clear.'},
  {id:'body', name:'Paragraph', group:'body', variant:'body', use:'Descriptions and longer reading', sample:'Thoughtful details help people understand what matters and what to do next.'},
  {id:'small', name:'Small text', group:'body', variant:'small', use:'Supporting information', sample:'Changes are saved when you publish.'},
  {id:'caption', name:'Caption', group:'body', variant:'caption', use:'Timestamps and metadata', sample:'Last updated a few moments ago'},
  {id:'label', name:'Label', group:'body', variant:'label', use:'Short labels and key information', sample:'Project overview'},
  {id:'overline', name:'Overline', group:'body', variant:'overline', use:'Short section introductions', sample:'Made for your next idea'},
];

function Sample({ style, children, tone, align }) {
  // Keep the gallery's own heading structure intact while previewing every size.
  return style.group === 'headings'
    ? <Heading level={3} size={style.size} tone={tone} align={align}>{children}</Heading>
    : <Paragraph variant={style.variant} tone={tone} align={align}>{children}</Paragraph>;
}

export function WidgetTypography() {
  const [group, setGroup] = useState('headings'), [selected, setSelected] = useState('h2');
  const [text, setText] = useState('Your next chapter starts here.');
  const [tone, setTone] = useState('default'), [align, setAlign] = useState('start');
  const [showCode, setShowCode] = useState(false);
  const playground = useRef(null);
  const current = styles.find(style => style.id === selected);
  const component = current.group === 'headings' ? 'Heading' : ['label','overline','caption'].includes(current.variant) ? 'Text' : 'Paragraph';
  const attributes = current.group === 'headings' ? ` level={${current.level}}${current.size === 'display' ? ' size="display"' : ''}` : current.variant === 'body' ? '' : ` variant="${current.variant}"`;
  const snippet = `import { ${component} } from '@cloudgatedevs/cloudgate-client-react/react/widgets';\n\n<${component}${attributes}${tone === 'default' ? '' : ` tone="${tone}"`}${align === 'start' ? '' : ` align="${align}"`}>\n  {${JSON.stringify(text)}}\n</${component}>`;
  function choose(style) { setSelected(style.id); setText(style.sample || 'Your next chapter starts here.'); }
  return <div className="cgw-type-demo">
    <div className="cgw-type-playground" ref={playground} tabIndex={-1} role="region" aria-label="Text playground">
      <div className="cgw-type-playground-head"><div><Text variant="overline" tone="accent">Make it your own</Text><Heading level={3} size="h5">Type playground</Heading></div>
        <Button variant="secondary" size="sm" onClick={() => setShowCode(value => !value)} aria-expanded={showCode}>{showCode ? 'Hide code' : 'Show code'}</Button></div>
      <div className="cgw-type-options">
        <Select label="Text style" value={selected} onChange={event => choose(styles.find(style => style.id === event.target.value))} options={styles.map(style => ({value:style.id,label:style.name}))} />
        <Select label="Text tone" value={tone} onChange={event => setTone(event.target.value)} options={['default','muted','accent','success','warning','danger','info'].map(value => ({value,label:value[0].toUpperCase()+value.slice(1)}))} />
        <Select label="Text alignment" value={align} onChange={event => setAlign(event.target.value)} options={[{value:'start',label:'Start'},{value:'center',label:'Center'},{value:'end',label:'End'}]} />
      </div>
      <Textarea label="Preview text" value={text} onChange={event => setText(event.target.value)} rows={2} />
      <div className="cgw-type-live" aria-label="Live text preview"><Sample style={current} tone={tone} align={align}>{text || 'Your text preview'}</Sample></div>
      {showCode && <CodeEditor label="Text style React code" value={snippet} minHeight="130px" maxHeight="280px" />}
    </div>
    <div className="cgw-type-scale-head"><div><Heading level={3} size="h5">A consistent type scale</Heading><Paragraph variant="small" tone="muted">Choose a style to try it above. Font sizes stay readable in every layout.</Paragraph></div>
      <Tabs label="Text style group" value={group} onChange={setGroup} items={[{value:'headings',label:'Headings'},{value:'body',label:'Body & labels'}]} /></div>
    <ul className="cgw-type-scale" aria-label="Text style samples">
      {styles.filter(style => style.group === group).map(style => <li key={style.id} data-selected={selected === style.id || undefined}>
        <div className="cgw-type-spec-label"><Text variant="label">{style.name}</Text><Text variant="caption" tone="muted">{style.use}</Text></div>
        <div className="cgw-type-spec-sample"><Sample style={style} tone={style.variant === 'overline' ? 'accent' : 'default'}>{style.sample || 'Built for what’s next.'}</Sample></div>
        <Button size="sm" variant="ghost" icon={selected === style.id ? Check : ArrowUpRight} aria-label={`Try ${style.name.toLowerCase()}`} aria-pressed={selected === style.id} onClick={() => {choose(style); setShowCode(true); playground.current?.focus({preventScroll:true}); playground.current?.scrollIntoView({block:'start', behavior:'instant'});}}>Use</Button>
      </li>)}
    </ul>
    <div className="cgw-type-scale-head" id="text-elements"><div><Heading level={3} size="h5">Everyday text elements</Heading><Paragraph variant="small" tone="muted">Compose readable content with the same shared styles.</Paragraph></div></div>
    <div className="cgw-type-elements">
      <section><Text variant="overline" tone="accent">Paragraphs & emphasis</Text><Heading level={4} size="h4">Make every word count.</Heading>
        <Paragraph>A clear introduction sets the scene. Use <strong>bold for emphasis</strong>, <em>italics for a change in voice</em>, and <InlineCode>project.name</InlineCode> for a short code reference.</Paragraph>
        <Paragraph variant="small" tone="muted">Supporting text should help someone take the next step.</Paragraph><TextLink href="#text-elements">Explore text elements</TextLink></section>
      <section><Text variant="overline" tone="accent">Lists</Text><Heading level={4} size="h4">Give ideas a little order.</Heading>
        <TextList><li>Keep each point focused.</li><li>Use a consistent voice.</li><li>Make the next step clear.</li></TextList>
        <TextList ordered compact><li>Choose a template.</li><li>Make it your own.</li><li>Share it with your team.</li></TextList></section>
      <section><Text variant="overline" tone="accent">Quotes & supporting text</Text><Blockquote attribution="A note from the design team"><Paragraph>Consistency makes an interface feel familiar, even when you are trying something new.</Paragraph></Blockquote>
        <Text variant="caption" tone="muted">A caption adds context without competing with the main story.</Text></section>
    </div>
    <Paragraph variant="small" tone="muted">Choose heading levels for the document structure; use <InlineCode>size</InlineCode> to adjust their appearance. Text labels here are for display—use labelled input widgets for form fields.</Paragraph>
  </div>;
}
