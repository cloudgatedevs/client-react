import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Alert, Button, Card, Select, Tabs } from '../widgets/primitives.jsx';
import { Form } from '../widgets/Form.jsx';
import { RichTextContent, RichTextEditor } from '../widgets/RichTextEditor.jsx';
import { CodeEditor } from '../widgets/CodeEditor.jsx';

const starter='<h2>A thoughtful welcome</h2><p>Bring your ideas to life with <strong>rich text</strong> that feels at home in your app.</p><ul><li>Write a product story, a course lesson or a help article.</li><li>Add structure with headings, lists and tables.</li><li>Make important details <em>easy to find</em>.</li></ul><blockquote><p>Good content starts with a clear message.</p></blockquote>';
export function WidgetRichText({state='ready'}) {
  const [value,setValue]=useState(state==='empty'?'':starter),[toolbar,setToolbar]=useState('standard'),[tab,setTab]=useState('rendered'),[pending,setPending]=useState(false),[saved,setSaved]=useState('');
  const disabled=state==='disabled',readOnly=state==='readonly';
  return <div className="cgw-stack">
    <div className="cgw-row cgw-rich-demo-controls"><Select label="Toolbar" value={toolbar} onChange={event=>setToolbar(event.target.value)} options={[{value:'basic',label:'Basic'},{value:'standard',label:'Standard'},{value:'full',label:'Full'}]} />
      <span className="cgw-muted">The same CKEditor 5 engine used in Cloudgate React.</span></div>
    <Form onSubmit={data=>setSaved(String(data.get('body')))} onReset={()=>{setValue(starter);setSaved('');}} className="cgw-stack">
      <RichTextEditor key={`${state}-${toolbar}`} name="body" label="Content" required value={value} onChange={html=>{setValue(html);setSaved('');}}
        toolbar={toolbar} loading={state==='loading'} disabled={disabled} readOnly={readOnly} error={state==='error'?'This draft could not be saved. Review the content and try again.':undefined}
        onPendingChange={setPending} hint="Format text, add a link or insert a table. Your draft stays in this example." />
      <div className="cgw-row"><Button type="submit" icon={Check} disabled={disabled || readOnly || pending}>Save sample</Button>
        <Button type="reset" variant="secondary" icon={RotateCcw} disabled={disabled || readOnly || pending}>Reset sample</Button></div>
      {saved && <Alert tone="success">The HTML draft was captured by the form. Nothing was sent to a server.</Alert>}
    </Form>
    <Card title="Live output" description="The same value, displayed as formatted content or HTML source.">
      <Tabs label="Rich text output" value={tab} onChange={setTab} items={[{value:'rendered',label:'Formatted content'},{value:'html',label:'HTML source'}]} />
      <div className="cgw-rich-demo-output">{tab==='html'?<CodeEditor value={value} language="html" label="Editor HTML output" minHeight="160px" />:<RichTextContent value={value} label="Formatted editor output" />}</div>
    </Card>
  </div>;
}
