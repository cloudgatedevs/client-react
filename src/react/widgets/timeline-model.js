export function timelineDate(value, {locale, timeZone} = {}) {
  if (!value || typeof value!=='string') return null;
  const isoDay = /^(\d{4}-\d{2}-\d{2})(?:T|$)/.exec(value)?.[1];
  if (isoDay) {const day=new Date(`${isoDay}T12:00:00Z`);if(!Number.isFinite(day.getTime()) || day.toISOString().slice(0,10)!==isoDay)return null;}
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T12:00:00Z` : value);
  if (!Number.isFinite(date.getTime()) || (dateOnly && date.toISOString().slice(0,10)!==value)) return null;
  const zone = dateOnly ? 'UTC' : timeZone;
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get = name => parts.find(part=>part.type===name)?.value;
  return {
    key:`${get('year')}-${get('month')}-${get('day')}`,
    day:new Intl.DateTimeFormat(locale,{timeZone:zone,dateStyle:'long'}).format(date),
    label:new Intl.DateTimeFormat(locale,{timeZone:zone,dateStyle:'medium',...(!dateOnly && {timeStyle:'short'})}).format(date),
  };
}

export function timelineGroups(items, {groupByDay=false,locale,timeZone} = {}) {
  // Validate before rendering: duplicate IDs corrupt entry state, especially after paging.
  const ids = new Set();
  if (timeZone) new Intl.DateTimeFormat(locale,{timeZone});
  const groups = [];
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) throw new Error('Timeline entries need unique, non-empty string IDs.');
    ids.add(item.id);
    const date = timelineDate(item.dateTime,{locale,timeZone});
    const key = groupByDay ? date?.key || 'undated' : 'all';
    let group = groups.at(-1);
    if (!group || group.key !== key) {group={key,label:groupByDay?date?.day || 'Undated':null,items:[]};groups.push(group);}
    group.items.push({item,date});
  }
  return groups;
}
