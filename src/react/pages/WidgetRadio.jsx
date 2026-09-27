import { useState } from 'react';
import { Button, Card, Form, RadioGroup } from '../widgets/index.jsx';

const plans = [
  {value: 'starter', label: 'Starter', description: 'For a personal project. 1 workspace.'},
  {value: 'team', label: 'Team', description: 'Build together. 5 workspaces and shared tools.'},
  {value: 'business', label: 'Business', description: 'Advanced controls for growing organisations.'},
];
export function WidgetRadio({ state }) {
  const [plan, setPlan] = useState('team'), [saved, setSaved] = useState('');
  const disabled = state === 'disabled';
  return <div className="cgw-stack">
    <Card title="Choose a plan" description="Selectable cards for choices that need a little more explanation.">
      <RadioGroup name="plan" label="Workspace plan" value={plan} onChange={setPlan} options={plans}
        variant="cards" orientation="horizontal" disabled={disabled}
        hint="Use Tab to enter the group, then arrow keys to change your selection."
        error={state === 'error' ? 'This plan is not available for your workspace.' : undefined} />
    </Card>
    <div className="cgw-demo-chart-grid">
      <Card title="Standard radios" description="A compact list with descriptions and an unavailable option.">
        <RadioGroup name="delivery" label="Delivery method" defaultValue="standard" disabled={disabled} options={[
          {value: 'standard', label: 'Standard delivery', description: 'Arrives in 3–5 working days.'},
          {value: 'express', label: 'Express delivery', description: 'Arrives the next working day.'},
          {value: 'pickup', label: 'Collect in store', description: 'Unavailable in your region.', disabled: true},
        ]} />
      </Card>
      <Card title="Inline choices" description="Require a choice, submit its value and reset the form.">
        <Form className="cgw-stack" onSubmit={data => setSaved(`Summary frequency: ${data.get('frequency')}`)} onReset={() => setSaved('')}>
          <RadioGroup name="frequency" label="Email summary" required disabled={disabled} orientation="horizontal"
            validationMessages={{required: 'Choose how often to receive a summary.'}}
            options={[{value:'daily', label:'Daily'}, {value:'weekly', label:'Weekly'}, {value:'monthly', label:'Monthly'}]} />
          <div className="cgw-row"><Button type="submit" size="sm" disabled={disabled}>Save preference</Button>
            <Button type="reset" size="sm" variant="secondary" disabled={disabled}>Reset</Button></div>
          {saved && <p role="status" className="cgw-muted">{saved}</p>}
        </Form>
      </Card>
    </div>
  </div>;
}
