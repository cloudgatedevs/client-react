import { useEffect, useMemo, useRef, useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import { Alignment, BlockQuote, Bold, ClassicEditor, Code, CodeBlock, Essentials, FontFamily, FontSize, Heading, Highlight,
  HorizontalLine, Image, ImageCaption, ImageInsertViaUrl, ImageStyle, ImageToolbar, ImageUpload, Indent, IndentBlock,
  Italic, Link, List, ListProperties, Paragraph, PasteFromOffice, PendingActions, RemoveFormat, Strikethrough,
  Table, TableCaption, TableCellProperties, TableColumnResize, TableProperties, TableToolbar, Underline } from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import { createRichTextUploadAdapter } from './rich-text-model.js';

const basePlugins=[Essentials,PendingActions,Paragraph,Heading,Bold,Italic,Underline,Strikethrough,Code,Link,List,ListProperties,
  BlockQuote,Alignment,Indent,IndentBlock,FontFamily,FontSize,Highlight,RemoveFormat,PasteFromOffice,CodeBlock,HorizontalLine,
  Table,TableToolbar,TableProperties,TableCellProperties,TableColumnResize,TableCaption,Image,ImageCaption,ImageStyle,ImageToolbar,ImageInsertViaUrl];
const toolbars={
  basic:['undo','redo','|','bold','italic','underline','|','link','bulletedList','numberedList'],
  standard:['undo','redo','|','heading','|','bold','italic','underline','strikethrough','|','link','bulletedList','numberedList','blockQuote','|','insertTable','insertImageViaUrl','removeFormat'],
  full:['undo','redo','|','heading','fontFamily','fontSize','|','bold','italic','underline','strikethrough','code','highlight','|',
    'link','bulletedList','numberedList','outdent','indent','alignment','|','blockQuote','codeBlock','horizontalLine','insertTable','insertImageViaUrl','removeFormat'],
};
const paletteTokens=['--accent','--accent-fg','--accent-text','--mist','--mist-muted','--mist-dim','--secondary',
  ...[950,900,850,800,700,600,500].map(shade=>`--ink-${shade}`),...['success','warning','danger','info'].map(tone=>`--cgw-${tone}`)];

export default function RichTextEditorContent(props) {
  const wrapper=useRef(null),latest=useRef(props);latest.current=props;
  const [instance,setInstance]=useState(null);
  const hasUpload=typeof props.uploadImage==='function';
  const config=useMemo(()=>({
    licenseKey:props.licenseKey,placeholder:props.placeholder,
    plugins:[...basePlugins,...(hasUpload?[ImageUpload]:[])],
    extraPlugins:hasUpload?[editor=>{editor.plugins.get('FileRepository').createUploadAdapter=loader=>
      createRichTextUploadAdapter(loader,(...args)=>latest.current.uploadImage(...args));}]:[],
    toolbar:{items:[...(toolbars[props.toolbar] || toolbars.standard),...(hasUpload?['uploadImage']:[])],shouldNotGroupWhenFull:true},
    menuBar:{isVisible:false},
    heading:{options:[{model:'paragraph',title:'Paragraph',class:'ck-heading_paragraph'},
      {model:'heading2',view:'h2',title:'Heading 2',class:'ck-heading_heading2'},
      {model:'heading3',view:'h3',title:'Heading 3',class:'ck-heading_heading3'},
      {model:'heading4',view:'h4',title:'Heading 4',class:'ck-heading_heading4'}]},
    fontFamily:{options:['default','Arial, Helvetica, sans-serif','Georgia, serif','Courier New, monospace']},
    fontSize:{options:['tiny','small','default','big','huge']},
    link:{defaultProtocol:'https://',addTargetToExternalLinks:true,allowedProtocols:['http','https','mailto','tel']},
    list:{properties:{styles:true,startIndex:true,reversed:true}},
    table:{contentToolbar:['tableColumn','tableRow','mergeTableCells','toggleTableCaption','tableProperties','tableCellProperties']},
    image:{toolbar:['imageTextAlternative','toggleImageCaption','imageStyle:inline','imageStyle:block','imageStyle:side']},
    codeBlock:{languages:[{language:'plaintext',label:'Plain text'},{language:'javascript',label:'JavaScript'},{language:'html',label:'HTML'},{language:'css',label:'CSS'},{language:'json',label:'JSON'}]},
  }),[props.licenseKey,props.placeholder,props.toolbar,hasUpload]);

  useEffect(()=>{
    if(!instance) return;
    const root=instance.editing.view.document.getRoot();
    instance.editing.view.change(writer=>{
      writer.setAttribute('id',props.id,root);
      writer.setAttribute('aria-labelledby',props.labelId,root);
      writer.setAttribute('aria-readonly',String(props.readOnly),root);
      writer.setAttribute('aria-disabled',String(props.disabled && !props.readOnly),root);
      writer.setAttribute('aria-required',String(props.required),root);
      writer.setAttribute('aria-invalid',String(props.invalid),root);
      if(props.describedBy) writer.setAttribute('aria-describedby',props.describedBy,root); else writer.removeAttribute('aria-describedby',root);
    });
    instance.ui.view.toolbar.element.hidden=props.readOnly || props.toolbar==='none';
  },[instance,props.id,props.labelId,props.readOnly,props.disabled,props.required,props.invalid,props.describedBy,props.toolbar]);

  useEffect(()=>{
    if(!instance) return;
    // CKEditor's per-instance popovers live under document.body. Carry scoped preview tokens there too.
    const portal=instance.ui.view.body.bodyCollectionContainer;
    if(!portal) return;
    portal.classList.add('cgw-rich-portal');
    const sync=()=>{const style=getComputedStyle(wrapper.current);for(const token of paletteTokens) portal.style.setProperty(token,style.getPropertyValue(token));portal.style.fontFamily=style.fontFamily;};
    sync();
    const observer=new MutationObserver(sync);
    for(let node=wrapper.current;node;node=node.parentElement) observer.observe(node,{attributes:true,attributeFilter:['style','class','data-theme']});
    const pending=instance.plugins.get('PendingActions'),change=()=>latest.current.onPendingChange(pending.hasAny);
    pending.on('change:hasAny',change);change();
    return ()=>{observer.disconnect();pending.off('change:hasAny',change);};
  },[instance]);

  return <div ref={wrapper} className="cgw-rich-engine"><CKEditor key={`${props.toolbar}-${hasUpload}-${props.licenseKey}-${props.placeholder}`}
    editor={ClassicEditor} config={config} data={props.value} disabled={props.disabled} disableWatchdog
    onReady={editor=>{setInstance(editor);latest.current.onReady(editor);}}
    onAfterDestroy={()=>{setInstance(null);latest.current.onDestroy();}}
    onChange={(_event,editor)=>{const data=editor.getData();if(data!==latest.current.value) latest.current.onChange(data);}}
    onBlur={()=>latest.current.onBlur()}
    onError={error=>latest.current.onError(error)} /></div>;
}
