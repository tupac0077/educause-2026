import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { GraduationCap, ArrowLeft, FlaskConical, Info, FileText, X } from "lucide-react";
import { NsKpiCard, NsCard, NS, fmtUSD } from "@/components/apx/ns-charts";

export const Route = createFileRoute("/_sidebar/enrollment-finance")({
  component: () => <EnrollmentFinancePage />,
});

type EnrollSummary = {
  enrolled_actual: number; enrolled_plan: number; enrolled_variance_pct: number;
  net_tuition_actual: number; net_tuition_plan: number; net_tuition_variance_usd: number;
  projected_cash_impact_usd: number; discount_rate_budget: number; census_date: string;
};
type Econ = {
  kpis: { net_tuition: number; gross_tuition: number; total_aid: number; discount_rate_pct: number };
  by_college: { college: string; net_tuition: number; gross_tuition: number; aid: number; discount_pct: number }[];
  funnel: { college: string; applied: number; admitted: number; enrolled: number }[];
  summary: EnrollSummary | null;
};

const CENSUS = "Sep 15, 2026";
const num = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n || 0));
const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

const TABS = ["Command Center", "Funnel & Cohort", "Aid Economics", "Scenario Simulator"] as const;
type Tab = (typeof TABS)[number];

function Badge({ tone, children }: { tone: "info" | "warn"; children: React.ReactNode }) {
  const bg = tone === "info" ? "rgba(90,219,255,0.18)" : "rgba(255,221,74,0.25)";
  const fg = tone === "info" ? "#0a6c8a" : "#8a6d00";
  return <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: bg, color: fg }}>{children}</span>;
}

function EnrollmentFinancePage() {
  const [data, setData] = useState<Econ | null>(null);
  const [tab, setTab] = useState<Tab>("Command Center");
  const [drawer, setDrawer] = useState<"lineage" | "action" | null>(null);

  useEffect(() => {
    fetch("/api/finance/enrollment-econ").then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => {});
  }, []);

  const agg = useMemo(() => {
    const f = data?.funnel ?? [];
    // SQL API returns numeric columns as strings — coerce, or `+` concatenates.
    const applied = f.reduce((s, x) => s + (Number(x.applied) || 0), 0);
    const admitted = f.reduce((s, x) => s + (Number(x.admitted) || 0), 0);
    const enrolled = f.reduce((s, x) => s + (Number(x.enrolled) || 0), 0);
    return { applied, admitted, enrolled };
  }, [data]);

  return (
    <div className="ns-theme">
      {/* nav + disclaimer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Link to="/financial-health"><button className="ns-card px-3 py-1.5 text-sm flex items-center gap-1"><ArrowLeft size={14} /> Financial Health</button></Link>
          <Link to="/research-finance"><button className="ns-card px-3 py-1.5 text-sm flex items-center gap-1"><FlaskConical size={14} /> Research Finance</button></Link>
        </div>
        <span className="ns-muted text-xs italic">Illustrative scenario data — not customer benchmarks.</span>
      </div>

      {/* header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: NS.navy }}>
          <GraduationCap size={22} /> Enrollment Finance — Command Center
        </h1>
        <p className="ns-muted text-sm mt-1">
          Will we hit the enrolled-student and net-tuition plan before census date ({CENSUS})? Maya Chen, CFO &amp; Treasurer.
        </p>
      </div>

      {/* tabs */}
      <div className="flex gap-6 border-b mb-5" style={{ borderColor: "var(--ns-line)" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="pb-2 text-sm font-medium -mb-px"
            style={{ borderBottom: tab === t ? `2px solid ${NS.navy}` : "2px solid transparent", color: tab === t ? NS.navy : "var(--ns-muted-ink)" }}>
            {t}
          </button>
        ))}
      </div>

      {/* quick actions */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Link to="/finance-copilot"><button className="px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: NS.navy }}>Ask: "Why are we behind net-tuition plan when deposits are ahead of last year?"</button></Link>
        <button onClick={() => setDrawer("lineage")} className="ns-card px-3 py-1.5 text-sm flex items-center gap-1 hover:opacity-90 transition"><Info size={14} /> Sources &amp; lineage</button>
        <button onClick={() => setDrawer("action")} className="ns-card px-3 py-1.5 text-sm flex items-center gap-1 hover:opacity-90 transition"><FileText size={14} /> Draft actions (human review)</button>
      </div>

      {drawer === "lineage" && <LineageDrawer onClose={() => setDrawer(null)} />}
      {drawer === "action" && <ActionDrawer onClose={() => setDrawer(null)} />}

      {!data ? (
        <div className="ns-muted text-sm">Loading…</div>
      ) : tab === "Command Center" ? (
        <CommandCenter data={data} agg={agg} />
      ) : tab === "Funnel & Cohort" ? (
        <FunnelCohort agg={agg} />
      ) : tab === "Aid Economics" ? (
        <AidEconomics data={data} agg={agg} />
      ) : (
        <Scenario data={data} agg={agg} />
      )}
    </div>
  );
}

function CommandCenter({ data, agg }: { data: Econ; agg: { enrolled: number } }) {
  const s = data.summary;
  const enrolledActual = s?.enrolled_actual ?? agg.enrolled;
  const enrolledPlan = s?.enrolled_plan ?? Math.round(agg.enrolled / 0.986);
  const enrVarPct = s?.enrolled_variance_pct ?? -1.4;
  const netVar = s?.net_tuition_variance_usd ?? -3_200_000; // net tuition vs budget
  const cashImpact = s?.projected_cash_impact_usd ?? -1_800_000;
  const discountBudget = s?.discount_rate_budget ?? 41;
  const netPlan = s?.net_tuition_plan ?? data.kpis.net_tuition * 1.02;
  const rows = [
    { m: "Net tuition", plan: netPlan, actual: data.kpis.net_tuition, fcst: data.kpis.net_tuition, ev: "Reported fact" },
    { m: "Gross tuition", plan: data.kpis.gross_tuition, actual: data.kpis.gross_tuition, fcst: data.kpis.gross_tuition, ev: "Reported fact" },
    { m: "Institutional aid", plan: data.kpis.total_aid * 0.95, actual: data.kpis.total_aid, fcst: data.kpis.total_aid, ev: "Reported fact" },
    { m: "Enrolled students", plan: enrolledPlan, actual: enrolledActual, fcst: enrolledActual, ev: "Reported fact", count: true },
    { m: "Discount rate", plan: discountBudget, actual: data.kpis.discount_rate_pct, fcst: data.kpis.discount_rate_pct + 0.6, ev: "Calculated est.", pctRow: true },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-xl p-5" style={{ border: "1px solid rgba(214,69,69,0.3)", background: "rgba(214,69,69,0.06)" }}>
        <div className="ns-display font-semibold" style={{ color: "#b23434" }}>Net-tuition plan at risk before census date ({CENSUS})</div>
        <p className="text-sm mt-1">
          Fall net tuition is forecast <b>{fmtUSD(netVar)}</b> vs budget even though enrolled students are only <b>{enrVarPct.toFixed(1)}%</b> below plan — a mix &amp; aid problem, not a headcount one. Confidence range {fmtUSD(netVar * 1.3)}–{fmtUSD(netVar * 0.7)}; projected cash effect {fmtUSD(cashImpact)}.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <NsKpiCard label="Net Tuition vs Budget" value={fmtUSD(netVar)} accent="#b23434" sub="mix & aid, not headcount" />
        <NsKpiCard label="Enrolled vs Plan" value={`${num(enrolledActual)} (${enrVarPct.toFixed(1)}%)`} accent={NS.orange} sub={`plan ${num(enrolledPlan)}`} />
        <NsKpiCard label="Discount Rate (fcst)" value={pct(data.kpis.discount_rate_pct)} accent={NS.orange} sub={`budget ${discountBudget.toFixed(1)}%`} />
        <NsKpiCard label="Projected Cash Impact" value={fmtUSD(cashImpact)} accent={NS.orange} sub="timing — separate from net tuition" />
      </div>

      <NsCard title="Target vs forecast" subtitle="plan · actual · forecast · variance · confidence">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left ns-muted text-xs uppercase" style={{ borderBottom: "1px solid var(--ns-line)" }}>
              <th className="py-2 pr-3">Metric</th><th className="py-2 pr-3">Plan</th><th className="py-2 pr-3">Actual</th><th className="py-2 pr-3">Forecast</th><th className="py-2 pr-3">Variance</th><th className="py-2 pr-3">Confidence</th><th className="py-2">Evidence</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => {
                const v = r.actual - r.plan;
                const f = r.count ? num : r.pctRow ? pct : (x: number) => fmtUSD(x);
                return (
                  <tr key={r.m} style={{ borderBottom: "1px solid var(--ns-line)" }}>
                    <td className="py-2 pr-3 font-medium">{r.m}</td>
                    <td className="py-2 pr-3">{f(r.plan)}</td>
                    <td className="py-2 pr-3">{f(r.actual)}</td>
                    <td className="py-2 pr-3">{f(r.fcst)}</td>
                    <td className="py-2 pr-3" style={{ color: v < 0 ? "#b23434" : "#2F9E6F" }}>{r.count ? num(v) : r.pctRow ? pct(v) : fmtUSD(v)}</td>
                    <td className="py-2 pr-3 ns-muted">±{r.pctRow ? "0.4pp" : "3%"}</td>
                    <td className="py-2"><Badge tone={r.ev === "Reported fact" ? "info" : "warn"}>{r.ev}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </NsCard>
    </div>
  );
}

function FunnelCohort({ agg }: { agg: { admitted: number; enrolled: number } }) {
  const admitted = agg.admitted || 1;
  const stages = [
    { name: "Admitted", count: admitted, py: Math.round(admitted * 0.97) },
    { name: "Deposited", count: Math.round(agg.enrolled * 1.12), py: Math.round(agg.enrolled * 1.05) },
    { name: "Registered", count: agg.enrolled, py: Math.round(agg.enrolled * 1.014) },
    { name: "Billed", count: Math.round(agg.enrolled * 0.98), py: Math.round(agg.enrolled * 0.985) },
    { name: "Paid", count: Math.round(agg.enrolled * 0.9), py: Math.round(agg.enrolled * 0.9) },
  ];
  const top = stages[0].count;
  const cohorts = [
    { seg: "First-generation", enr: -42, net: -1_100_000, disc: "48%", melt: "High", ret: "84%" },
    { seg: "International", enr: -18, net: -820_000, disc: "22%", melt: "Med", ret: "91%" },
    { seg: "Transfer", enr: 15, net: 260_000, disc: "39%", melt: "Low", ret: "88%" },
    { seg: "STEM majors", enr: 8, net: 180_000, disc: "37%", melt: "Low", ret: "93%" },
    { seg: "Out-of-state", enr: -11, net: -540_000, disc: "31%", melt: "Med", ret: "89%" },
  ];
  return (
    <div className="space-y-5">
      <NsCard title="Funnel — admitted → deposited → registered → billed → paid (vs prior year)"
        subtitle="Deposits are ahead of last year, but leakage after deposit (not-registered + billed-not-paid) is where net tuition is lost.">
        <div className="space-y-3">
          {stages.map((s) => {
            const delta = s.count - s.py;
            return (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-sm w-24 font-medium">{s.name}</span>
                <div className="flex-1 h-7 rounded-md overflow-hidden" style={{ background: "var(--ns-muted, #ECF0F6)" }}>
                  <div className="h-full rounded-md flex items-center px-2 text-white text-xs" style={{ width: `${(s.count / top) * 100}%`, background: NS.navy }}>
                    {num(s.count)}
                  </div>
                </div>
                <span className="text-xs w-24 text-right" style={{ color: delta >= 0 ? "#2F9E6F" : "#b23434" }}>
                  {delta >= 0 ? "▲" : "▼"} {num(Math.abs(delta))} vs PY
                </span>
              </div>
            );
          })}
        </div>
      </NsCard>

      <NsCard title="Cohort drivers">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left ns-muted text-xs uppercase" style={{ borderBottom: "1px solid var(--ns-line)" }}>
              <th className="py-2 pr-3">Segment</th><th className="py-2 pr-3">Enrolled Δ</th><th className="py-2 pr-3">Net Tuition Δ</th><th className="py-2 pr-3">Discount</th><th className="py-2 pr-3">Melt risk</th><th className="py-2">Retention</th>
            </tr></thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.seg} style={{ borderBottom: "1px solid var(--ns-line)" }}>
                  <td className="py-2 pr-3 font-medium">{c.seg}</td>
                  <td className="py-2 pr-3" style={{ color: c.enr < 0 ? "#b23434" : "#2F9E6F" }}>{c.enr > 0 ? "+" : ""}{c.enr}</td>
                  <td className="py-2 pr-3" style={{ color: c.net < 0 ? "#b23434" : "#2F9E6F" }}>{fmtUSD(c.net)}</td>
                  <td className="py-2 pr-3">{c.disc}</td>
                  <td className="py-2 pr-3">{c.melt}</td>
                  <td className="py-2">{c.ret}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NsCard>
    </div>
  );
}

function AidEconomics({ data, agg }: { data: Econ; agg: { enrolled: number } }) {
  const total = agg.enrolled || 1;
  const bands = [
    { band: "$0 (full pay)", share: 0.18, disc: 0, net: 25000, marg: 0, elas: "—" },
    { band: "$1–5k", share: 0.22, disc: 12, net: 21500, marg: 4200, elas: "0.3" },
    { band: "$5–15k", share: 0.31, disc: 34, net: 16800, marg: 5100, elas: "0.6" },
    { band: "$15–25k", share: 0.2, disc: 62, net: 10200, marg: 3800, elas: "1.1" },
    { band: "$25k+", share: 0.09, disc: 82, net: 5400, marg: 1900, elas: "1.7" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <NsKpiCard label="Net Tuition" value={fmtUSD(data.kpis.net_tuition)} accent={NS.navy} />
        <NsKpiCard label="Gross Tuition" value={fmtUSD(data.kpis.gross_tuition)} accent={NS.slate} />
        <NsKpiCard label="Institutional Aid" value={fmtUSD(data.kpis.total_aid)} accent={NS.orange} />
        <NsKpiCard label="Discount Rate" value={pct(data.kpis.discount_rate_pct)} accent={NS.orange} />
      </div>
      <NsCard title="Aid-band economics" subtitle="net tuition/student · discount · marginal award value · elasticity">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left ns-muted text-xs uppercase" style={{ borderBottom: "1px solid var(--ns-line)" }}>
              <th className="py-2 pr-3">Aid band</th><th className="py-2 pr-3">Students</th><th className="py-2 pr-3">Discount</th><th className="py-2 pr-3">Net / student</th><th className="py-2 pr-3">Marginal award value</th><th className="py-2">Elasticity</th>
            </tr></thead>
            <tbody>
              {bands.map((b) => (
                <tr key={b.band} style={{ borderBottom: "1px solid var(--ns-line)" }}>
                  <td className="py-2 pr-3 font-medium">{b.band}</td>
                  <td className="py-2 pr-3">{num(total * b.share)} <span className="ns-muted">({pct(b.share * 100)})</span></td>
                  <td className="py-2 pr-3">{b.disc}%</td>
                  <td className="py-2 pr-3">{fmtUSD(b.net, false)}</td>
                  <td className="py-2 pr-3">{b.marg ? fmtUSD(b.marg, false) : "—"}</td>
                  <td className="py-2">{b.elas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NsCard>
    </div>
  );
}

// ── Drawers ──────────────────────────────────────────────────────────────────
function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  // Portal to <body> so the fixed overlay is anchored to the viewport, not to the
  // page's scroll container / sidebar layout (which would otherwise cover the report).
  return createPortal(
    <div className="ns-theme fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative h-full overflow-y-auto shadow-2xl" style={{ width: "min(460px, 100%)", background: "var(--ns-surface)", borderLeft: "1px solid var(--ns-line)" }}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3" style={{ background: "var(--ns-surface)", borderBottom: "1px solid var(--ns-line)" }}>
          <span className="ns-display font-semibold" style={{ color: NS.navy }}>{title}</span>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70"><X size={16} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function LineageDrawer({ onClose }: { onClose: () => void }) {
  const sources: [string, string][] = [
    ["CRM / Admissions", "applications, admits, deposits, recruitment source, yield"],
    ["SIS / Student system", "registration, enrollment, retention, completion"],
    ["Financial-aid system", "awards, aid bands, discounting"],
    ["Bursar / Student accounts", "balances, billing, payment plans, collections"],
    ["Housing & auxiliary", "housing intent, occupancy, related revenue"],
    ["ERP / Budget / Forecast", "plan, actuals, net tuition, cash impact"],
  ];
  const dq: { issue: string; sev: "High" | "Med"; desc: string }[] = [
    { issue: "Deposit-date gaps", sev: "Med", desc: "~3% of deposited students missing a deposit timestamp; melt timing estimated." },
    { issue: "Aid award reconciliation", sev: "High", desc: "Institutional aid not yet reconciled to disbursement for 2 aid bands (~$0.9M)." },
    { issue: "Program mapping", sev: "Med", desc: "Recently added programs not yet mapped to a college for funnel roll-up." },
  ];
  return (
    <Drawer title="Sources & lineage" onClose={onClose}>
      <p className="ns-muted text-sm">
        Governed net-tuition contract: <span style={{ color: "var(--ns-ink)" }}>net tuition = gross tuition − institutional aid</span>. Collections &amp; cash impact are separate measures. Metric definitions are enforced by governed SQL functions (metric_net_tuition, metric_discount_rate, metric_yield, metric_melt).
      </p>
      <div className="mt-4 text-xs font-semibold uppercase tracking-wide ns-muted">Source systems (illustrative synthetic stand-ins)</div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {sources.map(([sys, desc]) => (
          <li key={sys}><span className="font-medium" style={{ color: "var(--ns-ink)" }}>{sys}</span> — <span className="ns-muted">{desc}</span></li>
        ))}
      </ul>
      <div className="mt-5 text-xs font-semibold uppercase tracking-wide ns-muted">Open data-quality issues (surfaced, not resolved)</div>
      <ul className="mt-2 space-y-2">
        {dq.map((d) => (
          <li key={d.issue} className="rounded-lg p-3" style={{ border: "1px solid var(--ns-line)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--ns-ink)" }}>{d.issue}</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: d.sev === "High" ? "rgba(214,69,69,0.12)" : "rgba(255,221,74,0.25)", color: d.sev === "High" ? "#b23434" : "#8a6d00" }}>{d.sev}</span>
            </div>
            <div className="text-xs ns-muted mt-1">{d.desc}</div>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}

function ActionDrawer({ onClose }: { onClose: () => void }) {
  const actions = [
    { title: "Targeted outreach — deposited, unpaid / unregistered", cohort: "Deposited-not-registered + billed-not-paid", impact: "Net tuition at risk before census", owner: "Enrollment Ops + Bursar", approval: "VP Enrollment" },
    { title: "Financial-aid packaging / remaining-award review", cohort: "Full & High aid bands", impact: "Discount running over budget", owner: "Financial Aid", approval: "CFO + Provost" },
    { title: "Program owner follow-up — first-generation cohort", cohort: "First-generation", impact: "-$1.1M net tuition vs plan", owner: "College deans/chairs", approval: "Provost" },
    { title: "Temporary discretionary-spend review", cohort: "Institution-wide", impact: "If the net-tuition gap persists past census", owner: "Budget Office", approval: "CFO" },
  ];
  return (
    <Drawer title="Draft actions — human review required" onClose={onClose}>
      <p className="ns-muted text-sm">
        These are DRAFTS. No aid change, outreach, pricing change, budget change, or communication is executed automatically — each requires the named approval.
      </p>
      <ul className="mt-4 space-y-3">
        {actions.map((a, i) => (
          <li key={i} className="rounded-lg p-3" style={{ border: "1px solid var(--ns-line)" }}>
            <div className="font-medium text-sm" style={{ color: "var(--ns-ink)" }}>{a.title}</div>
            <dl className="mt-2 grid grid-cols-1 gap-1 text-xs ns-muted">
              <div><span style={{ color: "var(--ns-ink)" }}>Cohort/program:</span> {a.cohort}</div>
              <div><span style={{ color: "var(--ns-ink)" }}>Est. impact:</span> {a.impact}</div>
              <div><span style={{ color: "var(--ns-ink)" }}>Owner:</span> {a.owner}</div>
              <div><span style={{ color: "var(--ns-ink)" }}>Required approval:</span> {a.approval}</div>
            </dl>
            <button className="mt-2 text-xs rounded-full px-3 py-1 ns-muted cursor-default" style={{ border: "1px solid var(--ns-line)" }} disabled>Requires human review</button>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}

function Scenario({ data, agg }: { data: Econ; agg: { enrolled: number } }) {
  const [vol, setVol] = useState(0);       // -5..5 %
  const [disc, setDisc] = useState(0);     // -5..5 pct-pts
  const [melt, setMelt] = useState(50);    // 0..100 %

  const baseGross = data.kpis.gross_tuition;
  const baseDiscount = data.kpis.discount_rate_pct;
  const netBudget = data.kpis.net_tuition * 1.02;

  const enrolledM = Math.round(agg.enrolled * (1 + vol / 100) * (1 + (melt - 50) / 100 * 0.03));
  const grossM = baseGross * (1 + vol / 100) * (1 + (melt - 50) / 100 * 0.03);
  const aidM = grossM * ((baseDiscount + disc) / 100);
  const netM = grossM - aidM;
  const netVsBudget = netM - netBudget;
  const cashM = netVsBudget * 0.3;
  const marginM = 1.5 + (netVsBudget / (baseGross * 4)) * 100;

  const Row = ({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) => (
    <div className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--ns-line)" }}>
      <span className="ns-muted text-sm">{label}</span>
      <span className="font-semibold" style={{ color: tone === "bad" ? "#b23434" : tone === "good" ? "#2F9E6F" : "var(--ns-ink)" }}>{value}</span>
    </div>
  );
  const Slider = ({ label, min, max, step, val, set, fmt }: { label: string; min: number; max: number; step: number; val: number; set: (n: number) => void; fmt: (n: number) => string }) => (
    <div>
      <div className="flex justify-between text-sm mb-1"><span>{label}</span><span className="font-medium">{fmt(val)}</span></div>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => set(Number(e.target.value))} className="w-full" style={{ accentColor: NS.navy }} />
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="ns-muted text-xs italic">Modeled estimates — not actuals or an approved forecast. Adjust assumptions to see directional impact.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NsCard title="Assumptions">
          <div className="space-y-5 pt-1">
            <Slider label="Enrollment volume" min={-5} max={5} step={0.5} val={vol} set={setVol} fmt={(n) => `${n > 0 ? "+" : ""}${n}%`} />
            <Slider label="Institutional discount rate" min={-5} max={5} step={0.5} val={disc} set={setDisc} fmt={(n) => `${n > 0 ? "+" : ""}${n} pp`} />
            <Slider label="Melt recovered (deposited→registered)" min={0} max={100} step={5} val={melt} set={setMelt} fmt={(n) => `${n}%`} />
          </div>
        </NsCard>
        <NsCard title="Modeled outcome">
          <div>
            <Row label="Enrolled students" value={num(enrolledM)} />
            <Row label="Gross tuition" value={fmtUSD(grossM)} />
            <Row label="Institutional aid" value={fmtUSD(aidM)} />
            <Row label="Net tuition" value={fmtUSD(netM)} />
            <Row label="Net tuition vs budget" value={fmtUSD(netVsBudget)} tone={netVsBudget < 0 ? "bad" : "good"} />
            <Row label="Monthly cash effect" value={fmtUSD(cashM)} tone={cashM < 0 ? "bad" : "good"} />
            <Row label="Year-end operating margin" value={pct(marginM)} tone={marginM < 1 ? "bad" : "good"} />
          </div>
        </NsCard>
      </div>
    </div>
  );
}
