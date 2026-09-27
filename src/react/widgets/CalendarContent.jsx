import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import listPlugin from '@fullcalendar/react/list';
import interactionPlugin from '@fullcalendar/react/interaction';
import themePlugin from '@fullcalendar/react/themes/monarch';
import locales from '@fullcalendar/react/locales-all';
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/monarch/theme.css';
import {CalendarDays,ChevronLeft,ChevronRight,LoaderCircle,Plus,RefreshCw} from 'lucide-react';
import {Alert,Button,IconButton,Input,Select} from './primitives.jsx';
import {CalendarSkeleton} from './Calendar.jsx';
import {CALENDAR_VIEWS,CALENDAR_VIEW_LABELS,calendarDate,prepareCalendarEvents,createCalendarLoader} from './calendar-model.js';

const plugins=[themePlugin,dayGridPlugin,timeGridPlugin,listPlugin,interactionPlugin];
const viewOptions={timeGridWeek:{titleFormat:{year:'numeric',month:'short',day:'numeric'}},timeGridDay:{titleFormat:{weekday:'short',month:'short',day:'numeric',year:'numeric'}}};
const EMPTY=[];
const agendaEvent=info=><div className="cgw-calendar-agenda-event"><span>{info.event.allDay?'All day':info.timeText}</span><strong>{info.event.title}</strong>{info.event.extendedProps.record?.location && <small>{String(info.event.extendedProps.record.location)}</small>}</div>;
export default function CalendarContent({events=EMPTY,loadEvents,reloadKey,initialDate,initialView='month',views=['month','week','day','agenda'],
  label,locale='en',timeZone='local',firstDay=1,weekends=true,height=640,maxEventsPerDay=3,
  loading=false,error,onRetry,disabled=false,readOnly=false,onEventClick,onDateClick,onRangeSelect,onRangeChange}) {
  const calendar=useRef(null),latest=useRef(null),host=useRef(null),portals=useRef(new Set());
  const [period,setPeriod]=useState({title:'Calendar',view:initialView,date:''}),[ready,setReady]=useState(false);
  const [request,setRequest]=useState({loading:false,error:null});
  const permitted=views.filter(view=>view in CALENDAR_VIEWS);
  const startView=permitted.includes(initialView)?initialView:permitted[0] || 'month';
  const parsed=useMemo(()=>{try{return {events:loadEvents?EMPTY:prepareCalendarEvents(events),date:initialDate?calendarDate(initialDate):undefined};}catch(problem){return {events:EMPTY,error:problem.message};}},[events,loadEvents,initialDate]);
  const remote=useMemo(()=>loadEvents?createCalendarLoader(loadEvents,setRequest):null,[loadEvents,reloadKey]);
  useEffect(()=>()=>remote?.abort(),[remote]);
  const problem=error || parsed.error || (remote?request.error:null);
  const busy=loading || (remote && request.loading);
  latest.current={disabled,busy,readOnly,onEventClick,onDateClick,onRangeSelect,onRangeChange};
  const datesSet=useCallback(info=>{
    const api=info.view.calendar;
    const view=Object.keys(CALENDAR_VIEWS).find(key=>CALENDAR_VIEWS[key]===info.view.type) || 'month';
    setPeriod({title:info.view.title,view,date:api.formatIso(api.getDate()).slice(0,10)});setReady(true);
    latest.current.onRangeChange?.({start:info.startStr,end:info.endStr,timeZone:info.timeZone,view});
  },[]);
  const eventClick=useCallback(info=>{info.jsEvent.preventDefault();if(!latest.current.disabled && !latest.current.busy) latest.current.onEventClick?.(info.event.extendedProps.record);},[]);
  const dateClick=useCallback(info=>{const state=latest.current;if(!state.disabled && !state.readOnly && !state.busy) state.onDateClick?.({date:info.dateStr,allDay:info.allDay});},[]);
  const select=useCallback(info=>{const state=latest.current;if(!state.disabled && !state.readOnly && !state.busy) state.onRangeSelect?.({start:info.startStr,end:info.endStr,allDay:info.allDay});calendar.current?.getApi().unselect();},[]);
  const syncPortal=useCallback(element=>{
    if(!host.current) return;
    const style=getComputedStyle(host.current);
    for(const token of Array.from(style)) if(/^--(?:fc-|cgw-|ink-|mist|accent|secondary)/.test(token)) element.style.setProperty(token,style.getPropertyValue(token));
    element.style.fontFamily=style.fontFamily;element.style.fontSize=style.fontSize;
  },[]);
  const mountDayHeader=useCallback(info=>{
    if(!info.inPopover) return;
    const element=info.el.closest('[role="dialog"]');
    if(element){element.classList.add('cgw-calendar-portal');portals.current.add(element);syncPortal(element);}
  },[syncPortal]);
  const unmountDayHeader=useCallback(info=>{if(info.inPopover) portals.current.delete(info.el.closest('[role="dialog"]'));},[]);
  useEffect(()=>{
    const observer=new MutationObserver(()=>portals.current.forEach(syncPortal));
    for(let node=host.current;node;node=node.parentElement) observer.observe(node,{attributes:true,attributeFilter:['style','class','data-theme']});
    return ()=>observer.disconnect();
  },[syncPortal]);
  function apiAction(action){const api=calendar.current?.getApi();if(!disabled && api){action(api);setPeriod(current=>({...current,date:api.formatIso(api.getDate()).slice(0,10)}));}}
  return <>
    <header className="cgw-calendar-toolbar">
      <div className="cgw-calendar-heading"><span className="cgw-calendar-icon"><CalendarDays size={21} aria-hidden="true" /></span><div><h3 aria-live="polite">{period.title}</h3><span>{timeZone==='local'?'Your local time':timeZone}{readOnly?' · Read only':''}</span></div></div>
      <div className="cgw-calendar-controls">
        <div className="cgw-calendar-paging"><IconButton label="Previous period" icon={ChevronLeft} disabled={disabled || !ready} onClick={()=>apiAction(api=>api?.prev())} /><Button variant="secondary" size="sm" disabled={disabled || !ready} onClick={()=>apiAction(api=>api?.today())}>Today</Button><IconButton label="Next period" icon={ChevronRight} disabled={disabled || !ready} onClick={()=>apiAction(api=>api?.next())} /></div>
        <Select aria-label="Calendar view" value={period.view} disabled={disabled || !ready} onChange={event=>apiAction(api=>api?.changeView(CALENDAR_VIEWS[event.target.value]))} options={(permitted.length?permitted:['month']).map(value=>({value,label:CALENDAR_VIEW_LABELS[value]}))} />
        {onDateClick && !readOnly && <Button icon={Plus} size="sm" disabled={disabled || busy || !ready || !!problem} onClick={()=>onDateClick({date:period.date,allDay:true})}>Add event</Button>}
      </div>
    </header>
    <div className="cgw-calendar-subtoolbar"><Input type="date" label="Go to date" value={period.date} disabled={disabled || !ready} onChange={event=>{if(event.target.value) apiAction(api=>api?.gotoDate(event.target.value));}} />
      <span className="cgw-calendar-status" role="status">{busy?<><LoaderCircle size={13} className="cgw-spin" aria-hidden="true" /> Loading events…</>:problem?'Events unavailable':remote?'Events for the visible dates':'All-day and timed events'}</span>
      {(remote || onRetry) && <IconButton label="Refresh calendar" icon={RefreshCw} disabled={disabled || busy} onClick={()=>{onRetry?.();calendar.current?.getApi().refetchEvents();}} />}
    </div>
    {problem && <div className="cgw-calendar-error"><Alert tone="danger" title="Could not load events">{String(problem)}{(remote || onRetry) && <Button size="sm" variant="secondary" onClick={()=>{onRetry?.();calendar.current?.getApi().refetchEvents();}} disabled={disabled}>Try again</Button>}</Alert></div>}
    <div className={`cgw-calendar-stage ${disabled?'cgw-calendar-stage--disabled':''}`} aria-busy={!!busy || !ready}>
      <div ref={host} className="cgw-calendar-engine" inert={disabled || busy || problem?'':undefined} aria-hidden={!ready || busy || problem?true:undefined}>
        <FullCalendar ref={calendar} plugins={plugins} locales={locales} locale={locale} timeZone={timeZone}
          initialView={CALENDAR_VIEWS[startView]} initialDate={parsed.date} views={viewOptions} headerToolbar={false} footerToolbar={false}
          height={height} firstDay={firstDay} weekends={weekends} fixedWeekCount={false} nowIndicator navLinks
          dayMaxEvents={maxEventsPerDay} events={remote?remote.load:parsed.events} datesSet={datesSet}
          eventClick={eventClick} dateClick={dateClick} select={select} editable={false}
          eventContent={period.view==='agenda'?agendaEvent:undefined}
          eventInteractive={!!onEventClick && !disabled} selectable={!!onRangeSelect && !disabled && !readOnly && !busy}
          dayHeaderDidMount={mountDayHeader} dayHeaderWillUnmount={unmountDayHeader}
          slotMinTime="00:00:00" slotMaxTime="24:00:00" scrollTime="08:00:00" slotDuration="00:30:00"
          eventTimeFormat={{hour:'numeric',minute:'2-digit'}} noEventsContent="No events in this date range."
          eventDidMount={info=>{if(info.event.extendedProps.record?.description) info.el.title=String(info.event.extendedProps.record.description);}} />
      </div>
      {(!ready || loading) && <div className="cgw-calendar-cover"><CalendarSkeleton /></div>}
      {busy && ready && !loading && <div className="cgw-calendar-busy" aria-hidden="true"><LoaderCircle className="cgw-spin" size={24} /></div>}
      {problem && <div className="cgw-calendar-unavailable">Event data is unavailable. Retry to load this date range.</div>}
    </div>
    <footer className="cgw-calendar-footer">{onEventClick?'Select an event to view its details.':'Browse events using the calendar views.'}{onRangeSelect && !readOnly && period.view!=='agenda'?' Drag across dates or times to select a range.':''}</footer>
  </>;
}
