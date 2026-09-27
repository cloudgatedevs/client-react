import { useEffect, useId, useMemo, useRef, useState } from "react";
import { EmptyState, WidgetSkeleton } from "./primitives.jsx";
import { useAnimatedNumber } from './motion.js';
import { TableExport } from './TableExport.jsx';
import {
  chartDomain,
  chartNumber,
  donutSegments,
  lineSegments,
} from "./chart-model.js";

const defaultFormat = (value) =>
  new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
const color = (index) => `var(--cgw-chart-${(index % 6) + 1})`;
function ChartData({ data, series, xKey, formatValue }) {
  return (
    <details className="cgw-chart-data">
      <summary>View data table</summary>
      <div className="cgw-export-toolbar"><TableExport label="Chart values" getRows={() => data}
        columns={[{key:xKey,label:'Label'}, ...series.map(item => ({key:item.key,label:item.label,
          exportValue:row => chartNumber(row[item.key])}))]} /></div>
      <div className="cgw-table-scroll">
        <table>
          <caption className="cgw-sr-only">Chart values</caption>
          <thead>
            <tr>
              <th scope="col">Label</th>
              {series.map((item) => (
                <th key={item.key} scope="col">
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <th scope="row">{String(row[xKey] ?? "")}</th>
                {series.map((item) => (
                  <td key={item.key}>
                    {chartNumber(row[item.key]) == null
                      ? "—"
                      : formatValue(Number(row[item.key]))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
function CartesianChart({
  type,
  data = [],
  series = [],
  xKey = "label",
  label = "Chart",
  formatValue = defaultFormat,
  height = 260,
  loading = false,
  showDataTable = true,
  animate = true,
  duration = 650,
}) {
  const id = useId().replaceAll(":", ""),
    [hidden, setHidden] = useState([]),
    [active, setActive] = useState(null),
    [width, setWidth] = useState(640),
    chartRef = useRef(null);
  useEffect(() => {
    const target = chartRef.current;
    if (!target) return;
    const measure = () =>
      setWidth(Math.max(240, Math.round(target.getBoundingClientRect().width)));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, data.length, series.length]);
  const shown = series.filter((item) => !hidden.includes(item.key));
  const animationKey = useMemo(() => JSON.stringify([loading, hidden, data.map(row =>
    [row[xKey], ...series.map(item => chartNumber(row[item.key]))])]), [loading, hidden, data, series, xKey]);
  const progress = useAnimatedNumber(1, { animate: animate && !loading && data.length > 0, duration, resetKey: animationKey });
  const { min, max } = useMemo(() => chartDomain(data, shown), [data, shown]);
  const top = 18,
    left = 64,
    right = 18,
    bottom = 38,
    h = Math.max(180, height),
    plotW = width - left - right,
    plotH = h - top - bottom;
  const y = (value) => top + ((max - value) / (max - min)) * plotH;
  const x = (index) =>
    type === "bar"
      ? left + ((index + 0.5) * plotW) / data.length
      : left +
        (data.length <= 1 ? plotW / 2 : (index * plotW) / (data.length - 1));
  const barWidth = Math.min(
    44,
    ((plotW / Math.max(1, data.length)) * 0.7) / Math.max(1, shown.length),
  );
  const labelCount = Math.min(data.length, Math.max(2, Math.floor(plotW / 64)));
  const labelIndexes = new Set(
    Array.from({ length: labelCount }, (_, i) =>
      labelCount === 1
        ? 0
        : Math.round((i * (data.length - 1)) / (labelCount - 1)),
    ),
  );
  if (loading)
    return (
      <div className="cgw-chart">
        <WidgetSkeleton variant="chart" height={`${h}px`} label={`Loading ${label}`} />
      </div>
    );
  if (!data.length || !series.length)
    return (
      <EmptyState
        title="No chart data"
        description="Data will appear here when it is available."
      />
    );
  const selected = active == null ? null : data[active];
  return (
    <div className="cgw-chart" ref={chartRef}>
      <div className="cgw-chart-legend" aria-label={`${label} series`}>
        {series.map((item, index) => (
          <button
            type="button"
            key={item.key}
            aria-pressed={!hidden.includes(item.key)}
            onClick={() =>
              setHidden((previous) =>
                previous.includes(item.key)
                  ? previous.filter((key) => key !== item.key)
                  : [...previous, item.key],
              )
            }
          >
            <span style={{ background: color(index) }} />
            {item.label}
          </button>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${h}`}
        role="group"
        aria-label={label}
        className="cgw-chart-svg"
      >
        <title>{label}</title>
        <desc>
          Focus a data point to read its value. Toggle series with the legend or
          expand the data table.
        </desc>
        <defs>
          <clipPath id={`${id}-reveal`}>
            <rect x={left - 6} y="0" width={(plotW + 12) * progress} height={h} />
          </clipPath>
          {series.map((item, index) => (
            <linearGradient
              id={`${id}-fill-${index}`}
              key={item.key}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor={color(index)} stopOpacity=".2" />
              <stop offset="100%" stopColor={color(index)} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {Array.from({ length: 5 }, (_, index) => {
          const value = min + ((max - min) * index) / 4;
          return (
            <g key={index} className="cgw-chart-axis">
              <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} />
              <text x={left - 10} y={y(value) + 4} textAnchor="end">
                {formatValue(value)}
              </text>
            </g>
          );
        })}
        {min < 0 && (
          <line
            x1={left}
            x2={width - right}
            y1={y(0)}
            y2={y(0)}
            className="cgw-chart-zero"
          />
        )}
        {data.map(
          (row, index) =>
            labelIndexes.has(index) && (
              <text
                className="cgw-chart-axis"
                key={index}
                x={x(index)}
                y={h - 10}
                textAnchor="middle"
              >
                {String(row[xKey] ?? "").slice(0, 16)}
              </text>
            ),
        )}
        {shown.map((item, seriesIndex) => {
          const index = series.findIndex((entry) => entry.key === item.key),
            points = data.map((row, i) =>
              chartNumber(row[item.key]) == null
                ? null
                : [x(i), y(Number(row[item.key]))],
            );
          return (
            <g key={item.key} style={{ color: color(index) }} clipPath={type === 'line' ? `url(#${id}-reveal)` : undefined}>
              {type === "line" &&
                lineSegments(points).map((segment, i) => (
                  <g key={i}>
                    <path
                      d={`M ${segment[0][0]} ${y(0)} L ${segment.map((point) => point.join(" ")).join(" L ")} L ${segment.at(-1)[0]} ${y(0)} Z`}
                      fill={`url(#${id}-fill-${index})`}
                    />
                    <polyline
                      points={segment.map((point) => point.join(",")).join(" ")}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </g>
                ))}
              {data.map((row, rowIndex) => {
                const value = chartNumber(row[item.key]);
                if (value == null) return null;
                const props = {
                  tabIndex: 0,
                  role: "img",
                  "aria-label": `${row[xKey]}, ${item.label}: ${formatValue(value)}`,
                  onFocus: () => setActive(rowIndex),
                  onMouseEnter: () => setActive(rowIndex),
                  onBlur: () => setActive(null),
                  onMouseLeave: () => setActive(null),
                  className: "cgw-chart-point",
                };
                return type === "bar" ? (
                  <rect
                    key={rowIndex}
                    {...props}
                    x={
                      x(rowIndex) +
                      (seriesIndex - shown.length / 2) * barWidth +
                      1
                    }
                    y={y(0) + (Math.min(y(value), y(0)) - y(0)) * progress}
                    width={Math.max(1, barWidth - 2)}
                    height={Math.max(1, Math.abs(y(value) - y(0))) * progress}
                    rx={3}
                    fill="currentColor"
                  >
                    <title>{props["aria-label"]}</title>
                  </rect>
                ) : (
                  <circle
                    key={rowIndex}
                    {...props}
                    cx={x(rowIndex)}
                    cy={y(value)}
                    r={active === rowIndex ? 5 : 3.5}
                    fill="currentColor"
                    stroke="rgb(var(--ink-850))"
                    strokeWidth={2}
                  >
                    <title>{props["aria-label"]}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="cgw-chart-readout" aria-live="polite">
        {selected ? (
          <>
            <strong>{selected[xKey]}</strong>
            {shown.map((item) => (
              <span key={item.key}>
                {item.label}:{" "}
                <b>
                  {chartNumber(selected[item.key]) == null
                    ? "—"
                    : formatValue(Number(selected[item.key]))}
                </b>
              </span>
            ))}
          </>
        ) : (
          <span>Hover or focus a point to explore</span>
        )}
      </div>
      {showDataTable && <ChartData {...{ data, series, xKey, formatValue }} />}
    </div>
  );
}
export const LineChart = (props) => <CartesianChart {...props} type="line" />;
export const BarChart = (props) => <CartesianChart {...props} type="bar" />;
export function DonutChart({
  data = [],
  labelKey = "label",
  valueKey = "value",
  label = "Distribution",
  formatValue = defaultFormat,
  loading = false,
  showDataTable = true,
  animate = true,
  duration = 750,
}) {
  const [active, setActive] = useState(null),
    { segments, total } = donutSegments(data, valueKey);
  const animationKey = useMemo(() => JSON.stringify([loading, data.map(row => [row[labelKey], chartNumber(row[valueKey])])]), [loading, data, labelKey, valueKey]);
  const progress = useAnimatedNumber(1, { animate: animate && !loading && total > 0, duration, resetKey: animationKey });
  if (loading)
    return (
      <WidgetSkeleton variant="donut" height="16rem" label={`Loading ${label}`} />
    );
  if (!total)
    return (
      <EmptyState
        title="No chart data"
        description="Add positive values to show a breakdown."
      />
    );
  const selected = active == null ? null : data[active];
  const selectedValue = selected ? segments[active].value : total;
  return (
    <div className="cgw-chart">
      <div className="cgw-donut-layout">
        <svg
          viewBox="0 0 220 220"
          role="group"
          aria-label={label}
          className="cgw-donut"
        >
          <title>{label}</title>
          <circle
            cx="110"
            cy="110"
            r="80"
            fill="none"
            stroke="rgb(var(--ink-800))"
            strokeWidth="24"
          />
          {segments.map(
            (segment, index) =>
              segment.value > 0 && (
                <circle
                  key={index}
                  cx="110"
                  cy="110"
                  r="80"
                  pathLength="100"
                  fill="none"
                  stroke={color(index)}
                  strokeWidth={active === index ? 29 : 24}
                  strokeDasharray={`${Math.min(segment.percent, Math.max(0, progress * 100 - segment.offset))} ${100 - Math.min(segment.percent, Math.max(0, progress * 100 - segment.offset))}`}
                  strokeDashoffset={-segment.offset}
                  transform="rotate(-90 110 110)"
                  tabIndex={0}
                  role="img"
                  aria-label={`${data[index][labelKey]}: ${formatValue(segment.value)}, ${segment.percent.toFixed(1)}%`}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onBlur={() => setActive(null)}
                  className="cgw-chart-point"
                >
                  <title>
                    {data[index][labelKey]}: {formatValue(segment.value)}
                  </title>
                </circle>
              ),
          )}
          <text x="110" y="108" textAnchor="middle" className="cgw-donut-value" aria-label={formatValue(selectedValue)}>
            <tspan aria-hidden="true">{formatValue(selected ? selectedValue : total * progress)}</tspan>
          </text>
          <text x="110" y="132" textAnchor="middle" className="cgw-chart-axis">
            {String(selected ? selected[labelKey] : "Total").slice(0, 20)}
          </text>
        </svg>
        <div className="cgw-donut-legend">
          {data.map((row, index) => (
            <div key={index}>
              <span className="cgw-dot" style={{ background: color(index) }} />
              <span>{row[labelKey]}</span>
              <strong>{segments[index].percent.toFixed(1)}%</strong>
            </div>
          ))}
        </div>
      </div>
      {showDataTable && (
        <ChartData
          data={data}
          series={[{ key: valueKey, label: "Value" }]}
          xKey={labelKey}
          formatValue={formatValue}
        />
      )}
    </div>
  );
}
