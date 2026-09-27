export const radioWidget = {
  id: 'radio', name: 'Radio group', category: 'Forms', exports: ['RadioGroup'],
  description: 'Single-choice radio buttons, inline choices and selectable cards. Native keyboard navigation with descriptions, disabled options and shared form validation.',
  props: [
    {name:'options', type:'RadioOption[]', description:'{value,label,description?,disabled?}. Use unique non-empty strings or finite numbers; zero is valid. Labels and descriptions accept non-interactive React content.'},
    {name:'value / defaultValue / onChange', type:'string | number | null / (value,option) => void', description:'Controlled value or an initial uncontrolled default. onChange receives the original typed value and option. Use an empty string or null for no selection.'},
    {name:'variant', type:"'default' | 'cards'", description:'Standard radio buttons by default. Cards give longer choices a selected border and tinted surface.'},
    {name:'orientation', type:"'vertical' | 'horizontal'", description:'Vertical by default. Horizontal wraps on narrow screens. Native arrow keys move between enabled radios; Space selects.'},
    {name:'label / hint / error', type:'ReactNode', description:'Label becomes a fieldset legend. Hints and errors are linked to the group and each radio. Supply label or aria-label.'},
    {name:'name / id', type:'string', description:'Native form name and group ID. Names default to unique generated values; supply a stable name for FormData. Disabled radios are omitted from submission.'},
    {name:'required / validate / validationMessages', type:'Shared field validation', description:'Inside Form, required blocks submission without a choice. validate receives the selected string (not the first option) and optional FormData. Errors appear when leaving the group or submitting, then update on changes.'},
    {name:'disabled', type:'boolean', description:'Disables the whole group. Individual options can also be disabled. The forwarded input ref targets the first enabled option.'},
  ],
  example: `import { useState } from 'react';
import { RadioGroup, Form, Button } from '@cloudgatedevs/cloudgate-client-react/react/widgets';

const plans = [
  {value:'starter', label:'Starter', description:'A workspace for your next idea.'},
  {value:'team', label:'Team', description:'Shared tools for your growing team.'},
  {value:'business', label:'Business', description:'Coming soon.', disabled:true},
];

export default function Example({ onSave }) {
  const [plan, setPlan] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(data) {
    setSaving(true); setError('');
    try { await onSave?.({plan:data.get('plan')}); }
    catch { setError('Could not save your plan. Please try again.'); }
    finally { setSaving(false); }
  }
  return <Form className="cgw-stack" onSubmit={submit} onReset={() => {setPlan(''); setError('');}}>
    <RadioGroup name="plan" label="Workspace plan" options={plans}
      value={plan} onChange={value => {setPlan(value); setError('');}}
      variant="cards" orientation="horizontal" required disabled={saving} error={error}
      validationMessages={{required:'Choose a plan to continue.'}} />
    <div className="cgw-row">
      <Button type="submit" loading={saving}>Save plan</Button>
      <Button type="reset" variant="secondary" disabled={saving}>Reset</Button>
    </div>
  </Form>;
}`,
};
