-- Supporting tables for Students/Courses/Faculty/Trends pages
CREATE SCHEMA IF NOT EXISTS serverless_student360_v2_catalog.silver;

-- Courses (~48 across 6 colleges)
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.silver.courses AS
SELECT
  id AS course_id,
  concat(element_at(array('ENGR','BUS','ECON','CS','NURS','EDU'), cast(pmod(id,6) AS int)+1), '-', lpad(cast(100 + id AS string),3,'0')) AS course_code,
  concat(element_at(array('Statics','Corporate Finance','Microeconomics','Data Structures','Anatomy','Learning Theory',
                          'Thermodynamics','Accounting','Macroeconomics','Algorithms','Pharmacology','Curriculum Design'),
                    cast(pmod(id,12) AS int)+1)) AS course_name,
  element_at(array('College of Engineering','College of Business','College of Arts & Sciences',
                   'College of Science','College of Health Sciences','College of Education'), cast(pmod(id,6) AS int)+1) AS faculty,
  3 AS credit_points,
  element_at(array('In-person','Online','Hybrid'), cast(pmod(id,3) AS int)+1) AS delivery_mode
FROM range(1,49) t(id);

-- Enrollments: ~6 per student
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.silver.enrollments AS
WITH ex AS (
  SELECT st.student_id, pmod(hash(st.student_id,'perf'),100) AS perf, e.n
  FROM serverless_student360_v2_catalog.gold.student_360 st
  LATERAL VIEW explode(sequence(1,6)) e AS n
),
j AS (
  SELECT ex.student_id, ex.perf, ex.n,
    pmod(hash(ex.student_id, ex.n), 48) + 1 AS course_id,
    least(100.0, greatest(0.0, ex.perf + (pmod(hash(ex.student_id, ex.n, 'mk'),40) - 20))) AS mark
  FROM ex
)
SELECT
  row_number() OVER (ORDER BY student_id, n) AS enrollment_id,
  j.student_id, j.course_id, c.course_code, c.course_name,
  element_at(array('2025-Spring','2025-Fall','2026-Spring','2026-Fall'), pmod(hash(j.student_id,j.n),4)+1) AS term_code,
  element_at(array('Spring','Fall','Spring','Fall'), pmod(hash(j.student_id,j.n),4)+1) AS term,
  element_at(array(2025,2025,2026,2026), pmod(hash(j.student_id,j.n),4)+1) AS year,
  CASE WHEN j.mark >= 90 THEN 'A' WHEN j.mark >= 80 THEN 'B' WHEN j.mark >= 70 THEN 'C'
       WHEN j.mark >= 60 THEN 'D' ELSE 'F' END AS grade,
  round(j.mark,1) AS mark,
  round(CASE WHEN j.mark >= 90 THEN 4.0 WHEN j.mark >= 80 THEN 3.0 WHEN j.mark >= 70 THEN 2.0
             WHEN j.mark >= 60 THEN 1.0 ELSE 0.0 END, 1) AS grade_point,
  CASE WHEN j.mark >= 60 THEN 3 ELSE 0 END AS credit_points_earned
FROM j JOIN serverless_student360_v2_catalog.silver.courses c ON j.course_id = c.course_id;

-- Student support interactions (for at-risk students mostly)
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.silver.student_support AS
WITH ex AS (
  SELECT st.student_id, st.total_support_interactions AS ns
  FROM serverless_student360_v2_catalog.gold.student_360 st
  WHERE st.total_support_interactions > 0
),
rows AS (
  SELECT student_id, e.n FROM ex LATERAL VIEW explode(sequence(1, ns)) e AS n
)
SELECT
  row_number() OVER (ORDER BY student_id, n) AS interaction_id,
  student_id,
  element_at(array('Academic Advising','Financial Aid Counseling','Tutoring','Mental Health','Career Services'),
             pmod(hash(student_id,n),5)+1) AS support_type,
  cast(date_add(make_date(2026,9,1), -pmod(hash(student_id,n,'d'),150)) AS string) AS interaction_date,
  element_at(array('In-person','Phone','Email','Video'), pmod(hash(student_id,n,'ch'),4)+1) AS channel,
  15 + pmod(hash(student_id,n,'dur'),45) AS duration_minutes,
  element_at(array('Resolved','Follow-up scheduled','Referred','No response'), pmod(hash(student_id,n,'o'),4)+1) AS outcome,
  'Synthetic support interaction record.' AS notes,
  (pmod(hash(student_id,n,'f'),3)=0) AS follow_up_required
FROM rows;

-- Course analytics (gold aggregate)
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.course_analytics AS
SELECT
  c.course_id, c.course_code, c.course_name, c.faculty, c.credit_points, c.delivery_mode,
  count(*) AS total_enrolled,
  round(avg(e.mark),1) AS avg_mark,
  round(avg(e.grade_point),2) AS avg_grade_point,
  sum(CASE WHEN e.grade <> 'F' THEN 1 ELSE 0 END) AS pass_count,
  sum(CASE WHEN e.grade = 'F' THEN 1 ELSE 0 END) AS fail_count,
  round(sum(CASE WHEN e.grade = 'F' THEN 1 ELSE 0 END) * 100.0 / count(*), 1) AS fail_rate_pct,
  0 AS withdrawal_count
FROM serverless_student360_v2_catalog.silver.courses c
JOIN serverless_student360_v2_catalog.silver.enrollments e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_code, c.course_name, c.faculty, c.credit_points, c.delivery_mode;

-- Faculty (college) performance
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.faculty_performance AS
SELECT
  faculty, program_level,
  count(*) AS total_students,
  round(avg(gpa),2) AS avg_gpa,
  sum(CASE WHEN student_status='AT_RISK' THEN 1 ELSE 0 END) AS at_risk_students,
  sum(CASE WHEN student_status='WITHDRAWN' THEN 1 ELSE 0 END) AS withdrawn_students,
  sum(CASE WHEN student_status='GRADUATED' THEN 1 ELSE 0 END) AS graduated_students,
  round(sum(CASE WHEN student_status='GRADUATED' THEN 1 ELSE 0 END)*100.0/count(*),1) AS graduation_rate_pct,
  round(sum(CASE WHEN student_status IN ('AT_RISK','WITHDRAWN') THEN 1 ELSE 0 END)*100.0/count(*),1) AS attrition_risk_pct,
  sum(CASE WHEN domestic_international='International' THEN 1 ELSE 0 END) AS international_students,
  sum(CASE WHEN first_in_family THEN 1 ELSE 0 END) AS first_in_family_students
FROM serverless_student360_v2_catalog.gold.student_360
GROUP BY faculty, program_level;

-- Term trends (gold) — pass/fail/withdrawal + enrollment counts per term
CREATE OR REPLACE TABLE serverless_student360_v2_catalog.gold.term_trends AS
SELECT
  year, term, concat(cast(year AS string), '-', term) AS term_code,
  count(*) AS total_enrollments,
  count(DISTINCT student_id) AS active_students,
  round(sum(CASE WHEN grade <> 'F' THEN 1 ELSE 0 END)*100.0/count(*),1) AS pass_rate_pct,
  round(sum(CASE WHEN grade = 'F' THEN 1 ELSE 0 END)*100.0/count(*),1) AS fail_rate_pct,
  round(2.0 + pmod(hash(year,term),40)/10.0,1) AS withdrawal_rate_pct
FROM serverless_student360_v2_catalog.silver.enrollments
GROUP BY year, term;

SELECT
 (SELECT count(*) FROM serverless_student360_v2_catalog.silver.enrollments) AS enrollments,
 (SELECT count(*) FROM serverless_student360_v2_catalog.silver.student_support) AS support,
 (SELECT count(*) FROM serverless_student360_v2_catalog.gold.course_analytics) AS courses;
