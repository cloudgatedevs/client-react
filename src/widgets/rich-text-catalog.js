export const richTextWidget={
  id:'wysiwyg',name:'WYSIWYG editor',category:'Forms',exports:['RichTextEditor','WysiwygEditor','RichTextContent'],
  description:'CKEditor 5 rich-text editing for product descriptions, lessons, articles and messages, with HTML output and form validation.',
  props:[
    {name:'value / onChange',type:'string / (html, summary)=>void',description:'Controlled HTML. onChange receives allowlisted HTML and {text,words,characters,hasContent}. Missing onChange makes the editor read-only. WysiwygEditor is an alias.'},
    {name:'toolbar',type:"'basic' | 'standard' | 'full' | 'none'",description:'Standard by default. Basic offers inline formatting, lists and links; full adds fonts, alignment, highlights, code blocks and more. Changing toolbar recreates the editor and resets undo history.'},
    {name:'label / name / hint / error / required / maxLength / validate',type:'field props',description:'Use a label. name submits HTML in FormData; required checks meaningful text or an image, maxLength counts Unicode text characters. validate(html,formData) returns an error string. Form focuses the editor on invalid submission. Controlled values reset in the caller.'},
    {name:'loading / disabled / readOnly',type:'boolean',description:'Loading shows skeletons. Disabled omits named HTML from FormData; read-only allows reading and submits the value without validation. Read-only hides the toolbar.'},
    {name:'placeholder / minHeight / maxHeight',type:'string',description:'Editable area defaults 220px–480px. Toolbar wraps; vertical scrolling can continue to the page.'},
    {name:'uploadImage',type:'(file,{signal,onProgress})=>Promise<{url}>',description:'Optional adapter for your own authenticated image endpoint. Forward signal; optionally call onProgress({loaded,total}). Only HTTP(S) and relative image URLs are accepted. Without it, images can be inserted by URL; no upload server is assumed.'},
    {name:'onPendingChange / onError / onBlur / ref',type:'callbacks / RichTextEditorHandle',description:'Pending covers startup, external loading and image uploads. Disable saves while pending. onError receives initialization failures; retry preserves the controlled value. ref exposes focus(). onBlur receives current HTML.'},
    {name:'licenseKey',type:'string',description:"Defaults to 'GPL', matching Cloudgate React. CKEditor licensing applies to consuming apps; pass an applicable commercial license key when required. No premium package is bundled."},
    {name:'RichTextContent',type:'{value,label?,className?}',description:'Client-side allowlisted HTML display with matching typography. Scripts, frames, event handlers, unsafe URLs and arbitrary CSS are removed. Independently sanitize and authorize HTML at the server before publishing. This is rich content, not arbitrary HTML/page embedding.'},
  ],
  example:`import { useState } from 'react';
import { Form, Button, RichTextEditor, RichTextContent, Alert } from '@cloudgatedevs/cloudgate-client-react/react/widgets';

export default function Example() {
  const [html,setHtml]=useState('<h2>Your next lesson</h2><p>Start with a <strong>clear idea</strong>.</p>');
  const [pending,setPending]=useState(false), [saved,setSaved]=useState(false);
  return <Form className="cgw-stack" onSubmit={data=>{
    // data.get('body') contains HTML. Validate/sanitize and save through your authorized API.
    setSaved(true);
  }} onReset={()=>{setHtml('');setSaved(false);}}>
    <RichTextEditor name="body" label="Lesson content" required value={html}
      onChange={value=>{setHtml(value);setSaved(false);}} toolbar="full" onPendingChange={setPending} />
    <div className="cgw-row"><Button type="submit" disabled={pending}>Save example</Button>
      <Button type="reset" variant="secondary" disabled={pending}>Clear</Button></div>
    {saved && <Alert tone="success">Example form validated. No API request was made.</Alert>}
    <RichTextContent value={html} label="Lesson preview" />
  </Form>;
}`,
};
