# Student 360: Higher Education Student Success Platform

A full-stack Databricks App for academic advisors, student support staff, and university leadership. Built with [APX](https://github.com/databricks-solutions/apx) (FastAPI + React).

Default edition is **US demo** (`us_demo`): Pacific State University labels, 4.0 GPA, USD, colleges, credit hours, FERPA-style governance copy. Pass `--edition mortarcaps_apac` from the repo-root `deploy.sh` to restore MortarCAPS / Australian 7.0 copy.

## Pages

### Overview
| Page | Persona | Description |
|------|---------|-------------|
| **Key Metrics** | All | KPI cards, interactive donut chart, top at-risk students, retention by college/faculty, executive overview |
| **Forecast & Analytics** | Leadership | AI trend forecasting, Genie NL queries, key driver analysis, AI insights |

### Data
| Page | Persona | Description |
|------|---------|-------------|
| **Students** | Advisors | Searchable student list. Click any row to open full 360 detail (demographics, degree progress, grade distribution, cohort comparison, enrollments, support history) |
| **Courses** | Dept Heads | Course analytics sorted by fail rate with faculty filters |
| **Faculty** | Leadership | Faculty performance: graduation rates, attrition, international/first-gen breakdowns |
| **Trends** | Leadership | Semester-over-semester pass/fail/withdrawal rates |

### Intervention
| Page | Persona | Description |
|------|---------|-------------|
| **Intervention Actions** | Advisors | Linked AI workflow: select student, generate intervention plan (ai_query + Llama 3.3 70B), compose personalized outreach email (empathetic/formal/nudge), send via Gmail/email client |
| **Intervention Tracker** | Advisors, Support Staff | Trello-style kanban board: Outreach Sent > Responded > Meeting Scheduled > Follow-up > Resolved. Persistent Delta table |
| **Intervention Outcomes** | Leadership, Compliance | 6-month post-intervention results: AI summary, KPI cards, trend charts, faculty breakdowns, equity impact, sparklines |
| **Intervention Simulator** | Analysts | What-if scenario modeling for resource allocation |

## Tech Stack

- **Backend**: Python + FastAPI + Databricks SDK (Statement Execution API + Genie API)
- **Frontend**: React + TanStack Router + shadcn/ui + Tailwind CSS
- **Data**: Gold layer (`student_360`, `student_risk_predictions`, `course_analytics`, `faculty_performance`, `term_trends`). Catalog comes from `STUDENT360_CATALOG` (US default `student360_us_demo`; APAC `higher_ed_demo`).
- **Edition**: Backend reads `STUDENT360_EDITION` (`us_demo` or `mortarcaps_apac`). Frontend labels are baked at Vite build via `VITE_STUDENT360_EDITION` (set by `deploy.sh`). `deploy.sh` also patches `.build/app.yml`. Do not mix a US catalog with an APAC frontend bundle.
- **AI**: ai_query() with Llama 3.3 70B (intervention plans, outreach emails, insights), AI_FORECAST (trend forecasting), ML risk model (scikit-learn via MLflow), Genie Space for NL queries

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/stats` | Dashboard KPIs |
| GET | `/api/dashboard/risk-distribution` | Risk category counts |
| GET | `/api/students` | Student list with search/filter |
| GET | `/api/students/{id}` | Student 360 detail |
| GET | `/api/students/{id}/enrollments` | Student enrollment records |
| GET | `/api/students/{id}/support` | Student support history |
| GET | `/api/students/{id}/cohort` | Cohort comparison metrics |
| GET | `/api/outreach` | Early alert outreach queue |
| GET | `/api/retention` | Retention rates by faculty |
| GET | `/api/courses` | Course analytics |
| GET | `/api/faculty` | Faculty performance |
| GET | `/api/faculty/names` | Faculty name list |
| GET | `/api/trends` | Term-over-term trends |
| POST | `/api/intervention/plan` | AI-generated intervention plan for a student |
| POST | `/api/outreach/compose` | AI-composed outreach email with tone selection |
| POST | `/api/outreach/log` | Log outreach to Delta table (persistent) |
| GET | `/api/outreach/log` | Get all outreach log entries from Delta table |
| POST | `/api/outreach/case-update` | Update case status, add notes, set follow-up |
| GET | `/api/effectiveness/comparison` | Intervened vs baseline metrics |
| GET | `/api/effectiveness/by-equity` | Effectiveness by equity group |
| GET | `/api/effectiveness/by-type` | Effectiveness by intervention type |
| GET | `/api/effectiveness/ai-summary` | AI-generated effectiveness summary |
| GET | `/api/outcomes/students` | Individual student outcome data (simulated) |
| GET | `/api/outcomes/summary` | Outcome KPIs (de-risked, improved, etc.) |
| GET | `/api/outcomes/trend` | 6-month trend data for intervened students |
| GET | `/api/outcomes/by-faculty` | Outcomes broken down by faculty |
| GET | `/api/outcomes/by-equity` | Equity impact of interventions |
| GET | `/api/outcomes/ai-summary` | AI executive summary of outcomes |
| POST | `/api/chat` | Genie copilot chat |

## Development

```bash
# Install frontend dependencies
bun install

# With APX (recommended)
apx dev start

# Without APX (standalone vite build). Bake US labels:
VITE_STUDENT360_EDITION=us_demo npx vite build
```

## Deployment

```bash
# Preferred: run from repo root (US demo by default)
./deploy.sh --profile <your_databricks_profile> --config ./deploy.config.json

# Original APAC / MortarCAPS demo
./deploy.sh --profile <your_databricks_profile> --edition mortarcaps_apac --config ./deploy.config.json

# App-only redeploy from repo root
./deploy.sh --profile <your_databricks_profile> --skip-bootstrap --skip-notebooks --skip-assets
```

For standalone app deploy internals, see `deploy.sh` (build + bundle + `databricks apps deploy` steps).

## App Permissions Required

The app's service principal needs:
- `USE_CATALOG` on your configured catalog (`STUDENT360_CATALOG`)
- `USE_SCHEMA` + `SELECT` on `gold`, `silver`, `genie`, `mortarcaps`, `bronze`
- `SELECT` + `MODIFY` on `<catalog>.gold.intervention_log` (Delta table for persistent outreach tracking)
- Access to a running SQL warehouse

These are provisioned by the root `deploy.sh` bootstrap flow when permissions allow.

## Data Persistence

Outreach tracking data is stored in `<catalog>.gold.intervention_log` (Delta table), persisting across app restarts and shared across all users. The table stores: student_id, student_name, tone, subject, sent_at, status, intervention_type, notes (array), next_follow_up, resolved_at.

Intervention Outcomes page uses simulated data generated from SQL queries against `gold.student_360` at-risk students. No separate table required.

---

Built with [APX](https://github.com/databricks-solutions/apx) on the Databricks Data Intelligence Platform.
