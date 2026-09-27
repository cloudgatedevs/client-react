import {Component,lazy,Suspense,useEffect,useState} from 'react';
import {Alert,Button,Skeleton} from './primitives.jsx';

const CalendarContent=lazy(()=>import('./CalendarContent.jsx'));
class CalendarBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}
export function CalendarSkeleton(){return <div className="cgw-calendar-skeleton" role="status" aria-label="Loading calendar"><Skeleton width="38%" height="24px" /><div>{Array.from({length:21},(_,i)=><Skeleton key={i} height="65px" />)}</div><span className="cgw-sr-only">Loading calendar…</span></div>;}

/** Event calendar. Navigation and viewing never persist changes; mutations belong to the caller. */
export function Calendar({label='Event calendar',className='',...props}) {
  const [mounted,setMounted]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>setMounted(true),[]);
  return <section className={`cgw-calendar ${className}`} aria-label={label}>
    {!mounted?<CalendarSkeleton />:<CalendarBoundary key={attempt} fallback={<Alert tone="danger" title="Could not open the calendar"><Button size="sm" variant="secondary" onClick={()=>setAttempt(n=>n+1)}>Try again</Button></Alert>}>
      <Suspense fallback={<CalendarSkeleton />}><CalendarContent {...props} label={label} /></Suspense>
    </CalendarBoundary>}
  </section>;
}
