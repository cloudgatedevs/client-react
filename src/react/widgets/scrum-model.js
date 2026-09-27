export function validateBoard(columns, cards) {
  const ids = new Set();
  for (const column of columns) {
    if (!column || typeof column.id !== 'string' || !column.id || !column.title || ids.has(column.id)) throw new Error('Board columns need unique string IDs and titles.');
    ids.add(column.id);
  }
  const cardIds = new Set();
  for (const card of cards) {
    if (!card || typeof card.id !== 'string' || !card.id || !card.title || cardIds.has(card.id)) throw new Error('Board cards need unique string IDs and titles.');
    if (!ids.has(card.columnId)) throw new Error(`Card ${card.id} belongs to an unknown column.`);
    cardIds.add(card.id);
  }
}

export function filterBoardCards(cards, search = '', assignee = '') {
  const terms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return cards.filter(card => (!assignee || (card.assignees || []).some(person => person.id === assignee)) &&
    terms.every(term => [card.title, card.reference, card.description, card.priority, ...(card.tags || []), ...(card.assignees || []).map(person => person.name)].filter(Boolean).join(' ').toLocaleLowerCase().includes(term)));
}

// Index is the insertion position in the destination AFTER removing the moving card.
// Work from the full data set, so moving while filtered never drops hidden cards.
export function moveBoardCard(cards, columns, cardId, toColumnId, toIndex) {
  validateBoard(columns, cards);
  const card = cards.find(item => item.id === cardId);
  if (!card || !columns.some(column => column.id === toColumnId)) return null;
  const source = cards.filter(item => item.columnId === card.columnId);
  const fromIndex = source.findIndex(item => item.id === cardId);
  const remaining = cards.filter(item => item.id !== cardId);
  const target = remaining.filter(item => item.columnId === toColumnId);
  const index = Math.max(0, Math.min(target.length, Number.isFinite(toIndex) ? Math.trunc(toIndex) : target.length));
  if (card.columnId === toColumnId && fromIndex === index) return null;
  const insertAt = index < target.length ? remaining.indexOf(target[index]) : target.length ? remaining.indexOf(target[target.length - 1]) + 1 : remaining.length;
  const next = [...remaining];
  next.splice(insertAt, 0, {...card, columnId: toColumnId});
  return {cards: next, change: {card, cardId, fromColumnId: card.columnId, toColumnId, fromIndex, toIndex: index}};
}

export function boardDropTarget(cards, cardId, over, after = false) {
  if (!over) return null;
  const remaining = cards.filter(card => card.id !== cardId);
  if (over.type === 'column') return {columnId: over.columnId, index: remaining.filter(card => card.columnId === over.columnId).length};
  if (over.cardId === cardId) return null;
  const card = remaining.find(item => item.id === over.cardId);
  if (!card) return null;
  const siblings = remaining.filter(item => item.columnId === card.columnId);
  return {columnId: card.columnId, index: siblings.indexOf(card) + (after ? 1 : 0)};
}

export function boardDate(value, locale) {
  if (!value) return null;
  // Date-only deadlines are calendar dates, never shifted by UTC offsets.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match ? new Date(+match[1], +match[2] - 1, +match[3], 12) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {label: date.toLocaleDateString(locale, {month:'short', day:'numeric'}), full: date.toLocaleDateString(locale, {dateStyle:'long'})};
}
