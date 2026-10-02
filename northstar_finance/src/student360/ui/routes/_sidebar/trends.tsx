import { createFileRoute, Link } from "@tanstack/react-router";
import { useTermTrendsSuspense } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { edition } from "@/lib/edition";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_sidebar/trends")({
  component: () => (
    <ErrorBoundary fallback={<div>Error loading trends</div>}>
      <Suspense fallback={<TrendsSkeleton />}>
        <TrendsPage />
      </Suspense>
    </ErrorBoundary>
  ),
});

function TrendsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

type TrendRow = {
  term_code: string;
  year: string;
  term: string;
  active_students: string;
  total_enrollments: string;
  avg_mark: string;
  pass_rate_pct: string;
  fail_rate_pct: string;
  withdrawal_rate_pct: string;
  total_credits_awarded: string;
};

function delta(curr: number, prev: number): { value: number; positive: boolean } {
  const d = curr - prev;
  return { value: d, positive: d >= 0 };
}

function DeltaBadge({ d, suffix = "", invert = false }: { d: { value: number; positive: boolean }; suffix?: string; invert?: boolean }) {
  const good = invert ? !d.positive : d.positive;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${good ? "text-green-600" : "text-red-800 dark:text-red-400"}`}>
      {good ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {d.value >= 0 ? "+" : ""}{d.value.toFixed(1)}{suffix}
    </span>
  );
}

function TrendsPage() {
  const { data: resp } = useTermTrendsSuspense();
  const trends = resp.data as TrendRow[];

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const latest = trends[trends.length - 1];
  const prev = trends.length > 1 ? trends[trends.length - 2] : null;

  const latestStudents = parseInt(latest?.active_students ?? "0");
  const latestEnrollments = parseInt(latest?.total_enrollments ?? "0");
  const latestPass = parseFloat(latest?.pass_rate_pct ?? "0");
  const latestAvgMark = parseFloat(latest?.avg_mark ?? "0");

  const dStudents = prev ? delta(latestStudents, parseInt(prev.active_students)) : null;
  const dEnrollments = prev ? delta(latestEnrollments, parseInt(prev.total_enrollments)) : null;
  const dPass = prev ? delta(latestPass, parseFloat(prev.pass_rate_pct)) : null;
  const dAvgMark = prev ? delta(latestAvgMark, parseFloat(prev.avg_mark)) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Semester Trends</h1>
          <p className="text-muted-foreground">
            Historical term-over-term performance data
          </p>
        </div>
        <Link to="/analytics" className="text-sm text-primary hover:underline flex items-center gap-1">
          View AI Forecasts <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Latest semester snapshot */}
      {latest && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Active Students</span>
                {dStudents && <DeltaBadge d={dStudents} />}
              </div>
              <div className="text-2xl font-bold">{latestStudents.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground">{latest.term_code}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Course Enrollments</span>
                {dEnrollments && <DeltaBadge d={dEnrollments} />}
              </div>
              <div className="text-2xl font-bold">{latestEnrollments.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground">{latest.term_code}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Pass Rate</span>
                {dPass && <DeltaBadge d={dPass} suffix="pp" />}
              </div>
              <div className="text-2xl font-bold">{latestPass.toFixed(1)}%</div>
              <div className="text-[11px] text-muted-foreground">{latest.term_code}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Avg Mark</span>
                {dAvgMark && <DeltaBadge d={dAvgMark} />}
              </div>
              <div className="text-2xl font-bold">{latestAvgMark.toFixed(1)}</div>
              <div className="text-[11px] text-muted-foreground">{latest.term_code}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Horizontal bar charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {([
          { label: "Pass Rate by Semester", key: "pass_rate_pct" as const, color: "bg-green-500", hoverColor: "bg-green-600" },
          { label: "Fail Rate by Semester", key: "fail_rate_pct" as const, color: "bg-red-400", hoverColor: "bg-red-500" },
          { label: "Withdrawal Rate by Semester", key: "withdrawal_rate_pct" as const, color: "bg-yellow-500", hoverColor: "bg-yellow-600" },
        ]).map(({ label, key, color, hoverColor }) => (
          <Card key={key} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trends.map((t, i) => {
                  const pct = parseFloat(t[key]) || 0;
                  const prevPct = i > 0 ? parseFloat(trends[i - 1][key]) || 0 : null;
                  const d = prevPct !== null ? delta(pct, prevPct) : null;
                  const isHov = hoveredRow === `${key}-${t.term_code}`;
                  return (
                    <div
                      key={t.term_code}
                      className="flex items-center gap-2 group cursor-default"
                      onMouseEnter={() => setHoveredRow(`${key}-${t.term_code}`)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <span className="text-xs w-14 text-muted-foreground font-medium">{t.term_code}</span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${isHov ? hoverColor : color} rounded-full transition-all duration-300`}
                          style={{ width: `${Math.min(pct, 100)}%`, transform: isHov ? "scaleY(1.2)" : "scaleY(1)", transformOrigin: "center" }}
                        />
                      </div>
                      <span className={`text-xs font-semibold w-14 text-right transition-colors ${isHov ? "text-foreground" : "text-muted-foreground"}`}>
                        {pct.toFixed(1)}%
                      </span>
                      {isHov && d && (
                        <span className="w-12 animate-in fade-in duration-100">
                          <DeltaBadge d={d} suffix="pp" invert={key !== "pass_rate_pct"} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sparkline overview */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Semester Comparison</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2.5 pr-4 font-semibold">Semester</th>
                  <th className="py-2.5 pr-4 font-semibold text-right">Students</th>
                  <th className="py-2.5 pr-4 font-semibold text-right">Enrollments</th>
                  <th className="py-2.5 pr-4 font-semibold text-right">Avg Mark</th>
                  <th className="py-2.5 pr-4 font-semibold text-right">Pass Rate</th>
                  <th className="py-2.5 pr-4 font-semibold text-right">Fail Rate</th>
                  <th className="py-2.5 pr-4 font-semibold text-right">Withdrawal</th>
                  <th className="py-2.5 font-semibold text-right">{edition.creditsLabel}</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((t, i) => {
                  const isLatest = i === trends.length - 1;
                  const isHov = hoveredRow === `table-${t.term_code}`;
                  const pr = i > 0 ? trends[i - 1] : null;
                  return (
                    <tr
                      key={t.term_code}
                      className={`border-b transition-colors cursor-default ${isHov ? "bg-muted/50" : ""} ${isLatest ? "font-medium" : ""}`}
                      onMouseEnter={() => setHoveredRow(`table-${t.term_code}`)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td className="py-2.5 pr-4 font-medium">
                        {t.term_code}
                        {isLatest && <span className="ml-1.5 text-[10px] text-primary font-semibold">Latest</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {parseInt(t.active_students).toLocaleString()}
                        {isHov && pr && (
                          <span className="ml-1.5 inline-flex"><DeltaBadge d={delta(parseInt(t.active_students), parseInt(pr.active_students))} /></span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {parseInt(t.total_enrollments).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {parseFloat(t.avg_mark).toFixed(1)}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {parseFloat(t.pass_rate_pct).toFixed(1)}%
                        {isHov && pr && (
                          <span className="ml-1.5 inline-flex"><DeltaBadge d={delta(parseFloat(t.pass_rate_pct), parseFloat(pr.pass_rate_pct))} suffix="pp" /></span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {parseFloat(t.fail_rate_pct).toFixed(1)}%
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {parseFloat(t.withdrawal_rate_pct).toFixed(1)}%
                      </td>
                      <td className="py-2.5 text-right">
                        {parseInt(t.total_credits_awarded).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
