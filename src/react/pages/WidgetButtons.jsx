import { useState } from 'react';
import { ArrowRight, Bell, Check, CheckCircle2, Download, Info, Plus, Settings2, ShieldAlert, Trash2 } from 'lucide-react';
import { Button, IconButton } from '../widgets/primitives.jsx';

const variants=[
  {id:'primary',label:'Primary',icon:Plus},
  {id:'secondary',label:'Secondary',icon:Settings2},
  {id:'neutral',label:'Neutral',icon:Download},
  {id:'success',label:'Success',icon:CheckCircle2},
  {id:'warning',label:'Warning',icon:ShieldAlert},
  {id:'danger',label:'Danger',icon:Trash2},
  {id:'info',label:'Info',icon:Info},
];
function Section({title,description,children}) {
  return <section className="cgw-button-demo-section"><header><h3>{title}</h3><p>{description}</p></header><div className="cgw-button-demo-row">{children}</div></section>;
}
export function WidgetButtons({state='ready'}) {
  const [message,setMessage]=useState('Choose an example to try it.');
  const controls={disabled:state==='disabled',loading:state==='loading'};
  const action=label=>()=>setMessage(`${label} button pressed. This example does not change application data.`);
  return <div className="cgw-button-demo">
    <Section title="Colour & intent" description="A consistent vocabulary for primary actions, supporting actions and meaningful statuses.">
      {variants.map(({id,label,icon})=><Button key={id} variant={id} icon={icon} {...controls} onClick={action(label)}>{label}</Button>)}
    </Section>
    <Section title="Solid" description="Stronger emphasis for the most important action.">
      {variants.map(({id,label,icon})=><Button key={id} variant={id} appearance="solid" icon={icon} {...controls} onClick={action(`Solid ${label.toLowerCase()}`)}>{label}</Button>)}
    </Section>
    <Section title="Soft" description="Tinted surfaces for actions that need a quieter presence.">
      {variants.map(({id,label})=><Button key={id} variant={id} appearance="soft" {...controls} onClick={action(`Soft ${label.toLowerCase()}`)}>{label}</Button>)}
    </Section>
    <Section title="Outline" description="A lighter alternative that preserves the colour’s meaning.">
      {variants.map(({id,label})=><Button key={id} variant={id} appearance="outline" {...controls} onClick={action(`Outline ${label.toLowerCase()}`)}>{label}</Button>)}
    </Section>
    <Section title="Quiet actions" description="Ghost and link-style buttons keep low-priority actions available. Use an anchor for navigation.">
      <Button variant="ghost" icon={Settings2} {...controls} onClick={action('Ghost')}>Options</Button>
      <Button variant="link" icon={ArrowRight} iconPosition="end" {...controls} onClick={action('Link-style')}>View details</Button>
    </Section>
    <Section title="Sizes & icon placement" description="Small, medium and large controls with leading or trailing icons.">
      <Button size="sm" icon={Plus} {...controls} onClick={action('Small')}>Small</Button>
      <Button icon={Plus} {...controls} onClick={action('Medium')}>Medium</Button>
      <Button size="lg" icon={ArrowRight} iconPosition="end" {...controls} onClick={action('Large')}>Continue</Button>
    </Section>
    <Section title="Icon buttons" description="Every icon-only control has an accessible label and the same visual options.">
      {variants.map(({id,label,icon})=><IconButton key={id} variant={id} appearance="soft" icon={icon} label={`${label} icon action`} {...controls} onClick={action(`${label} icon`)} />)}
      <IconButton variant="secondary" size="lg" icon={Bell} label="Large notification action" {...controls} onClick={action('Large notification')} />
    </Section>
    <Section title="Busy & disabled" description="Loading buttons expose their busy state and prevent repeated actions.">
      <Button loading variant="success" appearance="solid">Saving changes</Button>
      <Button loading variant="secondary" iconPosition="end">Checking</Button>
      <Button disabled icon={Check}>Saved</Button>
      <Button disabled variant="danger" appearance="outline" icon={Trash2}>Delete</Button>
    </Section>
    <Section title="Full width" description="A responsive action for forms, checkout steps or narrow cards.">
      <Button fullWidth icon={ArrowRight} iconPosition="end" {...controls} onClick={action('Full-width')}>Continue to the next step</Button>
    </Section>
    <p className="cgw-button-demo-status" role="status">{message}</p>
  </div>;
}
