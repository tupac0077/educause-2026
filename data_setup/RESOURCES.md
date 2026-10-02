# Northstar Office of Finance — provisioned resources (student360-v2 workspace)

Workspace: https://fevm-serverless-student360-v2.cloud.databricks.com

| Resource | ID / value |
|---|---|
| Catalog | `serverless_student360_v2_catalog` |
| Schemas | `gold`, `silver` |
| SQL Warehouse | `8e556c6c71086033` (Serverless Starter) |
| Genie space "Northstar Office of Finance" | `01f1bb79b35d179396e81fe7c2041fc2` |
| MLflow experiment `/Shared/northstar_finance/agent-traces` | `2917299776704403` |
| Agent model | `databricks-gpt-5-4` |

## Gold tables
- `gold.student_360` (800), `gold.student_risk_predictions`
- `gold.finance_accounts`, `gold.revenue_at_risk`, `gold.aid_appeals`, `gold.budget_vs_actual`
- `gold.finance_action_log` (writable audit — agent write-actions)
- `gold.course_analytics`, `gold.faculty_performance`, `gold.term_trends`
- `gold.intervention_log` (writable), `gold.mask_email/mask_dob/mask_national_id`
- `silver.courses`, `silver.enrollments`, `silver.student_support`

## Genie smoke test — PASSED
Q: "What is our total revenue at risk, broken down by college?" → correct SQL + answer (~$10.9M total).
