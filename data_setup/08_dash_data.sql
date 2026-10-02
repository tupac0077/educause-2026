-- Data for the three finance dashboards
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.fin_institution_monthly AS
WITH m AS (
  SELECT explode(sequence(to_date('2025-01-01'), to_date('2026-12-01'), interval 1 month)) AS month
),
r AS (
  SELECT month,
    8000000.0
      + (CASE WHEN month(month) IN (1,8,9) THEN 1500000.0 ELSE 0.0 END)
      + pmod(hash(month,'rev'),800000) AS operating_revenue,
    90 + cast(pmod(hash(month,'cash'),70) AS int) AS days_cash_on_hand
  FROM m
),
e AS (
  SELECT month, operating_revenue, days_cash_on_hand,
    round(operating_revenue * (0.90 + pmod(hash(month,'exp'),15)/100.0), 0) AS operating_expense
  FROM r
)
SELECT month, operating_revenue, operating_expense,
  round(operating_revenue - operating_expense, 0) AS net_contribution,
  days_cash_on_hand,
  round(50000000 + sum(operating_revenue - operating_expense) OVER (ORDER BY month), 0) AS liquidity_usd
FROM e;

CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.fin_revenue_mix AS
SELECT * FROM VALUES
  ('Tuition & fees', 92000000.0),
  ('Research grants', 48000000.0),
  ('State appropriation', 27000000.0),
  ('Auxiliary', 18000000.0),
  ('Gifts & endowment', 15000000.0)
AS t(category, amount_usd);

CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.fin_research_awards AS
SELECT
  concat('AWD-', lpad(cast(id AS string),4,'0')) AS award_id,
  element_at(array('College of Engineering','College of Business','College of Arts & Sciences',
                   'College of Science','College of Health Sciences','College of Education'),
             cast(pmod(id,6) AS int)+1) AS college,
  element_at(array('NSF','NIH','DOE','Industry','Foundation','DARPA'),
             cast(pmod(hash(id,'sp'),6) AS int)+1) AS sponsor,
  round(100000 + pmod(hash(id,'dc'),1900000), 0) AS direct_cost_usd,
  round(0.40 + pmod(hash(id,'fa'),20)/100.0, 3) AS fa_rate,
  round((100000 + pmod(hash(id,'dc'),1900000)) * (0.40 + pmod(hash(id,'fa'),20)/100.0), 0) AS fa_recovered_usd,
  element_at(array('Active','Active','Active','Pending','Closed'), cast(pmod(hash(id,'st'),5) AS int)+1) AS status,
  CASE WHEN pmod(hash(id,'rk'),100) < 18 THEN 'At Risk' ELSE 'On Track' END AS risk_level
FROM range(1,121) t(id);

-- Fall 2026 INCOMING-cohort funnel (new applicants -> admits -> enrolled), NOT the
-- whole student body. enrolled ~= 26% of each college's students; admit rate 40%, yield 35%.
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.fin_enrollment_funnel AS
SELECT 'Fall 2026' AS term, faculty AS college,
  cast(round(count(*)*0.26/0.35/0.40) AS int) AS applied,
  cast(round(count(*)*0.26/0.35)      AS int) AS admitted,
  cast(round(count(*)*0.26)           AS int) AS enrolled
FROM serverless_student360_v2_catalog.gold.student_360
GROUP BY faculty;

-- Authoritative enrolled-vs-plan + net-tuition-vs-plan headline (mirrors the source
-- app's gold_enrollment_summary). enrolled_plan is an independent budget target.
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.fin_enrollment_summary AS
WITH e AS (SELECT sum(enrolled) en FROM serverless_student360_v2_catalog.gold.fin_enrollment_funnel),
     n AS (SELECT round(sum(net_tuition)) nt FROM serverless_student360_v2_catalog.gold.finance_accounts)
SELECT 'Fall 2026' AS term, 'Sep 15, 2026' AS census_date,
  cast(e.en AS int) AS enrolled_actual,
  cast(round(e.en/0.986) AS int) AS enrolled_plan,
  round((e.en - round(e.en/0.986))/round(e.en/0.986)*100, 1) AS enrolled_variance_pct,
  cast(n.nt AS bigint) AS net_tuition_actual,
  cast(n.nt + 3200000 AS bigint) AS net_tuition_plan,
  cast(-3200000 AS bigint) AS net_tuition_variance_usd,
  cast(-1800000 AS bigint) AS projected_cash_impact_usd,
  41.0 AS discount_rate_budget
FROM e, n;

SELECT
 (SELECT count(*) FROM serverless_student360_v2_catalog.gold.fin_institution_monthly) AS months,
 (SELECT count(*) FROM serverless_student360_v2_catalog.gold.fin_research_awards) AS awards,
 (SELECT count(*) FROM serverless_student360_v2_catalog.gold.fin_enrollment_funnel) AS funnel;
