import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import {
  NsKpiCard,
  NsCard,
  NsBarChart,
  NsDonut,
  NS,
  fmtUSD,
} from "@/components/apx/ns-charts";

export const Route = createFileRoute("/_sidebar/research-finance")({
  component: () => <ResearchFinancePage />,
});

const RED = "#D64545";
const AMBER = "#FE9000";
const GOOD = "#2F9E6F";

type Research = {
  kpis: { direct_cost: number; fa_recovered: number; awards_at_risk: number; avg_fa_rate: number };
  by_college: { college: string; fa_recovered: number; direct_cost: number }[];
  by_sponsor: { sponsor: string; direct_cost: number }[];
  by_status: { status: string; n: number }[];
};

const shortCollege = (c: string) => c.replace("College of ", "");

const ALERTS = [
  { metric: "Unrestricted Liquidity", value: "42 days", tone: RED, headline: "Below the board-designated floor for the third consecutive month.", footer: "Threshold 60 days · breach ↓ · as of Sep 2026" },
  { metric: "Research Contribution", value: "−$2.4M", tone: RED, headline: "FYTD research-portfolio contribution is tracking below plan.", footer: "Threshold $0 · breach ↓ · as of Sep 2026" },
  { metric: "F&A Recovery at Risk", value: "$3.1M", tone: AMBER, headline: "Reduced indirect-cost recovery across the federal award cohort.", footer: "Threshold $1.5M · breach ↑ · as of Sep 2026" },
];

const HIGH_RISK = [
  { id: "AWD-20431", title: "Coastal Resilience Modeling", school: "Engineering", owner: "Dr. Alvarez", renewal: "Nov 2026", fa: 48, gap: 412000, approval: "Pending" },
  { id: "AWD-20512", title: "Genomic Data Commons", school: "Health Sciences", owner: "Dr. Osei", renewal: "Dec 2026", fa: 51, gap: 388000, approval: "Pending" },
  { id: "AWD-20087", title: "Quantum Materials Core", school: "Science", owner: "Dr. Bianchi", renewal: "Oct 2026", fa: 44, gap: 505000, approval: "Escalated" },
  { id: "AWD-20690", title: "Rural Education Outcomes", school: "Education", owner: "Dr. Park", renewal: "Jan 2027", fa: 57, gap: 141000, approval: "Approved" },
  { id: "AWD-20744", title: "Supply Chain Analytics", school: "Business", owner: "Dr. Reyes", renewal: "Feb 2027", fa: 53, gap: 219000, approval: "Pending" },
  { id: "AWD-20233", title: "Neuroimaging Consortium", school: "Health Sciences", owner: "Dr. Kim", renewal: "Nov 2026", fa: 46, gap: 467000, approval: "Escalated" },
];

const DQ_ISSUES = [
  { type: "Missing F&A rate", impact: 505000, desc: "3 awards lack a negotiated indirect-cost rate on file.", severity: "High" },
  { type: "Unmapped sponsor", impact: 180000, desc: "Sponsor codes not mapped to the federal/non-federal hierarchy.", severity: "Medium" },
  { type: "Stale renewal date", impact: 141000, desc: "Renewal date past due but status still Active.", severity: "Medium" },
];

const BRIEFS = [
  { period: "FY2026 · Sep", status: "Draft", contrib: "−$2.4M", fa: "$3.1M", dq: 3, by: "—", run: "Sep 28, 2026" },
  { period: "FY2026 · Aug", status: "Approved", contrib: "−$1.9M", fa: "$2.6M", dq: 2, by: "M. Chen", run: "Aug 31, 2026" },
  { period: "FY2026 · Jul", status: "Approved", contrib: "−$1.2M", fa: "$2.1M", dq: 4, by: "M. Chen", run: "Jul 31, 2026" },
  { period: "FY2026 · Jun", status: "Superseded", contrib: "−$0.8M", fa: "$1.7M", dq: 1, by: "M. Chen", run: "Jun 30, 2026" },
];

function bandLabel(n: number, text: string) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="ns-mono text-xs font-semibold rounded-md px-2 py-0.5" style={{ background: NS.navy, color: "white" }}>{n}</span>
      <span className="text-xs uppercase tracking-widest ns-muted font-semibold">{text}</span>
    </div>
  );
}

const PILL: Record<string, { background: string; color: string }> = {
  Approved: { background: "rgba(47,158,111,0.15)", color: "#2F9E6F" },
  Draft: { background: "rgba(254,144,0,0.15)", color: "#B45309" },
  Superseded: { background: "rgba(90,102,117,0.15)", color: "#5b6675" },
  Pending: { background: "rgba(254,144,0,0.15)", color: "#B45309" },
  Escalated: { background: "rgba(214,69,69,0.15)", color: "#D64545" },
};

function statusPill(s: string) {
  return (
    <span className="text-[11px] font-medium rounded-full px-2 py-0.5" style={PILL[s] ?? { background: "#eee", color: "#333" }}>
      {s}
    </span>
  );
}

function ResearchFinancePage() {
  const [d, setD] = useState<Research | null>(null);
  useEffect(() => { fetch("/api/finance/research").then((r) => r.json()).then(setD).catch(() => {}); }, []);

  return (
    <div className="ns-theme space-y-8">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-widest ns-muted font-semibold">Research Sustainability · Control Room</div>
        <h1 className="ns-display text-4xl font-semibold mt-1" style={{ color: NS.navy }}>The monthly control loop, at a glance.</h1>
        <p className="ns-muted text-sm mt-2 max-w-3xl">
          Illustrative data — fictional scenario scaffolding, not customer benchmarks. The console drafts; every award action stays for human review.
        </p>
      </div>

      {/* Band 1 — ALERT */}
      <section>
        {bandLabel(1, "Alert — thresholds breached")}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ALERTS.map((a) => (
            <div key={a.metric} className="ns-card p-5" style={{ borderLeft: `4px solid ${a.tone}` }}>
              <div className="text-xs uppercase tracking-wide ns-muted font-medium">{a.metric}</div>
              <div className="ns-display text-4xl font-semibold mt-1" style={{ color: a.tone }}>{a.value}</div>
              <div className="text-sm mt-2">{a.headline}</div>
              <div className="ns-muted text-xs mt-2">{a.footer}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <NsKpiCard label="Contribution vs plan (FYTD)" value="−$2.4M" accent={RED} />
          <NsKpiCard label="F&A recovery at risk" value={d ? fmtUSD(d.kpis.fa_recovered) : "…"} accent={AMBER} />
          <NsKpiCard label="Days cash on hand" value="42 / 60" accent={RED} />
          <NsKpiCard label="Capital exposure (amplifiers)" value="$18.7M" accent={NS.navy} />
        </div>
      </section>

      {/* Band 2 — ANSWER */}
      <section>
        {bandLabel(2, "Answer — evidence")}
        <div className="ns-card p-5 mb-4" style={{ borderLeft: `4px solid ${NS.cyan}` }}>
          <div className="ns-display text-lg font-semibold">Ask the assistant why contribution is below plan</div>
          <p className="ns-muted text-sm mt-1">
            Genie traces it to the awards, the POL-FA-CAP-2024 policy, owners &amp; renewal dates — and flags the open data-quality issues.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <NsCard title="F&A recovered by college">
            <NsBarChart data={(d?.by_college ?? []).map((r) => ({ label: shortCollege(r.college), value: r.fa_recovered }))} color={NS.navy} />
          </NsCard>
          <NsCard title="Direct cost by sponsor">
            <NsBarChart data={(d?.by_sponsor ?? []).map((r) => ({ label: r.sponsor, value: r.direct_cost }))} color={NS.slate} />
          </NsCard>
          <NsCard title="Awards by status">
            <NsDonut data={(d?.by_status ?? []).map((r) => ({ label: r.status, value: r.n }))} fmt={(v) => `${v}`} />
          </NsCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-2 ns-card p-5">
            <div className="ns-display text-lg font-semibold mb-3">High-risk awards ({HIGH_RISK.length})</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left ns-muted text-xs uppercase">
                    <th className="py-2 pr-3">Award</th><th className="py-2 pr-3">School</th><th className="py-2 pr-3">Owner</th>
                    <th className="py-2 pr-3">Renewal</th><th className="py-2 pr-3 text-right">Eff. F&amp;A</th>
                    <th className="py-2 pr-3 text-right">F&amp;A gap</th><th className="py-2">Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {HIGH_RISK.map((a) => (
                    <tr key={a.id} className="border-t" style={{ borderColor: "var(--ns-line)" }}>
                      <td className="py-2.5 pr-3"><span className="ns-mono text-xs">{a.id}</span><div className="text-xs ns-muted">{a.title}</div></td>
                      <td className="py-2.5 pr-3">{a.school}</td>
                      <td className="py-2.5 pr-3">{a.owner}</td>
                      <td className="py-2.5 pr-3">{a.renewal}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold" style={{ color: a.fa < 55 ? RED : "inherit" }}>{a.fa}%</td>
                      <td className="py-2.5 pr-3 text-right">{fmtUSD(a.gap)}</td>
                      <td className="py-2.5">{statusPill(a.approval)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="ns-card p-5">
            <div className="ns-display text-lg font-semibold">Open data-quality issues ({DQ_ISSUES.length})</div>
            <div className="ns-muted text-xs mb-3">Surfaced, not resolved.</div>
            <div className="space-y-3">
              {DQ_ISSUES.map((i) => (
                <div key={i.type} className="border-t pt-2" style={{ borderColor: "var(--ns-line)" }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} style={{ color: i.severity === "High" ? RED : AMBER }} />
                    <span className="font-medium text-sm" style={{ color: i.severity === "High" ? RED : AMBER }}>{i.type}</span>
                    <span className="ml-auto text-xs">{fmtUSD(i.impact)}</span>
                  </div>
                  <div className="ns-muted text-xs mt-1">{i.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Band 3 — ACT + CONTROL */}
      <section>
        <div className="flex items-center justify-between flex-wrap gap-2">
          {bandLabel(3, "Act + Control — brief queue")}
          <div className="flex items-center gap-1.5 text-xs ns-muted">
            <RefreshCw size={13} /> Northstar Monthly Control Loop · 06:00 America/New_York · next 1st of month
          </div>
        </div>
        <div className="ns-card p-5">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <button className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: NS.navy }}>
              <Sparkles size={15} /> Draft this month's brief
            </button>
            <span className="ns-muted text-sm">
              The assistant drafts → shows it → stops for your approval → records the Approved brief to Lakebase.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left ns-muted text-xs uppercase">
                  <th className="py-2 pr-3">Period</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3 text-right">Contribution var.</th>
                  <th className="py-2 pr-3 text-right">F&amp;A at risk</th><th className="py-2 pr-3 text-right">Open DQ</th>
                  <th className="py-2 pr-3">Approved by</th><th className="py-2">Run date</th>
                </tr>
              </thead>
              <tbody>
                {BRIEFS.map((b) => (
                  <tr key={b.period} className="border-t" style={{ borderColor: "var(--ns-line)" }}>
                    <td className="py-2.5 pr-3 font-medium">{b.period}</td>
                    <td className="py-2.5 pr-3">{statusPill(b.status)}</td>
                    <td className="py-2.5 pr-3 text-right" style={{ color: RED }}>{b.contrib}</td>
                    <td className="py-2.5 pr-3 text-right">{b.fa}</td>
                    <td className="py-2.5 pr-3 text-right">{b.dq}</td>
                    <td className="py-2.5 pr-3">{b.by}</td>
                    <td className="py-2.5">{b.run}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
