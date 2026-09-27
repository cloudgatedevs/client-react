export const calendarWidget={
  id:'calendar',name:'Calendar',category:'Scheduling',exports:['Calendar'],
  description:'An event calendar for bookings, meetings, courses and milestones, with month, week, day and agenda views and visible-range server loading.',
  props:[
    {name:'events',type:'CalendarEvent[]',description:'Local events: unique id, title, start and optional end, allDay, tone, description. Date-only YYYY-MM-DD for all-day events; ISO date-times or Date for timed events. end is exclusive. Keep records in caller state; events are not mutated.'},
    {name:'loadEvents / reloadKey',type:'({start,end,timeZone,signal})=>Promise<CalendarEvent[]> / unknown',description:'Use instead of events for server data. Fetch only events overlapping the visible [start,end) range, including events that started earlier. Forward signal; stale responses are ignored. Keep the callback stable. Change reloadKey after saves or when tenant/filter scope changes.'},
    {name:'initialDate / initialView / views',type:"string | Date / 'month'|'week'|'day'|'agenda' / CalendarView[]",description:'Defaults to today and month. Navigation has Today, previous/next, date input and a view selector. Initial values apply on mount; key the widget to reset navigation. Agenda covers the current month. views controls toolbar choices.'},
    {name:'onEventClick / onDateClick / onRangeSelect',type:'callbacks',description:'Event clicks receive the original record. Date clicks (or Add event) receive {date,allDay}; range selection receives {start,end,allDay} with exclusive end. Open your own dialog and call an authorized API before updating events. No persistence or automatic event drag/resizing is assumed.'},
    {name:'onRangeChange',type:'({start,end,timeZone,view})=>void',description:'Informs the caller when visible dates change, including initial display. Does not fetch events; use loadEvents for built-in cancellation and loading UI.'},
    {name:'locale / timeZone / firstDay / weekends',type:'string / string / 0–6 / boolean',description:"Locale defaults en, timeZone defaults local and accepts UTC or an IANA zone. Supply offsets for timed instants to avoid ambiguity. Monday starts the week by default; weekends defaults true."},
    {name:'height / maxEventsPerDay',type:'number|string / number',description:'Height defaults 640px. Month overflow uses +more popovers (three events per day by default). Week/day views scroll through all 24 hours. Agenda works well on narrow screens.'},
    {name:'loading / error / onRetry / disabled / readOnly',type:'state props',description:'Loading includes skeletons and busy indicators; server errors show retry. Disabled prevents all interaction. Read-only permits navigation and event details but hides Add event and suppresses date/range creation callbacks.'},
    {name:'label / className',type:'string',description:'Accessible region name (Event calendar by default) and an optional wrapper class. Theme tokens cover calendar surfaces, events, popovers and controls. Engine loads only when mounted.'},
  ],
  example:`import { useCallback, useState } from 'react';
import { Calendar, Dialog, Button } from '@cloudgatedevs/cloudgate-client-react/react/widgets';

export default function Example({tenantId}) {
  const [selected,setSelected]=useState(null);
  const loadEvents=useCallback(async({start,end,timeZone,signal})=>{
    // Replace with your application's authorized, tenant-scoped endpoint.
    // Include events where start < rangeEnd AND end > rangeStart.
    const query=new URLSearchParams({start,end,timeZone});
    const response=await fetch('/api/tenants/'+encodeURIComponent(tenantId)+'/events?'+query,{signal});
    if(!response.ok) throw new Error('Could not load events.');
    return response.json(); // [{id,title,start,end?,allDay?,tone?,description?}]
  },[tenantId]);
  return <>
    <Calendar loadEvents={loadEvents} reloadKey={tenantId} onEventClick={setSelected} label="Team calendar" />
    <Dialog open={!!selected} onClose={()=>setSelected(null)} title={selected?.title || 'Event'}
      footer={<Button variant="secondary" onClick={()=>setSelected(null)}>Close</Button>}>
      <p>{selected?.description || selected?.start}</p>
    </Dialog>
  </>;
}`,
};
