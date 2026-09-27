export const selectWidget = {
  id: 'select', name: 'Select', category: 'Forms', exports: ['Select', 'SearchSelect'],
  description: 'Standard, searchable and server-side dropdowns in one place. Choose a native Select for short lists or SearchSelect for local filtering and debounced remote search.',
  props: [
    {name:'Select: options', type:'{value:string|number,label:string,disabled?:boolean}[]', description:'Native select options with unique values. Includes mobile platform pickers and native keyboard behaviour.'},
    {name:'Select: value / defaultValue / onChange', type:'Native select attributes', description:'onChange receives the native event; read event.target.value as a string. defaultValue initializes an uncontrolled field.'},
    {name:'SearchSelect: options', type:'SearchOption[]', description:'Local {value,label,description?,disabled?} options. Values are unique non-empty strings or numbers; zero is valid. Filters labels and descriptions.'},
    {name:'SearchSelect: loadOptions', type:'({search,limit,signal}) => Promise<SearchOption[]>', description:'Remote mode. Filter and limit at the server; return an array in display order. Results are not filtered again locally. Forward signal to fetch.'},
    {name:'SearchSelect: value / defaultValue / onChange', type:'string | number / (value,option) => void', description:'Committed ID, separate from search text. The callback receives the ID and option, not a native event. Clearing emits an empty string and null.'},
    {name:'SearchSelect: selectedOption', type:'SearchOption', description:'Labels a preselected remote ID before results arrive. Selected labels are retained across searches.'},
    {name:'SearchSelect: debounceMs / minSearchLength / limit', type:'number', description:'Defaults: 300ms, 0 characters, 50 requested results. Searches only while open. A full result page prompts users to narrow their search.'},
    {name:'SearchSelect: reloadKey', type:'string | number', description:'Change when tenant, filters, permissions or records change; aborts the previous search and refreshes results.'},
    {name:'Both: label / hint / error / placeholder / name', type:'ReactNode / string', description:'Accessible field feedback. name submits the selected value. Use an empty placeholder with required on a native Select.'},
    {name:'Both: required / validate / validationMessages', type:'Shared field validation', description:'Uses blur, change and submit validation inside Form. validate receives the selected value as a string and optional FormData.'},
    {name:'Both: disabled', type:'boolean', description:'Prevents changes and omits the value from form submission.'},
    {name:'SearchSelect: readOnly / clearable', type:'boolean', description:'Read-only prevents changes while keeping the submitted value. clearable defaults true. Native Select has no readOnly mode.'},
  ],
  example: `import { useState } from 'react';
import { Select, SearchSelect } from '@cloudgatedevs/cloudgate-client-react/react/widgets';

const teams = [{value:'design', label:'Design'}, {value:'engineering', label:'Engineering'}];

// Replace this route and mapping with your application's authorized search API.
async function searchProjects({ search, limit, signal }) {
  const params = new URLSearchParams({ search, limit: String(limit) });
  const response = await fetch('/api/projects/search?' + params, { signal });
  if (!response.ok) throw new Error('Could not search projects.');
  const data = await response.json();
  return data.items.map(project => ({
    value: project.id, label: project.name, description: project.ownerName,
  }));
}

export default function Example() {
  const [period, setPeriod] = useState('30');
  const [team, setTeam] = useState('');
  const [project, setProject] = useState('');
  return <div className="cgw-stack">
    <Select label="Reporting period" name="period" value={period}
      onChange={event => setPeriod(event.target.value)}
      options={[{value:'7', label:'Last 7 days'}, {value:'30', label:'Last 30 days'}]} />
    <SearchSelect label="Team" name="team" options={teams} value={team} onChange={setTeam}
      placeholder="Search teams…" />
    <SearchSelect label="Project" name="project" value={project} onChange={setProject}
      loadOptions={searchProjects} minSearchLength={2} debounceMs={300} limit={20} required />
  </div>;
}`,
};
