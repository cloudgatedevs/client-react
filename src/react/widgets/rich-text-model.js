import DOMPurify from 'dompurify';

const tags=['p','br','strong','b','em','i','u','s','span','mark','h2','h3','h4','blockquote','ul','ol','li','table','thead','tbody','tfoot','tr','th','td','figure','figcaption','colgroup','col','img','hr','pre','code','sub','sup'];
const styles=new Set(['color','background-color','font-family','font-size','text-align','list-style-type','margin-left','margin-right','width','height','border-color','border-style','border-width','padding','vertical-align']);
const classes=/^(?:image(?:-(?:inline|style-[a-z-]+|resized))?|table|text-(?:tiny|small|big|huge)|marker-(?:yellow|green|pink|blue|grey)|pen-(?:red|green)|language-[a-z0-9-]+)$/;
export function safeRichTextUrl(value,{image=false}={}) {
  const url=String(value || '').trim();
  if(!url || /[\u0000-\u0020\u007f\\]/.test(url)) return '';
  if(/^(?:\/\/|https?:\/\/)/i.test(url)) return url;
  if(!image && /^(?:mailto:|tel:)/i.test(url)) return url;
  if(/^[^:/?#]*:/.test(url)) return '';
  return url;
}

/** Browser-only allowlist: the server must independently sanitize stored/published HTML. */
export function sanitizeRichText(html,purifier=DOMPurify) {
  if(!purifier?.sanitize || !purifier.isSupported) return '';
  const fragment=purifier.sanitize(String(html ?? ''),{ALLOWED_TAGS:[...tags,'a'],
    ALLOWED_ATTR:['href','target','rel','title','src','alt','width','height','colspan','rowspan','scope','start','reversed','type','style','class'],
    ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false,RETURN_DOM_FRAGMENT:true});
  for(const element of fragment.querySelectorAll('*')) {
    if(element.hasAttribute('href')) {
      const href=safeRichTextUrl(element.getAttribute('href'));
      if(href) element.setAttribute('href',href); else element.removeAttribute('href');
      if(element.getAttribute('target')==='_blank') element.setAttribute('rel','noopener noreferrer');
      else { element.removeAttribute('target');element.removeAttribute('rel'); }
    }
    if(element.hasAttribute('src')) {
      const src=safeRichTextUrl(element.getAttribute('src'),{image:true});
      if(src && element.tagName==='IMG') element.setAttribute('src',src); else element.removeAttribute('src');
    }
    if(element.hasAttribute('style')) {
      for(const name of Array.from(element.style)) {
        if(!styles.has(name) || /url\s*\(|expression|var\s*\(|[\\@<>]/i.test(element.style.getPropertyValue(name))) element.style.removeProperty(name);
        else element.style.setProperty(name,element.style.getPropertyValue(name),'');
      }
      if(!element.style.length) element.removeAttribute('style');
    }
    if(element.hasAttribute('class')) {
      const allowed=Array.from(element.classList).filter(name=>classes.test(name));
      if(allowed.length) element.setAttribute('class',allowed.join(' ')); else element.removeAttribute('class');
    }
  }
  const container=fragment.ownerDocument.createElement('div');container.append(fragment);
  return container.innerHTML;
}
export function richTextSummary(html,doc=globalThis.document) {
  if(!doc) return {text:'',words:0,characters:0,hasContent:false};
  const container=doc.createElement('div');container.innerHTML=html;
  for(const block of container.querySelectorAll('p,li,h2,h3,h4,blockquote,tr,pre,br')) block.append(doc.createTextNode(' '));
  const text=(container.textContent || '').replace(/[\u200b-\u200d\ufeff]/g,'').replace(/\s+/g,' ').trim();
  return {text,words:text?text.split(/\s+/u).length:0,characters:Array.from(text).length,hasContent:!!text || !!container.querySelector('img[src]')};
}
export function createRichTextUploadAdapter(loader,uploadImage) {
  const controller=new AbortController();
  return {
    async upload() {
      const file=await loader.file;
      if(controller.signal.aborted) throw new DOMException('Upload cancelled','AbortError');
      const result=await uploadImage(file,{signal:controller.signal,onProgress:({loaded,total})=>{
        if(Number.isFinite(loaded) && Number.isFinite(total) && total>0) {loader.uploadTotal=total;loader.uploaded=loaded;}
      }});
      if(controller.signal.aborted) throw new DOMException('Upload cancelled','AbortError');
      const url=safeRichTextUrl(result?.url,{image:true});
      if(!url) throw new Error('The upload did not return a valid image URL.');
      return {default:url};
    },
    abort(){controller.abort();},
  };
}
