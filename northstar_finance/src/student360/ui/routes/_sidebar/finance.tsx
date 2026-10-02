import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, FlaskConical, Wallet, ExternalLink, ArrowRight,
  Database, Table2, BookOpen, BarChart3,
} from "lucide-react";
import { NS } from "@/components/apx/ns-charts";
import { useConfig, orgQ, type AppConfig } from "@/lib/config";

export const Route = createFileRoute("/_sidebar/finance")({
  component: () => <FinancePage />,
});

type Dash = {
  title: string; blurb: string; dashKey: "dash_financial_health" | "dash_research_finance" | "dash_enrollment_finance"; appPath: string;
  icon: typeof Activity;
};
const DASHBOARDS: Dash[] = [
  {
    title: "Financial Health",
    blurb: "Operating revenue vs expense, net contribution, days cash on hand, and liquidity trends for the institution.",
    dashKey: "dash_financial_health",
    appPath: "/financial-health",
    icon: Activity,
  },
  {
    title: "Research Finance",
    blurb: "Sponsored research awards, F&A (indirect) recovery rates, and award risk by college and sponsor.",
    dashKey: "dash_research_finance",
    appPath: "/research-finance",
    icon: FlaskConical,
  },
  {
    title: "Enrollment Finance",
    blurb: "Enrollment funnel economics — applied → admitted → enrolled — and the tuition revenue tied to each term.",
    dashKey: "dash_enrollment_finance",
    appPath: "/enrollment-finance",
    icon: Wallet,
  },
];

type Tbl = {
  name: string; rows: string; grain: string; desc: string; cols: string;
};
const TABLES: Tbl[] = [
  {
    name: "finance_accounts", rows: "800", grain: "one row per student (Fall 2026)",
    desc: "Per-student tuition account: charges, aid, payments, balance due, days past due, and delinquency status.",
    cols: "tuition_charged, aid_awarded, net_tuition, payments_received, balance_due, days_past_due, delinquency_status",
  },
  {
    name: "revenue_at_risk", rows: "750", grain: "one row per at-risk student",
    desc: "Expected tuition revenue exposed to attrition — revenue_at_risk_usd = expected annual tuition × ML risk score, by college and driver.",
    cols: "expected_annual_tuition, risk_score, risk_category, revenue_at_risk_usd, primary_driver, college",
  },
  {
    name: "aid_appeals", rows: "183", grain: "one row per appeal",
    desc: "Financial-aid appeal queue: appeal type, requested amount, reason, and decision status (pending / approved / denied).",
    cols: "appeal_id, appeal_type, requested_amount_usd, reason, status, submitted_at, decided_at, decided_by",
  },
  {
    name: "budget_vs_actual", rows: "60", grain: "college × fiscal period × category",
    desc: "Departmental budget vs actual spend by college, fiscal period (FY2025/FY2026), and category, with $ and % variance.",
    cols: "college, fiscal_period, category, budget_usd, actual_usd, variance_usd, variance_pct",
  },
  {
    name: "fin_institution_monthly", rows: "24", grain: "one row per month",
    desc: "Institution-level monthly financials: operating revenue and expense, net contribution, days cash on hand, and liquidity.",
    cols: "month, operating_revenue, operating_expense, net_contribution, days_cash_on_hand, liquidity_usd",
  },
  {
    name: "fin_revenue_mix", rows: "5", grain: "one row per revenue category",
    desc: "Revenue mix by source — the share of total institutional revenue coming from each category.",
    cols: "category, amount_usd",
  },
  {
    name: "fin_research_awards", rows: "120", grain: "one row per award",
    desc: "Sponsored research awards and F&A (indirect cost) recovery, with sponsor, direct cost, recovery rate, status, and risk.",
    cols: "award_id, college, sponsor, direct_cost_usd, fa_rate, fa_recovered_usd, status, risk_level",
  },
  {
    name: "fin_enrollment_funnel", rows: "6", grain: "term × college",
    desc: "Enrollment funnel counts — applied, admitted, and enrolled — used to model tuition revenue by term and college.",
    cols: "term, college, applied, admitted, enrolled",
  },
  {
    name: "term_trends", rows: "4", grain: "one row per term",
    desc: "Term-over-term enrollment and outcome trends used for revenue and retention forecasting.",
    cols: "year, term, total_enrollments, active_students, pass_rate_pct, fail_rate_pct, withdrawal_rate_pct",
  },
  {
    name: "student_360", rows: "800", grain: "one row per student",
    desc: "Student master record (demographics, program, college, GPA, risk, engagement, financial-aid flag). Joins to every finance table on student_id.",
    cols: "student_id, full_name, college, program_name, gpa, risk_level, financial_aid, domestic_international",
  },
];

function FinancePage() {
  const cfg = useConfig();
  const pub = (c: AppConfig, id: string) => (id ? `${c.host}/dashboardsv3/${id}/published${orgQ(c)}` : "#");
  const explore = (c: AppConfig, t: string) => `${c.host}/explore/data/${c.catalog}/gold/${t}${orgQ(c)}`;
  const catalog = cfg?.catalog || "the gold schema";
  return (
    <div className="ns-theme space-y-8">
      {/* Header */}
      <div>
        <h1 className="ns-display text-4xl font-semibold" style={{ color: NS.navy }}>Finance</h1>
        <p className="ns-muted text-sm mt-1 max-w-3xl">
          The Office of Finance reporting hub — jump into the governed AI/BI dashboards, and browse the
          curated <span className="ns-mono">gold</span> tables in Unity Catalog that power finance
          reporting, Genie, and the dashboards.
        </p>
      </div>

      {/* Dashboards */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-5 w-5" style={{ color: NS.navy }} />
          <h2 className="ns-display text-xl font-semibold" style={{ color: NS.navy }}>AI/BI Dashboards</h2>
        </div>
        <p className="ns-muted text-sm mb-4">
          Published Databricks AI/BI dashboards — open the live dashboard in Databricks, or view the in-app version.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DASHBOARDS.map((d) => {
            const Icon = d.icon;
            return (
              <div key={d.title} className="ns-card p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(9,64,116,0.1)" }}>
                    <Icon className="h-4 w-4" style={{ color: NS.navy }} />
                  </span>
                  <h3 className="ns-display text-base font-semibold">{d.title}</h3>
                </div>
                <p className="ns-muted text-sm flex-1">{d.blurb}</p>
                <div className="flex items-center gap-3 mt-4">
                  <a
                    href={cfg ? pub(cfg, cfg[d.dashKey]) : "#"} target="_blank" rel="noreferrer"
                    className="text-sm font-medium inline-flex items-center gap-1"
                    style={{ color: NS.navy }}
                  >
                    Open dashboard <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <Link
                    to={d.appPath}
                    className="text-sm font-medium inline-flex items-center gap-1 ns-muted"
                  >
                    View in app <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Gold data catalog */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Database className="h-5 w-5" style={{ color: NS.navy }} />
          <h2 className="ns-display text-xl font-semibold" style={{ color: NS.navy }}>Gold data available for reporting</h2>
        </div>
        <p className="ns-muted text-sm mb-4">
          Governed, report-ready tables in{" "}
          <a
            href={cfg ? `${cfg.host}/explore/data/${cfg.catalog}/gold${orgQ(cfg)}` : "#"} target="_blank" rel="noreferrer"
            className="ns-mono underline" style={{ color: NS.navy }}
          >
            {catalog}.gold
          </a>. Every table inherits Unity Catalog permissions, lineage, and audit — the same governance
          behind the dashboards and Genie.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {TABLES.map((t) => (
            <div key={t.name} className="ns-card p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Table2 className="h-4 w-4 shrink-0" style={{ color: NS.navy }} />
                  <a
                    href={cfg ? explore(cfg, t.name) : "#"} target="_blank" rel="noreferrer"
                    className="ns-mono text-sm font-semibold truncate underline"
                    style={{ color: NS.navy }}
                  >
                    {t.name}
                  </a>
                </div>
                <span className="text-[11px] ns-muted whitespace-nowrap">{t.rows} rows</span>
              </div>
              <p className="text-sm mb-2">{t.desc}</p>
              <div className="text-xs ns-muted">
                <span className="font-semibold">Grain:</span> {t.grain}
              </div>
              <div className="text-xs ns-muted mt-1">
                <span className="font-semibold">Key columns:</span>{" "}
                <span className="ns-mono">{t.cols}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="ns-card p-4 mt-4 flex items-start gap-3">
          <BookOpen className="h-4 w-4 mt-0.5 shrink-0" style={{ color: NS.navy }} />
          <p className="ns-muted text-sm">
            Query these from any SQL editor, notebook, or BI tool on the Serverless warehouse, or ask them
            in natural language through <span className="font-semibold" style={{ color: NS.navy }}>Finance Genie</span>.
            All access is governed by Unity Catalog — PII columns are tagged and masked, and finance tables
            carry data-classification tags visible in the Data Catalog.
          </p>
        </div>
      </section>
    </div>
  );
}
