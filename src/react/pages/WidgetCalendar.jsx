import {useCallback,useState} from 'react';
import {Calendar} from '../widgets/Calendar.jsx';
import {Badge,Button,Checkbox,Dialog,Input,Select,Switch,Textarea} from '../widgets/primitives.jsx';
import {Form} from '../widgets/Form.jsx';
import {prepareCalendarEvents} from '../widgets/calendar-model.js';

const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const offset=days=>{const date=new Date();date.setDate(date.getDate()+days);return dateKey(date);};
function sampleEvents(){return [
  {id:'planning',title:'Sprint planning',start:`${offset(0)}T09:00:00`,end:`${offset(0)}T10:00:00`,tone:'accent',location:'Studio room',description:'Plan the next release and agree on priorities.'},
  {id:'workshop',title:'Design workshop',start:`${offset(0)}T11:00:00`,end:`${offset(0)}T12:30:00`,tone:'info',location:'Online',description:'A hands-on session with the product team.'},
  {id:'review',title:'Course review',start:`${offset(0)}T14:00:00`,end:`${offset(0)}T15:00:00`,tone:'success',location:'Learning studio'},
  {id:'checkin',title:'Customer check-in',start:`${offset(0)}T16:00:00`,end:`${offset(0)}T16:30:00`,tone:'warning',location:'Online'},
  {id:'launch',title:'Launch week',start:offset(2),end:offset(5),allDay:true,tone:'success',description:'A multi-day event with an exclusive end date.'},
  {id:'appointment',title:'Consultation',start:`${offset(-2)}T10:00:00`,end:`${offset(-2)}T11:00:00`,tone:'accent',location:'Room 3'},
  {id:'deadline',title:'Registration closes',start:offset(6),allDay:true,tone:'danger'},
  {id:'demo',title:'Product demo',start:`${offset(-6)}T13:00:00`,end:`${offset(-6)}T14:00:00`,tone:'info',location:'Online'},
];}
function blankDraft(selection){
  const date=selection.date || selection.start || offset(0),allDay=selection.allDay!==false;
  return {title:'',allDay,start:allDay?date.slice(0,10):date.slice(0,16),end:selection.end?(allDay?selection.end.slice(0,10):selection.end.slice(0,16)):'',tone:'accent',description:''};
}
export function WidgetCalendar({state='ready'}) {
  const [events,setEvents]=useState(()=>state==='empty'?[]:sampleEvents()),[server,setServer]=useState(false),[weekends,setWeekends]=useState(true),[selected,setSelected]=useState(null),[draft,setDraft]=useState(null),[recovered,setRecovered]=useState(false);
  const loadEvents=useCallback(({start,end,signal})=>new Promise((resolve,reject)=>{
    const cancel=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};
    const timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);
      if(state==='error' && !recovered){reject(new Error('This example request failed. Try again to reload the events.'));return;}
      const instant=value=>Date.parse(value.length===10?`${value}T00:00:00`:value);
      resolve(events.filter(event=>instant(event.start)<Date.parse(end) && (event.end?instant(event.end):instant(event.start)+(event.allDay?86400000:3600000))>Date.parse(start)));
    },450);
    if(signal.aborted) cancel(); else signal.addEventListener('abort',cancel,{once:true});
  }),[events,state,recovered]);
  function dateError(){try{prepareCalendarEvents([{...draft,end:draft.end || undefined,id:'draft',title:draft.title || 'Event'}]);}catch(error){return error.message;}}
  return <div className="cgw-stack">
    <div className="cgw-calendar-demo-controls"><Switch label="Simulated server" checked={server} onChange={setServer} disabled={state==='loading'} /><Checkbox label="Show weekends" checked={weekends} onChange={event=>setWeekends(event.target.checked)} /><span className="cgw-muted">Demo events stay in this preview.</span></div>
    <Calendar events={events} loadEvents={server || state==='error'?loadEvents:undefined} loading={state==='loading'} disabled={state==='disabled'} readOnly={state==='readonly'} weekends={weekends}
      onRetry={()=>setRecovered(true)} onEventClick={setSelected} onDateClick={selection=>setDraft(blankDraft(selection))} onRangeSelect={selection=>setDraft(blankDraft(selection))} />
    <div className="cgw-row"><Badge tone="accent" dot>Meetings</Badge><Badge tone="info" dot>Workshops</Badge><Badge tone="success" dot>Milestones</Badge><Badge tone="warning" dot>Check-ins</Badge><Badge tone="danger" dot>Deadlines</Badge></div>
    <Dialog open={!!selected} onClose={()=>setSelected(null)} title={selected?.title || 'Event details'} description="Example calendar event" footer={<Button variant="secondary" onClick={()=>setSelected(null)}>Close</Button>}>
      {selected && <div className="cgw-stack"><Badge tone={selected.tone}>{selected.allDay?'All-day event':'Scheduled event'}</Badge><dl className="cgw-calendar-event-details"><dt>Starts</dt><dd>{selected.start.replace('T',' · ')}</dd>{selected.end && <><dt>Ends{selected.allDay?' (exclusive)':''}</dt><dd>{selected.end.replace('T',' · ')}</dd></>}{selected.location && <><dt>Location</dt><dd>{selected.location}</dd></>}</dl>{selected.description && <p>{selected.description}</p>}</div>}
    </Dialog>
    <Dialog open={!!draft} onClose={()=>setDraft(null)} title="Add an event" description="Try the calendar with a local example. Nothing is saved to a server.">
      {draft && <Form className="cgw-stack" onSubmit={()=>{setEvents(rows=>[...rows,{...draft,end:draft.end || undefined,id:`sample-${Date.now()}`}]);setDraft(null);}}>
        <Input label="Event title" name="title" required value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})} />
        <Switch label="All day" checked={draft.allDay} onChange={allDay=>setDraft({...draft,allDay,start:allDay?draft.start.slice(0,10):`${draft.start.slice(0,10)}T09:00`,end:''})} />
        <Input label="Starts" type={draft.allDay?'date':'datetime-local'} required value={draft.start} onChange={event=>setDraft({...draft,start:event.target.value})} />
        <Input label={draft.allDay?'Ends (exclusive)':'Ends'} type={draft.allDay?'date':'datetime-local'} value={draft.end} validate={dateError} hint={draft.allDay?'Optional. Use the following date to include a full day.':undefined} onChange={event=>setDraft({...draft,end:event.target.value})} />
        <Select label="Category" value={draft.tone} onChange={event=>setDraft({...draft,tone:event.target.value})} options={[{value:'accent',label:'Meeting'},{value:'info',label:'Workshop'},{value:'success',label:'Milestone'},{value:'warning',label:'Check-in'},{value:'danger',label:'Deadline'}]} />
        <Textarea label="Notes" value={draft.description} onChange={event=>setDraft({...draft,description:event.target.value})} />
        <div className="cgw-row"><Button type="submit">Add sample event</Button><Button variant="secondary" onClick={()=>setDraft(null)}>Cancel</Button></div>
      </Form>}
    </Dialog>
  </div>;
}
