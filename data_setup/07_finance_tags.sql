-- Classification tags on the finance dashboard's source tables (policy allows: confidential/restricted/public/internal)
ALTER TABLE serverless_student360_v2_catalog.gold.finance_accounts ALTER COLUMN balance_due SET TAGS ('classification' = 'confidential');
ALTER TABLE serverless_student360_v2_catalog.gold.finance_accounts ALTER COLUMN aid_awarded SET TAGS ('classification' = 'confidential');
ALTER TABLE serverless_student360_v2_catalog.gold.finance_accounts ALTER COLUMN net_tuition SET TAGS ('classification' = 'confidential');
ALTER TABLE serverless_student360_v2_catalog.gold.finance_accounts ALTER COLUMN delinquency_status SET TAGS ('classification' = 'internal');
ALTER TABLE serverless_student360_v2_catalog.gold.revenue_at_risk ALTER COLUMN revenue_at_risk_usd SET TAGS ('classification' = 'confidential');
ALTER TABLE serverless_student360_v2_catalog.gold.revenue_at_risk ALTER COLUMN expected_annual_tuition SET TAGS ('classification' = 'internal');
ALTER TABLE serverless_student360_v2_catalog.gold.aid_appeals ALTER COLUMN requested_amount_usd SET TAGS ('classification' = 'confidential');
ALTER TABLE serverless_student360_v2_catalog.gold.aid_appeals ALTER COLUMN reason SET TAGS ('classification' = 'restricted');
ALTER TABLE serverless_student360_v2_catalog.gold.budget_vs_actual ALTER COLUMN budget_usd SET TAGS ('classification' = 'internal');
ALTER TABLE serverless_student360_v2_catalog.gold.budget_vs_actual ALTER COLUMN actual_usd SET TAGS ('classification' = 'internal');
-- table-level domain tags
ALTER TABLE serverless_student360_v2_catalog.gold.finance_accounts SET TAGS ('classification' = 'confidential');
ALTER TABLE serverless_student360_v2_catalog.gold.revenue_at_risk SET TAGS ('classification' = 'confidential');
ALTER TABLE serverless_student360_v2_catalog.gold.aid_appeals SET TAGS ('classification' = 'restricted');
ALTER TABLE serverless_student360_v2_catalog.gold.budget_vs_actual SET TAGS ('classification' = 'internal');
SELECT 'finance tags applied' AS status;
