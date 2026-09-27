import { useState } from 'react';
import { Plus, SlidersHorizontal, X } from 'lucide-react';
import { Alert, Button, Checkbox, Dialog, IconButton, Input, Select } from './primitives.jsx';
import { FILTER_OPERATORS, validateFilters } from './filter-model.js';

export function TableFilters({ fields, value, onChange }) {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(value), [errors, setErrors] = useState([]);
  const blank = field => ({field:field.key,type:field.type || 'text',operator:FILTER_OPERATORS[field.type || 'text'][0][0],value:field.type === 'select' ? [] : ''});
  const update = (index, patch) => { setDraft(previous => ({...previous,rules:previous.rules.map((rule,i)=> i === index ? {...rule,...patch} : rule)})); setErrors([]); };
  return <>
    <Button variant="secondary" size="sm" icon={SlidersHorizontal} onClick={() => {setDraft({match:value.match,rules:value.rules.map(rule=>({...rule}))});setErrors([]);setOpen(true);}}>
      Filters{value.rules.length ? ` (${value.rules.length})` : ''}
    </Button>
    <Dialog open={open} onClose={() => setOpen(false)} title="Advanced filters" size="lg" description="Build conditions to find the records you need."
      footer={<><Button variant="ghost" onClick={() => {setDraft({match:'all',rules:[]});setErrors([]);}}>Clear conditions</Button><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => {
        const next = draft.rules.map(rule => ({...rule,type:fields.find(field=>field.key===rule.field)?.type || 'text'}));
        const failures = validateFilters({...draft,rules:next},fields);setErrors(failures);
        if (!failures.some(Boolean)) {onChange({...draft,rules:next});setOpen(false);}
      }}>Apply filters</Button></>}>
      <div className="cgw-stack">
        <Select label="Match" value={draft.match} options={[{value:'all',label:'All conditions (AND)'},{value:'any',label:'Any condition (OR)'}]} onChange={event=>setDraft({...draft,match:event.target.value})} />
        {draft.rules.map((rule,index) => {
          const field = fields.find(item=>item.key===rule.field) || fields[0], noValue = ['empty','notEmpty'].includes(rule.operator);
          const selectedValues = Array.isArray(rule.value) ? rule.value : [];
          return <div key={index} className="cgw-filter-rule">
            <div className="cgw-filter-rule-fields">
              <Select label={`Field ${index+1}`} value={field.key} options={fields.map(item=>({value:item.key,label:item.label}))} onChange={event=>update(index,blank(fields.find(item=>item.key===event.target.value)))} />
              <Select label={`Condition ${index+1}`} value={rule.operator} options={FILTER_OPERATORS[field.type || 'text'].map(([value,label])=>({value,label}))} onChange={event=>update(index,{operator:event.target.value})} />
              <IconButton label={`Remove condition ${index+1}`} icon={X} onClick={()=>{setDraft({...draft,rules:draft.rules.filter((_,i)=>i!==index)});setErrors([]);}} />
            </div>
            {!noValue && (field.type === 'select' ? <fieldset className="cgw-filter-options"><legend>Values for {field.label}</legend>{field.options?.map(option=><Checkbox key={option.value} label={option.label} checked={selectedValues.includes(option.value)} onChange={()=>update(index,{value:selectedValues.includes(option.value) ? selectedValues.filter(item=>item!==option.value) : [...selectedValues,option.value]})} />)}</fieldset> :
              <div className="cgw-filter-values"><Input label={rule.operator === 'between' ? `From ${index+1}` : `Value ${index+1}`} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} step="any" value={rule.value ?? ''} onChange={event=>update(index,{value:event.target.value})} />
              {rule.operator === 'between' && <Input label={`To ${index+1}`} type={field.type === 'date' ? 'date' : 'number'} step="any" value={rule.valueTo ?? ''} onChange={event=>update(index,{valueTo:event.target.value})} />}</div>)}
            {errors[index] && <Alert tone="danger">{errors[index]}</Alert>}
          </div>;
        })}
        {!draft.rules.length && <p className="cgw-muted">No conditions. All records match.</p>}
        <Button variant="secondary" icon={Plus} onClick={()=>setDraft({...draft,rules:[...draft.rules,blank(fields[0])]})}>Add condition</Button>
      </div>
    </Dialog>
  </>;
}

export function FilterChips({ fields, value, onChange }) {
  if (!value.rules.length) return null;
  return <div className="cgw-filter-chips" aria-label="Active filters"><span>{value.match === 'any' ? 'Match any' : 'Match all'}</span>{value.rules.map((rule,index)=>{
    const field = fields.find(item=>item.key===rule.field), operator = FILTER_OPERATORS[rule.type || 'text']?.find(([op])=>op===rule.operator)?.[1] || rule.operator;
    const values = Array.isArray(rule.value) ? rule.value.map(value=>field?.options?.find(option=>option.value===value)?.label || value).join(', ') : rule.value;
    const label = `${field?.label || rule.field} ${operator.toLowerCase()}${['empty','notEmpty'].includes(rule.operator) ? '' : ` ${values}${rule.operator === 'between' ? ` – ${rule.valueTo}` : ''}`}`;
    return <button key={index} type="button" className="cgw-filter-chip" aria-label={`Remove filter: ${label}`} onClick={()=>onChange({...value,rules:value.rules.filter((_,i)=>i!==index)})}>{label}<X size={12} aria-hidden="true" /></button>;
  })}<Button size="sm" variant="ghost" onClick={()=>onChange({match:'all',rules:[]})}>Clear all filters</Button></div>;
}
