import { createFileRoute } from "@tanstack/react-router";
import {
  useDashboardStatsSuspense,
  useListRetentionSuspense,
  useExecutiveMetricsSuspense,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { SlidersHorizontal } from "lucide-react";
import { edition, shortOrgUnit } from "@/lib/edition";

export const Route = createFileRoute("/_sidebar/simulator")({
  component: () => (
    <ErrorBoundary fallback={<div>Error loading simulator</div>}>
      <Suspense fallback={<SimulatorSkeleton />}>
        <SimulatorPage />
      </Suspense>
    </ErrorBoundary>
  ),
});

function SimulatorSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

function SimulatorPage() {
  const { data: statsResp } = useDashboardStatsSuspense();
  const stats = statsResp.data;

  const { data: retentionResp } = useListRetentionSuspense();
  const retention = retentionResp.data;

  const { data: execResp } = useExecutiveMetricsSuspense();
  const exec = execResp.data;

  const supportedRate = exec.supported_student_pass_rate ?? 0;
  const unsupportedRate = exec.unsupported_student_pass_rate ?? 0;
  const interventionLift = supportedRate - unsupportedRate;

  const [sliders, setSliders] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const f of retention) {
      init[f.faculty] = Math.round(f.at_risk_count * 0.25);
    }
    return init;
  });

  const setFacultyTarget = (faculty: string, value: number) => {
    setSliders((prev) => ({ ...prev, [faculty]: value }));
  };

  const avgTuition = stats.at_risk_students > 0
    ? exec.revenue_at_risk / stats.at_risk_students
    : edition.defaultAnnualTuition;
  const boundedLift = Math.min(Math.max(interventionLift, 10), 50);
  const retentionProbability = boundedLift / 100;
  const costPerIntervention = 1500;

  const facultyResults = retention.map((f) => {
    const target = sliders[f.faculty] ?? 0;
    const saved = Math.round(target * retentionProbability);
    const revenue = saved * avgTuition;
    const cost = target * costPerIntervention;
    const baseRet = f.retention_rate_pct ?? exec.retention_rate_pct;
    const retGain = f.at_risk_count > 0
      ? (saved / f.at_risk_count) * (100 - baseRet) * 0.5
      : 0;
    return {
      faculty: f.faculty,
      shortName: shortOrgUnit(f.faculty),
      atRisk: f.at_risk_count,
      target,
      saved,
      revenue,
      cost,
      net: revenue - cost,
      baseRetention: baseRet,
      projectedRetention: Math.min(baseRet + retGain, 100),
      totalStudents: f.total_students,
      active: f.active_count,
      withdrawn: f.withdrawn_count,
    };
  });

  const totals = facultyResults.reduce(
    (acc, r) => ({
      target: acc.target + r.target,
      saved: acc.saved + r.saved,
      revenue: acc.revenue + r.revenue,
      cost: acc.cost + r.cost,
      net: acc.net + r.net,
      atRisk: acc.atRisk + r.atRisk,
    }),
    { target: 0, saved: 0, revenue: 0, cost: 0, net: 0, atRisk: 0 }
  );

  const totalROIMultiple = totals.cost > 0 ? totals.revenue / totals.cost : 0;
  const totalCoverage = totals.atRisk > 0 ? (totals.target / totals.atRisk) * 100 : 0;
  const projectedPassRate = unsupportedRate + (totals.target / Math.max(stats.at_risk_students, 1)) * boundedLift;
  const projectedRetentionAll = exec.retention_rate_pct + (totals.saved / Math.max(stats.at_risk_students, 1)) * (100 - exec.retention_rate_pct) * 0.5;

  const setAllPct = (pct: number) => {
    const next: Record<string, number> = {};
    for (const f of retention) {
      next[f.faculty] = Math.round(f.at_risk_count * pct);
    }
    setSliders(next);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center">
            <SlidersHorizontal className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Student Intervention Simulator</h1>
            <p className="text-muted-foreground">
              Model the impact of scaling interventions across {edition.orgUnitLabelPluralLower}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 text-xs border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-400">
          <SlidersHorizontal className="h-3 w-3" />
          Interactive
        </Badge>
      </div>

      {/* Aggregated totals at top */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-card border-2 border-teal-200 dark:border-teal-800 p-5 space-y-1 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">Total Students Targeted</div>
          <div className="text-3xl font-bold text-teal-700 dark:text-teal-400">{totals.target.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">{totalCoverage.toFixed(0)}% of at-risk · {totals.saved} projected retained</div>
        </div>
        <div className="rounded-xl bg-card border-2 border-teal-200 dark:border-teal-800 p-5 space-y-1 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">Revenue Protected</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">${(totals.revenue / 1_000_000).toFixed(2)}M {edition.currencySuffix}</div>
          <div className="text-xs text-muted-foreground">at ${Math.round(avgTuition).toLocaleString()} {edition.currencySuffix} avg tuition/student</div>
        </div>
        <div className="rounded-xl bg-card border-2 border-teal-200 dark:border-teal-800 p-5 space-y-1 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">Net ROI</div>
          <div className={`text-3xl font-bold ${totals.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-800 dark:text-red-400"}`}>
            {totals.net >= 0 ? "+" : ""}${(totals.net / 1_000_000).toFixed(2)}M {edition.currencySuffix}
          </div>
          <div className="text-xs text-muted-foreground">{totalROIMultiple.toFixed(1)}x return · ${(totals.cost / 1_000_000).toFixed(2)}M cost</div>
        </div>
        <div className="rounded-xl bg-card border-2 border-teal-200 dark:border-teal-800 p-5 space-y-1 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">Projected Retention</div>
          <div className="text-3xl font-bold text-teal-700 dark:text-teal-400">{Math.min(projectedRetentionAll, 100).toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">up from {exec.retention_rate_pct.toFixed(1)}% baseline</div>
        </div>
      </div>

      {/* Quick-set buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground font-medium">Quick set all {edition.orgUnitLabelPluralLower}:</span>
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <button
            key={pct}
            onClick={() => setAllPct(pct)}
            className="text-sm px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-400 bg-card hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-300 dark:hover:border-teal-600 transition-colors font-medium"
          >
            {(pct * 100).toFixed(0)}%
          </button>
        ))}
      </div>

      {/* Per-faculty sliders */}
      <div className="space-y-4">
        {facultyResults.map((r) => {
          const pct = r.atRisk > 0 ? (r.target / r.atRisk) * 100 : 0;
          return (
            <div key={r.faculty} className="rounded-xl border border-teal-100 dark:border-teal-800 bg-card p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold">{r.shortName}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {r.atRisk} at-risk of {r.totalStudents}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-teal-700 dark:text-teal-400 font-bold text-lg">{r.target}</span>
                  <span className="text-muted-foreground">students ({pct.toFixed(0)}%)</span>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={r.atRisk}
                step={Math.max(1, Math.round(r.atRisk / 50))}
                value={r.target}
                onChange={(e) => setFacultyTarget(r.faculty, Number(e.target.value))}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer bg-muted accent-teal-600"
              />

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Students Retained</span>
                  <div className="font-semibold text-teal-700 dark:text-teal-400">{r.saved}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Revenue Saved</span>
                  <div className="font-semibold text-green-600 dark:text-green-400">${r.revenue >= 1_000_000 ? `${(r.revenue / 1_000_000).toFixed(2)}M` : `${(r.revenue / 1000).toFixed(0)}K`}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Intervention Cost</span>
                  <div className="font-semibold text-muted-foreground">${(r.cost / 1000).toFixed(0)}K</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Net ROI</span>
                  <div className={`font-semibold ${r.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-800 dark:text-red-400"}`}>
                    {r.net >= 0 ? "+" : ""}${r.net >= 1_000_000 || r.net <= -1_000_000 ? `${(r.net / 1_000_000).toFixed(2)}M` : `${(r.net / 1000).toFixed(0)}K`}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Projected Retention</span>
                  <div className="font-semibold text-teal-700 dark:text-teal-400">
                    {r.projectedRetention.toFixed(1)}%
                    {r.projectedRetention > r.baseRetention && (
                      <span className="text-[10px] text-green-600 dark:text-green-400 ml-1">+{(r.projectedRetention - r.baseRetention).toFixed(1)}pp</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                    <div className="h-full rounded-full bg-teal-500 transition-all duration-500" style={{ width: `${r.projectedRetention}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pass rate impact */}
      <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50/60 to-white dark:from-teal-950/40 dark:to-card p-5 space-y-4">
        <div className="text-sm font-semibold text-teal-800 dark:text-teal-300">Projected Pass Rate Impact (University-Wide)</div>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current (no intervention)</span>
              <span className="font-semibold">{unsupportedRate.toFixed(1)}%</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-slate-400 transition-all duration-500" style={{ width: `${Math.min(unsupportedRate, 100)}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">With intervention ({totals.target.toLocaleString()} students across {retention.length} {edition.orgUnitLabelPluralLower})</span>
              <span className="font-semibold text-teal-700 dark:text-teal-400">{Math.min(projectedPassRate, 100).toFixed(1)}%</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-teal-500 transition-all duration-500" style={{ width: `${Math.min(projectedPassRate, 100)}%` }} />
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground pt-1">
          Projections use a modelled intervention lift of {boundedLift.toFixed(1)}pp (bounded 10–50pp). Cost estimate uses $1,500/student for advising, tutoring, and support services.
        </div>
      </div>
    </div>
  );
}
