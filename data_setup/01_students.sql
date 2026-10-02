-- Northstar University — synthetic student_360 + risk predictions
-- Deterministic via hash(student_id, salt). ~800 students.
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.student_360 AS
WITH base AS (
  SELECT
    id AS student_id,
    pmod(hash(id, 'perf'), 100)              AS perf,     -- 0..99 aptitude
    pmod(hash(id, 'col'), 6)                 AS col_ix,
    pmod(hash(id, 'fn'), 20)                 AS fn_ix,
    pmod(hash(id, 'ln'), 20)                 AS ln_ix,
    pmod(hash(id, 'gender'), 10)             AS g_ix,
    pmod(hash(id, 'intl'), 100)              AS intl_r,
    pmod(hash(id, 'aid'), 100)               AS aid_r,
    pmod(hash(id, 'fif'), 100)               AS fif_r,
    pmod(hash(id, 'cohort'), 4)              AS cohort_ix,
    pmod(hash(id, 'campus'), 3)              AS campus_ix,
    pmod(hash(id, 'lvl'), 100)               AS lvl_r,
    pmod(hash(id, 'age'), 8)                 AS age_off,
    pmod(hash(id, 'country'), 6)             AS country_ix
  FROM range(1, 801) t(id)
),
derived AS (
  SELECT
    student_id, perf, aid_r, fif_r, intl_r,
    element_at(array('James','Maria','David','Sofia','Michael','Aisha','Daniel','Emily','Carlos','Priya',
                     'Noah','Olivia','Liam','Ava','Ethan','Mia','Lucas','Zoe','Mason','Layla'), fn_ix+1) AS first_name,
    element_at(array('Smith','Garcia','Johnson','Lee','Brown','Patel','Nguyen','Martinez','Davis','Kim',
                     'Wilson','Lopez','Chen','Khan','Taylor','Singh','Moore','Ali','Clark','Rossi'), ln_ix+1) AS last_name,
    element_at(array('College of Engineering','College of Business','College of Arts & Sciences',
                     'College of Science','College of Health Sciences','College of Education'), col_ix+1) AS faculty,
    element_at(array('Main Campus','Downtown Campus','North Campus'), campus_ix+1) AS campus,
    element_at(array('Male','Female','Female','Male','Non-binary','Female','Male','Female','Male','Female'), g_ix+1) AS gender,
    element_at(array('2021','2022','2023','2024'), cohort_ix+1) AS cohort,
    CASE WHEN lvl_r < 72 THEN 'Undergraduate' ELSE 'Graduate' END AS program_level,
    18 + age_off + (CASE WHEN lvl_r >= 72 THEN 4 ELSE 0 END) AS age,
    CASE WHEN intl_r < 22 THEN 'International' ELSE 'Domestic' END AS domestic_international,
    element_at(array('United States','India','China','Nigeria','Brazil','Canada'), country_ix+1) AS country_raw
  FROM base
)
SELECT
  d.student_id,
  concat(d.first_name, ' ', d.last_name) AS full_name,
  d.first_name, d.last_name,
  lower(concat(d.first_name, '.', d.last_name, d.student_id, '@northstar.edu')) AS email,
  date_add(make_date(2000, 1, 1), pmod(hash(d.student_id,'dob'), 2900)) AS date_of_birth,
  d.age, d.gender,
  concat('NS-', lpad(cast(d.student_id AS string), 6, '0')) AS student_national_id,
  CASE d.faculty
    WHEN 'College of Engineering' THEN 'BS Mechanical Engineering'
    WHEN 'College of Business' THEN 'BBA Finance'
    WHEN 'College of Arts & Sciences' THEN 'BA Economics'
    WHEN 'College of Science' THEN 'BS Computer Science'
    WHEN 'College of Health Sciences' THEN 'BS Nursing'
    ELSE 'BA Education' END AS program_name,
  concat('P-', lpad(cast(pmod(hash(d.faculty),900)+100 AS string),3,'0')) AS program_code,
  d.program_level, d.faculty, d.campus, d.cohort,
  date_add(make_date(cast(d.cohort AS int), 8, 20), pmod(hash(d.student_id,'enr'),20)) AS enrollment_date,
  greatest(1, (2026 - cast(d.cohort AS int)) * 2) AS terms_enrolled,
  CASE
    WHEN d.perf < 10 THEN (CASE WHEN pmod(hash(d.student_id,'w'),3)=0 THEN 'WITHDRAWN' ELSE 'AT_RISK' END)
    WHEN d.perf < 22 THEN 'AT_RISK'
    WHEN d.perf >= 92 AND d.cohort IN ('2021','2022') THEN 'GRADUATED'
    WHEN pmod(hash(d.student_id,'leave'),50)=0 THEN 'ON_LEAVE'
    ELSE 'ACTIVE' END AS student_status,
  round(1.2 + d.perf/100.0*2.8, 2) AS gpa,
  round(1.2 + d.perf/100.0*2.8, 2) AS avg_grade_point,
  CASE WHEN d.perf < 22 THEN 'High' WHEN d.perf < 45 THEN 'Medium' ELSE 'Low' END AS risk_level,
  8 + pmod(hash(d.student_id,'tot'),8) AS total_enrollments,
  cast(round((8 + pmod(hash(d.student_id,'tot'),8)) * (0.4 + d.perf/100.0*0.55)) AS int) AS courses_passed,
  cast(round((8 + pmod(hash(d.student_id,'tot'),8)) * (0.5 - d.perf/100.0*0.45)) AS int) AS courses_failed,
  pmod(hash(d.student_id,'wd'),3) AS courses_withdrawn,
  round(40 + d.perf*0.6, 1) AS pass_rate_pct,
  cast(round(30 + d.perf*1.2) AS int) AS total_credits_earned,
  120 AS credit_points_required,
  round(least((30 + d.perf*1.2)/120.0*100, 100), 1) AS degree_completion_pct,
  cast(round(5 + d.perf*1.4) AS int) AS total_lms_activities,
  cast(round((5 + d.perf*1.4) * (25 + pmod(hash(d.student_id,'m'),20))) AS int) AS total_lms_minutes,
  cast(round(3 + d.perf*0.9) AS int) AS lms_active_days,
  round(20 + pmod(hash(d.student_id,'sess'),40), 1) AS avg_session_duration,
  cast(round(d.perf*0.8) AS int) AS lectures_viewed,
  pmod(hash(d.student_id,'forum'), 15) AS forum_posts,
  CASE WHEN d.perf < 30 THEN 2 + pmod(hash(d.student_id,'sup'),5) ELSE pmod(hash(d.student_id,'sup'),3) END AS total_support_interactions,
  CASE WHEN d.perf < 25 THEN pmod(hash(d.student_id,'mh'),3) ELSE 0 END AS mental_health_interactions,
  CASE WHEN d.perf < 25 THEN pmod(hash(d.student_id,'pf'),3) ELSE 0 END AS pending_follow_ups,
  date_add(make_date(2026, 9, 1), -pmod(hash(d.student_id,'lsd'),120)) AS last_support_date,
  d.domestic_international,
  CASE WHEN d.domestic_international = 'International' THEN d.country_raw ELSE 'United States' END AS country_of_origin,
  (d.fif_r < 30) AS first_in_family,
  (d.aid_r < 55) AS financial_aid
FROM derived d;

-- ML risk predictions (probability 0..1; category buckets)
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.student_risk_predictions AS
SELECT
  student_id,
  round(least(0.98, greatest(0.02, (100 - perf)/100.0 + (pmod(hash(student_id,'noise'),20)-10)/100.0)), 3) AS risk_score,
  CASE
    WHEN (100 - perf)/100.0 >= 0.80 THEN 'Very High'
    WHEN (100 - perf)/100.0 >= 0.62 THEN 'High'
    WHEN (100 - perf)/100.0 >= 0.45 THEN 'Medium'
    WHEN (100 - perf)/100.0 >= 0.28 THEN 'Low'
    ELSE 'Very Low' END AS risk_category,
  (perf < 30) AS predicted_at_risk
FROM (SELECT student_id, pmod(hash(student_id, 'perf'), 100) AS perf
      FROM serverless_student360_v2_catalog.gold.student_360);

SELECT count(*) AS students FROM serverless_student360_v2_catalog.gold.student_360;
