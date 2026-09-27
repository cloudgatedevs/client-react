export const scrumWidget={
  id:'scrum-board',name:'Scrum board',category:'Scheduling',exports:['ScrumBoard','KanbanBoard'],
  description:'A theme-aware scrum / kanban board for projects, courses, content and sales pipelines. Search, assignee filters, board/list views, draggable cards and accessible column/position moves.',
  props:[
    {name:'columns / cards',type:'ScrumColumn[] / ScrumCard[]',description:'Controlled records with unique non-empty string IDs. Columns have {id,title,tone?,limit?}; cards have {id,columnId,title,reference?,description?,priority?,tags?,assignees?,dueDate?,checklist?,comments?}. Every columnId must exist. Array order determines card order inside each column. Custom record fields are preserved.'},
    {name:'onCardsChange',type:'(nextCards,move)=>void|Promise<void>',description:'Called on a drop or Move dialog confirmation. move contains card, cardId, fromColumnId, toColumnId, fromIndex, toIndex. Destination index is after removing the moving card. Update controlled cards yourself; for a server save, authorize and persist first, then update state. Return the save promise: the board blocks competing moves, displays Saving and reports rejections without moving the card. No automatic persistence or optimistic mutation.'},
    {name:'onCardClick / onAddCard',type:'(card)=>void / (columnId)=>void',description:'Open your own details/editor or create flow. Add is shown only when supplied. Read-only permits details and filtering but hides creation/movement. No drag handles or Move buttons without onCardsChange.'},
    {name:'title / description / initialView',type:"string / string / 'board'|'list'",description:'Compact toolbar with live card count. View defaults board; list groups cards by status and removes column scroll limits. initialView applies on mount.'},
    {name:'searchable / showAssigneeFilter',type:'boolean',description:'Both default true. Local search matches all terms against title, reference, description, priority, tags and assignee names. Filters do not remove hidden records when moving cards. Assignee options derive from supplied cards.'},
    {name:'maxColumnHeight / locale',type:'number|string / string',description:'Column bodies default to a 560px scroll limit. Board scrolls horizontally; list view wraps on narrow screens. Due dates are displayed using locale; YYYY-MM-DD dates keep their calendar day.'},
    {name:'renderCard',type:'(card)=>ReactNode',description:'Optional replacement card contents. Return presentational content only (no nested buttons/links when onCardClick is used). Drag and Move controls remain available.'},
    {name:'loading / error / onRetry / readOnly / disabled',type:'state props',description:'Skeleton columns, external load errors/retry and pending-save indicators. Read-only allows browsing, filtering and details. Disabled prevents interaction. WIP limits are advisory; enforce real permissions and business rules on the server.'},
    {name:'className',type:'string',description:'Optional wrapper class. Uses app surfaces, semantic palette, density and reduced-motion preferences. Pointer/touch drag uses the grip; keyboard users use the Move card button and destination/position dialog.'},
  ],
  example:`import { useState } from 'react';
import { ScrumBoard, Dialog, Button } from '@cloudgatedevs/cloudgate-client-react/react/widgets';

const columns = [
  {id:'todo',title:'To do',tone:'info'},
  {id:'active',title:'In progress',tone:'accent',limit:3},
  {id:'done',title:'Done',tone:'success'},
];
const initialCards = [
  {id:'task-1',columnId:'todo',reference:'APP-101',title:'Design the onboarding flow',priority:'high',tags:['Design'],assignees:[{id:'maya',name:'Maya Chen'}],checklist:{completed:1,total:4},comments:2},
  {id:'task-2',columnId:'active',reference:'APP-102',title:'Build the dashboard',priority:'medium',tags:['Frontend']},
];
export default function Example() {
  const [cards,setCards] = useState(initialCards);
  const [selected,setSelected] = useState(null);
  return <>
    <ScrumBoard title="Team workspace" columns={columns} cards={cards}
      onCardsChange={setCards} onCardClick={setSelected} />
    <Dialog open={!!selected} onClose={()=>setSelected(null)} title={selected?.title || 'Card'}
      footer={<Button variant="secondary" onClick={()=>setSelected(null)}>Close</Button>}>
      <p>{selected?.reference} · {selected?.priority} priority</p>
    </Dialog>
  </>;
}
// For server moves, replace onCardsChange={setCards} with:
// async (next, move) => {
//   await yourAuthorizedApi.moveCard(move.cardId, move.toColumnId, move.toIndex);
//   setCards(next); // only after a successful save; reject on failure
// }
// Load cards from your own authorized API and pass loading/error/onRetry.
// Use onAddCard(columnId) to open your application's creation dialog.
`,
};
