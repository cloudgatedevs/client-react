import { Component, forwardRef, lazy, Suspense, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Button, Skeleton } from './primitives.jsx';
import { useFieldValidation, useFormValue } from './Form.jsx';
import { richTextSummary, sanitizeRichText } from './rich-text-model.js';

const Editor=lazy(()=>import('./RichTextEditorContent.jsx'));
class EditorBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error){this.props.onError?.(error);}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}
const loadingView=minHeight=><div className="cgw-rich-loading" role="status" aria-label="Loading rich text editor" style={{minHeight}}><Skeleton width="62%" /><Skeleton width="90%" /><Skeleton width="78%" /><Skeleton width="86%" /><Skeleton width="45%" /></div>;

export const RichTextEditor=forwardRef(function RichTextEditor({
  value='',onChange,label='Rich text',id:providedId,name,hint,error,required=false,disabled=false,readOnly=false,
  loading=false,toolbar='standard',placeholder='Start writing…',minHeight='220px',maxHeight='480px',
  licenseKey='GPL',uploadImage,onPendingChange,onError,onBlur,validate,maxLength,className='',
},ref) {
  const uid=useId(),id=providedId || `cgw-rich-${uid}`,editor=useRef(null),proxy=useRef(null),lastEdit=useRef(null);
  const [mounted,setMounted]=useState(false),[ready,setReady]=useState(false),[pending,setPending]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>setMounted(true),[]);
  const html=useMemo(()=>mounted?sanitizeRichText(value):'',[value,mounted]);
  const summary=useMemo(()=>richTextSummary(html),[html]);
  const locked=readOnly || !onChange;
  const busy=loading || !ready || pending;
  const pendingCallback=useRef(onPendingChange);pendingCallback.current=onPendingChange;
  useEffect(()=>{pendingCallback.current?.(busy);},[busy]);
  useEffect(()=>()=>pendingCallback.current?.(false),[]);
  useImperativeHandle(ref,()=>({focus:()=>editor.current?.editing.view.focus()}),[]);
  const validation=useFieldValidation({id,error,props:{value:summary.text,required,disabled:disabled || loading,readOnly:locked},validate:(_text,data)=>{
    if(failed) return 'The editor is unavailable. Try again before saving.';
    if(!ready || pending) return 'Wait for the editor and image uploads to finish.';
    if(required && !summary.hasContent) return 'Enter some content.';
    if(maxLength!=null && summary.characters>maxLength) return `Use no more than ${maxLength} characters.`;
    return validate?.(html,data);
  }},node=>{proxy.current=node;});
  useFormValue(html);
  const issue=error || validation.error;
  function change(next) {
    if(disabled || locked || loading) return;
    const clean=sanitizeRichText(next);
    // A parent's echo of sanitized HTML must not call CKEditor's setData and erase
    // undo/selection (CKEditor adds internal list IDs and canonicalizes markup).
    lastEdit.current={html:clean,editorHtml:next};
    onChange?.(clean,richTextSummary(clean));
  }
  function handleError(problem){setFailed(true);setReady(false);setPending(false);onError?.(problem);}
  const fallback=<Alert tone="danger" title="Could not load the editor">Your content is retained.
    <Button size="sm" variant="secondary" disabled={disabled} onClick={()=>{setFailed(false);setReady(false);setAttempt(n=>n+1);}}>Try again</Button></Alert>;
  return <div className={`cgw-field cgw-rich-field ${issue?'cgw-field--error':''} ${className}`}>
    {label && <label id={`${id}-label`} onClick={()=>editor.current?.editing.view.focus()}>{label}{required && <span className="cgw-required" aria-hidden="true"> *</span>}</label>}
    <div className={`cgw-rich-editor ${locked?'cgw-rich-editor--readonly':''} ${disabled?'cgw-rich-editor--disabled':''} ${issue?'cgw-rich-editor--error':''}`} aria-busy={busy || undefined}
      style={{'--cgw-rich-min':minHeight,'--cgw-rich-max':maxHeight}}>
      {!mounted || loading ? loadingView(minHeight) : failed ? fallback : <EditorBoundary key={attempt} onError={handleError} fallback={fallback}>
        <Suspense fallback={loadingView(minHeight)}><Editor value={lastEdit.current?.html===html?lastEdit.current.editorHtml:html} onChange={change} toolbar={toolbar} placeholder={placeholder} licenseKey={licenseKey}
          disabled={disabled || locked} readOnly={locked} labelId={`${id}-label`} id={id} describedBy={hint || issue?`${id}-help`:undefined} invalid={!!issue} required={required}
          uploadImage={uploadImage} onPendingChange={setPending} onReady={instance=>{editor.current=instance;setReady(true);}}
          onDestroy={()=>{editor.current=null;setReady(false);}} onError={handleError}
          onBlur={()=>{validation.bindings.onBlur({target:proxy.current});onBlur?.(html);}} /></Suspense>
      </EditorBoundary>}
      {!loading && <div className="cgw-rich-footer"><span>{summary.words} {summary.words===1?'word':'words'} · {summary.characters}{maxLength!=null?` / ${maxLength}`:''} characters</span><span>{disabled?'Disabled':locked?'Read only':pending?'Uploading image…':'Rich text · HTML'}</span></div>}
    </div>
    <textarea {...validation.bindings} className="cgw-rich-validation" aria-hidden="true" tabIndex={-1} value={summary.text || (summary.hasContent?'[image]':'')}
      disabled={disabled || loading} readOnly={locked} onChange={()=>{}} onFocus={()=>editor.current?.editing.view.focus()} />
    {name && <input type="hidden" name={name} value={html} disabled={disabled || loading} />}
    {(hint || issue) && <p className="cgw-field-help" id={`${id}-help`} role={issue?'alert':undefined}>{issue || hint}</p>}
  </div>;
});
export const WysiwygEditor=RichTextEditor;

/** Safe client-side HTML rendering, with the same content typography as the editor. */
export function RichTextContent({value='',label='Rich text content',className=''}) {
  const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);
  const html=useMemo(()=>mounted?sanitizeRichText(value):'',[value,mounted]);
  return <div className={`cgw-rich-content ck-content ${className}`} role="region" aria-label={label} dangerouslySetInnerHTML={{__html:html}} />;
}
