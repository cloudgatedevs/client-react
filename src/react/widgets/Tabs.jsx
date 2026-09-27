import {useEffect, useId, useRef, useState} from 'react';

const variants = new Set(['segmented','underline','pills','outline','enclosed']);
export function Tabs({label='Sections',items=[],value,onChange,className='',variant='segmented',orientation='horizontal',size='md',fullWidth=false,activationMode='automatic',keepMounted=true,disabled=false,dir}) {
  const id=useId(),refs=useRef(new Map());
  const enabled=items.filter(item=>!disabled && !item.disabled);
  // A removed/disabled selection must not leave the whole control outside the tab order.
  const activeValue=enabled.find(item=>item.value===value)?.value ?? enabled[0]?.value ?? items.find(item=>item.value===value)?.value ?? items[0]?.value;
  const [focusedValue,setFocusedValue]=useState(activeValue);
  useEffect(()=>setFocusedValue(activeValue),[activeValue]);
  const tabStop=enabled.some(item=>item.value===focusedValue)?focusedValue:activeValue;
  const hasPanels=items.some(item=>item.content!==undefined),vertical=orientation==='vertical';
  function choose(next){if(!disabled && enabled.some(item=>item.value===next)) {setFocusedValue(next);if(next!==value)onChange?.(next);}}
  function onKeyDown(event,itemValue) {
    const backward=vertical?'ArrowUp':'ArrowLeft',forward=vertical?'ArrowDown':'ArrowRight';
    if(![backward,forward,'Home','End'].includes(event.key) || !enabled.length) return;
    event.preventDefault();
    const rtl=!vertical && (dir || (typeof getComputedStyle==='function'?getComputedStyle(event.currentTarget).direction:'ltr'))==='rtl';
    const step=(event.key===forward?1:-1)*(rtl?-1:1),index=enabled.findIndex(item=>item.value===itemValue);
    const next=event.key==='Home'?enabled[0]:event.key==='End'?enabled.at(-1):enabled[(index+step+enabled.length)%enabled.length];
    setFocusedValue(next.value);
    const target=refs.current.get(next.value);
    target?.focus({preventScroll:true});
    target?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});
    if(activationMode!=='manual') choose(next.value);
  }
  return <div dir={dir} className={`cgw-tabs cgw-tabs--${variants.has(variant)?variant:'segmented'} cgw-tabs--${vertical?'vertical':'horizontal'} cgw-tabs--${['sm','md','lg'].includes(size)?size:'md'} ${fullWidth?'cgw-tabs--full':''} ${className}`}>
    <div className="cgw-tablist" role={hasPanels?'tablist':'group'} aria-label={label} aria-orientation={hasPanels?(vertical?'vertical':'horizontal'):undefined}>
      {items.map(item=>{
        const selected=item.value===activeValue,key=encodeURIComponent(item.value);
        return <button key={item.value} ref={node=>{if(node)refs.current.set(item.value,node);else refs.current.delete(item.value);}}
          type="button" role={hasPanels?'tab':undefined} id={`${id}-tab-${key}`} aria-selected={hasPanels?selected:undefined}
          aria-pressed={!hasPanels?selected:undefined} aria-controls={hasPanels?`${id}-panel-${key}`:undefined}
          tabIndex={!disabled && !item.disabled && item.value===tabStop?0:-1} disabled={disabled || item.disabled}
          onClick={()=>choose(item.value)} onFocus={()=>setFocusedValue(item.value)} onKeyDown={event=>onKeyDown(event,item.value)}>
          {item.icon && <item.icon size={16} aria-hidden="true" />}{item.label}
          {item.count!=null && <span className="cgw-tab-count">{item.count}</span>}
        </button>;
      })}
    </div>
    {hasPanels && <div className="cgw-tabpanels">{items.map(item=>{
      const selected=item.value===activeValue,key=encodeURIComponent(item.value);
      return <div key={item.value} role="tabpanel" id={`${id}-panel-${key}`} aria-labelledby={`${id}-tab-${key}`} hidden={!selected} tabIndex={0} className="cgw-tabpanel">
        {(keepMounted || selected) && item.content}
      </div>;
    })}</div>}
  </div>;
}
