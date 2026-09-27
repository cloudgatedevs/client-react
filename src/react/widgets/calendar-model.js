export const CALENDAR_VIEWS={month:'dayGridMonth',week:'timeGridWeek',day:'timeGridDay',agenda:'listMonth'};
export const CALENDAR_VIEW_LABELS={month:'Month',week:'Week',day:'Day',agenda:'Agenda'};
const tones=new Set(['accent','neutral','success','warning','danger','info']);
const datePattern=/^(\d{4})-(\d{2})-(\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/;

export function calendarDate(value) {
  const text=value instanceof Date?(Number.isFinite(+value)?value.toISOString():''):String(value ?? '');
  const match=datePattern.exec(text);
  if(!match) throw new Error('Calendar dates must be valid ISO dates or date-times.');
  const [,year,month,day]=match;
  const check=new Date(0);check.setUTCFullYear(+year,+month-1,+day);
  if(check.getUTCFullYear()!==+year || check.getUTCMonth()!==+month-1 || check.getUTCDate()!==+day || (text.length>10 && !Number.isFinite(Date.parse(text)))) {
    throw new Error('Calendar dates must be valid ISO dates or date-times.');
  }
  return text;
}

/** Only pass supported fields to the engine: records cannot inject HTML or navigation. */
export function prepareCalendarEvents(events) {
  if(!Array.isArray(events)) throw new Error('Calendar events must be an array.');
  const ids=new Set();
  return events.map(event=>{
    if(!event || !['string','number'].includes(typeof event.id) || (typeof event.id==='number' && !Number.isFinite(event.id)) || String(event.id).trim()==='' || typeof event.title!=='string' || !event.title.trim()) throw new Error('Each calendar event needs a unique id and a title.');
    const id=String(event.id);
    if(ids.has(id)) throw new Error('Calendar event ids must be unique.');
    ids.add(id);
    const start=calendarDate(event.start),end=event.end==null?undefined:calendarDate(event.end);
    const allDay=event.allDay ?? start.length===10;
    if(typeof allDay!=='boolean') throw new Error('allDay must be a boolean.');
    if(allDay && (start.length!==10 || (end && end.length!==10))) throw new Error('All-day events need YYYY-MM-DD dates.');
    if(!allDay && (start.length===10 || (end && end.length===10))) throw new Error('Timed events need ISO date-times.');
    if(end && Date.parse(end)<=Date.parse(start)) throw new Error('An event end must be after its start (exclusive).');
    const tone=tones.has(event.tone)?event.tone:'accent';
    const token=tone==='accent'?'--accent':tone==='neutral'?'--ink-700':`--cgw-${tone}`;
    const foreground=tone==='accent'?'--accent-fg':tone==='neutral'?'--mist':`--cgw-${tone}-fg`;
    return {id,title:String(event.title),start,end,allDay,
      color:`rgb(var(${token}))`,contrastColor:`rgb(var(${foreground}))`,
      extendedProps:{record:event,tone}};
  });
}

/** Each visible range owns its request. Even a loader that ignores abort cannot win late. */
export function createCalendarLoader(loadEvents,onState) {
  let controller,generation=0;
  return {
    async load(info) {
      controller?.abort();controller=new AbortController();
      const current=++generation,signal=controller.signal;
      onState({loading:true,error:null});
      try {
        const result=await loadEvents({start:info.startStr,end:info.endStr,timeZone:info.timeZone,signal});
        if(current!==generation || signal.aborted) return [];
        const events=prepareCalendarEvents(result);
        onState({loading:false,error:null});return events;
      } catch(error) {
        if(current!==generation || signal.aborted) return [];
        onState({loading:false,error:error?.message || 'Could not load calendar events.'});return [];
      }
    },
    abort(){generation++;controller?.abort();},
  };
}
