import {useId,useMemo,useRef,useState} from 'react';
import {AlertTriangle,Check,ChevronDown,ChevronRight,Circle,CircleDot,Clock3,History} from 'lucide-react';
import {Alert,Badge,Button,EmptyState,Skeleton} from './primitives.jsx';
import {CardAvatar,CardFrame,CardIcon,CardTags} from './card-shared.jsx';
import {timelineGroups} from './timeline-model.js';

const states={complete:{label:'Completed',icon:Check,tone:'success'},current:{label:'In progress',icon:CircleDot,tone:'accent'},upcoming:{label:'Upcoming',icon:Circle,tone:'neutral'},blocked:{label:'Blocked',icon:AlertTriangle,tone:'danger'}};
export function TimelineCard(props) {
  const {icon=Check,tone='accent',time,dateTime,actor,actorAvatar,tags,status}=props;
  return <CardFrame {...props} kind="timeline" leading={<CardIcon icon={icon} tone={tone} />}
    eyebrow={time && <time dateTime={dateTime}>{time}</time>} trailing={status && <Badge tone={tone} dot>{status}</Badge>}
    content={<>{actor && <div className="cgw-pattern-person"><CardAvatar name={actor} src={actorAvatar} size="sm" /><div><strong>{actor}</strong></div></div>}<CardTags tags={tags} /></>} />;
}
function TimelineEntry({item,date,disabled,headingLevel}) {
  const [expanded,setExpanded]=useState(false),detailsId=useId();
  const state=states[item.state],Icon=item.icon || state?.icon || Clock3,tone=item.tone || state?.tone || 'accent';
  const inactive=disabled || item.disabled,unavailable=item.loading || item.error || item.empty;
  return <li className={`cgw-timeline-entry cgw-tone--${tone}`} aria-current={item.state==='current'?'step':undefined}>
    <span className="cgw-timeline-marker" aria-hidden="true"><Icon size={16} strokeWidth={1.8} /></span>
    <TimelineCard {...item} id={undefined} headingLevel={item.headingLevel || headingLevel} disabled={inactive} icon={Icon} tone={tone}
      status={item.status ?? state?.label} time={item.time ?? date?.label} dateTime={date?item.dateTime:undefined}>
      {item.children}
      {item.details!=null && !unavailable && <div className="cgw-timeline-detail-wrap">
        <Button variant="ghost" size="sm" icon={expanded?ChevronDown:ChevronRight} disabled={inactive} aria-expanded={expanded} aria-controls={detailsId} onClick={()=>setExpanded(value=>!value)}>{item.detailsLabel || 'View details'}</Button>
        <div id={detailsId} hidden={!expanded} className="cgw-timeline-details">{item.details}</div>
      </div>}
    </TimelineCard>
  </li>;
}
export function Timeline({items=[],label='Activity timeline',variant='cards',orientation='vertical',groupByDay=false,locale,timeZone,headingLevel=3,
  loading=false,error,onRetry,emptyTitle='No activity yet',emptyDescription='New events will appear here.',disabled=false,
  hasMore=false,onLoadMore,loadingMore=false,loadMoreLabel='Load more activity',className=''}) {
  const [pending,setPending]=useState(false),[loadFailure,setLoadFailure]=useState(''),pendingRef=useRef(false),uid=useId();
  const horizontal=orientation==='horizontal',style=['cards','activity','alternating'].includes(variant)?variant:'cards';
  const {groups,invalid}=useMemo(()=>{try{return {groups:timelineGroups(items,{groupByDay:groupByDay && !horizontal,locale,timeZone}),invalid:null};}catch(cause){return {groups:[],invalid:cause.message};}},[items,groupByDay,horizontal,locale,timeZone]);
  const busy=pending || loadingMore,problem=invalid || error;
  async function loadMore() {
    if(!onLoadMore || disabled || loading || busy || pendingRef.current || problem) return;
    pendingRef.current=true;setPending(true);setLoadFailure('');
    try {await onLoadMore();} catch(cause) {setLoadFailure(cause?.message || 'Could not load more activity. Try again.');}
    finally {pendingRef.current=false;setPending(false);}
  }
  return <section className={`cgw-timeline cgw-timeline--${style} cgw-timeline--${horizontal?'horizontal':'vertical'} ${className}`} aria-label={label} aria-busy={loading || busy || undefined}>
    {problem && <Alert tone="danger" title="Could not load timeline" action={!invalid && onRetry?<Button variant="secondary" size="sm" disabled={disabled || loading} onClick={onRetry}>Try again</Button>:undefined}>{problem?.message || String(problem)}</Alert>}
    {loading ? <div className="cgw-timeline-loading" role="status" aria-label={`Loading ${label}`}><span className="cgw-sr-only">Loading {label}…</span>{[0,1,2].map(n=><div className="cgw-timeline-skeleton" key={n}><Skeleton width="28%" height=".65rem" /><Skeleton width="65%" height="1.2rem" /><Skeleton width="92%" /><Skeleton width="45%" /></div>)}</div> : invalid ? null : !items.length ? !problem && <EmptyState title={emptyTitle} description={emptyDescription} icon={History} /> :
      <div className="cgw-timeline-track" tabIndex={horizontal?0:undefined}>{groups.map((group,index)=><div key={`${group.key}-${index}`} className="cgw-timeline-group">
        {group.label && <div className="cgw-timeline-day" id={`${uid}-day-${index}`}><span>{group.label}</span><span>{group.items.length} {group.items.length===1?'event':'events'}</span></div>}
        <ol className="cgw-timeline-events" aria-label={group.label?`${label} · ${group.label}`:label}>{group.items.map(({item,date})=><TimelineEntry key={item.id} {...{item,date,headingLevel}} disabled={disabled} />)}</ol>
      </div>)}</div>}
    {!loading && !invalid && (hasMore || loadFailure || busy) && <footer className="cgw-timeline-footer">
      {loadFailure && <Alert title="Could not load more activity" tone="danger">{loadFailure}</Alert>}
      {(onLoadMore || busy) && <Button variant="secondary" size="sm" loading={busy} disabled={disabled || !!problem || !onLoadMore} onClick={()=>void loadMore()}>{loadFailure?'Try again':loadMoreLabel}</Button>}
      {busy && <span className="cgw-sr-only" role="status">Loading more activity…</span>}
    </footer>}
  </section>;
}
