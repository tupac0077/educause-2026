SELECT count(*) accounts, round(sum(balance_due)) total_balance, round(sum(revenue_at_risk_usd)) FROM serverless_student360_v2_catalog.gold.finance_accounts a LEFT JOIN serverless_student360_v2_catalog.gold.revenue_at_risk r USING(student_id);
SELECT delinquency_status, count(*) n FROM serverless_student360_v2_catalog.gold.finance_accounts GROUP BY delinquency_status ORDER BY n DESC;
SELECT status, count(*) n FROM serverless_student360_v2_catalog.gold.aid_appeals GROUP BY status;
SELECT count(*) rar_rows, round(sum(revenue_at_risk_usd)) rar_usd FROM serverless_student360_v2_catalog.gold.revenue_at_risk;
