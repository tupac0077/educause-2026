import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  NsKpiCard,
  NsCard,
  NsLineChart,
  NsDonut,
  NS,
  fmtUSD,
} from "@/components/apx/ns-charts";
import { Building2, FlaskConical, GraduationCap, TrendingDown, AlertTriangle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_sidebar/financial-health")({
  component: () => <FinancialHealthPage />,
});

type Health = {
  kpis: { operating_revenue: number; operating_expense: number; net_margin_pct: number; days_cash_on_hand: number };
  monthly: { month: string; operating_revenue: number; operating_expense: number; net_contribution: number; days_cash_on_hand: number }[];
  revenue_mix: { category: string; amount_usd: number }[];
};

// Illustrative scaffolding (the northstar page is itself labeled illustrative).
const RESERVES = 180_000_000;
const ENDOWMENT = 1_200_000_000;
const RESEARCH_VAR = -2_400_000;
const NET_TUITION_VAR = -3_100_000;
const TUITION_DEP_PCT = 62;

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs uppercase tracking-[0.14em] ns-muted font-semibold mb-3">{children}</div>
);

function FinancialHealthPage() {
  const [d, setD] = useState<Health | null>(null);
  useEffect(() => {
    fetch("/api/finance/health").then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => {});
  }, []);

  const k = d?.kpis;
  const line = (d?.monthly ?? []).map((m) => ({ label: m.month.slice(0, 7), value: m.net_contribution }));
  const mix = (d?.revenue_mix ?? []).map((m) => ({ label: m.category, value: m.amount_usd }));

  return (
    <div className="ns-theme space-y-8">
      {/* Header */}
      <div>
        <h1 className="ns-display text-3xl font-semibold flex items-center gap-2" style={{ color: NS.navy }}>
          <Building2 className="h-7 w-7" /> Northstar University — Financial Health
        </h1>
        <p className="ns-muted text-sm mt-1">
          Maya Chen, CFO &amp; Treasurer · institution-wide view. Illustrative data — fictional scenario scaffolding.
        </p>
      </div>

      {/* Band 1 — Enterprise health */}
      <section>
        <SectionLabel>Enterprise health — the balance sheet is sound</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <NsKpiCard label="Operating Margin" value={k ? `${k.net_margin_pct}%` : "—"} sub="thin" accent={NS.orange} />
          <NsKpiCard label="Days Cash on Hand" value={k ? `${k.days_cash_on_hand} days` : "—"} sub="board floor 60" accent={NS.navy} />
          <NsKpiCard label="Unrestricted Reserves" value={fmtUSD(RESERVES)} accent={NS.navy} />
          <NsKpiCard label="Endowment" value={fmtUSD(ENDOWMENT)} sub="payout 4.5%" accent={NS.slate} />
          <NsKpiCard label="Bond Rating" value="AA−" sub="S&P · stable" accent={NS.slate} />
          <NsKpiCard label="Debt Service Coverage" value="2.4×" sub="DSCR" accent={NS.navy} />
        </div>
        <p className="ns-muted text-xs mt-3">
          Composite Financial Index 3.1 · Deferred-maintenance backlog {fmtUSD(84_000_000)} · Operating revenue{" "}
          {k ? fmtUSD(k.operating_revenue) : "—"} · Tuition dependency {TUITION_DEP_PCT}%
        </p>
      </section>

      {/* Band 2 — Revenue engines & exposures */}
      <section>
        <SectionLabel>Revenue engines &amp; exposures this cycle</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Link to="/research-finance" className="ns-card p-5 block hover:opacity-90 transition" style={{ background: "rgba(214,69,69,0.05)" }}>
            <div className="ns-muted text-xs uppercase tracking-wide">Research Contribution vs Plan</div>
            <div className="ns-display text-3xl font-semibold text-red-600 mt-1 flex items-center gap-2">
              <TrendingDown className="h-6 w-6" /> {fmtUSD(RESEARCH_VAR)}
            </div>
            <div className="ns-muted text-sm mt-1">reduced F&amp;A recovery on the ~60-award federal cohort</div>
            <div className="text-sm font-medium mt-3 flex items-center gap-1" style={{ color: NS.navy }}>
              Investigate in Research Finance <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
          <Link to="/enrollment-finance" className="ns-card p-5 block hover:opacity-90 transition" style={{ background: "rgba(214,69,69,0.05)" }}>
            <div className="ns-muted text-xs uppercase tracking-wide">Net Tuition vs Budget</div>
            <div className="ns-display text-3xl font-semibold text-red-600 mt-1 flex items-center gap-2">
              <TrendingDown className="h-6 w-6" /> {fmtUSD(NET_TUITION_VAR)}
            </div>
            <div className="ns-muted text-sm mt-1">mix &amp; aid, not headcount (enrolled −1.4%)</div>
            <div className="text-sm font-medium mt-3 flex items-center gap-1" style={{ color: NS.navy }}>
              Investigate in Enrollment Finance <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NsCard title="Net contribution trend" subtitle="Monthly operating net contribution">
            <NsLineChart data={line} color={NS.navy} fmt={(v) => fmtUSD(v)} />
          </NsCard>
          <NsCard title="Revenue mix" subtitle="Operating revenue by source">
            <NsDonut data={mix} fmt={(v) => fmtUSD(v)} />
          </NsCard>
        </div>
        <div className="ns-card p-4 mt-4 flex items-start gap-3" style={{ background: "rgba(255,221,74,0.16)", borderColor: "rgba(254,144,0,0.4)" }}>
          <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: NS.orange }} />
          <p className="text-sm">Two revenue exposures are pressuring unrestricted liquidity this cycle.</p>
        </div>
      </section>

      {/* Band 3 — Decision paths + control loop */}
      <section>
        <SectionLabel>Choose a CFO decision path</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Link to="/research-finance" className="ns-card p-5 block hover:opacity-90 transition">
            <div className="ns-display text-lg font-semibold flex items-center gap-2" style={{ color: NS.navy }}>
              <FlaskConical className="h-5 w-5" /> Research Finance
            </div>
            <p className="ns-muted text-sm mt-1">Protect research capacity and unrestricted liquidity.</p>
            <ul className="text-sm mt-2 space-y-1 list-disc pl-5 ns-muted">
              <li>Research-portfolio contribution vs plan</li>
              <li>F&amp;A recovery at risk · cost-sharing exposure</li>
              <li>Awards approaching renewal</li>
            </ul>
          </Link>
          <Link to="/enrollment-finance" className="ns-card p-5 block hover:opacity-90 transition">
            <div className="ns-display text-lg font-semibold flex items-center gap-2" style={{ color: NS.navy }}>
              <GraduationCap className="h-5 w-5" /> Enrollment Finance
            </div>
            <p className="ns-muted text-sm mt-1">Protect net tuition before census date.</p>
            <ul className="text-sm mt-2 space-y-1 list-disc pl-5 ns-muted">
              <li>Net-tuition forecast vs budget · enrolled vs plan</li>
              <li>Discount rate · projected cash impact</li>
              <li>Deposited → registered → paid funnel</li>
            </ul>
          </Link>
        </div>

        <SectionLabel>The research control loop</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { n: 1, t: "ALERT", d: "Three thresholds breached — contribution, F&A recovery, liquidity." },
            { n: 2, t: "ANALYZE", d: "Break the variance down by school, sponsor, cohort, and amplifier." },
            { n: 3, t: "ANSWER", d: "“Why is contribution below plan?” Genie traces it to the awards + policy." },
            { n: 4, t: "ACT", d: "Draft the cabinet brief → approve → record to Lakebase.", hi: true },
            { n: 5, t: "CONTROL", d: "The monthly Lakeflow Job re-runs it; prior briefs preserved." },
          ].map((p) => (
            <div key={p.n} className="ns-card p-4" style={p.hi ? { borderColor: NS.orange, borderWidth: 2 } : undefined}>
              <div className="flex items-center gap-2 mb-1">
                <span className="ns-display text-lg font-semibold" style={{ color: p.hi ? NS.orange : NS.slate }}>{p.n}</span>
                <span className="text-xs font-semibold tracking-wide" style={{ color: p.hi ? NS.orange : NS.navy }}>{p.t}</span>
              </div>
              <p className="ns-muted text-xs leading-snug">{p.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
