import {useState} from 'react';
import {ScrumBoard} from '../widgets/ScrumBoard.jsx';
import {Badge,Button,Dialog,Input,Select,Switch,Textarea} from '../widgets/primitives.jsx';
import {Form} from '../widgets/Form.jsx';

const columns=[{id:'backlog',title:'Backlog',tone:'neutral'},{id:'todo',title:'To do',tone:'info'},{id:'progress',title:'In progress',tone:'accent',limit:4},{id:'review',title:'In review',tone:'warning',limit:3},{id:'done',title:'Done',tone:'success'}];
const people=[{id:'maya',name:'Maya Chen'},{id:'leo',name:'Leo Morgan'},{id:'alex',name:'Alex Rivera'},{id:'sam',name:'Sam Patel'}];
const titles=[
  ['Map the onboarding journey','Research','medium'],['Build a reusable pricing card','Design','low'],['Explore course completion badges','Learning','low'],
  ['Design the mobile checkout','Commerce','high'],['Write the release notes','Content','low'],['Add keyboard shortcuts','Accessibility','medium'],
  ['Build the course dashboard','Learning','high'],['Connect the payment flow','Commerce','urgent'],['Polish the empty states','Design','medium'],
  ['Review notification preferences','Settings','medium'],['Test the new search experience','Testing','high'],
  ['Ship the icon library','Design','low'],['Improve table loading states','Frontend','medium'],['Add theme-aware buttons','Design','low'],
];
function samples(){return titles.map(([title,tag,priority],index)=>({id:`task-${index}`,reference:`CG-${1042+index}`,title,priority,tags:[tag,index%2?'Frontend':'Product'],columnId:index<3?'backlog':index<6?'todo':index<9?'progress':index<11?'review':'done',assignees:[people[index%4]],dueDate:new Date(Date.now()+(index-3)*86400000).toISOString().slice(0,10),checklist:{completed:index>10?4:index%4,total:4},comments:index%5,description:'Bring this idea to life using the shared widgets, appearance settings and accessibility patterns.'}));}
export function WidgetScrumBoard({state='ready'}) {
  const [cards,setCards]=useState(()=>state==='empty'?[]:samples()),[draft,setDraft]=useState(null),[server,setServer]=useState(false),[failNext,setFailNext]=useState(false),[recovered,setRecovered]=useState(false);
  const readonly=state==='readonly',disabled=state==='disabled';
  async function saveMove(next) {
    if(server) await new Promise(resolve=>setTimeout(resolve,650));
    if(failNext){setFailNext(false);throw new Error('This example save failed. Your card is still in its original position. Try the move again.');}
    setCards(next);
  }
  const makeDraft=columnId=>setDraft({title:'',description:'',columnId,priority:'medium',assignee:'',dueDate:'',tags:''});
  const openCard=card=>setDraft({...card,assignee:card.assignees?.[0]?.id || '',tags:(card.tags || []).join(', ')});
  return <div className="cgw-stack">
    <div className="cgw-scrum-demo-controls"><Switch label="Simulate saving" checked={server} onChange={setServer} /><Switch label="Fail next move" checked={failNext} onChange={setFailNext} /><span className="cgw-muted">Example changes stay in this preview.</span></div>
    <ScrumBoard title="Product workspace" description="Sprint 12 · Build something people love" columns={columns} cards={cards} onCardsChange={saveMove} onAddCard={makeDraft} onCardClick={openCard}
      loading={state==='loading'} readOnly={readonly} disabled={disabled} error={state==='error' && !recovered?'This example board could not be loaded.':undefined} onRetry={()=>setRecovered(true)} />
    <div className="cgw-row"><Badge tone="accent">Drag by the grip</Badge><span className="cgw-muted">Use the move button for a precise column and position. Click a card to view or edit it.</span></div>
    <Dialog open={!!draft} onClose={()=>setDraft(null)} title={draft?.id?'Card details':'Add a card'} description={draft?.reference || 'Create an example card in this preview.'}>
      {draft && <Form className="cgw-stack" onSubmit={()=>{
        const next={...draft,id:draft.id || `sample-${Date.now()}`,reference:draft.reference || `CG-${1042+cards.length}`,tags:[...new Set(draft.tags.split(',').map(tag=>tag.trim()).filter(Boolean))],assignees:people.filter(person=>person.id===draft.assignee)};
        setCards(rows=>draft.id?rows.map(row=>row.id===draft.id?next:row):[...rows,next]);setDraft(null);
      }}>
        <Input label="Title" required value={draft.title} readOnly={readonly} onChange={event=>setDraft({...draft,title:event.target.value})} />
        <Textarea label="Description" value={draft.description} readOnly={readonly} onChange={event=>setDraft({...draft,description:event.target.value})} />
        <Select label="Status" value={draft.columnId} disabled={readonly} options={columns.map(column=>({value:column.id,label:column.title}))} onChange={event=>setDraft({...draft,columnId:event.target.value})} />
        <Select label="Priority" value={draft.priority} disabled={readonly} options={['low','medium','high','urgent'].map(value=>({value,label:value[0].toUpperCase()+value.slice(1)}))} onChange={event=>setDraft({...draft,priority:event.target.value})} />
        <Select label="Assignee" value={draft.assignee} disabled={readonly} options={[{value:'',label:'Unassigned'},...people.map(person=>({value:person.id,label:person.name}))]} onChange={event=>setDraft({...draft,assignee:event.target.value})} />
        <Input label="Due date" type="date" value={draft.dueDate || ''} readOnly={readonly} onChange={event=>setDraft({...draft,dueDate:event.target.value})} />
        <Input label="Tags" hint="Separate tags with commas." value={draft.tags} readOnly={readonly} onChange={event=>setDraft({...draft,tags:event.target.value})} />
        <div className="cgw-row">{!readonly && <Button type="submit">{draft.id?'Save changes':'Create card'}</Button>}<Button variant="secondary" onClick={()=>setDraft(null)}>{readonly?'Close':'Cancel'}</Button></div>
      </Form>}
    </Dialog>
  </div>;
}
