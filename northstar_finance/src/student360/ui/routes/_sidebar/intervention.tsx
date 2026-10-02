import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LayoutDashboard, BarChart3, ExternalLink, ArrowRight,
  Database, Table2, BookOpen, HeartPulse,
} from "lucide-react";
import { NS } from "@/components/apx/ns-charts";
import { useConfig, orgQ, type AppConfig } from "@/lib/config";

export const Route = createFileRoute("/_sidebar/intervention")({
  component: () => <InterventionPage />,
});

type Dash = { title: string; blurb: string; appPath: string; icon: typeof BarChart3 };
const DASHBOARDS: Dash[] = [
  {
    title: "Key Metrics",
    blurb: "Students overview and the executive briefing — enrollment, risk distribution, retention, and the headline student-success KPIs.",
    appPath: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Forecast & Analytics",
    blurb: "Trend forecasting and key-driver analysis — pass rates, enrollment, and attrition trajectories that inform where to intervene.",
    appPath: "/analytics",
    icon: BarChart3,
  },
];

type Tbl = { name: string; rows: string; grain: string; desc: string; cols: string };
const TABLES: Tbl[] = [
  {
    name: "student_360", rows: "800", grain: "one row per student",
    desc: "Student master record — demographics, program, college, GPA, status, engagement (LMS), and support history. The spine every intervention joins to on student_id.",
    cols: "student_id, full_name, college, program_name, gpa, risk_level, pass_rate_pct, courses_failed, total_lms_activities, pending_follow_ups, last_support_date",
  },
  {
    name: "student_risk_predictions", rows: "800", grain: "one row per student",
    desc: "ML risk-model output used to rank who needs attention — risk score, category, and the predicted-at-risk flag.",
    cols: "student_id, risk_score, risk_category, predicted_at_risk",
  },
  {
    name: "course_analytics", rows: "48", grain: "one row per course",
    desc: "Course-level outcomes to target high-fail courses — enrollment, average mark/grade, pass/fail counts, fail rate, and withdrawals.",
    cols: "course_code, course_name, faculty, total_enrolled, avg_mark, pass_count, fail_count, fail_rate_pct, withdrawal_count",
  },
  {
    name: "faculty_performance", rows: "12", grain: "college × program level",
    desc: "College rollups for where to focus programs — student counts, average GPA, at-risk/withdrawn/graduated counts, graduation and attrition rates.",
    cols: "faculty, program_level, total_students, avg_gpa, at_risk_students, graduation_rate_pct, attrition_risk_pct",
  },
  {
    name: "term_trends", rows: "4", grain: "one row per term",
    desc: "Term-over-term enrollment and outcome trends powering Forecast & Analytics — enrollments, active students, pass/fail/withdrawal rates.",
    cols: "year, term, term_code, total_enrollments, active_students, pass_rate_pct, fail_rate_pct, withdrawal_rate_pct",
  },
  {
    name: "intervention_log", rows: "writable", grain: "one row per intervention",
    desc: "Audit log of advising interventions — written by the Advisor Genie agent (with approval). Type, notes, status, and follow-up per student.",
    cols: "student_id, student_name, intervention_type, notes, status, sent_at, next_follow_up, resolved_at",
  },
];

function InterventionPage() {
  const cfg = useConfig();
  const explore = (c: AppConfig, t: string) => `${c.host}/explore/data/${c.catalog}/gold/${t}${orgQ(c)}`;
  const catalog = cfg?.catalog || "the gold schema";
  return (
    <div className="ns-theme space-y-8">
      {/* Header */}
      <div>
        <h1 className="ns-display text-4xl font-semibold" style={{ color: NS.navy }}>Intervention</h1>
        <p className="ns-muted text-sm mt-1 max-w-3xl">
          The student-success intervention hub — the analytics used to decide where to intervene, and the
          governed <span className="ns-mono">gold</span> tables in Unity Catalog behind risk scoring,
          course outcomes, and the intervention log.
        </p>
      </div>

      {/* Dashboards */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-5 w-5" style={{ color: NS.navy }} />
          <h2 className="ns-display text-xl font-semibold" style={{ color: NS.navy }}>Dashboards</h2>
        </div>
        <p className="ns-muted text-sm mb-4">
          The AI/BI analytics surfaces used for intervention decisions — Key Metrics and Forecast &amp; Analytics.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="mt-4">
                  <Link to={d.appPath} className="text-sm font-medium inline-flex items-center gap-1" style={{ color: NS.navy }}>
                    Open in app <ArrowRight className="h-3.5 w-3.5" />
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
          <h2 className="ns-display text-xl font-semibold" style={{ color: NS.navy }}>Gold data for intervention &amp; student success</h2>
        </div>
        <p className="ns-muted text-sm mb-4">
          Governed, report-ready tables in{" "}
          <a
            href={cfg ? `${cfg.host}/explore/data/${cfg.catalog}/gold${orgQ(cfg)}` : "#"} target="_blank" rel="noreferrer"
            className="ns-mono underline" style={{ color: NS.navy }}
          >
            {catalog}.gold
          </a>. Every table inherits Unity Catalog permissions, lineage, and audit — the same governance behind the dashboards and the agents.
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
                <span className="text-[11px] ns-muted whitespace-nowrap">{t.rows === "writable" ? "writable" : `${t.rows} rows`}</span>
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
            Query these from any SQL editor, notebook, or BI tool on the Serverless warehouse, or ask them in
            natural language through <span className="font-semibold" style={{ color: NS.navy }}>Advisor Genie</span>.
            PII columns are tagged and masked, and data-classification tags are visible in the Data Catalog.
          </p>
        </div>
      </section>
    </div>
  );
}
