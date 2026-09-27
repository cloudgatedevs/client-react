const imports = `import { DataTable } from '@cloudgatedevs/cloudgate-client-react/react/widgets';`;
const setup = `const columns = [{key:'name',label:'Project'}, {key:'status',label:'Status'}, {key:'revenue',label:'Revenue'}];
const rows = [{id:1,name:'Brand studio',status:'Active',revenue:2400}, {id:2,name:'Customer portal',status:'Paused',revenue:1800}];`;
const loader = `// Adapt this endpoint to your app. Filter and authorize on the server.
async function loadRows({page,pageSize,search,sort,filters,advancedFilters,signal}) {
  const params = new URLSearchParams({page:String(page),pageSize:String(pageSize),search,
    sort:JSON.stringify(sort),filters:JSON.stringify(filters),advancedFilters:JSON.stringify(advancedFilters)});
  const response = await fetch('/api/projects?' + params, {signal});
  if (!response.ok) throw new Error('Could not load projects.');
  return response.json(); // {rows, total} — count AFTER filtering, BEFORE pagination
}`;
export const tableExamples = {
  'data-table': {
    description:'Local records with search, sorting, pagination, column controls and Excel export. Compose the same DataTable with server loading, selection or subtables when needed.',
    example:`${imports}\n${setup}\nexport default function Example() { return <DataTable label="Projects" rows={rows} columns={columns} pageSize={10} />; }`,
  },
  'lazy-table': {
    description:'Server pagination, load-more and infinite scrolling with page-sized requests, cancellation, loading skeletons and retry.',
    example:`${imports}\n${setup.split('\n')[0]}\n${loader}\nexport default function Example() { return <DataTable label="Projects" columns={columns} loadRows={loadRows} pagination="load-more" pageSize={25} />; }`,
  },
  'selection-table': {
    description:'Select records across pages and run bulk actions, with pending feedback, error recovery and refresh after success.',
    example:`import { useState } from 'react';\n${imports}\n${setup}\nexport default function Example() {
  const [projects,setProjects] = useState(rows);
  return <DataTable label="Projects" rows={projects} columns={columns} selectable getRowLabel={row=>row.name}
    bulkActions={[{id:'activate',label:'Activate',onAction:ids=>setProjects(old=>old.map(row=>ids.includes(row.id)?{...row,status:'Active'}:row))}]} />;
}`,
  },
  'row-selection-table': {
    description:'Click a row to highlight one active record and load connected cards, charts or detail widgets. Supports keyboard selection, local or server data and controlled state, independently of bulk checkboxes.',
    example:`import { useEffect, useState } from 'react';
import { DataTable, Card, EmptyState, Alert, Button } from '@cloudgatedevs/cloudgate-client-react/react/widgets';

const columns = [{key:'name', label:'Name'}, {key:'email', label:'Email'}];

function UserDetails({userId}) {
  const [user, setUser] = useState(null), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setUser(null); setError('');
    async function load() {
      try {
        // Replace with your authorized, tenant-scoped detail endpoint.
        const response = await fetch('/api/users/' + encodeURIComponent(userId), {signal:controller.signal});
        if (!response.ok) throw new Error('Could not load user details.');
        const data = await response.json();
        if (!controller.signal.aborted) setUser(data);
      } catch (err) { if (!controller.signal.aborted) setError(err.message); }
    }
    load();
    return () => controller.abort();
  }, [userId, revision]);
  if (error) return <Alert tone="danger" title="Details unavailable" action={<Button onClick={() => setRevision(value=>value+1)}>Try again</Button>}>{error}</Alert>;
  return <Card title={user?.name || 'User details'} loading={!user}>
    {user && <p>{user.email}</p>}
  </Card>;
}

export default function Example({users}) {
  const [activeId, setActiveId] = useState(null);
  return <div className="cgw-stack">
    <DataTable label="Users" rows={users} columns={columns} getRowLabel={row=>row.name}
      rowSelectable activeRowId={activeId} onActiveRowChange={(id, row)=>setActiveId(id)} />
    {activeId !== null ? <>
      <Button variant="secondary" onClick={()=>setActiveId(null)}>Clear active row</Button>
      <UserDetails key={activeId} userId={activeId} />
    </> : <EmptyState title="Select a user" description="Their details will appear here." />}
  </div>;
}`,
  },
  subtable: {
    description:'Expand a row to lazily mount a child table. Each parent-scoped subtable owns its search, sorting, pagination and Excel export.',
    example:`${imports}\n${setup}\nfunction Tasks({project}) {
  async function loadTasks({signal,page,pageSize,search,sort}) {
    const params=new URLSearchParams({page:String(page),pageSize:String(pageSize),search,sort:JSON.stringify(sort)});
    const response=await fetch('/api/projects/'+encodeURIComponent(project.id)+'/tasks?'+params,{signal});
    if(!response.ok) throw new Error('Could not load tasks.');
    return response.json();
  }
  return <DataTable label={project.name+' tasks'} columns={[{key:'name',label:'Task'}]} loadRows={loadTasks} pageSize={5} />;
}
export default function Example() { return <DataTable label="Projects" rows={rows} columns={columns}
  getRowLabel={row=>row.name} renderExpandedRow={row=><Tasks project={row} />} />; }`,
  },
  'advanced-table': {
    description:'Combine text, multi-select, number and date conditions using AND/OR. Apply drafts together, remove filter chips or clear all. Supports local and server filtering.',
    example:`${imports}\n${setup.split('\n')[0]}\n${loader}\nconst fields=[
  {key:'name',label:'Project',type:'text'},
  {key:'status',label:'Status',type:'select',options:[{value:'Active',label:'Active'},{value:'Paused',label:'Paused'}]},
  {key:'revenue',label:'Revenue',type:'number'},
  {key:'created',label:'Created',type:'date'},
];
export default function Example() { return <DataTable label="Projects" columns={[...columns,{key:'created',label:'Created'}]}
  loadRows={loadRows} filterFields={fields} />; }`,
  },
};
