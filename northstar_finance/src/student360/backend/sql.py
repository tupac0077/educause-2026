"""SQL query helpers for Student 360 data access."""

import os

EDITION = os.environ.get("STUDENT360_EDITION", "us_demo")
if EDITION not in {"us_demo", "mortarcaps_apac", "northstar_finance"}:
    raise ValueError(f"Unsupported STUDENT360_EDITION: {EDITION}")

IS_NORTHSTAR = EDITION == "northstar_finance"
# northstar_finance reuses the US 4.0 / Spring-Fall / "College" conventions,
# so it flows through every IS_US_DEMO branch below (only the labels differ).
IS_US_DEMO = EDITION in {"us_demo", "northstar_finance"}
if IS_NORTHSTAR:
    DEFAULT_CATALOG = "serverless_student360_v2_catalog"
elif EDITION == "us_demo":
    DEFAULT_CATALOG = "student360_us_demo"
else:
    DEFAULT_CATALOG = "higher_ed_demo"
CATALOG = os.environ.get("STUDENT360_CATALOG", DEFAULT_CATALOG)
GOLD = f"{CATALOG}.gold"
SILVER = f"{CATALOG}.silver"
BUILDATHON = f"{CATALOG}.buildathon"

GPA_MAX = 4.0 if IS_US_DEMO else 7.0
GPA_SCALE_LABEL = "US 4.0 scale" if IS_US_DEMO else "Australian 7.0 scale"
DE_RISKED_GPA = 2.5 if IS_US_DEMO else 4.0
MEDIUM_RISK_GPA = 2.0 if IS_US_DEMO else 3.0
TREND_AT_RISK_GPA = 2.0 if IS_US_DEMO else 3.5
ORG_UNIT_LABEL = "College" if IS_US_DEMO else "Faculty"
DEFAULT_ADVISOR_ORG_UNIT = (
    "College of Business" if IS_NORTHSTAR
    else "College of Science" if IS_US_DEMO
    else "Faculty of Science"
)
FIRST_GEN_LABEL = "First-generation" if IS_US_DEMO else "First-in-Family"
LEADERSHIP_ROLE = (
    "VP of Finance" if IS_NORTHSTAR
    else "Provost" if IS_US_DEMO
    else "Deputy Vice-Chancellor"
)
DOMESTIC_TUITION = 25000 if IS_US_DEMO else 30000
INTERNATIONAL_TUITION = 40000 if IS_US_DEMO else 45000

HISTORICAL_TERM_DATE_SQL = (
    "CASE WHEN term = 'Spring' THEN MAKE_DATE(CAST(year AS INT), 1, 1) "
    "ELSE MAKE_DATE(CAST(year AS INT), 8, 1) END"
    if IS_US_DEMO
    else "CASE WHEN term = 'S1' THEN MAKE_DATE(CAST(year AS INT), 3, 1) "
    "ELSE MAKE_DATE(CAST(year AS INT), 8, 1) END"
)
FORECAST_TERM_CODE_SQL = (
    "CONCAT(YEAR(f.ds), '-', CASE WHEN MONTH(f.ds) <= 6 THEN 'Spring' ELSE 'Fall' END)"
    if IS_US_DEMO
    else "CONCAT(YEAR(f.ds), '-S', CASE WHEN MONTH(f.ds) <= 6 THEN '1' ELSE '2' END)"
)


def _term_order_sql(column: str) -> str:
    if IS_US_DEMO:
        return f"CASE {column} WHEN 'Spring' THEN 1 WHEN 'Fall' THEN 2 ELSE 3 END"
    return f"CASE {column} WHEN 'S1' THEN 1 WHEN 'S2' THEN 2 ELSE 3 END"


def dashboard_stats_query() -> str:
    return f"""
    SELECT
        COUNT(*) as total_students,
        SUM(CASE WHEN student_status = 'ACTIVE' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN student_status = 'AT_RISK' THEN 1 ELSE 0 END) as at_risk_students,
        ROUND(AVG(gpa), 2) as avg_gpa
    FROM {GOLD}.student_360
    """


def risk_distribution_query() -> str:
    return f"""
    SELECT risk_category, COUNT(*) as count
    FROM {GOLD}.student_risk_predictions
    GROUP BY risk_category
    ORDER BY CASE risk_category
        WHEN 'Very High' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
        WHEN 'Very Low' THEN 5
    END
    """


def students_list_query(
    search: str | None = None,
    risk_level: str | None = None,
    faculty: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> str:
    conditions = []
    if search:
        safe = search.replace("'", "''")
        conditions.append(
            f"(LOWER(s.full_name) LIKE LOWER('%{safe}%') OR LOWER(s.email) LIKE LOWER('%{safe}%'))"
        )
    if risk_level:
        safe = risk_level.replace("'", "''")
        conditions.append(f"s.risk_level = '{safe}'")
    if faculty:
        safe = faculty.replace("'", "''")
        conditions.append(f"s.faculty = '{safe}'")
    if status:
        safe = status.replace("'", "''")
        conditions.append(f"s.student_status = '{safe}'")

    where = "WHERE " + " AND ".join(conditions) if conditions else ""

    return f"""
    SELECT
        s.student_id, s.full_name, s.email, s.program_name, s.faculty,
        s.campus, s.student_status, s.gpa, s.risk_level,
        p.risk_score, p.risk_category,
        s.pass_rate_pct, s.courses_failed, s.total_lms_activities
    FROM {GOLD}.student_360 s
    LEFT JOIN {GOLD}.student_risk_predictions p ON s.student_id = p.student_id
    {where}
    ORDER BY COALESCE(p.risk_score, 0) DESC
    LIMIT {limit} OFFSET {offset}
    """


def student_detail_query(student_id: int) -> str:
    return f"""
    SELECT
        s.*,
        p.risk_score, p.risk_category, p.predicted_at_risk
    FROM {GOLD}.student_360 s
    LEFT JOIN {GOLD}.student_risk_predictions p ON s.student_id = p.student_id
    WHERE s.student_id = {student_id}
    """


def student_support_query(student_id: int) -> str:
    return f"""
    SELECT interaction_id, support_type, CAST(interaction_date AS STRING) as interaction_date,
           channel, duration_minutes, outcome, notes, follow_up_required
    FROM {SILVER}.student_support
    WHERE student_id = {student_id}
    ORDER BY interaction_date DESC
    """


def student_enrollments_query(student_id: int) -> str:
    return f"""
    SELECT e.enrollment_id, c.course_code, c.course_name, e.term_code,
           e.grade, e.mark, e.grade_point, e.credit_points_earned
    FROM {SILVER}.enrollments e
    JOIN {SILVER}.courses c ON e.course_id = c.course_id
    WHERE e.student_id = {student_id}
    ORDER BY e.year DESC, {_term_order_sql("e.term")} DESC
    """


def course_analytics_query(faculty: str | None = None) -> str:
    where = ""
    if faculty:
        safe = faculty.replace("'", "''")
        where = f"WHERE faculty = '{safe}'"
    return f"""
    SELECT * FROM {GOLD}.course_analytics
    {where}
    ORDER BY fail_rate_pct DESC
    """


def faculty_performance_query() -> str:
    return f"SELECT * FROM {GOLD}.faculty_performance ORDER BY faculty, program_level"


def faculties_list_query() -> str:
    return f"SELECT DISTINCT faculty FROM {GOLD}.student_360 ORDER BY faculty"


def term_trends_query() -> str:
    return f"SELECT * FROM {GOLD}.term_trends ORDER BY year, {_term_order_sql('term')}"


def forecast_query() -> str:
    return f"""
    WITH historical AS (
        SELECT
            {HISTORICAL_TERM_DATE_SQL} AS ds,
            term_code,
            CAST(pass_rate_pct AS DOUBLE) AS pass_rate,
            CAST(fail_rate_pct AS DOUBLE) AS fail_rate,
            CAST(withdrawal_rate_pct AS DOUBLE) AS withdrawal_rate
        FROM {GOLD}.term_trends
        ORDER BY ds
    ),
    forecasted AS (
        SELECT * FROM AI_FORECAST(
            TABLE(SELECT ds, pass_rate, fail_rate, withdrawal_rate FROM historical ORDER BY ds),
            horizon => '2028-08-01',
            time_col => 'ds',
            value_col => ARRAY('pass_rate', 'fail_rate', 'withdrawal_rate')
        )
    )
    SELECT
        h.term_code,
        h.ds,
        h.pass_rate AS pass_rate,
        h.fail_rate AS fail_rate,
        h.withdrawal_rate AS withdrawal_rate,
        NULL AS pass_rate_upper, NULL AS pass_rate_lower,
        NULL AS fail_rate_upper, NULL AS fail_rate_lower,
        NULL AS withdrawal_rate_upper, NULL AS withdrawal_rate_lower,
        false AS is_forecast
    FROM historical h
    UNION ALL
    SELECT
        {FORECAST_TERM_CODE_SQL} AS term_code,
        f.ds,
        f.pass_rate_forecast AS pass_rate,
        f.fail_rate_forecast AS fail_rate,
        f.withdrawal_rate_forecast AS withdrawal_rate,
        f.pass_rate_upper, f.pass_rate_lower,
        f.fail_rate_upper, f.fail_rate_lower,
        f.withdrawal_rate_upper, f.withdrawal_rate_lower,
        true AS is_forecast
    FROM forecasted f
    ORDER BY ds
    """


def outreach_queue_query(
    priority: str | None = None,
    faculty: str | None = None,
    limit: int = 50,
) -> str:
    conditions = ["s.student_status IN ('ACTIVE', 'AT_RISK', 'ON_LEAVE')"]
    if priority == "urgent":
        conditions.append(
            "(s.risk_level = 'High' OR COALESCE(p.risk_category, '') IN ('High', 'Very High'))"
        )
    elif priority == "monitor":
        conditions.append("s.risk_level = 'Medium'")
    if faculty:
        safe = faculty.replace("'", "''")
        conditions.append(f"s.faculty = '{safe}'")

    where = "WHERE " + " AND ".join(conditions)

    return f"""
    SELECT
        s.student_id, s.full_name, s.email, s.program_name, s.faculty,
        s.campus, s.student_status, s.gpa, s.risk_level,
        p.risk_score, p.risk_category,
        s.pass_rate_pct, s.courses_failed, s.total_lms_activities,
        s.lms_active_days, s.pending_follow_ups, s.total_support_interactions,
        s.domestic_international, s.first_in_family,
        CASE
            WHEN s.risk_level = 'High' AND s.pending_follow_ups > 0
                THEN 'Urgent - Active support case with follow-ups pending'
            WHEN s.risk_level = 'High' AND COALESCE(s.total_lms_activities, 0) < 10
                THEN 'Urgent - Disengaged and at risk'
            WHEN s.risk_level = 'High'
                THEN 'High Priority - Academic performance concerns'
            WHEN s.risk_level = 'Medium' AND s.courses_failed > 0
                THEN 'Monitor - Has failed courses'
            WHEN s.risk_level = 'Medium'
                THEN 'Monitor - Showing early warning signs'
            ELSE 'No immediate action required'
        END as recommended_action
    FROM {GOLD}.student_360 s
    LEFT JOIN {GOLD}.student_risk_predictions p ON s.student_id = p.student_id
    {where}
    ORDER BY COALESCE(p.risk_score, 0) DESC
    LIMIT {limit}
    """


def retention_by_faculty_query() -> str:
    return f"""
    SELECT
        faculty,
        COUNT(*) as total_students,
        SUM(CASE WHEN student_status = 'ACTIVE' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN student_status = 'AT_RISK' THEN 1 ELSE 0 END) as at_risk_count,
        SUM(CASE WHEN student_status = 'WITHDRAWN' THEN 1 ELSE 0 END) as withdrawn_count,
        SUM(CASE WHEN student_status = 'GRADUATED' THEN 1 ELSE 0 END) as graduated_count,
        ROUND(
            SUM(CASE WHEN student_status IN ('ACTIVE', 'GRADUATED', 'ON_LEAVE') THEN 1 ELSE 0 END)
            * 100.0 / COUNT(*), 1
        ) as retention_rate_pct
    FROM {GOLD}.student_360
    GROUP BY faculty
    ORDER BY retention_rate_pct ASC
    """


def cohort_comparison_query(student_id: int) -> str:
    return f"""
    WITH student AS (
        SELECT student_id, faculty, program_name, cohort, gpa,
               pass_rate_pct, total_lms_activities, total_lms_minutes
        FROM {GOLD}.student_360
        WHERE student_id = {student_id}
    ),
    cohort AS (
        SELECT
            ROUND(AVG(gpa), 2) as cohort_avg_gpa,
            ROUND(AVG(pass_rate_pct), 1) as cohort_avg_pass_rate,
            ROUND(AVG(total_lms_activities), 0) as cohort_avg_lms_activities,
            ROUND(AVG(total_lms_minutes), 0) as cohort_avg_lms_minutes,
            COUNT(*) as cohort_size
        FROM {GOLD}.student_360
        WHERE faculty = (SELECT faculty FROM student)
          AND cohort = (SELECT cohort FROM student)
    )
    SELECT
        s.gpa as student_gpa,
        c.cohort_avg_gpa,
        s.pass_rate_pct as student_pass_rate,
        c.cohort_avg_pass_rate,
        s.total_lms_activities as student_lms_activities,
        c.cohort_avg_lms_activities,
        s.total_lms_minutes as student_lms_minutes,
        c.cohort_avg_lms_minutes,
        c.cohort_size
    FROM student s, cohort c
    """


def risk_drivers_query() -> str:
    return f"""
    SELECT
        'GPA' as metric,
        ROUND(AVG(CASE WHEN student_status = 'AT_RISK' THEN gpa END), 2) as at_risk_avg,
        ROUND(AVG(CASE WHEN student_status = 'ACTIVE' THEN gpa END), 2) as healthy_avg,
        '{GPA_SCALE_LABEL}' as unit
    FROM {GOLD}.student_360
    UNION ALL
    SELECT 'Pass Rate', ROUND(AVG(CASE WHEN student_status = 'AT_RISK' THEN pass_rate_pct END), 1),
        ROUND(AVG(CASE WHEN student_status = 'ACTIVE' THEN pass_rate_pct END), 1), '%'
    FROM {GOLD}.student_360
    UNION ALL
    SELECT 'LMS Activities', ROUND(AVG(CASE WHEN student_status = 'AT_RISK' THEN total_lms_activities END), 0),
        ROUND(AVG(CASE WHEN student_status = 'ACTIVE' THEN total_lms_activities END), 0), 'count'
    FROM {GOLD}.student_360
    UNION ALL
    SELECT 'LMS Minutes', ROUND(AVG(CASE WHEN student_status = 'AT_RISK' THEN total_lms_minutes END), 0),
        ROUND(AVG(CASE WHEN student_status = 'ACTIVE' THEN total_lms_minutes END), 0), 'mins'
    FROM {GOLD}.student_360
    UNION ALL
    SELECT 'Support Interactions', ROUND(AVG(CASE WHEN student_status = 'AT_RISK' THEN total_support_interactions END), 1),
        ROUND(AVG(CASE WHEN student_status = 'ACTIVE' THEN total_support_interactions END), 1), 'count'
    FROM {GOLD}.student_360
    UNION ALL
    SELECT 'Courses Failed', ROUND(AVG(CASE WHEN student_status = 'AT_RISK' THEN courses_failed END), 1),
        ROUND(AVG(CASE WHEN student_status = 'ACTIVE' THEN courses_failed END), 1), 'count'
    FROM {GOLD}.student_360
    """


def ai_insights_query() -> str:
    return f"""
    WITH drivers AS (
        SELECT
            ROUND(AVG(CASE WHEN student_status = 'AT_RISK' THEN pass_rate_pct END), 1) as atrisk_pass,
            ROUND(AVG(CASE WHEN student_status = 'ACTIVE' THEN pass_rate_pct END), 1) as healthy_pass,
            ROUND(AVG(CASE WHEN student_status = 'AT_RISK' THEN total_lms_activities END), 0) as atrisk_lms,
            ROUND(AVG(CASE WHEN student_status = 'ACTIVE' THEN total_lms_activities END), 0) as healthy_lms,
            ROUND(AVG(CASE WHEN student_status = 'AT_RISK' THEN total_lms_minutes END), 0) as atrisk_mins,
            ROUND(AVG(CASE WHEN student_status = 'ACTIVE' THEN total_lms_minutes END), 0) as healthy_mins,
            ROUND(AVG(CASE WHEN student_status = 'AT_RISK' THEN courses_failed END), 1) as atrisk_fails,
            ROUND(AVG(CASE WHEN student_status = 'ACTIVE' THEN courses_failed END), 1) as healthy_fails,
            ROUND(AVG(CASE WHEN student_status = 'AT_RISK' THEN total_support_interactions END), 1) as atrisk_support,
            ROUND(AVG(CASE WHEN student_status = 'ACTIVE' THEN total_support_interactions END), 1) as healthy_support,
            SUM(CASE WHEN student_status = 'AT_RISK' THEN 1 ELSE 0 END) as at_risk_count,
            SUM(CASE WHEN student_status = 'ACTIVE' THEN 1 ELSE 0 END) as active_count,
            SUM(CASE WHEN student_status = 'WITHDRAWN' THEN 1 ELSE 0 END) as withdrawn_count,
            ROUND(AVG(gpa), 2) as avg_gpa
        FROM {GOLD}.student_360
    )
    SELECT ai_query(
        'databricks-meta-llama-3-3-70b-instruct',
        CONCAT(
            'You are a university analytics AI advising a {LEADERSHIP_ROLE}. Analyze these key driver metrics comparing at-risk vs healthy students. ',
            'Return exactly 4 insights as a JSON array of objects with "icon" (one of: alert, trending-down, zap, shield, users, activity), "title" (max 6 words), and "body" (max 30 words, specific with numbers) fields. ',
            'Focus on the biggest gaps and actionable intervention opportunities. ',
            'At-risk students (', d.at_risk_count, '): pass_rate=', d.atrisk_pass, '%, lms_activities=', d.atrisk_lms, ', lms_minutes=', d.atrisk_mins, ', courses_failed=', d.atrisk_fails, ', support_interactions=', d.atrisk_support,
            '. Healthy students (', d.active_count, '): pass_rate=', d.healthy_pass, '%, lms_activities=', d.healthy_lms, ', lms_minutes=', d.healthy_mins, ', courses_failed=', d.healthy_fails, ', support_interactions=', d.healthy_support,
            '. Withdrawn: ', d.withdrawn_count, '. Avg institution GPA: ', d.avg_gpa,
            '. Return ONLY the JSON array, no other text.'
        )
    ) as insights
    FROM drivers d
    """


def enrollment_forecast_query() -> str:
    return f"""
    WITH historical AS (
        SELECT
            {HISTORICAL_TERM_DATE_SQL} AS ds,
            term_code,
            CAST(active_students AS DOUBLE) AS active_students,
            CAST(total_enrollments AS DOUBLE) AS total_enrollments
        FROM {GOLD}.term_trends
        ORDER BY ds
    ),
    forecasted AS (
        SELECT * FROM AI_FORECAST(
            TABLE(SELECT ds, active_students, total_enrollments FROM historical ORDER BY ds),
            horizon => '2028-08-01',
            time_col => 'ds',
            value_col => ARRAY('active_students', 'total_enrollments')
        )
    )
    SELECT
        h.term_code, h.ds,
        h.active_students, h.total_enrollments,
        NULL AS active_students_upper, NULL AS active_students_lower,
        NULL AS total_enrollments_upper, NULL AS total_enrollments_lower,
        false AS is_forecast
    FROM historical h
    UNION ALL
    SELECT
        {FORECAST_TERM_CODE_SQL},
        f.ds,
        f.active_students_forecast, f.total_enrollments_forecast,
        f.active_students_upper, f.active_students_lower,
        f.total_enrollments_upper, f.total_enrollments_lower,
        true AS is_forecast
    FROM forecasted f
    ORDER BY ds
    """


def intervention_plan_query(student_id: int) -> str:
    return f"""
    WITH student AS (
        SELECT s.*, p.risk_score, p.risk_category
        FROM {GOLD}.student_360 s
        LEFT JOIN {GOLD}.student_risk_predictions p ON s.student_id = p.student_id
        WHERE s.student_id = {student_id}
    )
    SELECT
        st.student_id,
        st.full_name AS student_name,
        ai_query(
            'databricks-meta-llama-3-3-70b-instruct',
            CONCAT(
                'You are a university student success advisor creating an intervention plan. ',
                'Analyze this student profile and return a JSON object (no markdown fences). ',
                'Schema: {{',
                '"intervention_type": "one of: Academic Tutoring, Peer Mentoring, Academic Advising, Counseling Referral, Financial Support, Career Guidance, Study Skills Workshop, Academic Probation Meeting",',
                '"urgency": "one of: Critical, High, Medium, Low",',
                '"summary": "2-3 sentence assessment of the student situation",',
                '"risk_factors": ["list of 3-5 specific risk factors identified from data"],',
                '"meeting_agenda": ["list of 4-5 agenda items for the intervention meeting"],',
                '"talking_points": ["list of 3-4 specific talking points tailored to this student, referencing their actual data"],',
                '"action_items": ["list of 4-6 concrete action items with owners (student/advisor/support)"],',
                '"referrals": ["list of relevant campus services to refer to, with reason"],',
                '"follow_up_schedule": "specific follow-up timeline e.g. Weekly check-ins for 4 weeks, then bi-weekly",',
                '"success_criteria": "measurable criteria e.g. GPA above {DE_RISKED_GPA:g} by end of {"Fall 2026" if IS_US_DEMO else "S2 2026"}, LMS engagement above 50 activities/month"',
                '}}',
                ' Student Profile: ',
                'Name: ', st.full_name,
                ', Age: ', COALESCE(CAST(st.age AS STRING), 'N/A'),
                ', Gender: ', COALESCE(st.gender, 'Unknown'),
                ', Status: ', st.student_status,
                ', GPA: ', COALESCE(CAST(st.gpa AS STRING), 'N/A'), ' ({GPA_SCALE_LABEL})',
                ', Avg Grade Point: ', COALESCE(CAST(st.avg_grade_point AS STRING), 'N/A'),
                ', Program: ', COALESCE(st.program_name, 'Unknown'),
                ', Program Code: ', COALESCE(st.program_code, 'Unknown'),
                ', Program Level: ', COALESCE(st.program_level, 'Unknown'),
                ', {ORG_UNIT_LABEL}: ', COALESCE(st.faculty, 'Unknown'),
                ', Campus: ', COALESCE(st.campus, 'Unknown'),
                ', Cohort: ', COALESCE(st.cohort, 'Unknown'),
                ', Enrollment Date: ', COALESCE(CAST(st.enrollment_date AS STRING), 'Unknown'),
                ', Terms Enrolled: ', COALESCE(CAST(st.terms_enrolled AS STRING), '0'),
                ', Risk Level: ', COALESCE(st.risk_level, 'Unknown'),
                ', ML Risk Score: ', COALESCE(CAST(st.risk_score AS STRING), 'N/A'),
                ', Risk Category: ', COALESCE(st.risk_category, 'Unknown'),
                ', Total Enrollments: ', COALESCE(CAST(st.total_enrollments AS STRING), '0'),
                ', Courses Passed: ', COALESCE(CAST(st.courses_passed AS STRING), '0'),
                ', Courses Failed: ', COALESCE(CAST(st.courses_failed AS STRING), '0'),
                ', Courses Withdrawn: ', COALESCE(CAST(st.courses_withdrawn AS STRING), '0'),
                ', Pass Rate: ', COALESCE(CAST(st.pass_rate_pct AS STRING), '0'), '%',
                ', Credits Earned: ', COALESCE(CAST(st.total_credits_earned AS STRING), '0'),
                ', Credits Required: ', COALESCE(CAST(st.credit_points_required AS STRING), '0'),
                ', Degree Completion: ', COALESCE(CAST(st.degree_completion_pct AS STRING), '0'), '%',
                ', LMS Activities: ', COALESCE(CAST(st.total_lms_activities AS STRING), '0'),
                ', LMS Minutes: ', COALESCE(CAST(st.total_lms_minutes AS STRING), '0'),
                ', LMS Active Days: ', COALESCE(CAST(st.lms_active_days AS STRING), '0'),
                ', Avg Session Duration: ', COALESCE(CAST(st.avg_session_duration AS STRING), '0'), ' mins',
                ', Lectures Viewed: ', COALESCE(CAST(st.lectures_viewed AS STRING), '0'),
                ', Forum Posts: ', COALESCE(CAST(st.forum_posts AS STRING), '0'),
                ', Support Sessions: ', COALESCE(CAST(st.total_support_interactions AS STRING), '0'),
                ', Mental Health Sessions: ', COALESCE(CAST(st.mental_health_interactions AS STRING), '0'),
                ', Pending Follow-ups: ', COALESCE(CAST(st.pending_follow_ups AS STRING), '0'),
                ', Last Support Date: ', COALESCE(CAST(st.last_support_date AS STRING), 'None'),
                ', Domestic/International: ', COALESCE(st.domestic_international, 'Unknown'),
                ', Country of Origin: ', COALESCE(st.country_of_origin, 'Unknown'),
                ', {FIRST_GEN_LABEL}: ', CAST(COALESCE(st.first_in_family, false) AS STRING),
                ', Financial Aid: ', CAST(COALESCE(st.financial_aid, false) AS STRING),
                '. Return ONLY the JSON object, no other text.'
            )
        ) AS plan_json
    FROM student st
    """


def outreach_email_query(student_id: int, tone: str, intervention_context: str) -> str:
    safe_tone = tone.replace("'", "''")
    safe_context = intervention_context.replace("'", "''")[:2000]
    return f"""
    WITH student AS (
        SELECT s.*
        FROM {GOLD}.student_360 s
        WHERE s.student_id = {student_id}
    )
    SELECT
        st.student_id,
        st.full_name AS student_name,
        st.email AS student_email,
        ai_query(
            'databricks-meta-llama-3-3-70b-instruct',
            CONCAT(
                'You are a caring university academic advisor writing an outreach email to a student. ',
                'Tone: {safe_tone}. ',
                'Tone guidelines: ',
                'empathetic = warm, understanding, non-judgmental, focuses on support available; ',
                'formal = professional, structured, references policies and deadlines; ',
                'nudge = friendly, brief, encouraging, light touch check-in. ',
                'Return a JSON object (no markdown fences): {{',
                '"subject": "email subject line",',
                '"body": "full email body. CRITICAL FORMATTING: Use \\n for EVERY line break. Use \\n\\n for paragraph breaks. The email MUST have this structure with line breaks between each part:\\nDear [First Name],\\n\\n[Opening paragraph - 2 sentences showing care]\\n\\n[Observations paragraph - reference their data naturally, 2-3 sentences]\\n\\n[Resources section:]\\n- [Resource 1]\\n- [Resource 2]\\n- [Resource 3]\\n\\n[Call to action - 1-2 sentences with specific next step]\\n\\n[Warm closing sentence]\\n\\nWarm regards,\\n[Your Name]\\nStudent Success Team\\n[{ORG_UNIT_LABEL} name]\\nPhone: {"(555) 010-2026" if IS_US_DEMO else "02 XXXX XXXX"}\\nEmail: {"studentsuccess@pacificstate.edu" if IS_US_DEMO else "studentsuccess@uni.edu.au"}. For international students mention international student support. For {FIRST_GEN_LABEL.lower()} students mention peer mentoring. Keep paragraphs short."',
                '}}',
                ' Student: ', st.full_name,
                ', Age: ', COALESCE(CAST(st.age AS STRING), 'N/A'),
                ', Email: ', st.email,
                ', Program: ', COALESCE(st.program_name, 'Unknown'),
                ', Program Level: ', COALESCE(st.program_level, 'Unknown'),
                ', {ORG_UNIT_LABEL}: ', COALESCE(st.faculty, 'Unknown'),
                ', Campus: ', COALESCE(st.campus, 'Unknown'),
                ', GPA: ', COALESCE(CAST(st.gpa AS STRING), 'N/A'), ' ({GPA_SCALE_LABEL})',
                ', Pass Rate: ', COALESCE(CAST(st.pass_rate_pct AS STRING), '0'), '%',
                ', Courses Failed: ', COALESCE(CAST(st.courses_failed AS STRING), '0'),
                ', Degree Completion: ', COALESCE(CAST(st.degree_completion_pct AS STRING), '0'), '%',
                ', Status: ', st.student_status,
                ', Risk Level: ', COALESCE(st.risk_level, 'Unknown'),
                ', Domestic/International: ', COALESCE(st.domestic_international, 'Unknown'),
                ', Country of Origin: ', COALESCE(st.country_of_origin, 'Unknown'),
                ', {FIRST_GEN_LABEL}: ', CAST(COALESCE(st.first_in_family, false) AS STRING),
                ', Financial Aid: ', CAST(COALESCE(st.financial_aid, false) AS STRING),
                ', LMS Activities: ', COALESCE(CAST(st.total_lms_activities AS STRING), '0'),
                ', LMS Active Days: ', COALESCE(CAST(st.lms_active_days AS STRING), '0'),
                ', Lectures Viewed: ', COALESCE(CAST(st.lectures_viewed AS STRING), '0'),
                ', Support Sessions: ', COALESCE(CAST(st.total_support_interactions AS STRING), '0'),
                ', Mental Health Sessions: ', COALESCE(CAST(st.mental_health_interactions AS STRING), '0'),
                ', Pending Follow-ups: ', COALESCE(CAST(st.pending_follow_ups AS STRING), '0'),
                CASE WHEN LENGTH('{safe_context}') > 5
                    THEN CONCAT('. Intervention Plan Context: {safe_context}')
                    ELSE ''
                END,
                '. Return ONLY the JSON object.'
            )
        ) AS email_json
    FROM student st
    """


def effectiveness_comparison_query(intervened_ids: list[int]) -> str:
    if not intervened_ids:
        return f"""
        SELECT
            0 as intervened_count, COUNT(*) as not_intervened_count,
            NULL as intervened_avg_gpa, ROUND(AVG(gpa), 2) as not_intervened_avg_gpa,
            NULL as intervened_pass_rate, ROUND(AVG(pass_rate_pct), 1) as not_intervened_pass_rate,
            NULL as intervened_retention_pct,
            ROUND(SUM(CASE WHEN student_status IN ('ACTIVE','GRADUATED','ON_LEAVE','AT_RISK') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as not_intervened_retention_pct,
            NULL as intervened_avg_lms, ROUND(AVG(total_lms_activities), 0) as not_intervened_avg_lms
        FROM {GOLD}.student_360
        WHERE student_status IN ('AT_RISK', 'ACTIVE')
        """
    ids_str = ",".join(str(i) for i in intervened_ids)
    return f"""
    SELECT
        SUM(CASE WHEN student_id IN ({ids_str}) THEN 1 ELSE 0 END) as intervened_count,
        SUM(CASE WHEN student_id NOT IN ({ids_str}) THEN 1 ELSE 0 END) as not_intervened_count,
        ROUND(AVG(CASE WHEN student_id IN ({ids_str}) THEN gpa END), 2) as intervened_avg_gpa,
        ROUND(AVG(CASE WHEN student_id NOT IN ({ids_str}) THEN gpa END), 2) as not_intervened_avg_gpa,
        ROUND(AVG(CASE WHEN student_id IN ({ids_str}) THEN pass_rate_pct END), 1) as intervened_pass_rate,
        ROUND(AVG(CASE WHEN student_id NOT IN ({ids_str}) THEN pass_rate_pct END), 1) as not_intervened_pass_rate,
        ROUND(
            SUM(CASE WHEN student_id IN ({ids_str}) AND student_status IN ('ACTIVE','GRADUATED','ON_LEAVE','AT_RISK') THEN 1 ELSE 0 END)
            * 100.0 / NULLIF(SUM(CASE WHEN student_id IN ({ids_str}) THEN 1 ELSE 0 END), 0), 1
        ) as intervened_retention_pct,
        ROUND(
            SUM(CASE WHEN student_id NOT IN ({ids_str}) AND student_status IN ('ACTIVE','GRADUATED','ON_LEAVE','AT_RISK') THEN 1 ELSE 0 END)
            * 100.0 / NULLIF(SUM(CASE WHEN student_id NOT IN ({ids_str}) THEN 1 ELSE 0 END), 0), 1
        ) as not_intervened_retention_pct,
        ROUND(AVG(CASE WHEN student_id IN ({ids_str}) THEN total_lms_activities END), 0) as intervened_avg_lms,
        ROUND(AVG(CASE WHEN student_id NOT IN ({ids_str}) THEN total_lms_activities END), 0) as not_intervened_avg_lms
    FROM {GOLD}.student_360
    WHERE student_status IN ('AT_RISK', 'ACTIVE', 'ON_LEAVE')
    """


def effectiveness_by_equity_query(intervened_ids: list[int]) -> str:
    if not intervened_ids:
        return "SELECT 'No data' as grp, NULL as intervened_pass_rate, NULL as not_intervened_pass_rate, NULL as gap_pp, 0 as count"
    ids_str = ",".join(str(i) for i in intervened_ids)
    return f"""
    SELECT grp as group, intervened_pass_rate, not_intervened_pass_rate,
           ROUND(intervened_pass_rate - not_intervened_pass_rate, 1) as gap_pp, cnt as count
    FROM (
        SELECT '{FIRST_GEN_LABEL}' as grp,
            ROUND(AVG(CASE WHEN student_id IN ({ids_str}) AND first_in_family = true THEN pass_rate_pct END), 1) as intervened_pass_rate,
            ROUND(AVG(CASE WHEN student_id NOT IN ({ids_str}) AND first_in_family = true THEN pass_rate_pct END), 1) as not_intervened_pass_rate,
            SUM(CASE WHEN first_in_family = true THEN 1 ELSE 0 END) as cnt
        FROM {GOLD}.student_360 WHERE student_status IN ('AT_RISK', 'ACTIVE', 'ON_LEAVE')
        UNION ALL
        SELECT 'International',
            ROUND(AVG(CASE WHEN student_id IN ({ids_str}) AND domestic_international = 'International' THEN pass_rate_pct END), 1),
            ROUND(AVG(CASE WHEN student_id NOT IN ({ids_str}) AND domestic_international = 'International' THEN pass_rate_pct END), 1),
            SUM(CASE WHEN domestic_international = 'International' THEN 1 ELSE 0 END)
        FROM {GOLD}.student_360 WHERE student_status IN ('AT_RISK', 'ACTIVE', 'ON_LEAVE')
        UNION ALL
        SELECT 'Domestic',
            ROUND(AVG(CASE WHEN student_id IN ({ids_str}) AND domestic_international = 'Domestic' THEN pass_rate_pct END), 1),
            ROUND(AVG(CASE WHEN student_id NOT IN ({ids_str}) AND domestic_international = 'Domestic' THEN pass_rate_pct END), 1),
            SUM(CASE WHEN domestic_international = 'Domestic' THEN 1 ELSE 0 END)
        FROM {GOLD}.student_360 WHERE student_status IN ('AT_RISK', 'ACTIVE', 'ON_LEAVE')
        UNION ALL
        SELECT 'Financial Aid',
            ROUND(AVG(CASE WHEN student_id IN ({ids_str}) AND financial_aid = true THEN pass_rate_pct END), 1),
            ROUND(AVG(CASE WHEN student_id NOT IN ({ids_str}) AND financial_aid = true THEN pass_rate_pct END), 1),
            SUM(CASE WHEN financial_aid = true THEN 1 ELSE 0 END)
        FROM {GOLD}.student_360 WHERE student_status IN ('AT_RISK', 'ACTIVE', 'ON_LEAVE')
    )
    """


def effectiveness_ai_summary_query(intervened_ids: list[int]) -> str:
    if not intervened_ids:
        return "SELECT 'No interventions logged yet. Send outreach via AI Actions to start tracking effectiveness.' as summary"
    ids_str = ",".join(str(i) for i in intervened_ids)
    return f"""
    WITH metrics AS (
        SELECT
            SUM(CASE WHEN student_id IN ({ids_str}) THEN 1 ELSE 0 END) as intervened_n,
            ROUND(AVG(CASE WHEN student_id IN ({ids_str}) THEN gpa END), 2) as int_gpa,
            ROUND(AVG(CASE WHEN student_id NOT IN ({ids_str}) THEN gpa END), 2) as noint_gpa,
            ROUND(AVG(CASE WHEN student_id IN ({ids_str}) THEN pass_rate_pct END), 1) as int_pass,
            ROUND(AVG(CASE WHEN student_id NOT IN ({ids_str}) THEN pass_rate_pct END), 1) as noint_pass,
            ROUND(AVG(CASE WHEN student_id IN ({ids_str}) THEN total_lms_activities END), 0) as int_lms,
            ROUND(AVG(CASE WHEN student_id NOT IN ({ids_str}) THEN total_lms_activities END), 0) as noint_lms,
            ROUND(AVG(CASE WHEN student_id IN ({ids_str}) AND first_in_family = true THEN pass_rate_pct END), 1) as int_fif_pass,
            ROUND(AVG(CASE WHEN student_id NOT IN ({ids_str}) AND first_in_family = true THEN pass_rate_pct END), 1) as noint_fif_pass,
            ROUND(AVG(CASE WHEN student_id IN ({ids_str}) AND domestic_international = 'International' THEN pass_rate_pct END), 1) as int_intl_pass,
            ROUND(AVG(CASE WHEN student_id NOT IN ({ids_str}) AND domestic_international = 'International' THEN pass_rate_pct END), 1) as noint_intl_pass
        FROM {GOLD}.student_360
        WHERE student_status IN ('AT_RISK', 'ACTIVE', 'ON_LEAVE')
    )
    SELECT ai_query(
        'databricks-meta-llama-3-3-70b-instruct',
        CONCAT(
            'You are a university analytics advisor writing a brief intervention effectiveness summary for a {LEADERSHIP_ROLE}. ',
            'Write 3-4 sentences summarizing the impact. Be specific with numbers. Mention equity groups if relevant. ',
            'Intervened students (', m.intervened_n, '): avg GPA=', m.int_gpa, ', pass rate=', m.int_pass, '%, LMS activities=', m.int_lms,
            '. Non-intervened at-risk: avg GPA=', m.noint_gpa, ', pass rate=', m.noint_pass, '%, LMS activities=', m.noint_lms,
            '. {FIRST_GEN_LABEL} intervened pass rate=', COALESCE(CAST(m.int_fif_pass AS STRING), 'N/A'),
            '% vs non-intervened=', COALESCE(CAST(m.noint_fif_pass AS STRING), 'N/A'),
            '%. International intervened pass rate=', COALESCE(CAST(m.int_intl_pass AS STRING), 'N/A'),
            '% vs non-intervened=', COALESCE(CAST(m.noint_intl_pass AS STRING), 'N/A'),
            '%. Return ONLY the summary text, no JSON.'
        )
    ) as summary
    FROM metrics m
    """


def intervention_outcomes_query() -> str:
    return f"""
    WITH at_risk AS (
        SELECT
            s.student_id, s.full_name, s.faculty, s.program_name,
            s.domestic_international, s.first_in_family,
            s.gpa, s.pass_rate_pct, s.total_lms_activities,
            s.risk_level, s.student_status,
            p.risk_score,
            -- Simulate intervention type based on student profile
            CASE
                WHEN s.total_lms_activities < 20 THEN 'Academic Tutoring'
                WHEN s.mental_health_interactions > 2 THEN 'Counseling Referral'
                WHEN s.courses_failed >= 3 THEN 'Academic Probation Meeting'
                WHEN s.first_in_family = true THEN 'Peer Mentoring'
                WHEN s.domestic_international = 'International' THEN 'International Support'
                ELSE 'Academic Advising'
            END AS intervention_type,
            -- Simulate improvement (seeded by student_id for consistency)
            -- Students with higher support interactions improve more
            ROUND(s.gpa + (0.3 + (s.student_id % 7) * 0.15) *
                CASE WHEN s.total_support_interactions > 3 THEN 1.3 ELSE 0.8 END, 2
            ) AS gpa_after_raw,
            ROUND(s.pass_rate_pct + (5 + (s.student_id % 11) * 2.5) *
                CASE WHEN s.total_lms_activities > 15 THEN 1.2 ELSE 0.7 END, 1
            ) AS pass_rate_after_raw,
            CAST(s.total_lms_activities + (10 + (s.student_id % 13) * 5) AS INT) AS lms_after_raw
        FROM {GOLD}.student_360 s
        LEFT JOIN {GOLD}.student_risk_predictions p ON s.student_id = p.student_id
        WHERE s.student_status = 'AT_RISK'
        ORDER BY COALESCE(p.risk_score, 0) DESC
        LIMIT 40
    )
    SELECT
        student_id, full_name, faculty, program_name,
        domestic_international, first_in_family, intervention_type,
        gpa AS gpa_before,
        LEAST(gpa_after_raw, {GPA_MAX}) AS gpa_after,
        ROUND(LEAST(gpa_after_raw, {GPA_MAX}) - gpa, 2) AS gpa_change,
        pass_rate_pct AS pass_rate_before,
        LEAST(pass_rate_after_raw, 100.0) AS pass_rate_after,
        total_lms_activities AS lms_before,
        lms_after_raw AS lms_after,
        risk_level AS risk_before,
        CASE
            WHEN LEAST(gpa_after_raw, {GPA_MAX}) >= {DE_RISKED_GPA} AND LEAST(pass_rate_after_raw, 100.0) >= 60 THEN 'Low'
            WHEN LEAST(gpa_after_raw, {GPA_MAX}) >= {MEDIUM_RISK_GPA} THEN 'Medium'
            ELSE 'High'
        END AS risk_after,
        CASE
            WHEN LEAST(gpa_after_raw, {GPA_MAX}) >= {DE_RISKED_GPA} AND LEAST(pass_rate_after_raw, 100.0) >= 60 THEN 'de-risked'
            WHEN LEAST(gpa_after_raw, {GPA_MAX}) > gpa + 0.3 THEN 'improved'
            WHEN LEAST(gpa_after_raw, {GPA_MAX}) >= gpa - 0.1 THEN 'unchanged'
            ELSE 'declined'
        END AS outcome
    FROM at_risk
    """


def intervention_trend_query() -> str:
    return f"""
    WITH at_risk_base AS (
        SELECT student_id, gpa, pass_rate_pct, total_lms_activities,
               (student_id % 7) AS seed
        FROM {GOLD}.student_360
        WHERE student_status = 'AT_RISK'
        ORDER BY gpa ASC
        LIMIT 40
    ),
    months AS (
        SELECT 0 AS m, 'Baseline' AS label UNION ALL
        SELECT 1, 'Month 1' UNION ALL SELECT 2, 'Month 2' UNION ALL
        SELECT 3, 'Month 3' UNION ALL SELECT 4, 'Month 4' UNION ALL
        SELECT 5, 'Month 5' UNION ALL SELECT 6, 'Month 6'
    )
    SELECT
        mo.label AS month,
        ROUND(AVG(LEAST(b.gpa + (mo.m * (0.08 + b.seed * 0.02)), {GPA_MAX})), 2) AS avg_gpa,
        ROUND(AVG(LEAST(b.pass_rate_pct + (mo.m * (2.0 + b.seed * 0.8)), 100.0)), 1) AS avg_pass_rate,
        ROUND(AVG(b.total_lms_activities + (mo.m * (3 + b.seed))), 0) AS avg_lms_activities,
        CAST(SUM(CASE WHEN LEAST(b.gpa + (mo.m * (0.08 + b.seed * 0.02)), {GPA_MAX}) < {TREND_AT_RISK_GPA} THEN 1 ELSE 0 END) AS INT) AS at_risk_count,
        CAST(SUM(CASE WHEN mo.m > 0 AND LEAST(b.gpa + (mo.m * (0.08 + b.seed * 0.02)), {GPA_MAX}) >= {DE_RISKED_GPA} THEN 1 ELSE 0 END) AS INT) AS de_risked_cumulative
    FROM at_risk_base b
    CROSS JOIN months mo
    GROUP BY mo.m, mo.label
    ORDER BY mo.m
    """


def intervention_outcomes_ai_summary_query() -> str:
    return f"""
    WITH outcomes AS (
        SELECT
            COUNT(*) AS total,
            SUM(CASE
                WHEN LEAST(gpa + (0.3 + (student_id % 7) * 0.15) *
                    CASE WHEN total_support_interactions > 3 THEN 1.3 ELSE 0.8 END, {GPA_MAX}) >= {DE_RISKED_GPA}
                    AND LEAST(pass_rate_pct + (5 + (student_id % 11) * 2.5) *
                    CASE WHEN total_lms_activities > 15 THEN 1.2 ELSE 0.7 END, 100.0) >= 60
                THEN 1 ELSE 0 END) AS de_risked,
            ROUND(AVG(LEAST(gpa + (0.3 + (student_id % 7) * 0.15) *
                CASE WHEN total_support_interactions > 3 THEN 1.3 ELSE 0.8 END, {GPA_MAX}) - gpa), 2) AS avg_gpa_lift,
            ROUND(AVG(LEAST(pass_rate_pct + (5 + (student_id % 11) * 2.5) *
                CASE WHEN total_lms_activities > 15 THEN 1.2 ELSE 0.7 END, 100.0) - pass_rate_pct), 1) AS avg_pass_lift,
            SUM(CASE WHEN first_in_family = true THEN 1 ELSE 0 END) AS fif_count,
            SUM(CASE WHEN domestic_international = 'International' THEN 1 ELSE 0 END) AS intl_count
        FROM {GOLD}.student_360
        WHERE student_status = 'AT_RISK'
        LIMIT 40
    )
    SELECT ai_query(
        'databricks-meta-llama-3-3-70b-instruct',
        CONCAT(
            'You are a university provost''s analytics advisor. Write a 4-5 sentence executive summary of intervention outcomes for a board report. ',
            'Be specific with numbers and percentages. Highlight equity impact. ',
            'Data: ', o.total, ' at-risk students received interventions over 6 months. ',
            o.de_risked, ' were de-risked (moved to low risk). ',
            'Average GPA improvement: +', o.avg_gpa_lift, ' points ({GPA_SCALE_LABEL}). ',
            'Average pass rate improvement: +', o.avg_pass_lift, ' percentage points. ',
            o.fif_count, ' were {FIRST_GEN_LABEL.lower()} students. ',
            o.intl_count, ' were international students. ',
            'Return ONLY the summary paragraph, no JSON or markdown.'
        )
    ) AS summary
    FROM outcomes o
    """


def insert_intervention_log(student_id: int, student_name: str, tone: str, subject: str, intervention_type: str | None) -> str:
    safe_name = student_name.replace("'", "''")
    safe_subject = subject.replace("'", "''")
    safe_type = (intervention_type or "General Outreach").replace("'", "''")
    safe_tone = tone.replace("'", "''")
    return f"""
    MERGE INTO {GOLD}.intervention_log t
    USING (SELECT {student_id} AS student_id) s
    ON t.student_id = s.student_id
    WHEN MATCHED THEN UPDATE SET
        tone = '{safe_tone}',
        subject = '{safe_subject}',
        sent_at = current_timestamp(),
        status = 'outreach_sent',
        intervention_type = '{safe_type}',
        notes = array(CONCAT('Outreach email sent (', '{safe_tone}', ' tone): ', '{safe_subject}')),
        next_follow_up = NULL,
        resolved_at = NULL
    WHEN NOT MATCHED THEN INSERT
        (student_id, student_name, tone, subject, sent_at, status, intervention_type, notes)
    VALUES
        ({student_id}, '{safe_name}', '{safe_tone}', '{safe_subject}', current_timestamp(), 'outreach_sent', '{safe_type}',
         array(CONCAT('Outreach email sent (', '{safe_tone}', ' tone): ', '{safe_subject}')))
    """


def upsert_planning_intervention(
    student_id: int,
    student_name: str,
    intervention_type: str | None,
) -> str:
    """Insert a 'planning' row when the AI plan is first generated.
    Only inserts when there is no existing row for the student — does NOT downgrade
    a row that has already progressed past planning (e.g. outreach_sent)."""
    safe_name = student_name.replace("'", "''")
    safe_type = (intervention_type or "General Outreach").replace("'", "''")
    return f"""
    MERGE INTO {GOLD}.intervention_log t
    USING (SELECT {student_id} AS student_id) s
    ON t.student_id = s.student_id
    WHEN NOT MATCHED THEN INSERT
        (student_id, student_name, tone, subject, sent_at, status, intervention_type, notes)
    VALUES
        ({student_id}, '{safe_name}', NULL, NULL, current_timestamp(), 'planning', '{safe_type}',
         array(CONCAT('Plan generated: ', '{safe_type}')))
    """


def get_intervention_log_query() -> str:
    return f"SELECT * FROM {GOLD}.intervention_log ORDER BY sent_at DESC"


def update_case_status_query(student_id: int, status: str) -> str:
    safe_status = status.replace("'", "''")
    resolved_clause = ", resolved_at = current_timestamp()" if status == "resolved" else ""
    return f"""
    UPDATE {GOLD}.intervention_log
    SET status = '{safe_status}'{resolved_clause}
    WHERE student_id = {student_id}
    """


def add_case_note_query(student_id: int, note: str) -> str:
    safe_note = note.replace("'", "''")
    return f"""
    UPDATE {GOLD}.intervention_log
    SET notes = array_append(notes, CONCAT('[', date_format(current_timestamp(), 'dd MMM HH:mm'), '] ', '{safe_note}'))
    WHERE student_id = {student_id}
    """


def set_follow_up_query(student_id: int, follow_up: str) -> str:
    safe = follow_up.replace("'", "''")
    return f"""
    UPDATE {GOLD}.intervention_log
    SET next_follow_up = '{safe}'
    WHERE student_id = {student_id}
    """


# --- Governance Queries ---


def governance_tags_query() -> str:
    return f"""
    SELECT
        column_name,
        tag_name,
        tag_value
    FROM {CATALOG}.information_schema.column_tags
    WHERE schema_name = 'gold'
      AND table_name = 'student_360'
    ORDER BY column_name, tag_name
    """


def governance_table_tags_query() -> str:
    return f"""
    SELECT
        tag_name,
        tag_value
    FROM {CATALOG}.information_schema.table_tags
    WHERE schema_name = 'gold'
      AND table_name = 'student_360'
    ORDER BY tag_name
    """


def governance_masking_demo_query(student_id: int) -> str:
    """Full masking demo — returns both raw and masked values for comparison."""
    return f"""
    SELECT
        student_id,
        full_name,
        email AS email_privileged,
        {GOLD}.mask_email(email) AS email_masked,
        CAST(date_of_birth AS STRING) AS dob_privileged,
        {GOLD}.mask_dob(date_of_birth) AS dob_masked,
        student_national_id AS national_id_privileged,
        {GOLD}.mask_national_id(student_national_id) AS national_id_masked
    FROM {GOLD}.student_360
    WHERE student_id = {student_id}
    """


def governance_masking_demo_fallback_query(student_id: int) -> str:
    """Fallback when date_of_birth and student_national_id columns don't exist yet."""
    return f"""
    SELECT
        student_id,
        full_name,
        email AS email_privileged,
        {GOLD}.mask_email(email) AS email_masked,
        NULL AS dob_privileged,
        NULL AS dob_masked,
        NULL AS national_id_privileged,
        NULL AS national_id_masked
    FROM {GOLD}.student_360
    WHERE student_id = {student_id}
    """


def governance_advisor_view_query(faculty: str) -> str:
    """Simulates what a faculty advisor sees — masked PII, filtered to their faculty."""
    safe_faculty = faculty.replace("'", "''")
    return f"""
    SELECT
        COUNT(*) AS student_count,
        ROUND(AVG(gpa), 2) AS avg_gpa,
        SUM(CASE WHEN student_status = 'AT_RISK' THEN 1 ELSE 0 END) AS at_risk_count,
        SUM(CASE WHEN domestic_international = 'International' THEN 1 ELSE 0 END) AS international_count
    FROM {GOLD}.student_360
    WHERE faculty = '{safe_faculty}'
    """


def governance_advisor_sample_query(faculty: str) -> str:
    """Sample masked student records as a faculty advisor would see them."""
    safe_faculty = faculty.replace("'", "''")
    return f"""
    SELECT
        student_id,
        full_name,
        CONCAT(LEFT(email, 2), '****@', SPLIT(email, '@')[1]) AS email,
        CASE WHEN date_of_birth IS NOT NULL
            THEN CONCAT(LEFT(CAST(date_of_birth AS STRING), 4), '-**-**')
            ELSE '****-**-**'
        END AS date_of_birth,
        CASE WHEN student_national_id IS NOT NULL
            THEN CONCAT('***-***-', RIGHT(student_national_id, 3))
            ELSE '***-***-***'
        END AS student_national_id,
        program_name,
        gpa,
        student_status,
        risk_level
    FROM {GOLD}.student_360
    WHERE faculty = '{safe_faculty}'
    ORDER BY gpa ASC
    LIMIT 5
    """


def governance_row_filter_counts_query() -> str:
    return f"""
    SELECT
        faculty,
        COUNT(*) AS student_count
    FROM {GOLD}.student_360
    GROUP BY faculty
    ORDER BY student_count DESC
    """


def executive_metrics_query() -> str:
    return f"""
    WITH metrics AS (
        SELECT
            COUNT(*) as total_students,
            SUM(CASE WHEN student_status = 'ACTIVE' THEN 1 ELSE 0 END) as active_students,
            SUM(CASE WHEN student_status = 'AT_RISK' THEN 1 ELSE 0 END) as at_risk_students,
            SUM(CASE WHEN student_status = 'WITHDRAWN' THEN 1 ELSE 0 END) as withdrawn_students,
            SUM(CASE WHEN student_status = 'GRADUATED' THEN 1 ELSE 0 END) as graduated_students,
            ROUND(AVG(gpa), 2) as avg_gpa,
            ROUND(
                SUM(CASE WHEN student_status IN ('ACTIVE', 'GRADUATED', 'ON_LEAVE', 'AT_RISK') THEN 1 ELSE 0 END)
                * 100.0 / COUNT(*), 1
            ) as retention_rate_pct,
            ROUND(
                SUM(CASE WHEN student_status = 'WITHDRAWN' THEN 1 ELSE 0 END)
                * 100.0 / COUNT(*), 1
            ) as attrition_rate_pct,
            ROUND(
                SUM(CASE WHEN student_status = 'GRADUATED' THEN 1 ELSE 0 END)
                * 100.0 / NULLIF(SUM(CASE WHEN student_status IN ('GRADUATED', 'WITHDRAWN') THEN 1 ELSE 0 END), 0), 1
            ) as completion_rate_pct,
            SUM(CASE
                WHEN student_status = 'AT_RISK' AND domestic_international = 'International' THEN {INTERNATIONAL_TUITION}
                WHEN student_status = 'AT_RISK' AND domestic_international = 'Domestic' THEN {DOMESTIC_TUITION}
                ELSE 0
            END) as revenue_at_risk,
            SUM(CASE
                WHEN student_status = 'WITHDRAWN' AND domestic_international = 'International' THEN {INTERNATIONAL_TUITION}
                WHEN student_status = 'WITHDRAWN' AND domestic_international = 'Domestic' THEN {DOMESTIC_TUITION}
                ELSE 0
            END) as revenue_lost,
            SUM(CASE WHEN domestic_international = 'International' THEN 1 ELSE 0 END) as international_total,
            SUM(CASE WHEN domestic_international = 'International' AND student_status = 'AT_RISK' THEN 1 ELSE 0 END) as international_at_risk,
            ROUND(AVG(CASE WHEN first_in_family = true THEN pass_rate_pct END), 1) as first_in_family_pass_rate,
            ROUND(AVG(CASE WHEN first_in_family = false THEN pass_rate_pct END), 1) as continuing_family_pass_rate,
            ROUND(AVG(CASE WHEN total_support_interactions > 0 THEN pass_rate_pct END), 1) as supported_student_pass_rate,
            ROUND(AVG(CASE WHEN total_support_interactions = 0 OR total_support_interactions IS NULL THEN pass_rate_pct END), 1) as unsupported_student_pass_rate,
            SUM(total_support_interactions) as total_interventions,
            ROUND(AVG(pass_rate_pct), 1) as avg_pass_rate
        FROM {GOLD}.student_360
    )
    SELECT * FROM metrics
    """
