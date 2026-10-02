import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useOutcomeSummary,
  useOutcomeStudents,
  useOutcomeTrend,
  useOutcomeByFaculty,
  useOutcomeByEquity,
  useOutcomeAiSummary,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { edition, shortOrgUnit } from "@/lib/edition";
import { useRef, useState, useCallback } from "react";
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Brain,
  Users,
  Building2,
  Minus,
  Shield,
  GraduationCap,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const Route = createFileRoute("/_sidebar/outcomes")({
  component: () => <OutcomesPage />,
});

// ── KPI Card (matching dashboard KpiCard) ──

function KpiCard({ label, value, subtitle, icon, color, detail }: {
  label: string; value: string; subtitle: string; icon: React.ReactNode;
  color: "green" | "blue" | "red" | "indigo" | "amber" | "slate";
  detail?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const colorMap = {
    green: { border: "border-green-200", iconBg: "bg-green-100", iconText: "text-green-600", val: "text-green-700", ring: "ring-green-300" },
    blue: { border: "border-blue-200", iconBg: "bg-blue-100", iconText: "text-blue-600", val: "text-blue-700", ring: "ring-blue-300" },
    red: { border: "border-red-200", iconBg: "bg-red-100", iconText: "text-red-600", val: "text-red-700", ring: "ring-red-300" },
    indigo: { border: "border-indigo-200", iconBg: "bg-indigo-100", iconText: "text-indigo-600", val: "text-indigo-700", ring: "ring-indigo-300" },
    amber: { border: "border-amber-200", iconBg: "bg-amber-100", iconText: "text-amber-600", val: "text-amber-700", ring: "ring-amber-300" },
    slate: { border: "border-slate-200", iconBg: "bg-slate-100", iconText: "text-slate-600", val: "text-slate-600", ring: "ring-slate-300" },
  };
  const c = colorMap[color];

  return (
    <Card
      className={`${c.border} hover:shadow-lg transition-all duration-200 ${detail ? "cursor-pointer" : ""} ${open ? `ring-2 ${c.ring}` : ""} group`}
      onClick={() => detail && setOpen(!open)}
    >
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className={`h-10 w-10 rounded-xl ${c.iconBg} flex items-center justify-center ${c.iconText} group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          {detail && (
            <div className="text-muted-foreground">
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          )}
        </div>
        <div>
          <div className={`text-2xl font-bold ${c.val}`}>{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</div>
        </div>
        {open && detail && (
          <div className="pt-3 mt-2 border-t animate-in fade-in slide-in-from-top-1 duration-200">{detail}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Outcome badge ──

function OutcomeBadge({ outcome }: { outcome: string | null | undefined }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    "de-risked": { label: "De-risked", cls: "bg-green-100 text-green-800 border-green-300", icon: <CheckCircle2 className="h-3 w-3" /> },
    improved: { label: "Improved", cls: "bg-blue-100 text-blue-800 border-blue-300", icon: <TrendingUp className="h-3 w-3" /> },
    unchanged: { label: "Unchanged", cls: "bg-slate-100 text-slate-700 border-slate-300", icon: <Minus className="h-3 w-3" /> },
    declined: { label: "Declined", cls: "bg-red-100 text-red-800 border-red-300", icon: <TrendingDown className="h-3 w-3" /> },
  };
  const c = cfg[outcome || ""] || cfg.unchanged;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  );
}

// ── Mini sparkline ──

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const w = 80, h = 24, pad = 2;
  const pts = data.map((v, i) => `${(pad + (i / (data.length - 1)) * (w - pad * 2)).toFixed(1)},${(pad + (1 - (v - min) / range) * (h - pad * 2)).toFixed(1)}`);
  const last = pts[pts.length - 1].split(",");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block ml-1">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

// ── Interactive trend chart ──

function TrendChart({ data, metricKey, label, color, unit }: {
  data: { month: string; [k: string]: unknown }[]; metricKey: string; label: string; color: string; unit?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const values = data.map((d) => Number(d[metricKey] ?? 0));
  if (values.length < 2) return null;
  const min = Math.floor(Math.min(...values) * 0.92), max = Math.ceil(Math.max(...values) * 1.08), range = max - min || 1;
  const W = 520, H = 170, pL = 48, pR = 12, pT = 12, pB = 28;
  const plotW = W - pL - pR, plotH = H - pT - pB;
  const x = (i: number) => pL + (i / Math.max(data.length - 1, 1)) * plotW;
  const y = (v: number) => pT + plotH - ((v - min) / range) * plotH;
  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0, dist = Infinity;
    for (let i = 0; i < data.length; i++) { const d = Math.abs(x(i) - svgX); if (d < dist) { dist = d; closest = i; } }
    setHoverIdx(closest);
  }, [data.length]);
  const gridN = 4, step = range / gridN;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">{label}</span>
        <span className={`text-xs font-semibold ${values[values.length - 1] >= values[0] ? "text-green-600" : "text-red-500"}`}>
          {values[values.length - 1] >= values[0] ? "+" : ""}{(values[values.length - 1] - values[0]).toFixed(1)}{unit} over 6mo
        </span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto cursor-crosshair" onMouseMove={onMouseMove} onMouseLeave={() => setHoverIdx(null)}>
        {Array.from({ length: gridN + 1 }, (_, i) => { const v = min + i * step; return (
          <g key={i}><line x1={pL} x2={W - pR} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.06} />
          <text x={pL - 4} y={y(v) + 3} textAnchor="end" fontSize="8" fill="currentColor" fillOpacity={0.4}>{v.toFixed(1)}{unit}</text></g>
        ); })}
        <path d={`M${x(0)},${y(values[0])} ${values.map((v, i) => `L${x(i)},${y(v)}`).join(" ")} L${x(values.length - 1)},${pT + plotH} L${x(0)},${pT + plotH} Z`} fill={color} fillOpacity={0.06} />
        <path d={values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === hoverIdx ? 5 : 3} fill={i === hoverIdx ? "white" : color} stroke={color} strokeWidth={i === hoverIdx ? 2.5 : 1.5} style={{ transition: "r 0.1s" }} />)}
        {data.map((d, i) => <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity={i === hoverIdx ? 1 : 0.5} fontWeight={i === hoverIdx ? "bold" : "normal"}>{d.month}</text>)}
        {hoverIdx !== null && (<>
          <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={pT} y2={pT + plotH} stroke="currentColor" strokeOpacity={0.12} strokeDasharray="3 2" />
          <rect x={x(hoverIdx) + (hoverIdx > data.length / 2 ? -62 : 8)} y={y(values[hoverIdx]) - 12} width={54} height={22} rx={4} fill="white" stroke="currentColor" strokeOpacity={0.12} filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))" />
          <text x={x(hoverIdx) + (hoverIdx > data.length / 2 ? -35 : 35)} y={y(values[hoverIdx]) + 2} textAnchor="middle" fontSize="11" fontWeight="bold" fill={color}>{values[hoverIdx].toFixed(1)}{unit}</text>
        </>)}
      </svg>
    </div>
  );
}

// ── Main page ──

function OutcomesPage() {
  const { data: summResp, isLoading } = useOutcomeSummary();
  const summary = summResp?.data;
  const { data: studResp, isLoading: loadingStud } = useOutcomeStudents();
  const students = studResp?.data ?? [];
  const { data: trendResp } = useOutcomeTrend();
  const trend = trendResp?.data ?? [];
  const { data: facResp } = useOutcomeByFaculty();
  const faculties = facResp?.data ?? [];
  const { data: eqResp } = useOutcomeByEquity();
  const equity = eqResp?.data ?? [];
  const { data: aiResp } = useOutcomeAiSummary();
  const aiSummary = aiResp?.data?.summary;
  const [showAll, setShowAll] = useState(false);
  const displayStudents = showAll ? students : students.slice(0, 10);

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );

  const s = summary || { total_intervened: 0, de_risked: 0, improved: 0, unchanged: 0, declined: 0 };
  const deRiskedPct = s.total_intervened > 0 ? ((s.de_risked / s.total_intervened) * 100).toFixed(0) : "0";
  const successPct = s.total_intervened > 0 ? (((s.de_risked + s.improved) / s.total_intervened) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Intervention Outcomes</h1>
          <p className="text-sm text-muted-foreground">
            6-month post-intervention performance &mdash; simulated data
          </p>
        </div>
        <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
          {s.total_intervened} students tracked
        </Badge>
      </div>

      {/* AI Summary */}
      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-violet-600 flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-violet-900">AI Executive Summary</h2>
            <span className="text-[11px] text-violet-700 font-medium">Generated by ai_query() &middot; Llama 3.3 70B</span>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-violet-900">{aiSummary || "Loading..."}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Students Intervened"
          value={s.total_intervened.toString()}
          subtitle="At-risk students received intervention"
          icon={<Users className="h-5 w-5" />}
          color="indigo"
          detail={
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">De-risked</span><span className="font-semibold text-green-600">{s.de_risked}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Improved</span><span className="font-semibold text-blue-600">{s.improved}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Unchanged</span><span className="font-semibold">{s.unchanged}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Declined</span><span className="font-semibold text-red-600">{s.declined}</span></div>
            </div>
          }
        />
        <KpiCard
          label="De-risked"
          value={`${s.de_risked} (${deRiskedPct}%)`}
          subtitle="Moved from at-risk to low risk"
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="green"
        />
        <KpiCard
          label="Success Rate"
          value={`${successPct}%`}
          subtitle="De-risked + improved combined"
          icon={<TrendingUp className="h-5 w-5" />}
          color={Number(successPct) >= 60 ? "green" : Number(successPct) >= 40 ? "amber" : "red"}
        />
        <KpiCard
          label="Retention Rate"
          value={`${(s.retention_rate ?? 0).toFixed(1)}%`}
          subtitle="Intervened students still enrolled"
          icon={<Shield className="h-5 w-5" />}
          color={(s.retention_rate ?? 0) >= 85 ? "green" : (s.retention_rate ?? 0) >= 70 ? "amber" : "red"}
        />
      </div>

      {/* Improvement Metrics */}
      <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/30 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
          <h2 className="text-lg font-semibold text-green-900">Improvement Metrics</h2>
          <span className="ml-auto text-xs text-green-700 font-medium tracking-wide uppercase">6-Month Lift</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <KpiCard
            label="Avg GPA Lift"
            value={`+${(s.avg_gpa_lift ?? 0).toFixed(2)}`}
            subtitle={`On ${edition.gpaScaleLabel}`}
            icon={<GraduationCap className="h-5 w-5" />}
            color="green"
          />
          <KpiCard
            label="Avg Pass Rate Lift"
            value={`+${(s.avg_pass_rate_lift ?? 0).toFixed(1)}pp`}
            subtitle="Percentage point improvement"
            icon={<TrendingUp className="h-5 w-5" />}
            color="blue"
          />
          <KpiCard
            label="Avg LMS Activity Lift"
            value={`+${(s.avg_lms_lift ?? 0).toFixed(0)}`}
            subtitle="Additional platform interactions"
            icon={<Activity className="h-5 w-5" />}
            color="indigo"
          />
        </div>
      </div>

      {/* Trend Charts */}
      {trend.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">6-Month Trend Analysis</h2>
            <p className="text-sm text-muted-foreground">Post-intervention metric trajectories</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="hover:shadow-lg hover:border-green-200/80 transition-all duration-200">
              <CardContent className="pt-6"><TrendChart data={trend as any[]} metricKey="avg_gpa" label="GPA Trajectory" color="#16a34a" /></CardContent>
            </Card>
            <Card className="hover:shadow-lg hover:border-blue-200/80 transition-all duration-200">
              <CardContent className="pt-6"><TrendChart data={trend as any[]} metricKey="avg_pass_rate" label="Pass Rate Trajectory" color="#2563eb" unit="%" /></CardContent>
            </Card>
            <Card className="hover:shadow-lg hover:border-red-200/80 transition-all duration-200">
              <CardContent className="pt-6"><TrendChart data={trend as any[]} metricKey="at_risk_count" label="At-Risk Count (declining)" color="#dc2626" /></CardContent>
            </Card>
            <Card className="hover:shadow-lg hover:border-emerald-200/80 transition-all duration-200">
              <CardContent className="pt-6"><TrendChart data={trend as any[]} metricKey="de_risked_cumulative" label="Cumulative De-risked" color="#10b981" /></CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Organization unit + Equity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {faculties.length > 0 && (
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-amber-600" />
                </div>
                Outcomes by {edition.orgUnitLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faculties.map((f) => (
                  <div key={f.faculty} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{f.faculty}</span>
                      <span className="text-green-600 font-semibold">{f.de_risked_pct?.toFixed(0)}% de-risked</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${f.de_risked_pct ?? 0}%` }} />
                    </div>
                    <div className="flex gap-3 text-[11px] text-muted-foreground">
                      <span>{f.intervened} intervened</span>
                      <span>{f.de_risked} de-risked</span>
                      <span className="text-green-600 font-medium">+{(f.avg_gpa_lift ?? 0).toFixed(2)} GPA</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {equity.length > 0 && (
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-sky-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-sky-600" />
                </div>
                Equity Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {equity.map((eq) => (
                  <div key={eq.group} className="p-4 rounded-lg border hover:border-sky-200 hover:bg-sky-50/30 transition-all duration-150 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{eq.group}</span>
                      <Badge variant="outline" className="text-[10px] gap-1 border-green-300 text-green-700 font-semibold">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {eq.de_risked}/{eq.intervened} de-risked
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">GPA Lift</span>
                        <div className="font-bold text-green-700 text-base">+{(eq.avg_gpa_lift ?? 0).toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pass Rate Lift</span>
                        <div className="font-bold text-blue-700 text-base">+{(eq.avg_pass_rate_lift ?? 0).toFixed(1)}pp</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Individual student outcomes */}
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-indigo-600" />
              </div>
              Individual Student Outcomes
            </CardTitle>
            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">{students.length} students</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingStud ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50/80">
                      <th className="py-3 pr-3 font-semibold text-left text-slate-700">Student</th>
                      <th className="py-3 pr-3 font-semibold text-left text-slate-700">Intervention</th>
                      <th className="py-3 pr-3 font-semibold text-right text-slate-700">GPA Before</th>
                      <th className="py-3 pr-3 font-semibold text-right text-slate-700">GPA After</th>
                      <th className="py-3 pr-3 font-semibold text-right text-slate-700">Change</th>
                      <th className="py-3 pr-3 font-semibold text-right text-slate-700">Pass Rate</th>
                      <th className="py-3 pr-3 font-semibold text-left text-slate-700">Risk</th>
                      <th className="py-3 pr-3 font-semibold text-left text-slate-700">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayStudents.map((st) => (
                      <tr key={st.student_id} className="border-b hover:bg-indigo-50/30 transition-colors">
                        <td className="py-2.5 pr-3">
                          <Link to={`/students/${st.student_id}`} className="font-medium hover:underline">{st.full_name}</Link>
                          <div className="text-[11px] text-muted-foreground">{shortOrgUnit(st.faculty)}</div>
                        </td>
                        <td className="py-2.5 pr-3"><Badge variant="outline" className="text-[10px]">{st.intervention_type}</Badge></td>
                        <td className="py-2.5 pr-3 text-right font-mono text-muted-foreground">{(st.gpa_before ?? 0).toFixed(2)}</td>
                        <td className="py-2.5 pr-3 text-right font-mono font-semibold">{(st.gpa_after ?? 0).toFixed(2)}</td>
                        <td className="py-2.5 pr-3 text-right">
                          <span className={`font-semibold ${(st.gpa_change ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {(st.gpa_change ?? 0) >= 0 ? "+" : ""}{(st.gpa_change ?? 0).toFixed(2)}
                          </span>
                          <Sparkline
                            data={[st.gpa_before ?? 0, (st.gpa_before ?? 0) + (st.gpa_change ?? 0) * 0.2, (st.gpa_before ?? 0) + (st.gpa_change ?? 0) * 0.4, (st.gpa_before ?? 0) + (st.gpa_change ?? 0) * 0.65, (st.gpa_before ?? 0) + (st.gpa_change ?? 0) * 0.85, st.gpa_after ?? 0]}
                            color={(st.gpa_change ?? 0) >= 0 ? "#16a34a" : "#dc2626"}
                          />
                        </td>
                        <td className="py-2.5 pr-3 text-right text-xs">
                          <span className="text-muted-foreground">{(st.pass_rate_before ?? 0).toFixed(0)}%</span>
                          <span className="mx-1 text-muted-foreground/40">&rarr;</span>
                          <span className="font-semibold">{(st.pass_rate_after ?? 0).toFixed(0)}%</span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="text-red-500 font-medium">{st.risk_before}</span>
                            <span className="text-muted-foreground/40">&rarr;</span>
                            <span className={`font-semibold ${st.risk_after === "Low" ? "text-green-600" : st.risk_after === "Medium" ? "text-amber-600" : "text-red-500"}`}>{st.risk_after}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3"><OutcomeBadge outcome={st.outcome} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {students.length > 10 && (
                <button onClick={() => setShowAll(!showAll)} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
                  {showAll ? "Show less" : `Show all ${students.length} students`}
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
