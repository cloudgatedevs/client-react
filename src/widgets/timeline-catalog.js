export const timelineWidget={
  id:'timeline',name:'Timeline',category:'Scheduling',exports:['Timeline'],
  description:'Connected activity feeds, project histories, milestones and order tracking. Card, compact activity, alternating and horizontal layouts with date grouping and progressive loading.',
  props:[
    {name:'items',type:'TimelineItem[]',description:'Ordered entries with unique non-empty string id and title. Supports all TimelineCard fields: description, dateTime, time, actor/avatar, icon, tone, status, tags, action/secondaryAction, children, footer and per-entry loading/error/disabled states. IDs are React keys, not HTML IDs. The caller controls order; no sorting or automatic date-based completion.'},
    {name:'variant / orientation',type:"'cards'|'activity'|'alternating' / 'vertical'|'horizontal'",description:'Cards remains the default for existing callers. Activity is a compact feed. Alternating puts vertical entries either side of the connector and collapses to one side on phones. Horizontal scrolls a series of milestone cards inside the widget; alternating is ignored horizontally.'},
    {name:'items[].state',type:"'complete'|'current'|'upcoming'|'blocked'",description:'Optional milestone state provides an icon, tone and explicit status text. current exposes aria-current=step; supply at most one current entry per progression. Explicit icon, tone and status override the defaults. Values are supplied by the app, never inferred from date.'},
    {name:'items[].details / detailsLabel',type:'ReactNode / string',description:'Optional expandable details with an accessible button; the default label is View details. Disabled entries cannot toggle. Contents stay mounted while hidden to retain local state; the caller owns loading within custom content.'},
    {name:'groupByDay / locale / timeZone',type:'boolean / string / IANA timezone',description:'Optional contiguous day headings for vertical timelines. Defaults false and uses browser locale/timezone. Pass ISO date-times with offsets for instants. Date-only YYYY-MM-DD dates retain their calendar day. Explicit time overrides the display text. Invalid dates appear in Undated when grouped; invalid timezone/duplicate IDs show an error instead of crashing.'},
    {name:'hasMore / onLoadMore / loadingMore / loadMoreLabel',type:'boolean / ()=>void|Promise<void> / boolean / string',description:'Provide more-page loading from your own API and append/deduplicate by id in caller state. Return the promise; duplicate clicks are blocked and failures show retry while retaining existing entries. loadingMore also supports external loading. Default label is Load more activity. No endpoint, cursor or persistence is assumed; key the timeline when dataset/tenant scope changes.'},
    {name:'loading / error / onRetry / disabled',type:'state props',description:'Initial skeletons, empty state and recoverable errors. Existing entries remain visible under a load error; loading replaces them with skeletons. Disabled blocks built-in actions, links, details and paging. Custom children manage their own disabled state. Retry is supplied by the caller.'},
    {name:'label / headingLevel / emptyTitle / emptyDescription / className',type:'display props',description:'Name the region and ordered list. Entry heading level defaults 3; a per-item headingLevel can override it. Empty title defaults No activity yet. Inherits all appearance tokens, spacing and reduced motion.'},
  ],
  example:`import { useState } from 'react';
import { Timeline } from '@cloudgatedevs/cloudgate-client-react/react/widgets';

export default function Example() {
  const [items,setItems]=useState([
    {id:'review',title:'Design approved',description:'The team signed off on the next release.',dateTime:'2026-09-26T10:30:00Z',actor:'Maya Chen',state:'complete',details:<p>Approved for desktop and mobile.</p>},
    {id:'draft',title:'First draft shared',dateTime:'2026-09-25T14:00:00Z',actor:'Alex Morgan',tags:['Design']},
  ]);
  const [hasMore,setHasMore]=useState(true);
  async function loadMore() {
    // Local example. Replace with your own authorized, paged API.
    await new Promise(resolve=>setTimeout(resolve,500));
    setItems(current=>[...current,{id:'kickoff',title:'Project started',dateTime:'2026-09-24T09:00:00Z'}]);
    setHasMore(false);
  }
  return <Timeline label="Project activity" variant="activity" items={items}
    groupByDay timeZone="UTC" hasMore={hasMore} onLoadMore={loadMore} />;
}
// Use variant="cards" (default) or "alternating" for richer histories.
// Use orientation="horizontal" for milestones in the supplied order.
// Each milestone can have state: complete, current, upcoming or blocked.
// Keep application data, server permissions and cursor management in the caller.
`,
};
