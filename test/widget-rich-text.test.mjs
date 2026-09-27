import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import createDOMPurify from 'dompurify';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {sanitizeRichText,richTextSummary,safeRichTextUrl,createRichTextUploadAdapter} from '../src/react/widgets/rich-text-model.js';
const window=new JSDOM('').window,purifier=createDOMPurify(window);
const clean=value=>sanitizeRichText(value,purifier);

test('rich content removes executable markup, tracking CSS and unsafe navigation while preserving supported formatting',()=>{
  const html=clean('<h2 onclick="alert(1)">Hello</h2><script>alert(1)</script><iframe src="/bad"></iframe><svg onload="alert(1)"></svg><p style="position:fixed;background-image:url(https://example.invalid);color:red">Text <strong>bold</strong></p><a href="java&#x0a;script:alert(1)">bad</a><img src="data:image/svg+xml,test" onerror="alert(1)"><a href="https://example.com" target="_blank">Good</a>');
  assert.doesNotMatch(html,/script|iframe|svg|onclick|onerror|position|background-image|data:image|alert\(1\)/i);
  assert.match(html,/<h2>Hello<\/h2>/);assert.match(html,/<strong>bold<\/strong>/);
  assert.match(html,/color:\s*red/);assert.match(html,/rel="noopener noreferrer"/);
  assert.equal(sanitizeRichText('<strong>unsafe on server</strong>',{}),'');
});
test('rich text round-trips fonts, highlights, tables, code and image descriptions',()=>{
  const html=clean('<p><span class="text-big injected-class">Big</span><mark class="marker-yellow">Marked</mark></p><figure class="table"><table><tbody><tr><td colspan="2" style="width:50%">Cell</td></tr></tbody></table></figure><pre><code class="language-javascript">const n = 1;</code></pre><figure class="image image-style-side"><img src="/media/photo.png" alt="A mountain"><figcaption>A view</figcaption></figure>');
  assert.match(html,/class="text-big"/);assert.doesNotMatch(html,/injected-class/);
  assert.match(html,/colspan="2"/);assert.match(html,/language-javascript/);assert.match(html,/alt="A mountain"/);
  assert.equal(clean(html),html);
});
test('required content ignores blank rich markup and word counts preserve block boundaries and Unicode',()=>{
  assert.equal(richTextSummary(clean('<p>&nbsp;<br></p><p>\u200b</p>'),window.document).hasContent,false);
  assert.deepEqual(richTextSummary(clean('<p>Hello</p><p>world 🌍</p>'),window.document),{text:'Hello world 🌍',words:3,characters:13,hasContent:true});
  assert.equal(richTextSummary(clean('<img src="/picture.png" alt="Photo">'),window.document).hasContent,true);
  assert.equal(richTextSummary(clean('<img src="javascript:alert(1)">'),window.document).hasContent,false);
  assert.equal(safeRichTextUrl('mailto:hello@example.com',{image:true}),'');
});
test('image uploads report progress, validate results and abort without returning stale URLs',async()=>{
  const file={name:'photo.png'},loader={file:Promise.resolve(file)};
  const adapter=createRichTextUploadAdapter(loader,async(input,{onProgress})=>{assert.equal(input,file);onProgress({loaded:10,total:20});return {url:'/media/photo.png'};});
  assert.deepEqual(await adapter.upload(),{default:'/media/photo.png'});assert.equal(loader.uploaded,10);assert.equal(loader.uploadTotal,20);
  await assert.rejects(createRichTextUploadAdapter(loader,async()=>({url:'javascript:alert(1)'})).upload(),/valid image URL/);
  let finish,signal;
  const cancelled=createRichTextUploadAdapter(loader,async(_file,options)=>{signal=options.signal;return new Promise(resolve=>{finish=resolve;});});
  const promise=cancelled.upload();await Promise.resolve();cancelled.abort();assert.equal(signal.aborted,true);
  finish({url:'/late.png'});await assert.rejects(promise,{name:'AbortError'});
});

test('controlled sanitized HTML retains editor history, while external replacements still update the editor',async()=>{
  const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/react/widgets/RichTextEditor.jsx',import.meta.url))],
    bundle:true,write:false,format:'cjs',platform:'node',packages:'external',external:['react'],jsx:'automatic',logLevel:'silent',
    plugins:[{name:'editor-browser-boundary',setup(builder){
      builder.onResolve({filter:/RichTextEditorContent\.jsx$/},()=>({path:'editor',namespace:'test-editor'}));
      builder.onLoad({filter:/.*/,namespace:'test-editor'},()=>({contents:"import React from 'react'; export default props=>React.createElement('editor-probe',props);",loader:'jsx'}));
    }}]});
  const module={exports:{}},require=createRequire(import.meta.url);
  new Function('require','module','exports',compiled.outputFiles[0].text)(name=>name==='dompurify'?purifier:require(name),module,module.exports);
  const oldDocument=globalThis.document;globalThis.document=window.document;
  let view,latest;
  const onChange=html=>{latest=html;};
  const render=value=>React.createElement(module.exports.RichTextEditor,{value,onChange,name:'body'});
  try {
    await act(async()=>{view=create(render('<p>Start</p>'));});
    const raw='<ul><li data-list-item-id="stable-id"><strong>Draft</strong></li></ul>';
    await act(async()=>view.root.findByType('editor-probe').props.onChange(raw));
    assert.equal(latest,'<ul><li><strong>Draft</strong></li></ul>');
    await act(async()=>view.update(render(latest)));
    assert.equal(view.root.findByType('editor-probe').props.value,raw,'the editor must not receive a stripped echo that resets history');
    assert.equal(view.root.findByProps({type:'hidden'}).props.value,latest,'only sanitized HTML is submitted');
    await act(async()=>view.update(render('<p>A different draft</p>')));
    assert.equal(view.root.findByType('editor-probe').props.value,'<p>A different draft</p>');
  } finally {if(view) await act(async()=>view.unmount());globalThis.document=oldDocument;}
});
