import {useState} from 'react';
import {Check,FileText,Flag,MessageSquare,Package,Palette,Rocket,Truck} from 'lucide-react';
import {Timeline} from '../widgets/Timeline.jsx';
import {Badge,Button,Dialog,Select,Switch} from '../widgets/primitives.jsx';

const activity=[
  {id:'published',title:'Version 2.4 is live',description:'A faster checkout, clearer navigation, and a fresh set of shared widgets.',dateTime:'2026-09-26T10:30:00Z',actor:'Maya Chen',icon:Rocket,tone:'success',status:'Published',tags:['Release','Product'],details:<dl className="cgw-timeline-demo-details"><dt>Version</dt><dd>2.4.0</dd><dt>Highlights</dt><dd>Checkout, navigation and shared widgets</dd><dt>Environment</dt><dd>Example production workspace</dd></dl>},
  {id:'approved',title:'Design review approved',description:'The team signed off on the new customer experience.',dateTime:'2026-09-26T09:00:00Z',actor:'Alex Morgan',icon:Check,tone:'success',status:'Approved'},
  {id:'feedback',title:'A little feedback goes a long way',description:'Three comments helped refine the mobile experience before release.',dateTime:'2026-09-25T14:20:00Z',actor:'Sam Rivera',icon:MessageSquare,tone:'info',tags:['Feedback'],details:<blockquote className="cgw-timeline-demo-quote">“The new navigation feels much clearer on a phone. Let’s keep the primary action within reach.”</blockquote>},
  {id:'design',title:'New direction shared',description:'A first look at the visual language for our next chapter.',dateTime:'2026-09-25T10:15:00Z',actor:'Maya Chen',icon:Palette,tone:'accent',tags:['Design']},
  {id:'scope',title:'A plan worth building',description:'Scope, milestones and ownership are ready for the team.',dateTime:'2026-09-24T11:30:00Z',actor:'Jordan Ellis',icon:FileText,tone:'neutral'},
  {id:'kickoff',title:'And so it begins',description:'The team came together around a shared goal.',dateTime:'2026-09-23T08:00:00Z',icon:Flag,tone:'accent'},
];
const milestones=[
  {id:'discovery',title:'Discover',description:'Goals, research and a shared direction.',dateTime:'2026-09-14',state:'complete'},
  {id:'design',title:'Design',description:'Turn the idea into a thoughtful experience.',dateTime:'2026-09-21',state:'complete'},
  {id:'build',title:'Build',description:'Bring the experience to life with shared widgets.',dateTime:'2026-09-28',state:'current',tags:['You are here']},
  {id:'launch',title:'Launch',description:'Test, refine, then share it with the world.',dateTime:'2026-10-05',state:'upcoming'},
];
export function WidgetTimeline({state='ready'}) {
  const [layout,setLayout]=useState('activity'),[grouped,setGrouped]=useState(true),[count,setCount]=useState(4),[selected,setSelected]=useState(null),[recovered,setRecovered]=useState(false);
  const disabled=state==='disabled',loading=state==='loading',empty=state==='empty',horizontal=layout==='horizontal';
  const items=empty?[]:horizontal?milestones:activity.slice(0,count).map(item=>({...item,action:{label:'Open event',variant:'secondary',onClick:()=>setSelected(item)}}));
  async function loadMore(){await new Promise(resolve=>setTimeout(resolve,650));setCount(value=>Math.min(value+2,activity.length));}
  return <div className="cgw-stack">
    <div className="cgw-timeline-demo-controls"><Select label="Timeline layout" value={layout} onChange={event=>setLayout(event.target.value)} options={[{value:'activity',label:'Activity feed'},{value:'cards',label:'Timeline cards'},{value:'alternating',label:'Alternating'},{value:'horizontal',label:'Horizontal milestones'}]} /><Switch label="Group by day" checked={grouped} onChange={setGrouped} disabled={horizontal} /><span className="cgw-muted">Example activity · dates shown in UTC</span></div>
    <section className="cgw-timeline-demo-surface"><header className="cgw-timeline-demo-heading"><div><h3>{horizontal?'From idea to launch':'A story of steady progress'}</h3><p>{horizontal?'Milestones for the next product release.':'The decisions, conversations and moments that move a project forward.'}</p></div><Badge tone="accent">{horizontal?'Project roadmap':'Project activity'}</Badge></header>
      <Timeline label={horizontal?'Release milestones':'Project activity'} headingLevel={4} variant={horizontal?'cards':layout} orientation={horizontal?'horizontal':'vertical'} groupByDay={grouped} timeZone="UTC" items={items} loading={loading} disabled={disabled}
        error={state==='error' && !recovered?'This example activity service is unavailable.':undefined} onRetry={()=>setRecovered(true)} hasMore={!horizontal && !empty && count<activity.length} onLoadMore={loadMore} />
    </section>
    <section className="cgw-timeline-demo-surface"><header className="cgw-timeline-demo-heading"><div><h3>Order tracking</h3><p>The same timeline also works for deliveries, approvals and customer journeys.</p></div><Badge tone="neutral">Order #1042</Badge></header>
      <Timeline label="Order delivery progress" headingLevel={4} variant="activity" items={empty?[]:[
        {id:'placed',title:'Order confirmed',description:'Your order is being prepared.',time:'24 September · 10:15',icon:Package,state:'complete'},
        {id:'shipped',title:'On its way',description:'Your parcel has left the distribution centre.',time:'25 September · 08:30',icon:Truck,state:'complete'},
        {id:'delivery',title:'Out for delivery',description:'Your parcel is with the local courier.',time:'26 September · 07:45',icon:Truck,state:'current'},
        {id:'delivered',title:'Delivered',description:'We will confirm when the parcel arrives.',state:'upcoming'},
      ]} loading={loading} disabled={disabled} error={state==='error' && !recovered?'Could not load the example delivery.':undefined} onRetry={()=>setRecovered(true)} />
    </section>
    <Dialog open={!!selected} onClose={()=>setSelected(null)} title={selected?.title || 'Event details'} description="Example project event" footer={<Button variant="secondary" onClick={()=>setSelected(null)}>Close</Button>}>
      {selected && <div className="cgw-stack"><p>{selected.description}</p><Badge tone={selected.tone}>{selected.actor || 'Project team'}</Badge><time dateTime={selected.dateTime}>{selected.dateTime.replace('T',' · ').replace('Z',' UTC')}</time>{selected.details}</div>}
    </Dialog>
  </div>;
}
