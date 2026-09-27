export const chartNumber = (value) =>
  value == null || value === "" || !Number.isFinite(Number(value))
    ? null
    : Number(value);
export function chartDomain(data, series) {
  const values = data
    .flatMap((row) => series.map((item) => chartNumber(row[item.key])))
    .filter((value) => value != null);
  const min = Math.min(0, ...values),
    max = Math.max(0, ...values);
  const span = max - min || 1;
  return {
    min: min < 0 ? min - span * 0.08 : 0,
    max: max > 0 ? max + span * 0.08 : min < 0 ? 0 : 1,
  };
}
export function donutSegments(data, valueKey) {
  const values = data.map((row) =>
      Math.max(0, chartNumber(row[valueKey]) ?? 0),
    ),
    total = values.reduce((sum, value) => sum + value, 0);
  let offset = 0;
  return {
    total,
    segments: values.map((value) => {
      const percent = total ? (value / total) * 100 : 0,
        segment = { value, percent, offset };
      offset += percent;
      return segment;
    }),
  };
}
export function lineSegments(points) {
  const segments = [];
  let current = [];
  for (const point of points) {
    if (point) current.push(point);
    else if (current.length) {
      segments.push(current);
      current = [];
    }
  }
  if (current.length) segments.push(current);
  return segments;
}
