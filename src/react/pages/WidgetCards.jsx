import { useState } from 'react';
import { ArrowRight, BookOpen, Headphones, MapPin, PanelsTopLeft, ShoppingBag } from 'lucide-react';
import * as Cards from '../widgets/Cards.jsx';
import { Button, EmptyState } from '../widgets/primitives.jsx';
import { cardIndex } from '../../widgets/card-index.js';
import { cardSamples } from '../../widgets/card-examples.js';

// Code-native illustrations inherit the preview palette; consumers may provide image URLs instead.
function Cover({kind}) {
  const Icon=kind==='product-card'?Headphones:kind==='listing-card'?MapPin:kind==='course-card'?PanelsTopLeft:BookOpen;
  const caption=kind==='product-card'?'STUDIO / 01':kind==='listing-card'?'A LITTLE CLOSER TO NATURE':kind==='course-card'?'MAKE IDEAS REAL':'NOTES ON GOOD DESIGN';
  return <div className={`cgw-card-demo-cover cgw-card-demo-cover--${kind}`} aria-hidden="true">
    <div className="cgw-card-demo-orbit" /><div className="cgw-card-demo-orbit cgw-card-demo-orbit--second" />
    <span className="cgw-card-demo-cover-caption">{caption}</span><div className="cgw-card-demo-cover-object"><Icon size={76} strokeWidth={1.1} /></div>
    <span className="cgw-card-demo-cover-detail">Thoughtfully made.</span>
  </div>;
}
const mediaCards=['product-card','course-card','article-card','listing-card'];
const alternateSamples={
  'article-card':{title:'A calmer way to get things done',category:'Working well',description:'Practical rituals for a focused, sustainable creative practice.',author:'Sam Rivera',readingTime:'4 min read',tags:['Focus','Teams']},
  'project-card':{title:'Website refresh',description:'A clearer story and a fresh home for our product.',status:'Completed',statusTone:'success',progress:100,dueDate:'Shipped 24 September',team:[{name:'Maya Chen'},{name:'Sam Rivera'}],tags:['Website','Launch']},
  'event-card':{title:'Design systems workshop',description:'Build a reusable component with our product team.',date:'2026-10-20',time:'10:00–12:00 · UTC',location:'Online · live workshop',attendees:120,category:'Workshop'},
  'file-card':{name:'Launch assets.zip',description:'Approved graphics and campaign source files.',fileType:'Archive',size:'128 MB',updatedAt:'Updated yesterday',owner:'Sam Rivera',tags:['Marketing','Approved']},
  'job-card':{title:'Front-end engineer',company:'Fieldwork',description:'Build thoughtful interfaces for teams around the world.',location:'Remote · worldwide',employmentType:'Contract',compensation:'$70–$95 / hour',tags:['React','Accessibility','TypeScript']},
  'listing-card':{title:'An airy city loft',description:'A peaceful base in the heart of the city.',location:'Cape Town, South Africa',price:95,highlights:['2 guests','1 bedroom','City views'],badge:'New stay'},
  'notification-card':{title:'Your workspace is up to date',description:'All changes have been saved and shared with your team.',time:'Yesterday'},
  'order-card':{orderNumber:'#1038',status:'Delivered',statusTone:'success',items:[{name:'Everyday travel mug',quantity:1,amount:24}],total:24,deliveryLabel:'Delivered · 24 September'},
};
function CardExample({id,state='ready',alternate=false}) {
  const meta=cardIndex.find(card=>card.id===id),Component=Cards[meta.exportName],sample={...cardSamples[id],...(alternate?alternateSamples[id]:{})};
  const [saved,setSaved]=useState(false),[done,setDone]=useState(alternate && id==='notification-card'),[notice,setNotice]=useState(''),[cart,setCart]=useState(0),
    [progress,setProgress]=useState(alternate?0:sample.progress),[connected,setConnected]=useState(!alternate),[dismissed,setDismissed]=useState(false),[following,setFollowing]=useState(false);
  const loading=state==='loading',disabled=state==='disabled';
  const props={...sample,loading,disabled,empty:state==='empty',error:state==='error'?'The sample service is unavailable. Switch to Ready to continue.':undefined};
  if(mediaCards.includes(id)) props.media=<Cover kind={id} />;
  if(id==='product-card') Object.assign(props,{saved,onSavedChange:setSaved,action:{label:cart?`Add another · ${cart} in cart`:'Add to cart',icon:ShoppingBag,onClick:()=>{setCart(value=>value+1);setNotice('Added to the sample cart.');}},...(alternate?{title:'Everyday studio headphones',badge:undefined,price:89,compareAtPrice:undefined,available:false}: {})});
  else if(id==='course-card') Object.assign(props,{progress,action:{label:progress===100?'Review course':progress===0?'Start learning':'Continue learning',icon:ArrowRight,onClick:()=>{setProgress(value=>Math.min(100,(value || 0)+12));setNotice(progress===100?'Sample course opened for review.':'Sample lesson completed.');}},...(alternate?{title:'Your first design system',level:'Beginner',lessons:12,duration:'2h 10m'}:{})});
  else if(id==='task-card') Object.assign(props,{checked:done,onCheckedChange:setDone,action:{label:'View task',variant:'secondary',onClick:()=>setNotice('Sample task opened for review.')},...(alternate?{title:'Prepare launch notes',priority:'Normal',priorityTone:'neutral'}:{})});
  else if(id==='integration-card') Object.assign(props,{status:connected?'Connected':'Not connected',statusTone:connected?'success':'neutral',account:connected?sample.account:undefined,action:{label:connected?'Disconnect':'Connect',variant:'secondary',onClick:()=>setConnected(value=>!value)}});
  else if(id==='notification-card') Object.assign(props,{onDismiss:()=>setDismissed(true),action:{label:done?'Read':'Mark as read',disabled:done,variant:'secondary',onClick:()=>setDone(true)},unread:!done});
  else if(id==='profile-card') Object.assign(props,{stats:sample.stats.map(stat=>stat.label==='Followers'?{...stat,value:stat.value+Number(following)}:stat),action:{label:following?'Following':'Follow',variant:following?'secondary':'primary',onClick:()=>setFollowing(value=>!value)},...(alternate?{name:'Alex Morgan',role:'Front-end engineer',status:'In a project',statusTone:'neutral',tags:['React','Accessibility']}:{})});
  else if(id==='metric-chart-card') Object.assign(props,{formatValue:value=>'$'+Math.round(value).toLocaleString(),...(alternate?{title:'Revenue by month',chartType:'bar',trend:'+8.4%'}:{})});
  else if(id==='listing-card') Object.assign(props,{saved,onSavedChange:setSaved,action:{label:'Check availability',onClick:()=>setNotice('Sample dates: 12–15 October are available.')}});
  else if(id==='goal-card') Object.assign(props,{action:{label:'Add 50 members',variant:'secondary',onClick:()=>setCart(value=>value+50)},value:(alternate?1000:sample.value)+cart,...(alternate?{title:'October milestone'}:{})});
  else if(id==='pricing-card') Object.assign(props,{action:{label:'Choose plan',onClick:()=>setNotice('Team plan selected in this example.')},...(alternate?{name:'Starter',price:0,description:'A focused place to get started.',featured:false,badge:undefined,features:['3 projects','Core component library',{label:'Advanced reporting',included:false}],action:{label:'Choose Starter',variant:'secondary',onClick:()=>setNotice('Starter plan selected in this example.')}}:{})});
  else if(id==='testimonial-card') Object.assign(props,alternate?{name:'Sam Rivera',role:'Product lead · Fieldwork',quote:'It feels like the interface gets out of the way. Our team can focus on the work and still keep everything consistent.'}:{});
  else props.action={label:({'timeline-card':'View activity','article-card':'Read article','project-card':'Open project','event-card':'Reserve a place','file-card':'Preview file','job-card':'View role','order-card':'Track order'})[id] || 'View details',variant:'secondary',icon:ArrowRight,onClick:()=>setNotice(({'event-card':'A place is reserved in this sample event.','order-card':'Your sample order is at the local delivery depot.','file-card':'Sample file preview selected.'})[id] || `${sample.title || sample.name} selected in this example.`)};
  return <div className="cgw-card-demo-item">
    {dismissed && !loading ? <EmptyState title="Notification dismissed" description="You’re all caught up." action={<Button size="sm" variant="secondary" onClick={()=>setDismissed(false)}>Undo dismissal</Button>} /> : <Component {...props} />}
    {notice && !loading && <div className="cgw-card-demo-notice" role="status">{notice}</div>}
  </div>;
}
export function WidgetCards({id,state,onChoose}) {
  if(id==='cards') return <div className="cgw-stack"><p className="cgw-pattern-muted">Explore reusable patterns for different kinds of apps. All examples use fictional data.</p>
    <Cards.CardGrid minCardWidth={290}>{cardIndex.map(card=><section key={card.id} className="cgw-card-gallery-item">
      <button type="button" className="cgw-card-gallery-link" onClick={()=>onChoose(card.id)}><span>{card.name}</span><ArrowRight size={14} aria-hidden="true" /></button>
      <CardExample id={card.id} />
    </section>)}</Cards.CardGrid></div>;
  if(id==='timeline-card') return <div className="cgw-card-demo-wide"><Cards.Timeline label="Project activity" loading={state==='loading'} items={[
    {id:'review',...cardSamples[id],disabled:state==='disabled',empty:state==='empty',error:state==='error'?'Could not load this activity.':undefined},
    {id:'draft',title:'First draft shared',description:'A new direction for the customer portal is ready for feedback.',time:'Yesterday, 15:20',dateTime:'2026-09-25T15:20:00+02:00',actor:'Maya Chen',tone:'accent',tags:['Milestone']},
    {id:'kickoff',title:'Project started',description:'The team agreed on the goals, scope and first milestones.',time:'23 September, 09:00',dateTime:'2026-09-23T09:00:00+02:00',actor:'Jordan Ellis',tone:'neutral'},
  ].map(item=>({...item,disabled:state==='disabled',loading:state==='loading',empty:state==='empty',error:state==='error'?'Could not load this activity.':undefined}))} /></div>;
  return <Cards.CardGrid minCardWidth={id==='metric-chart-card'?360:270}>
    <CardExample key={`${id}-${state}-first`} id={id} state={state} />
    <CardExample key={`${id}-${state}-second`} id={id} state={state} alternate />
  </Cards.CardGrid>;
}
