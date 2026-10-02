import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useDashboardStatsSuspense,
  useRiskDistributionSuspense,
  useListStudentsSuspense,
  useListRetentionSuspense,
  useExecutiveMetricsSuspense,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Suspense, useState, useRef, useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { edition, shortOrgUnit } from "@/lib/edition";
import {
  Users,
  AlertTriangle,
  GraduationCap,
  TrendingUp,
  DollarSign,
  Shield,
  Globe,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  FileText,
  Printer,
} from "lucide-react";

export const Route = createFileRoute("/_sidebar/dashboard")({
  component: () => (
    <ErrorBoundary fallback={<div>Error loading dashboard</div>}>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </ErrorBoundary>
  ),
});

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// ── Interactive KPI card with hover effect & optional detail expand ──

function KpiCard({
  label,
  value,
  subtitle,
  icon,
  color = "indigo",
  detail,
  link,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color?: "indigo" | "red" | "green" | "amber" | "sky";
  detail?: React.ReactNode;
  link?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!detail;

  const colorMap = {
    indigo: { bg: "bg-indigo-50", border: "border-indigo-200", iconBg: "bg-indigo-100", iconText: "text-indigo-600", ring: "ring-indigo-300", value: "text-indigo-900" },
    red: { bg: "bg-red-50", border: "border-red-200", iconBg: "bg-red-100", iconText: "text-red-800 dark:text-red-400", ring: "ring-red-300", value: "text-red-800 dark:text-red-400" },
    green: { bg: "bg-green-50", border: "border-green-200", iconBg: "bg-green-100", iconText: "text-green-600", ring: "ring-green-300", value: "text-green-600" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", iconBg: "bg-amber-100", iconText: "text-amber-600", ring: "ring-amber-300", value: "text-amber-900" },
    sky: { bg: "bg-sky-50", border: "border-sky-200", iconBg: "bg-sky-100", iconText: "text-sky-600", ring: "ring-sky-300", value: "text-sky-900" },
  };
  const c = colorMap[color];

  const inner = (
    <Card
      className={`${c.border} hover:shadow-lg transition-all duration-200 cursor-pointer ${open ? `ring-2 ${c.ring}` : ""} group`}
      onClick={() => hasDetail && setOpen(!open)}
    >
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className={`h-10 w-10 rounded-xl ${c.iconBg} flex items-center justify-center ${c.iconText} group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          {hasDetail && (
            <div className="text-muted-foreground">
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          )}
          {link && !hasDetail && (
            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <div>
          <div className={`text-2xl font-bold ${c.value}`}>{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</div>
        </div>
        {open && detail && (
          <div className="pt-3 mt-2 border-t animate-in fade-in slide-in-from-top-1 duration-200">
            {detail}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (link && !hasDetail) {
    return <Link to={link}>{inner}</Link>;
  }
  return inner;
}

// ── Interactive donut chart with hover segment highlighting ──

function InteractiveDonut({
  data,
  total,
}: {
  data: { label: string; count: number; color: string; hex: string }[];
  total: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || total === 0) return;
      const rect = svg.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = e.clientX - rect.left - cx;
      const dy = e.clientY - rect.top - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r = rect.width / 2;
      if (dist < r * 0.35 || dist > r * 0.9) {
        setHoverIdx(null);
        return;
      }
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (angle < 0) angle += 360;
      let cumPct = 0;
      for (let i = 0; i < data.length; i++) {
        cumPct += (data[i].count / total) * 360;
        if (angle <= cumPct) {
          setHoverIdx(i);
          return;
        }
      }
      setHoverIdx(data.length - 1);
    },
    [data, total]
  );

  let offset = 0;
  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox="0 0 36 36"
        className="w-36 h-36 -rotate-90 cursor-pointer"
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {data.map((item, i) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          const isHov = i === hoverIdx;
          const el = (
            <circle
              key={item.label}
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              strokeWidth={isHov ? 5 : 3.5}
              stroke={item.hex}
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={`${-offset}`}
              opacity={hoverIdx !== null && !isHov ? 0.35 : 1}
              style={{ transition: "stroke-width 0.15s, opacity 0.15s" }}
            />
          );
          offset += pct;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hoverIdx !== null ? (
          <>
            <span className="text-lg font-bold">{data[hoverIdx].count.toLocaleString()}</span>
            <span className="text-[9px] text-muted-foreground font-medium">{data[hoverIdx].label}</span>
            <span className="text-[9px] text-muted-foreground">
              {((data[hoverIdx].count / total) * 100).toFixed(1)}%
            </span>
          </>
        ) : (
          <>
            <span className="text-lg font-bold">{total.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground">scored</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Interactive progress bar with hover tooltip ──

function HoverBar({
  label,
  value,
  maxVal,
  color,
  suffix = "",
  extraInfo,
}: {
  label: string;
  value: number;
  maxVal: number;
  color: string;
  suffix?: string;
  extraInfo?: string;
}) {
  const [hover, setHover] = useState(false);
  const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;

  return (
    <div
      className="space-y-1 cursor-default"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-3 text-muted-foreground">
          {hover && extraInfo && (
            <span className="text-xs animate-in fade-in duration-150">{extraInfo}</span>
          )}
          <span className={`font-semibold ${hover ? "text-foreground" : "text-foreground"}`}>
            {value.toFixed(1)}{suffix}
          </span>
        </div>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%`, transform: hover ? "scaleY(1.4)" : "scaleY(1)", transformOrigin: "bottom" }}
        />
      </div>
    </div>
  );
}

// ── What-If Intervention Simulator ──

// ── Executive Briefing Export ──

function ExecBriefingModal({
  open,
  onClose,
  stats,
  exec,
  retention,
  riskDist,
  riskTotal,
}: {
  open: boolean;
  onClose: () => void;
  stats: { total_students: number; active_students: number; at_risk_students: number; avg_gpa: number; high_risk_count: number; medium_risk_count: number; low_risk_count: number };
  exec: {
    retention_rate_pct: number; attrition_rate_pct: number; completion_rate_pct?: number | null;
    revenue_at_risk: number; revenue_lost: number; withdrawn_students: number; graduated_students: number;
    international_total: number; international_at_risk: number;
    first_in_family_pass_rate?: number | null; continuing_family_pass_rate?: number | null;
    supported_student_pass_rate?: number | null; unsupported_student_pass_rate?: number | null;
    total_interventions: number; avg_pass_rate?: number | null; at_risk_students: number; active_students: number; total_students: number;
  };
  retention: { faculty: string; total_students: number; retention_rate_pct?: number | null; active_count: number; at_risk_count: number; withdrawn_count: number; graduated_count: number }[];
  riskDist: { risk_category: string; count: number }[];
  riskTotal: number;
}) {
  if (!open) return null;

  const fmtM = (v: number) => `$${(v / 1_000_000).toFixed(1)}M`;
  const now = new Date();
  const dateStr = now.toLocaleDateString(edition.locale, { day: "numeric", month: "long", year: "numeric" });
  const supportedRate = exec.supported_student_pass_rate ?? 0;
  const unsupportedRate = exec.unsupported_student_pass_rate ?? 0;
  const lift = supportedRate - unsupportedRate;
  const fifRate = exec.first_in_family_pass_rate ?? 0;
  const contRate = exec.continuing_family_pass_rate ?? 0;

  const handlePrint = () => {
    const el = document.getElementById("exec-briefing-content");
    if (!el) return;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Executive Briefing - Northstar Office of Finance</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; padding: 40px; line-height: 1.5; }
  .header { border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 24px; color: #1e1b4b; }
  .header .subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
  .header .date { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 15px; font-weight: 700; color: #312e81; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  .kpi .label { font-size: 11px; color: #6b7280; font-weight: 500; }
  .kpi .value { font-size: 22px; font-weight: 700; margin-top: 2px; }
  .kpi .sub { font-size: 10px; color: #9ca3af; margin-top: 2px; }
  .kpi .value.red { color: #b91c1c; }
  .kpi .value.green { color: #15803d; }
  .kpi .value.indigo { color: #3730a3; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 8px 10px; background: #f3f4f6; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
  td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
  .bar-cell { position: relative; }
  .bar { height: 6px; border-radius: 3px; display: inline-block; }
  .risk-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
  .risk-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 20px; } .kpi-grid { grid-template-columns: repeat(4, 1fr); } }
</style></head><body>${el.innerHTML}
<div class="footer">Northstar University Office of Finance &mdash; Powered by Databricks &middot; ${edition.governanceStandard} &middot; Generated ${dateStr}</div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const riskColors: Record<string, string> = {
    "Very High": "#ef4444", "High": "#f97316", "Medium": "#eab308", "Low": "#22c55e", "Very Low": "#10b981",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold">Executive Briefing Preview</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>

        {/* Printable content */}
        <div id="exec-briefing-content" className="p-6 space-y-6 text-sm">
          <div className="header">
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b" }}>Office of Finance Executive Briefing</h1>
            <div className="subtitle" style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{edition.universityName} &mdash; Office of Finance</div>
            <div className="date" style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{dateStr}</div>
          </div>

          {/* KPIs */}
          <div className="section">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#312e81", borderBottom: "1px solid #e5e7eb", paddingBottom: 6, marginBottom: 12 }}>Key Performance Indicators</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <div className="kpi" style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Total Students</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#3730a3", marginTop: 2 }}>{stats.total_students.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{stats.active_students.toLocaleString()} active</div>
              </div>
              <div className="kpi" style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>At-Risk Students</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#b91c1c", marginTop: 2 }}>{exec.at_risk_students.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{stats.total_students > 0 ? ((exec.at_risk_students / stats.total_students) * 100).toFixed(1) : 0}% of population</div>
              </div>
              <div className="kpi" style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Retention Rate</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: exec.retention_rate_pct >= 85 ? "#15803d" : "#b91c1c", marginTop: 2 }}>{exec.retention_rate_pct.toFixed(1)}%</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Attrition: {exec.attrition_rate_pct.toFixed(1)}%</div>
              </div>
              <div className="kpi" style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Average GPA</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#3730a3", marginTop: 2 }}>{stats.avg_gpa.toFixed(2)}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Avg pass rate: {(exec.avg_pass_rate ?? 0).toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Financial Impact */}
          <div className="section">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#312e81", borderBottom: "1px solid #e5e7eb", paddingBottom: 6, marginBottom: 12 }}>Financial Impact</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <div className="kpi" style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Revenue at Risk</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#b91c1c", marginTop: 2 }}>{fmtM(exec.revenue_at_risk)} {edition.currencySuffix}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{exec.at_risk_students} at-risk students</div>
              </div>
              <div className="kpi" style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Revenue Lost</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#b91c1c", marginTop: 2 }}>{fmtM(exec.revenue_lost)} {edition.currencySuffix}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{exec.withdrawn_students} withdrawn</div>
              </div>
              <div className="kpi" style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Intervention Lift</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#15803d", marginTop: 2 }}>{lift >= 0 ? "+" : ""}{lift.toFixed(1)}pp</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{exec.total_interventions.toLocaleString()} delivered</div>
              </div>
              <div className="kpi" style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Completion Rate</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#3730a3", marginTop: 2 }}>{exec.completion_rate_pct != null ? `${exec.completion_rate_pct.toFixed(1)}%` : "N/A"}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{exec.graduated_students} graduated</div>
              </div>
            </div>
          </div>

          {/* Two-column: Risk + Equity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="section">
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#312e81", borderBottom: "1px solid #e5e7eb", paddingBottom: 6, marginBottom: 12 }}>Risk Distribution</h2>
              {riskDist.map((item) => (
                <div key={item.risk_category} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12 }}>
                  <span>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: riskColors[item.risk_category] || "#94a3b8", marginRight: 6, verticalAlign: "middle" }} />
                    {item.risk_category}
                  </span>
                  <span style={{ color: "#6b7280" }}>{item.count.toLocaleString()} ({riskTotal > 0 ? ((item.count / riskTotal) * 100).toFixed(1) : 0}%)</span>
                </div>
              ))}
            </div>
            <div className="section">
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#312e81", borderBottom: "1px solid #e5e7eb", paddingBottom: 6, marginBottom: 12 }}>Equity & Access</h2>
              <div style={{ fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                  <span>{edition.firstGenLabel} pass rate</span><span style={{ fontWeight: 600 }}>{fifRate.toFixed(1)}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                  <span>{edition.continuingGenerationLabel} pass rate</span><span style={{ fontWeight: 600 }}>{contRate.toFixed(1)}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: "1px solid #e5e7eb", marginTop: 4, paddingTop: 8 }}>
                  <span>Equity gap</span><span style={{ fontWeight: 700, color: (fifRate - contRate) >= 0 ? "#15803d" : "#b91c1c" }}>{(fifRate - contRate) >= 0 ? "+" : ""}{(fifRate - contRate).toFixed(1)}pp</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                  <span>International at risk</span><span style={{ fontWeight: 600 }}>{exec.international_at_risk} / {exec.international_total} ({exec.international_total > 0 ? ((exec.international_at_risk / exec.international_total) * 100).toFixed(1) : 0}%)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                  <span>Supported pass rate</span><span style={{ fontWeight: 600 }}>{supportedRate.toFixed(1)}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                  <span>Unsupported pass rate</span><span style={{ fontWeight: 600 }}>{unsupportedRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Retention by organization unit table */}
          <div className="section">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#312e81", borderBottom: "1px solid #e5e7eb", paddingBottom: 6, marginBottom: 12 }}>Retention by {edition.orgUnitLabel}</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, borderBottom: "2px solid #e5e7eb" }}>{edition.orgUnitLabel}</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, borderBottom: "2px solid #e5e7eb" }}>Students</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, borderBottom: "2px solid #e5e7eb" }}>Active</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, borderBottom: "2px solid #e5e7eb" }}>At Risk</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, borderBottom: "2px solid #e5e7eb" }}>Withdrawn</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, borderBottom: "2px solid #e5e7eb" }}>Retention</th>
                </tr>
              </thead>
              <tbody>
                {retention.map((r) => (
                  <tr key={r.faculty}>
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid #f3f4f6" }}>{shortOrgUnit(r.faculty)}</td>
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{r.total_students}</td>
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{r.active_count}</td>
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid #f3f4f6", textAlign: "right", color: "#b91c1c" }}>{r.at_risk_count}</td>
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{r.withdrawn_count}</td>
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 600, color: (r.retention_rate_pct ?? 0) >= 85 ? "#15803d" : "#b91c1c" }}>{(r.retention_rate_pct ?? 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ──

function Dashboard() {
  const { data: statsResp } = useDashboardStatsSuspense();
  const stats = statsResp.data;

  const { data: riskResp } = useRiskDistributionSuspense();
  const riskDist = riskResp.data;

  const { data: topRiskResp } = useListStudentsSuspense({
    params: { risk_level: "High", limit: 10 },
  });
  const topRisk = topRiskResp.data;

  const { data: retentionResp } = useListRetentionSuspense();
  const retention = retentionResp.data;

  const { data: execResp } = useExecutiveMetricsSuspense();
  const exec = execResp.data;

  const riskTotal = riskDist.reduce((s, i) => s + i.count, 0);

  const fmtMillions = (v: number) => `$${(v / 1_000_000).toFixed(1)}M`;
  const supportedRate = exec.supported_student_pass_rate ?? 0;
  const unsupportedRate = exec.unsupported_student_pass_rate ?? 0;
  const interventionLift = supportedRate - unsupportedRate;
  const fifRate = exec.first_in_family_pass_rate ?? 0;
  const contRate = exec.continuing_family_pass_rate ?? 0;
  const equityGap = fifRate - contRate;
  const intlAtRiskPct =
    exec.international_total > 0
      ? ((exec.international_at_risk / exec.international_total) * 100).toFixed(1)
      : "0";
  const atRiskPct = stats.total_students > 0 ? ((stats.at_risk_students / stats.total_students) * 100).toFixed(1) : "0";

  const donutData = riskDist.map((item) => ({
    label: item.risk_category,
    count: item.count,
    color:
      item.risk_category === "Very High" ? "bg-red-500"
        : item.risk_category === "High" ? "bg-orange-500"
          : item.risk_category === "Medium" ? "bg-yellow-500"
            : item.risk_category === "Low" ? "bg-green-500"
              : "bg-emerald-500",
    hex:
      item.risk_category === "Very High" ? "#ef4444"
        : item.risk_category === "High" ? "#f97316"
          : item.risk_category === "Medium" ? "#eab308"
            : item.risk_category === "Low" ? "#22c55e"
              : "#10b981",
  }));

  const [hoveredStudent, setHoveredStudent] = useState<number | null>(null);
  const [briefingOpen, setBriefingOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-indigo-900">Students Overview</h1>
        </div>
        <Button onClick={() => setBriefingOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <FileText className="h-4 w-4" />
          Export Executive View
        </Button>
      </div>

      <ExecBriefingModal
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
        stats={stats}
        exec={exec}
        retention={retention}
        riskDist={riskDist}
        riskTotal={riskTotal}
      />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Students"
          value={stats.total_students.toLocaleString()}
          subtitle={`${stats.active_students.toLocaleString()} active`}
          icon={<Users className="h-5 w-5" />}
          color="indigo"
          link="/students"
          detail={
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="font-semibold">{stats.active_students.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Withdrawn</span><span className="font-semibold">{exec.withdrawn_students.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Graduated</span><span className="font-semibold">{exec.graduated_students.toLocaleString()}</span></div>
            </div>
          }
        />
        <KpiCard
          label="At-Risk Students"
          value={stats.at_risk_students.toLocaleString()}
          subtitle={`${atRiskPct}% of total population`}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
          link="/alerts"
          detail={
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">High Risk</span><span className="font-semibold text-red-800 dark:text-red-400">{stats.high_risk_count}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Medium Risk</span><span className="font-semibold text-amber-600">{stats.medium_risk_count}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Low Risk</span><span className="font-semibold text-green-600">{stats.low_risk_count}</span></div>
            </div>
          }
        />
        <KpiCard
          label="Average GPA"
          value={stats.avg_gpa.toFixed(2)}
          subtitle={edition.gpaScaleLabel}
          icon={<GraduationCap className="h-5 w-5" />}
          color="amber"
          detail={
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Avg Pass Rate</span><span className="font-semibold">{(exec.avg_pass_rate ?? 0).toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Completion Rate</span><span className="font-semibold">{exec.completion_rate_pct != null ? `${exec.completion_rate_pct.toFixed(1)}%` : "N/A"}</span></div>
            </div>
          }
        />
        <KpiCard
          label="Retention Rate"
          value={`${exec.retention_rate_pct.toFixed(1)}%`}
          subtitle="Semester-to-semester persistence"
          icon={<TrendingUp className="h-5 w-5" />}
          color={exec.retention_rate_pct >= 85 ? "green" : exec.retention_rate_pct >= 75 ? "amber" : "red"}
          detail={
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Attrition Rate</span><span className="font-semibold text-red-800 dark:text-red-400">{exec.attrition_rate_pct.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Withdrawn</span><span className="font-semibold">{exec.withdrawn_students.toLocaleString()}</span></div>
            </div>
          }
        />
      </div>

      {/* ── Executive Overview ── */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          <h2 className="text-lg font-semibold text-indigo-900">Executive Overview</h2>
          <span className="ml-auto text-xs text-indigo-400 font-medium tracking-wide uppercase">{edition.leadershipLabel}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Revenue at Risk"
            value={`${fmtMillions(exec.revenue_at_risk)} ${edition.currencySuffix}`}
            subtitle="Potential annual tuition loss from at-risk students"
            icon={<DollarSign className="h-5 w-5" />}
            color="red"
            detail={
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">At-risk students</span><span className="font-semibold">{exec.at_risk_students.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Avg tuition/student</span><span className="font-semibold">{exec.at_risk_students > 0 ? `$${Math.round(exec.revenue_at_risk / exec.at_risk_students).toLocaleString()}` : "N/A"}</span></div>
              </div>
            }
          />
          <KpiCard
            label="Revenue Lost to Attrition"
            value={`${fmtMillions(exec.revenue_lost)} ${edition.currencySuffix}`}
            subtitle="Confirmed tuition loss from withdrawn students"
            icon={<DollarSign className="h-5 w-5" />}
            color="amber"
            detail={
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Withdrawn students</span><span className="font-semibold">{exec.withdrawn_students.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Avg tuition/student</span><span className="font-semibold">{exec.withdrawn_students > 0 ? `$${Math.round(exec.revenue_lost / exec.withdrawn_students).toLocaleString()}` : "N/A"}</span></div>
              </div>
            }
          />
          <KpiCard
            label="Intervention Impact"
            value={`${interventionLift >= 0 ? "+" : ""}${interventionLift.toFixed(1)}pp`}
            subtitle={`${exec.total_interventions.toLocaleString()} interventions delivered`}
            icon={<Shield className="h-5 w-5" />}
            color={interventionLift >= 0 ? "green" : "red"}
            detail={
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Supported pass rate</span><span className="font-semibold">{supportedRate.toFixed(1)}%</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-green-500 transition-all duration-700" style={{ width: `${Math.min(supportedRate, 100)}%` }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Unsupported pass rate</span><span className="font-semibold">{unsupportedRate.toFixed(1)}%</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-slate-400 transition-all duration-700" style={{ width: `${Math.min(unsupportedRate, 100)}%` }} />
                  </div>
                </div>
              </div>
            }
          />
          <KpiCard
            label="Equity & Access"
            value={`${equityGap >= 0 ? "+" : ""}${equityGap.toFixed(1)}pp gap`}
            subtitle={`${exec.international_at_risk} intl. at risk (${intlAtRiskPct}%)`}
            icon={<Globe className="h-5 w-5" />}
            color={equityGap >= -5 ? "sky" : "red"}
            detail={
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">{edition.firstGenLabel} pass rate</span><span className="font-semibold">{fifRate.toFixed(1)}%</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-sky-500 transition-all duration-700" style={{ width: `${Math.min(fifRate, 100)}%` }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">{edition.continuingGenerationLabel} pass rate</span><span className="font-semibold">{contRate.toFixed(1)}%</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-slate-400 transition-all duration-700" style={{ width: `${Math.min(contRate, 100)}%` }} />
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">International at risk</span>
                  <span className="font-semibold">{exec.international_at_risk} / {exec.international_total}</span>
                </div>
              </div>
            }
          />
        </div>
      </div>

      {/* ── Risk Distribution + Top At-Risk ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Risk Distribution
              <span className="text-xs text-muted-foreground font-normal ml-auto">Hover to explore</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <InteractiveDonut data={donutData} total={riskTotal} />
              <div className="flex-1 space-y-2.5">
                {donutData.map((item) => {
                  const pct = riskTotal > 0 ? ((item.count / riskTotal) * 100).toFixed(1) : "0";
                  return (
                    <div key={item.label} className="group cursor-default">
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${item.color} group-hover:scale-125 transition-transform`} />
                          <span className="group-hover:font-semibold transition-all">{item.label}</span>
                        </div>
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                          {item.count.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${item.color} rounded-full group-hover:h-2 transition-all duration-300`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Highest Risk Students</CardTitle>
              <Link to="/alerts" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all alerts <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {topRisk.map((s) => (
                <Link
                  key={s.student_id}
                  to={`/students/${s.student_id}`}
                  className={`flex items-center justify-between p-2.5 rounded-lg transition-all duration-150 ${
                    hoveredStudent === s.student_id
                      ? "bg-red-50 dark:bg-red-950/30 shadow-sm border border-red-200 dark:border-red-800"
                      : "hover:bg-muted border border-transparent"
                  }`}
                  onMouseEnter={() => setHoveredStudent(s.student_id)}
                  onMouseLeave={() => setHoveredStudent(null)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      hoveredStudent === s.student_id ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" : "bg-muted text-muted-foreground"
                    }`}>
                      {s.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{s.full_name}</div>
                      <div className="text-xs text-muted-foreground">{s.program_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      GPA {s.gpa?.toFixed(1) ?? "N/A"}
                    </span>
                    <Badge variant="destructive" className="text-[10px]">
                      {s.risk_score
                        ? `${(s.risk_score * 100).toFixed(0)}% risk`
                        : `${s.courses_failed} failed`}
                    </Badge>
                    {hoveredStudent === s.student_id && (
                      <ArrowUpRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400 animate-in fade-in duration-150" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Retention by organization unit ── */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Retention by {edition.orgUnitLabel}</CardTitle>
            <span className="text-xs text-muted-foreground">Hover bars for details</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {retention.map((r) => {
              const retPct = r.retention_rate_pct ?? 0;
              const barColor = retPct >= 90 ? "bg-green-500"
                : retPct >= 80 ? "bg-yellow-500"
                  : "bg-red-500";
              return (
                <HoverBar
                  key={r.faculty}
                  label={shortOrgUnit(r.faculty)}
                  value={retPct}
                  maxVal={100}
                  color={barColor}
                  suffix="%"
                  extraInfo={`${r.active_count} active · ${r.graduated_count} graduated · ${r.at_risk_count} at risk · ${r.withdrawn_count} withdrawn`}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
