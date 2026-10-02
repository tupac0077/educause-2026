import { createFileRoute } from "@tanstack/react-router";
import {
  useRiskDriversSuspense,
  useAiInsightsSuspense,
  useEnrollmentForecastSuspense,
  useTrendsForecastSuspense,
  chat,
  type ForecastPoint,
  type EnrollmentForecastPoint,
  type RiskDriver,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  TrendingDown,
  Zap,
  Shield,
  Users,
  Activity,
  Brain,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  MessageCircle,
  Send,
  Bot,
  User,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_sidebar/analytics")({
  component: () => (
    <ErrorBoundary fallback={<div>Error loading analytics</div>}>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsPage />
      </Suspense>
    </ErrorBoundary>
  ),
});

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

const ICON_MAP: Record<string, React.ReactNode> = {
  alert: <AlertTriangle className="h-4 w-4" />,
  "trending-down": <TrendingDown className="h-4 w-4" />,
  zap: <Zap className="h-4 w-4" />,
  shield: <Shield className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
};

// ── Interactive SVG line chart with hover tooltip & crosshair ──

function LineChart<T extends { term_code: string; is_forecast: boolean }>({
  data,
  metricKey,
  upperKey,
  lowerKey,
  color,
  formatter,
}: {
  data: T[];
  metricKey: keyof T;
  upperKey: keyof T;
  lowerKey: keyof T;
  color: string;
  formatter?: (v: number) => string;
}) {
  const fmt = formatter ?? ((v: number) => v.toFixed(1));
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const values = data
    .map((d) => [d[metricKey], d[upperKey], d[lowerKey]])
    .flat()
    .filter((v): v is number => typeof v === "number" && v != null);
  if (values.length === 0) return null;

  const minV = Math.floor(Math.min(...values) * 0.98);
  const maxV = Math.ceil(Math.max(...values) * 1.02);
  const range = maxV - minV || 1;

  const W = 580, H = 200, pL = 55, pR = 15, pT = 12, pB = 35;
  const plotW = W - pL - pR, plotH = H - pT - pB;
  const x = (i: number) => pL + (i / Math.max(data.length - 1, 1)) * plotW;
  const y = (v: number) => pT + plotH - ((v - minV) / range) * plotH;

  const historical = data.filter((d) => !d.is_forecast);
  const forecast = data.filter((d) => d.is_forecast);
  const splitIdx = historical.length;

  const bandUp = forecast.map((d, i) => { const v = d[upperKey]; return typeof v === "number" ? `${x(splitIdx + i).toFixed(1)},${y(v).toFixed(1)}` : ""; }).filter(Boolean);
  const bandLo = [...forecast].reverse().map((d, i) => { const v = d[lowerKey]; const idx = splitIdx + (forecast.length - 1 - i); return typeof v === "number" ? `${x(idx).toFixed(1)},${y(v).toFixed(1)}` : ""; }).filter(Boolean);
  const bandPath = bandUp.length ? `M${bandUp.join("L")}L${bandLo.join("L")}Z` : "";

  const gridN = 4;
  const step = range / gridN;

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < data.length; i++) {
      const dist = Math.abs(x(i) - svgX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    }
    setHoverIdx(closest);
  }, [data.length]);

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hVal = hovered ? hovered[metricKey] : null;
  const hUpper = hovered ? hovered[upperKey] : null;
  const hLower = hovered ? hovered[lowerKey] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto cursor-crosshair"
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Grid */}
        {Array.from({ length: gridN + 1 }, (_, i) => {
          const val = minV + i * step;
          return (
            <g key={i}>
              <line x1={pL} x2={W - pR} y1={y(val)} y2={y(val)} stroke="currentColor" strokeOpacity={0.06} />
              <text x={pL - 4} y={y(val) + 3} textAnchor="end" fontSize="8" fill="currentColor" fillOpacity={0.45}>{fmt(val)}</text>
            </g>
          );
        })}

        {/* Forecast divider */}
        {splitIdx > 0 && splitIdx < data.length && (
          <line x1={x(splitIdx - 0.5)} x2={x(splitIdx - 0.5)} y1={pT} y2={pT + plotH} stroke="currentColor" strokeOpacity={0.12} strokeDasharray="4 3" />
        )}

        {/* Confidence band */}
        {bandPath && <path d={bandPath} fill="#7c3aed" fillOpacity={0.1} />}

        {/* Historical line */}
        {historical.length > 1 && (
          <path
            d={historical.map((d, i) => { const v = d[metricKey]; return typeof v === "number" ? `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}` : ""; }).join("")}
            fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {/* Forecast line */}
        {forecast.length > 0 && (
          <path
            d={[historical[historical.length - 1], ...forecast].map((d, i) => { const v = d[metricKey]; const idx = splitIdx - 1 + i; return typeof v === "number" ? `${i === 0 ? "M" : "L"}${x(idx).toFixed(1)},${y(v).toFixed(1)}` : ""; }).join("")}
            fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {data.map((d, i) => {
          const v = d[metricKey];
          if (typeof v !== "number") return null;
          const isHov = i === hoverIdx;
          return (
            <circle
              key={i}
              cx={x(i)} cy={y(v)}
              r={isHov ? 6 : d.is_forecast ? 2.5 : 3.5}
              fill={isHov ? "white" : d.is_forecast ? "#7c3aed" : color}
              stroke={isHov ? (d.is_forecast ? "#7c3aed" : color) : "white"}
              strokeWidth={isHov ? 2.5 : 1.5}
              style={{ transition: "r 0.1s, fill 0.1s" }}
            />
          );
        })}

        {/* Crosshair */}
        {hoverIdx !== null && typeof hVal === "number" && (
          <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={pT} y2={pT + plotH} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} strokeDasharray="3 2" />
        )}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize="8"
            fill="currentColor" fillOpacity={i === hoverIdx ? 1 : d.is_forecast ? 0.35 : 0.55}
            fontWeight={i === hoverIdx ? "bold" : "normal"}
            fontStyle={d.is_forecast ? "italic" : "normal"}>
            {d.term_code}
          </text>
        ))}

        {/* Tooltip */}
        {hoverIdx !== null && hovered && typeof hVal === "number" && (() => {
          const tx = x(hoverIdx);
          const ty = y(hVal);
          const boxW = hovered.is_forecast ? 150 : 100;
          const boxH = hovered.is_forecast && typeof hUpper === "number" ? 52 : 36;
          const flipX = tx + boxW + 10 > W;
          const bx = flipX ? tx - boxW - 10 : tx + 10;
          const by = Math.max(pT, Math.min(ty - boxH / 2, pT + plotH - boxH));
          return (
            <g>
              <rect x={bx} y={by} width={boxW} height={boxH} rx={4} fill="white" stroke="currentColor" strokeOpacity={0.15} filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))" />
              <text x={bx + 8} y={by + 14} fontSize="9" fontWeight="bold" fill="currentColor">{hovered.term_code}{hovered.is_forecast ? " (forecast)" : ""}</text>
              <text x={bx + 8} y={by + 28} fontSize="10" fontWeight="bold" fill={hovered.is_forecast ? "#7c3aed" : color}>{fmt(hVal)}</text>
              {hovered.is_forecast && typeof hUpper === "number" && typeof hLower === "number" && (
                <text x={bx + 8} y={by + 44} fontSize="8" fill="currentColor" fillOpacity={0.5}>CI: {fmt(hLower)} – {fmt(hUpper)}</text>
              )}
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mt-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: color }} />Historical
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 rounded border border-dashed" style={{ borderColor: "#7c3aed" }} />AI Forecast
        </span>
      </div>
    </div>
  );
}

// ── Expandable driver card ──

function DriverCard({ d }: { d: RiskDriver }) {
  const [open, setOpen] = useState(false);
  const atRisk = d.at_risk_avg ?? 0;
  const healthy = d.healthy_avg ?? 0;
  const max = Math.max(atRisk, healthy, 1);
  const gap = healthy !== 0 ? ((atRisk - healthy) / healthy) * 100 : 0;
  const absGap = Math.abs(atRisk - healthy);
  const isLowerBetter = d.metric === "Support Interactions" || d.metric === "Courses Failed";
  const gapColor = gap < 0 ? "text-red-800 dark:text-red-400" : "text-orange-600 dark:text-orange-400";

  const explanations: Record<string, string> = {
    "GPA": "GPA difference is small, suggesting academic ability alone isn't the primary differentiator. Engagement and support patterns matter more.",
    "Pass Rate": "At-risk students pass courses at nearly half the rate of healthy students — the single strongest signal for early intervention triggers.",
    "LMS Activities": "At-risk students show 80% less platform engagement. LMS activity drop-off is often the earliest detectable warning sign.",
    "LMS Minutes": "At-risk students spend ~80% less time on the LMS. Low time-on-platform precedes grade decline by 3–4 weeks on average.",
    "Support Interactions": "At-risk students have 4x more support contacts, indicating existing interventions are reaching them — but outcomes need improvement.",
    "Courses Failed": "At-risk students fail nearly 5x more courses. Cascading failures compound withdrawal risk each semester.",
  };

  return (
    <Card
      className={`border-sky-100 cursor-pointer transition-all duration-200 hover:shadow-md ${open ? "ring-2 ring-sky-300" : ""}`}
      onClick={() => setOpen(!open)}
    >
      <CardContent className="pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{d.metric}</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold ${gapColor}`}>
              {gap > 0 ? "+" : ""}{gap.toFixed(0)}%
            </span>
            {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        </div>
        <div className="space-y-2">
          <div className="space-y-0.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-red-800 dark:text-red-400 font-medium">At-Risk</span>
              <span className="font-semibold">{atRisk.toLocaleString()}{d.unit === "%" ? "%" : ""}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-red-400 transition-all duration-500" style={{ width: `${(atRisk / max) * 100}%` }} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-sky-600 font-medium">Healthy</span>
              <span className="font-semibold">{healthy.toLocaleString()}{d.unit === "%" ? "%" : ""}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-sky-400 transition-all duration-500" style={{ width: `${(healthy / max) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        {open && (
          <div className="pt-2 mt-2 border-t border-sky-100 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2 text-xs">
              <ArrowRight className="h-3 w-3 text-sky-500" />
              <span className="text-muted-foreground">
                Gap: <strong className={gapColor}>{absGap.toFixed(1)} {d.unit === "%" ? "pp" : d.unit ?? ""}</strong>
                {" "}({isLowerBetter ? "higher" : "lower"} is worse for at-risk)
              </span>
            </div>
            {explanations[d.metric] && (
              <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                {explanations[d.metric]}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Inline Genie chat widget ──

type ChatMsg = { role: "user" | "assistant"; content: string; sql?: string | null };

const GENIE_SUGGESTIONS = [
  "Which students need the most urgent attention?",
  "Show me high-risk students in Engineering",
  "Which courses have the highest fail rates?",
  "How has pass rate changed over the last 3 semesters?",
];

function GenieWidget() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setExpanded(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const resp = await chat({ message: text, conversation_id: conversationId });
      setConversationId(resp.data.conversation_id ?? undefined);
      setMessages((prev) => [...prev, { role: "assistant", content: resp.data.response, sql: resp.data.sql_query }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-6 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Ask Genie</h2>
            <p className="text-xs text-emerald-600/70">Query your student data using natural language</p>
          </div>
          <Badge variant="outline" className="ml-2 text-[10px] border-emerald-300 text-emerald-600">
            Databricks Genie
          </Badge>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-emerald-500 hover:text-emerald-700 flex items-center gap-1 font-medium">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>

      {/* Chat area */}
      {expanded && messages.length > 0 && (
        <div className="max-h-96 overflow-y-auto space-y-3 rounded-xl bg-white border border-emerald-100 p-4 shadow-inner">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-emerald-700" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-emerald-600 text-white" : "bg-muted"}`}>
                <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{msg.content}</pre>
                {msg.sql && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer opacity-60">View SQL</summary>
                    <pre className="text-xs mt-1 p-2 bg-background/50 rounded overflow-x-auto font-mono">{msg.sql}</pre>
                  </details>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Suggestion chips (shown when no messages) */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2.5">
          {GENIE_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-sm px-4 py-2 rounded-full border border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50 hover:border-emerald-400 hover:shadow-sm transition-all font-medium"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about students, courses, risk scores, trends..."
          disabled={loading}
          className="flex-1 h-12 bg-white border-emerald-300 focus-visible:ring-emerald-400 text-base px-4 rounded-xl shadow-sm"
        />
        <Button type="submit" disabled={loading || !input.trim()} className="h-12 px-5 bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm text-base">
          <Send className="h-5 w-5 mr-1.5" />
          Ask
        </Button>
      </form>
    </div>
  );
}

// ── Main page ──

type ForecastMetric = "pass_rate" | "fail_rate" | "withdrawal_rate";
type EnrollMetric = "active_students" | "total_enrollments";

const TREND_METRICS: { key: ForecastMetric; upper: `${ForecastMetric}_upper`; lower: `${ForecastMetric}_lower`; label: string; color: string }[] = [
  { key: "pass_rate", upper: "pass_rate_upper", lower: "pass_rate_lower", label: "Pass Rate", color: "#16a34a" },
  { key: "fail_rate", upper: "fail_rate_upper", lower: "fail_rate_lower", label: "Fail Rate", color: "#dc2626" },
  { key: "withdrawal_rate", upper: "withdrawal_rate_upper", lower: "withdrawal_rate_lower", label: "Withdrawal Rate", color: "#ca8a04" },
];

const ENROLL_METRICS: { key: EnrollMetric; upper: `${EnrollMetric}_upper`; lower: `${EnrollMetric}_lower`; label: string }[] = [
  { key: "active_students", upper: "active_students_upper", lower: "active_students_lower", label: "Active Students" },
  { key: "total_enrollments", upper: "total_enrollments_upper", lower: "total_enrollments_lower", label: "Total Course Enrollments" },
];

function AnalyticsPage() {
  const { data: driversResp } = useRiskDriversSuspense();
  const drivers = driversResp.data;

  const { data: insightsResp } = useAiInsightsSuspense();
  const insights = insightsResp.data;

  const { data: enrollResp } = useEnrollmentForecastSuspense();
  const enrollForecast = enrollResp.data;

  const { data: trendResp } = useTrendsForecastSuspense();
  const trendForecast = trendResp.data;

  const [selectedTrend, setSelectedTrend] = useState<ForecastMetric>("pass_rate");
  const [selectedEnroll, setSelectedEnroll] = useState<EnrollMetric>("active_students");

  const tm = TREND_METRICS.find((m) => m.key === selectedTrend)!;
  const em = ENROLL_METRICS.find((m) => m.key === selectedEnroll)!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forecast & Analytics</h1>
          <p className="text-muted-foreground">
            Trend forecasting, key driver analysis, and AI-powered insights
          </p>
        </div>
      </div>

      {/* Ask Genie */}
      <GenieWidget />

      {/* AI-Generated Insights */}
      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-amber-600" />
          <h2 className="text-base font-semibold text-amber-900">AI-Generated Insights</h2>
          <Badge variant="outline" className="ml-2 text-[10px] border-amber-300 text-amber-600">
            ai_query() &middot; Llama 3.3 70B
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg bg-white/80 border border-amber-100 hover:border-amber-300 hover:shadow-sm transition-all">
              <div className="flex-shrink-0 mt-0.5 text-amber-600">
                {ICON_MAP[insight.icon] ?? <Zap className="h-4 w-4" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-amber-900">{insight.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{insight.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Driver Analysis */}
      <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/60 to-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-sky-600" />
          <h2 className="text-base font-semibold text-sky-900">Key Driver Analysis</h2>
          <span className="ml-auto text-xs text-sky-400 font-medium tracking-wide uppercase">Click a card to expand</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((d) => (
            <DriverCard key={d.metric} d={d} />
          ))}
        </div>
      </div>

      {/* AI Forecast Section */}
      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/60 to-white p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <h2 className="text-base font-semibold text-violet-900">AI Trend Forecasts</h2>
          <Badge variant="outline" className="ml-2 text-[10px] border-violet-300 text-violet-600">
            AI_FORECAST &middot; 4-Semester Projection
          </Badge>
        </div>

        {/* Enrollment forecast with metric toggle */}
        <Card className="border-violet-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-violet-700">{em.label}</CardTitle>
              <div className="flex rounded-lg border border-violet-200 overflow-hidden">
                {ENROLL_METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setSelectedEnroll(m.key)}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      selectedEnroll === m.key
                        ? "bg-violet-600 text-white"
                        : "bg-white text-violet-600 hover:bg-violet-50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <LineChart<EnrollmentForecastPoint>
              data={enrollForecast}
              metricKey={em.key}
              upperKey={em.upper}
              lowerKey={em.lower}
              color="#0284c7"
              formatter={(v) => v.toFixed(0)}
            />
          </CardContent>
        </Card>

        {/* Performance forecast with metric toggle */}
        <Card className="border-violet-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-violet-700">{tm.label} Forecast</CardTitle>
              <div className="flex rounded-lg border border-violet-200 overflow-hidden">
                {TREND_METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setSelectedTrend(m.key)}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      selectedTrend === m.key
                        ? "bg-violet-600 text-white"
                        : "bg-white text-violet-600 hover:bg-violet-50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <LineChart<ForecastPoint>
              data={trendForecast}
              metricKey={tm.key}
              upperKey={tm.upper}
              lowerKey={tm.lower}
              color={tm.color}
              formatter={(v) => `${v.toFixed(1)}%`}
            />
          </CardContent>
        </Card>
      </div>


    </div>
  );
}
