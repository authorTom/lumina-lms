// Server-rendered SVG charts for the analytics dashboard.
// Palette (validated): series-1 blue #2a78d6, series-2 aqua #1baf7a;
// ink #0b0b0b / #52514e, muted #898781, gridline #e1e0d9, baseline #c3c2b7.

const INK = "#0b0b0b";
const MUTED = "#898781";
const GRID = "#e1e0d9";
const BASELINE = "#c3c2b7";
export const SERIES = ["#2a78d6", "#1baf7a"] as const;

function niceMax(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (value <= m * magnitude) return m * magnitude;
  }
  return 10 * magnitude;
}

export interface LineSeries {
  name: string;
  color: string;
  values: number[];
}

export function LineChart({
  labels,
  series,
  height = 200,
}: {
  labels: string[]; // one per point, e.g. "12 Jun"
  series: LineSeries[];
  height?: number;
}) {
  const width = 640;
  const pad = { top: 12, right: 84, bottom: 24, left: 36 };
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const n = labels.length;
  const x = (i: number) => pad.left + (n <= 1 ? 0 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.top + ih - (v / max) * ih;

  const gridValues = [...new Set([0, Math.ceil(max / 2), max])];
  const tickEvery = Math.max(1, Math.ceil(n / 5));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" className="w-full min-w-[480px]">
        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              x2={pad.left + iw}
              y1={y(v)}
              y2={y(v)}
              stroke={v === 0 ? BASELINE : GRID}
              strokeWidth={1}
            />
            <text x={pad.left - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill={MUTED}>
              {v}
            </text>
          </g>
        ))}
        {labels.map((label, i) =>
          i % tickEvery === 0 ? (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize={10} fill={MUTED}>
              {label}
            </text>
          ) : null
        )}
        {series.map((s) => {
          const path = s.values
            .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
            .join("");
          const lastIndex = s.values.length - 1;
          return (
            <g key={s.name}>
              <path d={path} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={8} fill="transparent">
                  <title>{`${labels[i]} — ${s.name}: ${v}`}</title>
                </circle>
              ))}
              <circle cx={x(lastIndex)} cy={y(s.values[lastIndex])} r={3} fill={s.color} />
              {/* Direct label at the line's end */}
              <text
                x={x(lastIndex) + 8}
                y={y(s.values[lastIndex]) + 3.5}
                fontSize={11}
                fill={INK}
              >
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function HBarChart({
  items,
  color = SERIES[0],
}: {
  items: { label: string; value: number }[];
  color?: string;
}) {
  const width = 640;
  const rowH = 26;
  const barH = 16;
  const labelW = 190;
  const valueW = 44;
  const height = items.length * rowH + 4;
  const iw = width - labelW - valueW;
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" className="w-full min-w-[480px]">
        {items.map((item, i) => {
          const w = Math.max(2, (item.value / max) * iw);
          const yTop = i * rowH + (rowH - barH) / 2;
          const r = Math.min(4, w / 2);
          return (
            <g key={item.label + i}>
              <text
                x={labelW - 8}
                y={yTop + barH / 2 + 3.5}
                textAnchor="end"
                fontSize={11}
                fill="#52514e"
              >
                {item.label.length > 28 ? item.label.slice(0, 27) + "…" : item.label}
              </text>
              {/* Rounded data-end only (baseline edge stays square) */}
              <path
                d={`M${labelW},${yTop} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${barH - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - r} Z`}
                fill={color}
              >
                <title>{`${item.label}: ${item.value}`}</title>
              </path>
              <text
                x={labelW + w + 6}
                y={yTop + barH / 2 + 3.5}
                fontSize={11}
                fill={INK}
              >
                {item.value}
              </text>
            </g>
          );
        })}
        <line x1={labelW} x2={labelW} y1={0} y2={height} stroke={BASELINE} strokeWidth={1} />
      </svg>
    </div>
  );
}

export function ColumnChart({
  items,
  color = SERIES[0],
  formatLabel = (label: string) => label,
  tickEvery = 3,
}: {
  items: { label: string; value: number }[];
  color?: string;
  formatLabel?: (label: string) => string;
  tickEvery?: number;
}) {
  const width = 640;
  const height = 170;
  const pad = { top: 8, right: 8, bottom: 22, left: 32 };
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...items.map((i) => i.value)));
  const gap = 2;
  const colW = iw / items.length - gap;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" className="w-full min-w-[480px]">
        {[...new Set([Math.ceil(max / 2), max])].map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              x2={pad.left + iw}
              y1={pad.top + ih - (v / max) * ih}
              y2={pad.top + ih - (v / max) * ih}
              stroke={GRID}
              strokeWidth={1}
            />
            <text
              x={pad.left - 5}
              y={pad.top + ih - (v / max) * ih + 3.5}
              textAnchor="end"
              fontSize={10}
              fill={MUTED}
            >
              {v}
            </text>
          </g>
        ))}
        <line
          x1={pad.left}
          x2={pad.left + iw}
          y1={pad.top + ih}
          y2={pad.top + ih}
          stroke={BASELINE}
          strokeWidth={1}
        />
        {items.map((item, i) => {
          const h = (item.value / max) * ih;
          const xLeft = pad.left + i * (colW + gap);
          const r = Math.min(4, colW / 2, h);
          return (
            <g key={item.label}>
              {item.value > 0 && (
                <path
                  d={`M${xLeft},${pad.top + ih} v-${h - r} a${r},${r} 0 0 1 ${r},-${r} h${colW - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} Z`}
                  fill={color}
                >
                  <title>{`${formatLabel(item.label)}: ${item.value}`}</title>
                </path>
              )}
              {i % tickEvery === 0 && (
                <text
                  x={xLeft + colW / 2}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fill={MUTED}
                >
                  {formatLabel(item.label)}
                </text>
              )}
              {/* invisible hover target covering the full column height */}
              <rect x={xLeft} y={pad.top} width={colW + gap} height={ih} fill="transparent">
                <title>{`${formatLabel(item.label)}: ${item.value}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ChartLegend({ series }: { series: { name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-zinc-600">
      {series.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}
