/**
 * Northstar-themed SVG chart primitives (no chart library — matches the app's
 * hand-rolled SVG approach). Used by the Financial Health / Research Finance /
 * Enrollment Finance pages inside a `.ns-theme` wrapper. Colors reference the
 * brand palette: navy #094074, slate #3C6997, cyan #5ADBFF, lemon #FFDD4A,
 * orange #FE9000.
 */
import type { ReactNode } from "react";

export const NS = {
  navy: "#094074",
  slate: "#3C6997",
  cyan: "#5ADBFF",
  lemon: "#FFDD4A",
  orange: "#FE9000",
};
export const NS_SERIES = [NS.navy, NS.slate, NS.cyan, NS.orange, NS.lemon];

const usd = (n: number, compact = true) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(n || 0);

export function fmtUSD(n: number, compact = true) {
  return usd(n, compact);
}

export function NsKpiCard({
  label,
  value,
  sub,
  accent = NS.navy,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="ns-card p-5" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="ns-muted text-xs uppercase tracking-wide font-medium">{label}</div>
      <div className="ns-display text-3xl font-semibold mt-1" style={{ color: accent }}>{value}</div>
      {sub && <div className="ns-muted text-xs mt-1">{sub}</div>}
    </div>
  );
}

export function NsCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="ns-card p-5">
      <div className="mb-3">
        <div className="ns-display text-lg font-semibold">{title}</div>
        {subtitle && <div className="ns-muted text-xs">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

/** Vertical bar chart. data: [{label, value}] (+ optional value2 for grouped). */
export function NsBarChart({
  data,
  color = NS.navy,
  color2,
  fmt = (v: number) => usd(v),
  height = 220,
}: {
  data: { label: string; value: number; value2?: number }[];
  color?: string;
  color2?: string;
  fmt?: (v: number) => string;
  height?: number;
}) {
  if (!data.length) return <div className="ns-muted text-sm">No data.</div>;
  const grouped = color2 != null && data.some((d) => d.value2 != null);
  const max = Math.max(...data.flatMap((d) => [d.value, d.value2 ?? 0]), 1);
  const W = 640, H = height, padB = 46, padT = 10, padL = 8, padR = 8;
  const plotH = H - padB - padT;
  const bw = (W - padL - padR) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const cx = padL + i * bw;
        const bh = (d.value / max) * plotH;
        const groupBw = grouped ? bw * 0.34 : bw * 0.5;
        const gap = grouped ? bw * 0.08 : 0;
        const x1 = cx + bw / 2 - (grouped ? groupBw + gap / 2 : groupBw / 2);
        return (
          <g key={i}>
            <rect x={x1} y={padT + plotH - bh} width={groupBw} height={bh} rx={3} fill={color} />
            {grouped && (
              <rect
                x={x1 + groupBw + gap}
                y={padT + plotH - (((d.value2 ?? 0) / max) * plotH)}
                width={groupBw}
                height={((d.value2 ?? 0) / max) * plotH}
                rx={3}
                fill={color2}
              />
            )}
            <text x={cx + bw / 2} y={H - 28} textAnchor="middle" fontSize="10" fill="var(--ns-muted-ink)">
              {d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label}
            </text>
            <text x={cx + bw / 2} y={padT + plotH - bh - 4} textAnchor="middle" fontSize="9.5" fill="var(--ns-ink)">
              {fmt(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Line chart over an ordered series. data: [{label, value}]. */
export function NsLineChart({
  data,
  color = NS.navy,
  area = true,
  fmt = (v: number) => usd(v),
  height = 220,
}: {
  data: { label: string; value: number }[];
  color?: string;
  area?: boolean;
  fmt?: (v: number) => string;
  height?: number;
}) {
  if (data.length < 2) return <div className="ns-muted text-sm">Not enough data.</div>;
  const W = 640, H = height, padB = 28, padT = 12, padL = 10, padR = 10;
  const plotH = H - padB - padT, plotW = W - padL - padR;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const x = (i: number) => padL + (i / (data.length - 1)) * plotW;
  const y = (v: number) => padT + plotH - ((v - min) / range) * plotH;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const areaPath = `${line} L${x(data.length - 1)},${padT + plotH} L${x(0)},${padT + plotH} Z`;
  const step = Math.ceil(data.length / 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {area && <path d={areaPath} fill={color} fillOpacity={0.12} />}
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} />
      {data.map((d, i) => (i % step === 0 ? (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="var(--ns-muted-ink)">{d.label}</text>
      ) : null))}
      <text x={padL} y={y(max) - 4} fontSize="9.5" fill="var(--ns-muted-ink)">{fmt(max)}</text>
    </svg>
  );
}

/** Donut / pie. data: [{label, value}] — colors auto-assigned from NS_SERIES. */
export function NsDonut({
  data,
  fmt = (v: number) => usd(v),
  size = 200,
}: {
  data: { label: string; value: number }[];
  fmt?: (v: number) => string;
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2, ir = r * 0.6, cx = r, cy = r;
  let a0 = -Math.PI / 2;
  const arc = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const iarc = (a: number) => [cx + ir * Math.cos(a), cy + ir * Math.sin(a)];
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
        {data.map((d, i) => {
          const a1 = a0 + (d.value / total) * Math.PI * 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const [x0, y0] = arc(a0), [x1, y1] = arc(a1);
          const [ix1, iy1] = iarc(a1), [ix0, iy0] = iarc(a0);
          const path = `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${ix1},${iy1} A${ir},${ir} 0 ${large} 0 ${ix0},${iy0} Z`;
          a0 = a1;
          return <path key={i} d={path} fill={NS_SERIES[i % NS_SERIES.length]} />;
        })}
      </svg>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: NS_SERIES[i % NS_SERIES.length] }} />
            <span className="ns-muted">{d.label}</span>
            <span className="font-medium ml-auto">{fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
