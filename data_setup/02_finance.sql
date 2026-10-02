-- Northstar University — Office of Finance synthetic tables (depend on gold.student_360)
-- Tuition assumptions: Domestic $25k, International $40k per year.

-- Per-student account for the current term (Fall 2026)
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.finance_accounts AS
WITH s AS (
  SELECT st.student_id, st.full_name, st.faculty AS college, st.domestic_international, st.financial_aid,
         st.student_status, st.gpa, p.risk_score, p.risk_category,
         pmod(hash(st.student_id,'fin'),100) AS fr
  FROM serverless_student360_v2_catalog.gold.student_360 st
  LEFT JOIN serverless_student360_v2_catalog.gold.student_risk_predictions p USING (student_id)
)
SELECT
  student_id, full_name, college, 'Fall 2026' AS term,
  CASE WHEN domestic_international = 'International' THEN 40000.0 ELSE 25000.0 END AS tuition_charged,
  round(CASE WHEN financial_aid THEN (CASE WHEN domestic_international='International' THEN 40000.0 ELSE 25000.0 END)
                                      * (0.20 + (pmod(hash(student_id,'aidpct'),40)/100.0)) ELSE 0.0 END, 2) AS aid_awarded,
  round((CASE WHEN domestic_international='International' THEN 40000.0 ELSE 25000.0 END)
        - CASE WHEN financial_aid THEN (CASE WHEN domestic_international='International' THEN 40000.0 ELSE 25000.0 END)
                                        * (0.20 + (pmod(hash(student_id,'aidpct'),40)/100.0)) ELSE 0.0 END, 2) AS net_tuition,
  round((CASE WHEN domestic_international='International' THEN 40000.0 ELSE 25000.0 END
        - CASE WHEN financial_aid THEN (CASE WHEN domestic_international='International' THEN 40000.0 ELSE 25000.0 END)
                                        * (0.20 + (pmod(hash(student_id,'aidpct'),40)/100.0)) ELSE 0.0 END)
        * (CASE WHEN fr < 20 THEN 0.35 WHEN fr < 55 THEN 0.75 ELSE 1.0 END), 2) AS payments_received,
  round((CASE WHEN domestic_international='International' THEN 40000.0 ELSE 25000.0 END
        - CASE WHEN financial_aid THEN (CASE WHEN domestic_international='International' THEN 40000.0 ELSE 25000.0 END)
                                        * (0.20 + (pmod(hash(student_id,'aidpct'),40)/100.0)) ELSE 0.0 END)
        * (1.0 - (CASE WHEN fr < 20 THEN 0.35 WHEN fr < 55 THEN 0.75 ELSE 1.0 END)), 2) AS balance_due,
  CASE WHEN fr < 20 THEN 30 + pmod(hash(student_id,'dpd'),90) WHEN fr < 40 THEN pmod(hash(student_id,'dpd'),30) ELSE 0 END AS days_past_due,
  (fr >= 20 AND fr < 45) AS payment_plan_flag,
  CASE WHEN fr < 12 THEN 'Delinquent' WHEN fr < 20 THEN 'Past Due' WHEN fr < 45 THEN 'Payment Plan' ELSE 'Current' END AS delinquency_status
FROM s;

-- Revenue at risk: expected future tuition weighted by ML risk score
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.revenue_at_risk AS
SELECT
  st.student_id, st.full_name, st.faculty AS college, st.domestic_international,
  CASE WHEN st.domestic_international='International' THEN 40000.0 ELSE 25000.0 END AS expected_annual_tuition,
  round(least(4.0, greatest(0.0, (4.0 - st.gpa))) * 1.0, 2) AS gpa_gap,
  coalesce(p.risk_score, 0.0) AS risk_score,
  coalesce(p.risk_category, 'Unknown') AS risk_category,
  round((CASE WHEN st.domestic_international='International' THEN 40000.0 ELSE 25000.0 END) * coalesce(p.risk_score,0.0), 2) AS revenue_at_risk_usd,
  CASE
    WHEN st.total_lms_activities < 30 THEN 'Low engagement'
    WHEN st.courses_failed >= 3 THEN 'Academic performance'
    WHEN st.pass_rate_pct < 60 THEN 'Low pass rate'
    WHEN st.financial_aid AND st.gpa < 2.5 THEN 'Financial + academic'
    ELSE 'Academic performance' END AS primary_driver
FROM serverless_student360_v2_catalog.gold.student_360 st
LEFT JOIN serverless_student360_v2_catalog.gold.student_risk_predictions p USING (student_id)
WHERE st.student_status IN ('AT_RISK','ACTIVE','ON_LEAVE');

-- Financial aid appeals queue (subset of aid students)
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.aid_appeals AS
WITH cand AS (
  SELECT student_id, full_name, faculty AS college, domestic_international, gpa,
         pmod(hash(student_id,'appeal'),100) AS ar
  FROM serverless_student360_v2_catalog.gold.student_360
  WHERE financial_aid = true
)
SELECT
  concat('APL-', lpad(cast(row_number() OVER (ORDER BY student_id) AS string),4,'0')) AS appeal_id,
  student_id, full_name, college,
  element_at(array('Cost of Attendance Adjustment','Dependency Override','Special Circumstance',
                   'Satisfactory Academic Progress','Professional Judgment'), pmod(hash(student_id,'atype'),5)+1) AS appeal_type,
  round(1000 + pmod(hash(student_id,'amt'),9000), 2) AS requested_amount_usd,
  element_at(array('Loss of family income','Unexpected medical expenses','Reduced work hours',
                   'GPA recovery after hardship','Housing instability'), pmod(hash(student_id,'reason'),5)+1) AS reason,
  CASE WHEN pmod(hash(student_id,'astat'),10) < 6 THEN 'pending'
       WHEN pmod(hash(student_id,'astat'),10) < 8 THEN 'approved' ELSE 'denied' END AS status,
  date_add(make_date(2026,9,1), -pmod(hash(student_id,'asub'),40)) AS submitted_at,
  CAST(NULL AS DATE) AS decided_at,
  CAST(NULL AS STRING) AS decided_by
FROM cand
WHERE pmod(hash(student_id,'pick'),100) < 45;

-- Budget vs actual by college / fiscal period / category
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.budget_vs_actual AS
SELECT
  college, fiscal_period, category,
  budget_usd,
  round(budget_usd * (0.85 + pmod(hash(college, fiscal_period, category),30)/100.0), 2) AS actual_usd,
  round(budget_usd * (0.85 + pmod(hash(college, fiscal_period, category),30)/100.0) - budget_usd, 2) AS variance_usd,
  round(((0.85 + pmod(hash(college, fiscal_period, category),30)/100.0) - 1.0) * 100, 1) AS variance_pct
FROM (
  SELECT c AS college, fp AS fiscal_period, cat AS category,
         (1000000 + pmod(hash(c,fp,cat),1) + pmod(hash(c,cat),4000000)) * 1.0 AS budget_usd
  FROM (SELECT explode(array('College of Engineering','College of Business','College of Arts & Sciences',
                             'College of Science','College of Health Sciences','College of Education')) AS c)
  CROSS JOIN (SELECT explode(array('FY2025','FY2026')) AS fp)
  CROSS JOIN (SELECT explode(array('Instruction','Student Services','Financial Aid','Facilities','Research')) AS cat)
);

-- Writable audit log for agent write-actions (starts empty)
CREATE TABLE IF NOT EXISTS serverless_student360_v2_catalog.gold.finance_action_log (
  action_id STRING,
  action_type STRING,
  student_id INT,
  appeal_id STRING,
  amount_usd DOUBLE,
  status STRING,
  decision_notes STRING,
  payload STRING,
  actor STRING,
  created_at TIMESTAMP
) USING DELTA;

SELECT
  (SELECT count(*) FROM serverless_student360_v2_catalog.gold.finance_accounts) AS accounts,
  (SELECT count(*) FROM serverless_student360_v2_catalog.gold.revenue_at_risk) AS rar,
  (SELECT count(*) FROM serverless_student360_v2_catalog.gold.aid_appeals) AS appeals,
  (SELECT count(*) FROM serverless_student360_v2_catalog.gold.budget_vs_actual) AS budget;
