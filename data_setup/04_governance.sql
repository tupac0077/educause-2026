-- Masking UDFs used by the Governance page
CREATE OR REPLACE FUNCTION serverless_student360_v2_catalog.gold.mask_email(email STRING)
RETURNS STRING
RETURN CASE WHEN email IS NULL THEN NULL
            ELSE concat(left(email,2), '****@', split(email,'@')[1]) END;

CREATE OR REPLACE FUNCTION serverless_student360_v2_catalog.gold.mask_dob(dob DATE)
RETURNS STRING
RETURN CASE WHEN dob IS NULL THEN NULL ELSE concat(left(cast(dob AS string),4), '-**-**') END;

CREATE OR REPLACE FUNCTION serverless_student360_v2_catalog.gold.mask_national_id(nid STRING)
RETURNS STRING
RETURN CASE WHEN nid IS NULL THEN NULL ELSE concat('***-***-', right(nid,3)) END;

-- Writable intervention/case log (reused by Tracker + Effectiveness pages)
CREATE TABLE IF NOT EXISTS serverless_student360_v2_catalog.gold.intervention_log (
  student_id INT,
  student_name STRING,
  tone STRING,
  subject STRING,
  sent_at TIMESTAMP,
  status STRING,
  intervention_type STRING,
  notes ARRAY<STRING>,
  next_follow_up STRING,
  resolved_at TIMESTAMP
) USING DELTA;

-- PII tags so the Governance page shows column/table classifications
ALTER TABLE serverless_student360_v2_catalog.gold.student_360 ALTER COLUMN email SET TAGS ('classification' = 'confidential');
ALTER TABLE serverless_student360_v2_catalog.gold.student_360 ALTER COLUMN date_of_birth SET TAGS ('classification' = 'confidential');
ALTER TABLE serverless_student360_v2_catalog.gold.student_360 ALTER COLUMN student_national_id SET TAGS ('classification' = 'restricted');
ALTER TABLE serverless_student360_v2_catalog.gold.student_360 ALTER COLUMN full_name SET TAGS ('classification' = 'internal');
ALTER TABLE serverless_student360_v2_catalog.gold.student_360 SET TAGS ('classification' = 'restricted');

SELECT serverless_student360_v2_catalog.gold.mask_email('jane.doe123@northstar.edu') AS masked_email;
