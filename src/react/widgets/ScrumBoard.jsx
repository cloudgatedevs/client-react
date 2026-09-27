import {useId, useMemo, useRef, useState} from 'react';
import {DndContext, DragOverlay, PointerSensor, pointerWithin, rectIntersection, useDraggable, useDroppable, useSensor, useSensors} from '@dnd-kit/core';
import {ArrowRightLeft, CalendarDays, CheckCheck, GripVertical, Kanban, List, LoaderCircle, MessageSquare, Plus, Search, X} from 'lucide-react';
import {Alert, Badge, Button, Dialog, EmptyState, IconButton, Input, Select, Skeleton, Tabs} from './primitives.jsx';
import {CardAvatar} from './card-shared.jsx';
import {boardDate, boardDropTarget, filterBoardCards, moveBoardCard, validateBoard} from './scrum-model.js';

const EMPTY = [];
const priorities = {urgent:'danger', high:'warning', medium:'accent', low:'success'};
const cardKey = id => `card:${id}`;
const columnKey = id => `column:${id}`;
function collisions(args) {
  const hits = pointerWithin(args);
  const candidates = hits.length ? hits : rectIntersection(args);
  // A card is inside its column. Prefer the more precise insertion target.
  return candidates.sort((a,b) => Number(String(b.id).startsWith('card:')) - Number(String(a.id).startsWith('card:')));
}
function CardContent({card, locale, renderCard}) {
  if (renderCard) return renderCard(card);
  const date = boardDate(card.dueDate, locale), tone = priorities[card.priority];
  return <>
    <div className="cgw-scrum-card-meta"><span>{card.reference || card.id}</span>{tone && <span className={`cgw-scrum-priority cgw-tone--${tone}`}><i aria-hidden="true" />{card.priority}</span>}</div>
    <span className="cgw-scrum-card-title">{card.title}</span>
    {card.tags?.length > 0 && <span className="cgw-scrum-tags">{card.tags.map(tag => <Badge key={tag}>{tag}</Badge>)}</span>}
    <span className="cgw-scrum-card-foot">
      <span className="cgw-pattern-team">{card.assignees?.slice(0,3).map(person => <CardAvatar key={person.id} name={person.name} src={person.avatar} size="sm" />)}{card.assignees?.length > 3 && <span className="cgw-pattern-team-more">+{card.assignees.length - 3}</span>}</span>
      {date && <time dateTime={card.dueDate} title={date.full}><CalendarDays size={12} aria-hidden="true" />{date.label}</time>}
      <span className="cgw-scrum-card-stats">
        {card.checklist && <span aria-label={`${card.checklist.completed} of ${card.checklist.total} tasks complete`}><CheckCheck size={14} aria-hidden="true" />{card.checklist.completed}/{card.checklist.total}</span>}
        {card.comments != null && <span aria-label={`${card.comments} comments`}><MessageSquare size={14} aria-hidden="true" />{card.comments}</span>}
      </span>
    </span>
  </>;
}
function BoardCard({card, disabled, movable, onOpen, onMove, locale, renderCard, dropHint}) {
  const {attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging} = useDraggable({id:cardKey(card.id), data:{cardId:card.id}, disabled:!movable});
  const {setNodeRef:setDropRef} = useDroppable({id:cardKey(card.id), data:{type:'card',cardId:card.id}, disabled:!movable});
  return <article ref={node=>{setNodeRef(node);setDropRef(node);}} aria-label={card.title}
    className={`cgw-scrum-card ${isDragging?'cgw-scrum-card--dragging':''} ${dropHint?`cgw-scrum-card--${dropHint}`:''}`}>
    {movable && <div className="cgw-scrum-card-actions">
      <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} tabIndex={-1} className="cgw-scrum-grip" aria-label={`Drag ${card.title}`} title="Drag to move; use Move card for keyboard controls"><GripVertical size={15} aria-hidden="true" /></button>
      <IconButton icon={ArrowRightLeft} size="sm" label={`Move ${card.title}`} data-scrum-move={card.id} onClick={()=>onMove(card)} />
    </div>}
    {onOpen ? <button type="button" className="cgw-scrum-card-body" onClick={()=>onOpen(card)} disabled={disabled} aria-label={`Open ${card.title}`}><CardContent {...{card,locale,renderCard}} /></button> :
      <div className="cgw-scrum-card-body"><CardContent {...{card,locale,renderCard}} /></div>}
  </article>;
}
function BoardColumn({column, cards, total, blocked, editable, movable, loading, onAdd, active, hint, ...cardProps}) {
  const {setNodeRef,isOver} = useDroppable({id:columnKey(column.id), data:{type:'column',columnId:column.id},disabled:!movable});
  const titleId=useId(), overLimit=column.limit>0 && total>column.limit;
  return <section ref={setNodeRef} aria-labelledby={titleId} className={`cgw-scrum-column ${active && (isOver || hint?.columnId===column.id)?'cgw-scrum-column--over':''}`}>
    <header className="cgw-scrum-column-head"><span className={`cgw-scrum-column-dot cgw-tone--${column.tone || 'neutral'}`} aria-hidden="true" /><h3 id={titleId}>{column.title}</h3>
      <Badge tone={overLimit?'warning':'neutral'}><span title={column.limit?`Work in progress limit: ${column.limit}`:undefined}>{cards.length}{column.limit>0?` / ${column.limit}`:''}</span></Badge>
      {editable && onAdd && <IconButton icon={Plus} size="sm" label={`Add card to ${column.title}`} disabled={blocked} onClick={()=>onAdd(column.id)} />}
    </header>
    {overLimit && <span className="cgw-scrum-limit">Work in progress limit exceeded ({total}/{column.limit})</span>}
    <div className="cgw-scrum-column-body" tabIndex={0} aria-label={`${column.title} cards`}>
      {loading ? [0,1,2].map(n=><div className="cgw-scrum-skeleton" key={n}><Skeleton width="40%" /><Skeleton height="2.4rem" /><Skeleton width="65%" /><Skeleton width="80%" /></div>) : cards.length ? cards.map(card=><BoardCard key={card.id} {...cardProps} {...{card,movable}} dropHint={hint?.cardId===card.id?hint.edge:undefined} />) :
        <div className="cgw-scrum-empty-column"><Kanban size={22} strokeWidth={1.3} aria-hidden="true" /><span>{total?'No matching cards':'No cards yet'}</span>{editable && onAdd && <Button variant="ghost" size="sm" icon={Plus} disabled={blocked} onClick={()=>onAdd(column.id)}>Add card</Button>}</div>}
      {hint?.columnId===column.id && !hint.cardId && <div className="cgw-scrum-drop-end" aria-hidden="true" />}
    </div>
  </section>;
}

export function ScrumBoard({columns=EMPTY,cards=EMPTY,title='Scrum board',description,initialView='board',onCardsChange,onCardClick,onAddCard,
  loading=false,error,onRetry,readOnly=false,disabled=false,searchable=true,showAssigneeFilter=true,locale,
  maxColumnHeight=560,renderCard,className=''}) {
  const [search,setSearch]=useState(''),[assignee,setAssignee]=useState(''),[view,setView]=useState(initialView==='list'?'list':'board');
  const [active,setActive]=useState(null),[hint,setHint]=useState(null),[move,setMove]=useState(null),[pending,setPending]=useState(false),[failure,setFailure]=useState(''),[announcement,setAnnouncement]=useState('');
  const pendingRef=useRef(false),rootRef=useRef(null),returnCardRef=useRef(null),headingId=useId();
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}));
  const invalid=useMemo(()=>{try{validateBoard(columns,cards);return '';}catch(cause){return cause.message;}},[columns,cards]);
  const visible=useMemo(()=>filterBoardCards(cards,search,assignee),[cards,search,assignee]);
  const people=useMemo(()=>[...new Map(cards.flatMap(card=>(card.assignees || []).map(person=>[person.id,person]))).values()],[cards]);
  const blocked=disabled || loading || pending || !!error || !!invalid,editable=!readOnly,movable=editable && !blocked && !!onCardsChange;
  const activeCard=cards.find(card=>card.id===active);
  async function commit(cardId,columnId,index) {
    if(!movable || pendingRef.current) return;
    const result=moveBoardCard(cards,columns,cardId,columnId,index);
    if(!result){setMove(null);return;}
    pendingRef.current=true;setPending(true);setFailure('');
    try {
      await onCardsChange(result.cards,result.change);
      setMove(null);setAnnouncement(`${result.change.card.title} moved to ${columns.find(column=>column.id===columnId)?.title}, position ${result.change.toIndex+1}.`);
    } catch(cause) {setFailure(cause?.message || 'The card could not be moved. Please try again.');}
    finally {pendingRef.current=false;setPending(false);}
  }
  function dropDetails(event) {
    if (!event.over) return null;
    const data=event.over.data.current,rect=event.active.rect.current.translated;
    const after=!!rect && rect.top+rect.height/2>event.over.rect.top+event.over.rect.height/2;
    const target=boardDropTarget(cards,event.active.data.current.cardId,data,after);
    return target?{...target,cardId:data.type==='card'?data.cardId:null,edge:after?'after':'before'}:null;
  }
  function openMove(card) {
    returnCardRef.current=card.id;
    setFailure('');setMove({id:card.id,title:card.title,columnId:card.columnId,index:cards.filter(row=>row.columnId===card.columnId).findIndex(row=>row.id===card.id)});
  }
  const dialogPositions=move?cards.filter(card=>card.columnId===move.columnId && card.id!==move.id):EMPTY;
  const resetFilters=()=>{setSearch('');setAssignee('');};
  return <section ref={rootRef} tabIndex={-1} className={`cgw-scrum ${className}`} aria-labelledby={headingId} aria-busy={loading || pending || undefined} style={{'--cgw-board-height':typeof maxColumnHeight==='number'?`${maxColumnHeight}px`:maxColumnHeight}}>
    <header className="cgw-scrum-toolbar">
      <div className="cgw-scrum-heading"><h2 id={headingId}>{title}</h2><span>{search || assignee?`${visible.length} of ${cards.length}`:cards.length} {cards.length===1?'card':'cards'}{readOnly?' · Read only':''}</span>{description && <p>{description}</p>}</div>
      <div className="cgw-scrum-tools">
        {showAssigneeFilter && people.length>0 && <Select aria-label="Filter by assignee" value={assignee} onChange={event=>setAssignee(event.target.value)} disabled={disabled || pending} options={[{value:'',label:'All assignees'},...people.map(person=>({value:person.id,label:person.name}))]} />}
        {searchable && <Input aria-label="Search cards" placeholder="Search cards…" icon={Search} value={search} onChange={event=>setSearch(event.target.value)} disabled={disabled || pending} />}
        <Tabs label="Board view" value={view} onChange={next=>{setView(next);setActive(null);setHint(null);}} items={[{value:'board',label:'Board',icon:Kanban,disabled:disabled || pending},{value:'list',label:'List',icon:List,disabled:disabled || pending}]} />
        {editable && onAddCard && <Button size="sm" icon={Plus} disabled={blocked || !columns.length} onClick={()=>onAddCard(columns[0].id)}>Add card</Button>}
      </div>
    </header>
    {(search || assignee) && <div className="cgw-scrum-filter"><span>Showing {visible.length} matching cards</span><Button size="sm" variant="ghost" icon={X} disabled={disabled || pending} onClick={resetFilters}>Clear filters</Button></div>}
    {pending && <div className="cgw-scrum-progress" role="status"><LoaderCircle size={14} className="cgw-spin" aria-hidden="true" />Saving card…</div>}
    {failure && !move && <Alert tone="danger" title="Could not move card" onDismiss={()=>setFailure('')}>{failure}</Alert>}
    {error || invalid ? <Alert tone="danger" title="Could not load board" action={!invalid && onRetry?<Button size="sm" variant="secondary" disabled={disabled || loading} onClick={onRetry}>Try again</Button>:undefined}>{invalid || error?.message || String(error)}</Alert> : !columns.length ?
      <EmptyState title="No columns yet" description="Add columns to organize your work." icon={Kanban} /> :
      <DndContext sensors={sensors} collisionDetection={collisions}
        accessibility={{screenReaderInstructions:{draggable:'Use the Move card button to choose a destination and position with the keyboard.'}}}
        onDragStart={event=>{setFailure('');setActive(event.active.data.current.cardId);}}
        onDragMove={event=>setHint(dropDetails(event))} onDragOver={event=>setHint(dropDetails(event))}
        onDragCancel={()=>{setActive(null);setHint(null);}}
        onDragEnd={event=>{const target=dropDetails(event);setActive(null);setHint(null);if(target) void commit(event.active.data.current.cardId,target.columnId,target.index);}}>
        <div className={`cgw-scrum-columns cgw-scrum-columns--${view}`} aria-label={view==='board'?'Board columns':'Cards by status'} tabIndex={0}>
          {columns.map(column=><BoardColumn key={column.id} {...{column,blocked,editable,movable,loading,active,hint,locale,renderCard}} cards={visible.filter(card=>card.columnId===column.id)} total={cards.filter(card=>card.columnId===column.id).length} disabled={disabled || pending} onAdd={onAddCard} onOpen={onCardClick} onMove={openMove} />)}
        </div>
        <DragOverlay dropAnimation={null}>{activeCard?<div className="cgw-scrum-card cgw-scrum-card--overlay"><div className="cgw-scrum-card-body"><CardContent card={activeCard} {...{locale,renderCard}} /></div></div>:null}</DragOverlay>
      </DndContext>}
    <span className="cgw-sr-only" role="status" aria-live="polite">{announcement}</span>
    <Dialog open={!!move} onClose={pending?undefined:()=>setMove(null)} title="Move card" description={move?.title}
      onCloseAutoFocus={event=>{event.preventDefault();const target=Array.from(rootRef.current?.querySelectorAll('[data-scrum-move]') || []).find(button=>button.dataset.scrumMove===returnCardRef.current);(target || rootRef.current)?.focus();}}
      footer={<><Button variant="secondary" disabled={pending} onClick={()=>setMove(null)}>Cancel</Button><Button loading={pending} disabled={!movable} onClick={()=>void commit(move.id,move.columnId,move.index)}>Move card</Button></>}>
      {move && <div className="cgw-stack">
        {failure && <Alert tone="danger" title="Could not move card">{failure}</Alert>}
        <Select label="Column" value={move.columnId} disabled={pending} options={columns.map(column=>({value:column.id,label:column.title}))} onChange={event=>setMove({...move,columnId:event.target.value,index:0})} />
        <Select label="Position" value={String(Math.min(move.index,dialogPositions.length))} disabled={pending} options={[...dialogPositions.map((card,index)=>({value:String(index),label:`${index+1} · Before ${card.title}`})),{value:String(dialogPositions.length),label:`${dialogPositions.length+1} · At the end`}]} onChange={event=>setMove({...move,index:Number(event.target.value)})} />
      </div>}
    </Dialog>
  </section>;
}
export const KanbanBoard = ScrumBoard;
