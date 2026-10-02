import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, type ReactNode } from "react";
import {
  getFinanceSummary, getAidAppeals, getRevenueAtRisk, getActionLog,
  type FinanceSummary, type AidAppeal, type RevenueAtRisk, type ActionLogEntry,
} from "@/lib/agent";
import { Zap, AlertTriangle, FileText, TrendingDown, ArrowRight, History } from "lucide-react";

export const Route = createFileRoute("/_sidebar/finance-actions")({
  component: () => <FinanceActionsPage />,
});

const usd = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fn()
      .then((d) => live && setData(d))
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error };
}

function FinanceActionsPage() {
  const { data: summary } = useAsync<FinanceSummary>(getFinanceSummary);
  const { data: appeals } = useAsync<AidAppeal[]>(() => getAidAppeals("pending"));
  const { data: rar } = useAsync<RevenueAtRisk[]>(() => getRevenueAtRisk(15));
  const { data: log } = useAsync<ActionLogEntry[]>(getActionLog);

  const seed = (prompt: string) => `/finance-copilot?prompt=${encodeURIComponent(prompt)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" /> AI Actions
        </h1>
        <p className="text-muted-foreground">
          Work the finance queues with the Copilot — review aid appeals, triage revenue at risk, and
          let the agent take actions with your approval.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Revenue at Risk" value={usd(summary?.total_revenue_at_risk_usd)} icon={<TrendingDown className="h-4 w-4" />} ready={!!summary} />
        <StatTile label="Overdue Balance" value={usd(summary?.overdue_balance_usd)} icon={<AlertTriangle className="h-4 w-4" />} ready={!!summary} />
        <StatTile label="Pending Appeals" value={summary ? String(summary.pending_appeals) : "—"} sub={usd(summary?.pending_appeals_usd)} icon={<FileText className="h-4 w-4" />} ready={!!summary} />
        <StatTile label="Colleges Over Budget" value={summary ? String(summary.over_budget_colleges) : "—"} icon={<AlertTriangle className="h-4 w-4" />} ready={!!summary} />
      </div>

      {/* Aid appeal queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pending Financial Aid Appeals</CardTitle>
          <a href={seed("Review the pending aid appeals and recommend decisions")}>
            <Button size="sm" variant="outline">Review all with Copilot <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </a>
        </CardHeader>
        <CardContent>
          {!appeals ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3">Appeal</th>
                    <th className="py-2 pr-3">Student</th>
                    <th className="py-2 pr-3">College</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3 text-right">Requested</th>
                    <th className="py-2 pr-3">Reason</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {appeals.slice(0, 12).map((a) => (
                    <tr key={a.appeal_id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{a.appeal_id}</td>
                      <td className="py-2 pr-3">{a.full_name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{a.college}</td>
                      <td className="py-2 pr-3">{a.appeal_type}</td>
                      <td className="py-2 pr-3 text-right">{usd(a.requested_amount_usd)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{a.reason}</td>
                      <td className="py-2">
                        <a href={seed(`Review aid appeal ${a.appeal_id} for ${a.full_name} and recommend a decision`)}>
                          <Button size="sm" variant="ghost">Review</Button>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue at risk */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Top Revenue at Risk</CardTitle>
          <a href={seed("Which students have the highest revenue at risk, and what should we do about the top 3?")}>
            <Button size="sm" variant="outline">Triage with Copilot <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </a>
        </CardHeader>
        <CardContent>
          {!rar ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3">Student</th>
                    <th className="py-2 pr-3">College</th>
                    <th className="py-2 pr-3">Risk</th>
                    <th className="py-2 pr-3 text-right">Rev at Risk</th>
                    <th className="py-2 pr-3">Driver</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rar.map((r) => (
                    <tr key={r.student_id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{r.full_name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.college}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={r.risk_category === "Very High" || r.risk_category === "High" ? "destructive" : "secondary"}>
                          {r.risk_category}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">{usd(r.revenue_at_risk_usd)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.primary_driver}</td>
                      <td className="py-2">
                        <a href={seed(`Student ${r.student_id} (${r.full_name}) has ${usd(r.revenue_at_risk_usd)} of revenue at risk. Recommend a retention action.`)}>
                          <Button size="sm" variant="ghost">Act</Button>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" /> Agent Action Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!log ? (
            <Skeleton className="h-24 w-full" />
          ) : log.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No actions taken yet. Actions the Copilot executes (with your approval) will appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {log.map((e) => (
                <div key={e.action_id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                  <div>
                    <Badge variant="outline" className="mr-2">{e.action_type}</Badge>
                    <span className="text-muted-foreground">{e.decision_notes ?? e.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.amount_usd != null ? usd(e.amount_usd) + " · " : ""}
                    {e.actor ?? "agent"} · {e.created_at}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  label, value, sub, icon, ready,
}: {
  label: string; value: string; sub?: string; icon: ReactNode; ready: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-xs">{label}</span>
          {icon}
        </div>
        {ready ? (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
          </>
        ) : (
          <Skeleton className="h-8 w-24" />
        )}
      </CardContent>
    </Card>
  );
}
