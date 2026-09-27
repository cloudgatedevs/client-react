import {useState} from 'react';
import {Bell, CreditCard, LayoutDashboard, ListChecks, Settings, ShieldCheck, Users, UserRound} from 'lucide-react';
import {Badge,Input,Select,Switch,Tabs} from '../widgets/primitives.jsx';

function Panel({title,description,children}) {
  return <div className="cgw-tabs-demo-panel"><h4>{title}</h4><p>{description}</p>{children}</div>;
}
function Section({title,description,children,wide=false}) {
  return <section className={`cgw-tabs-demo-section ${wide?'cgw-tabs-demo-section--wide':''}`}><header><h3>{title}</h3><p>{description}</p></header>{children}</section>;
}
const projectItems=[
  {value:'overview',label:'Overview',icon:LayoutDashboard,content:<Panel title="A clear view of your project" description="Keep the important details together, with space for your own widgets." ><div className="cgw-row"><Badge tone="success" dot>On track</Badge><span className="cgw-muted">Next milestone · Design review</span></div></Panel>},
  {value:'activity',label:'Activity',icon:ListChecks,count:8,content:<Panel title="Recent activity" description="8 updates from your team. Connect this panel to your own activity feed." />},
  {value:'team',label:'Team',icon:Users,count:4,content:<Panel title="Made for collaboration" description="Four people working towards the next release." />},
];
function ProjectTabs({variant,disabled,...props}) {
  const [value,setValue]=useState('overview');
  return <Tabs variant={variant} label={`${variant} project sections`} value={value} onChange={setValue} disabled={disabled} items={projectItems} {...props} />;
}
export function WidgetTabs({state='ready'}) {
  const disabled=state==='disabled';
  const [account,setAccount]=useState('account'),[vertical,setVertical]=useState('profile'),[size,setSize]=useState('md'),[fullWidth,setFullWidth]=useState(true),[manual,setManual]=useState(false);
  const [period,setPeriod]=useState('month'),[weekly,setWeekly]=useState(true);
  return <div className="cgw-tabs-demo">
    <Section wide title="Underline" description="A quiet page-level navigation, with an accent line that follows the selected section.">
      <Tabs label="Account settings" variant="underline" value={account} onChange={setAccount} disabled={disabled} items={[
        {value:'account',label:'Account',content:<Panel title="Profile" description="Your public profile and personal details."><div className="cgw-tabs-demo-fields"><Input label="Display name" defaultValue="Alex Morgan" disabled={disabled} /><Input label="Role" defaultValue="Product designer" disabled={disabled} /></div></Panel>},
        {value:'security',label:'Security',content:<Panel title="Security" description="Manage your account protection and sign-in preferences."><Badge tone="success" dot>Two-factor authentication enabled</Badge></Panel>},
        {value:'billing',label:'Plan and Billing',content:<Panel title="Your plan" description="A flexible home for invoices, payment methods and subscription details."><Badge tone="accent">Team plan</Badge></Panel>},
        {value:'notifications',label:'Notifications',count:3,content:<Panel title="Notifications" description="Choose which updates reach you."><Switch label="Weekly summary" checked={weekly} onChange={setWeekly} disabled={disabled} /></Panel>},
        {value:'team',label:'Team',content:<Panel title="Your team" description="A space for team members, invitations and roles." />},
        {value:'audit',label:'Audit log',disabled:true,content:<Panel title="Audit log" description="This section is unavailable in this example." />},
      ]} />
    </Section>
    <Section title="Segmented" description="The familiar compact control for related views and tools."><ProjectTabs variant="segmented" disabled={disabled} /></Section>
    <Section title="Pills" description="Rounded tabs with a stronger accent for the active section."><ProjectTabs variant="pills" disabled={disabled} /></Section>
    <Section title="Outlined" description="Separate bordered options with a soft selection highlight."><ProjectTabs variant="outline" disabled={disabled} /></Section>
    <Section title="Enclosed" description="A connected tab strip and content surface for contained workspaces."><ProjectTabs variant="enclosed" disabled={disabled} /></Section>
    <Section wide title="Vertical navigation" description="A side-by-side layout for settings and longer section names. Navigate with the up and down arrows.">
      <Tabs label="Workspace settings" variant="pills" orientation="vertical" value={vertical} onChange={setVertical} disabled={disabled} items={[
        {value:'profile',label:'Profile',icon:UserRound,content:<Panel title="Your workspace profile" description="Give your workspace a name that your team will recognise."><Input label="Workspace name" defaultValue="Northstar Studio" disabled={disabled} /></Panel>},
        {value:'access',label:'Access',icon:ShieldCheck,content:<Panel title="Access & permissions" description="Configure the roles and permissions used by your app." />},
        {value:'billing',label:'Billing',icon:CreditCard,content:<Panel title="Billing details" description="Review your workspace plan and billing information." />},
        {value:'notifications',label:'Notifications',icon:Bell,count:3,content:<Panel title="Stay in the loop" description="Decide which workspace updates you want to receive." />},
        {value:'advanced',label:'Advanced',icon:Settings,disabled:true},
      ]} />
    </Section>
    <Section wide title="Size, layout & activation" description="Try equal-width tabs, three control sizes, and manual activation for panels that load data. In manual mode, arrows move focus; Enter or Space opens the section.">
      <div className="cgw-tabs-demo-controls"><Select label="Tab size" value={size} onChange={event=>setSize(event.target.value)} options={[{value:'sm',label:'Small'},{value:'md',label:'Medium'},{value:'lg',label:'Large'}]} /><Switch label="Full width" checked={fullWidth} onChange={setFullWidth} /><Switch label="Manual activation" checked={manual} onChange={setManual} /></div>
      <ProjectTabs variant="underline" label="Adjustable project sections" disabled={disabled} size={size} fullWidth={fullWidth} activationMode={manual?'manual':'automatic'} />
    </Section>
    <Section wide title="View switcher" description="Without panel content, tabs act as a compact group of toggle buttons for an existing view.">
      <Tabs label="Reporting period" variant="segmented" size="sm" value={period} onChange={setPeriod} disabled={disabled} items={[{value:'week',label:'This week'},{value:'month',label:'This month'},{value:'quarter',label:'This quarter'}]} />
      <p className="cgw-muted" role="status">Showing {period==='week'?'this week':period==='month'?'this month':'this quarter'}.</p>
    </Section>
  </div>;
}
