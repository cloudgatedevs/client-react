import { matchesAdvancedFilters } from './filter-model.js';
export const clampPage = (page, total, pageSize) =>
  Math.max(1, Math.min(page, Math.max(1, Math.ceil(total / pageSize))));
export function tableValue(row, column) {
  return column.accessor ? column.accessor(row) : row[column.key];
}
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
export function queryRows(
  rows,
  columns,
  { page = 1, pageSize = 10, search = "", sort = null, filters = {}, advancedFilters } = {},
) {
  const term = search.trim().toLocaleLowerCase();
  let result = rows.filter(
    (row) =>
      (!term ||
        columns.some(
          (column) =>
            column.searchable !== false &&
            String(tableValue(row, column) ?? "")
              .toLocaleLowerCase()
              .includes(term),
        )) &&
      matchesAdvancedFilters(row, columns, advancedFilters) && Object.entries(filters).every(
        ([key, value]) =>
          value == null ||
          value === "" ||
          (Array.isArray(value)
            ? value.includes(row[key])
            : String(row[key]) === String(value)),
      ),
  );
  const column = sort && columns.find((column) => column.key === sort.key);
  if (column && column.sortable !== false) {
    result = [...result].sort((a, b) => {
      const left = tableValue(a, column),
        right = tableValue(b, column);
      // Nulls always follow real values, including when sorted descending.
      if (left == null || right == null)
        return left == null && right == null ? 0 : left == null ? 1 : -1;
      const compared = column.compare
        ? column.compare(left, right, a, b)
        : typeof left === "number" && typeof right === "number"
          ? left - right
          : left instanceof Date && right instanceof Date
            ? left - right
            : collator.compare(String(left), String(right));
      return compared * (sort.direction === "desc" ? -1 : 1);
    });
  }
  const safePage = clampPage(page, result.length, pageSize);
  return {
    rows: result.slice((safePage - 1) * pageSize, safePage * pageSize),
    total: result.length,
    page: safePage,
  };
}
export function validatePage(result) {
  if (
    !result ||
    !Array.isArray(result.rows) ||
    !Number.isSafeInteger(result.total) ||
    result.total < 0
  )
    throw new Error(
      "The table loader must return { rows: [], total: non-negative integer }.",
    );
  return result;
}
export function mergeRows(previous, incoming, getRowId) {
  const byId = new Map(previous.map((row) => [getRowId(row), row]));
  for (const row of incoming) byId.set(getRowId(row), row);
  return [...byId.values()];
}
export function pageNumbers(page, pages) {
  return [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((value) => value > 0 && value <= pages)
    .sort((a, b) => a - b);
}
