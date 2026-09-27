export const tabsWidget={
  id:'tabs',name:'Tabs',category:'Navigation',exports:['Tabs'],
  description:'Five tab styles: underline, segmented, pills, outlined and enclosed. Horizontal or vertical layouts, icons, counts, responsive overflow and accessible keyboard navigation.',
  props:[
    {name:'items',type:'TabItem[]',description:'Stable unique string values with {value,label,content?,icon?,count?,disabled?}. Supply content for connected tab panels. Without any content, the control is a group of pressed/unpressed view buttons. Do not use tabs as links between routes.'},
    {name:'value / onChange',type:'string / (value:string)=>void',description:'Controlled selection. Use an enabled item value. Missing or individually disabled selections display the first enabled item without emitting onChange. When the whole control is disabled, the current panel stays visible.'},
    {name:'variant',type:"'segmented'|'underline'|'pills'|'outline'|'enclosed'",description:'Segmented is the existing default. Underline suits page sections; pills emphasize the selection; outline separates options; enclosed connects the strip to a bordered content surface. All use palette tokens.'},
    {name:'orientation',type:"'horizontal'|'vertical'",description:'Horizontal by default, with overflow confined to the strip on narrow screens. Vertical places tabs beside the panel and uses Up/Down instead of Left/Right. On phones the vertical list sits above the panel, retaining the same keyboard direction.'},
    {name:'size / fullWidth',type:"'sm'|'md'|'lg' / boolean",description:'Medium by default. Full width shares horizontal space between tabs while retaining readable minimum widths; vertical full width reserves 35% for the rail. Coarse-pointer targets remain at least 44px tall.'},
    {name:'activationMode',type:"'automatic'|'manual'",description:'Automatic activates with arrow keys. Manual only moves focus, then Enter/Space opens the panel; use for costly or remote panels. Home/End select the first/last enabled target. Disabled items are skipped and navigation wraps.'},
    {name:'keepMounted',type:'boolean',description:'True by default so hidden panel forms keep their state. False unmounts inactive contents: useful for lazy server panels, but component-local edits are lost when switching. Manage important drafts above Tabs.'},
    {name:'disabled / dir / label / className',type:"boolean / 'ltr'|'rtl' / string / string",description:'Disabled blocks selection and keyboard moves. dir defaults to inherited document direction and affects horizontal arrows. Give each tab list a meaningful accessible label. Styles follow appearance settings and reduced motion.'},
  ],
  example:`import { useState } from 'react';
import { UserRound, ShieldCheck, Bell } from 'lucide-react';
import { Tabs, Input } from '@cloudgatedevs/cloudgate-client-react/react/widgets';

function SettingsTabs({variant='underline',orientation='horizontal'}) {
  const [tab,setTab]=useState('account');
  return <Tabs label={variant+' account settings'} variant={variant} orientation={orientation}
    value={tab} onChange={setTab} items={[
      {value:'account',label:'Account',icon:UserRound,content:<Input label="Display name" defaultValue="Alex Morgan" />},
      {value:'security',label:'Security',icon:ShieldCheck,content:<p>Your security settings belong here.</p>},
      {value:'notifications',label:'Notifications',icon:Bell,count:3,content:<p>Choose which updates reach you.</p>},
      {value:'audit',label:'Audit log',disabled:true,content:<p>Unavailable in this example.</p>},
    ]} />;
}
export default function Example() {
  return <div className="cgw-stack">
    {['underline','segmented','pills','outline','enclosed'].map(variant=>
      <SettingsTabs key={variant} variant={variant} />)}
    <SettingsTabs variant="pills" orientation="vertical" />
  </div>;
}
// size="sm" | "md" | "lg"; fullWidth stretches the tab strip.
// For remote content, use activationMode="manual" and keepMounted={false}.
// Load inside the panel, forward AbortSignal and cancel on unmount.
// Keep permission checks and real persistence in your application.
`,
};
