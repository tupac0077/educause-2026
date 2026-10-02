from pydantic import BaseModel
from .. import __version__


# --- Governance Models ---


class ColumnTag(BaseModel):
    column_name: str
    tag_name: str
    tag_value: str


class TableTag(BaseModel):
    tag_name: str
    tag_value: str


class MaskingDemo(BaseModel):
    student_id: int
    full_name: str | None = None
    email_privileged: str | None = None
    email_masked: str | None = None
    dob_privileged: str | None = None
    dob_masked: str | None = None
    national_id_privileged: str | None = None
    national_id_masked: str | None = None


class FacultyRowCount(BaseModel):
    faculty: str
    student_count: int


class AdvisorViewStats(BaseModel):
    faculty: str
    student_count: int = 0
    avg_gpa: float | None = None
    at_risk_count: int = 0
    international_count: int = 0


class AdvisorSampleRow(BaseModel):
    student_id: int
    full_name: str | None = None
    email: str | None = None
    date_of_birth: str | None = None
    student_national_id: str | None = None
    program_name: str | None = None
    gpa: float | None = None
    student_status: str | None = None
    risk_level: str | None = None


class AdvisorView(BaseModel):
    persona: str
    faculty: str | None = None
    stats: AdvisorViewStats | None = None
    sample_students: list[AdvisorSampleRow] = []


class GovernanceOverview(BaseModel):
    column_tags: list[ColumnTag]
    table_tags: list[TableTag]
    masking_demo: MaskingDemo | None = None
    row_filter_counts: list[FacultyRowCount]
    current_user: str | None = None


class VersionOut(BaseModel):
    version: str

    @classmethod
    def from_metadata(cls):
        return cls(version=__version__)


# --- Student Models ---


class StudentSummary(BaseModel):
    student_id: int
    full_name: str
    email: str
    program_name: str | None = None
    faculty: str | None = None
    campus: str | None = None
    student_status: str | None = None
    gpa: float | None = None
    risk_level: str | None = None
    risk_score: float | None = None
    risk_category: str | None = None
    pass_rate_pct: float | None = None
    courses_failed: int | None = None
    total_lms_activities: int | None = None


class Student360Detail(BaseModel):
    student_id: int
    full_name: str
    email: str
    age: int | None = None
    gender: str | None = None
    domestic_international: str | None = None
    country_of_origin: str | None = None
    campus: str | None = None
    student_status: str | None = None
    enrollment_date: str | None = None
    cohort: str | None = None
    gpa: float | None = None
    financial_aid: bool | None = None
    first_in_family: bool | None = None
    program_name: str | None = None
    program_code: str | None = None
    faculty: str | None = None
    program_level: str | None = None
    credit_points_required: int | None = None
    total_enrollments: int | None = None
    courses_passed: int | None = None
    courses_failed: int | None = None
    courses_withdrawn: int | None = None
    avg_grade_point: float | None = None
    total_credits_earned: int | None = None
    degree_completion_pct: float | None = None
    terms_enrolled: int | None = None
    pass_rate_pct: float | None = None
    total_lms_activities: int | None = None
    total_lms_minutes: int | None = None
    avg_session_duration: float | None = None
    lms_active_days: int | None = None
    lectures_viewed: int | None = None
    forum_posts: int | None = None
    total_support_interactions: int | None = None
    mental_health_interactions: int | None = None
    pending_follow_ups: int | None = None
    last_support_date: str | None = None
    risk_level: str | None = None
    risk_score: float | None = None
    risk_category: str | None = None
    predicted_at_risk: int | None = None


class SupportInteraction(BaseModel):
    interaction_id: int
    support_type: str
    interaction_date: str
    channel: str
    duration_minutes: int
    outcome: str
    notes: str | None = None
    follow_up_required: bool


class EnrollmentRecord(BaseModel):
    enrollment_id: int
    course_code: str | None = None
    course_name: str | None = None
    term_code: str | None = None
    grade: str | None = None
    mark: float | None = None
    grade_point: float | None = None
    credit_points_earned: int | None = None


# --- Course Models ---


class CourseAnalytics(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    faculty: str | None = None
    credit_points: int | None = None
    delivery_mode: str | None = None
    total_enrolled: int | None = None
    avg_mark: float | None = None
    avg_grade_point: float | None = None
    pass_count: int | None = None
    fail_count: int | None = None
    fail_rate_pct: float | None = None
    withdrawal_count: int | None = None


# --- Faculty Models ---


class FacultyPerformance(BaseModel):
    faculty: str
    program_level: str | None = None
    total_students: int | None = None
    avg_gpa: float | None = None
    at_risk_students: int | None = None
    withdrawn_students: int | None = None
    graduated_students: int | None = None
    graduation_rate_pct: float | None = None
    attrition_risk_pct: float | None = None
    international_students: int | None = None
    first_in_family_students: int | None = None


# --- Dashboard Models ---


class DashboardStats(BaseModel):
    total_students: int
    active_students: int
    at_risk_students: int
    avg_gpa: float
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int


class ExecutiveMetrics(BaseModel):
    total_students: int
    active_students: int
    at_risk_students: int
    withdrawn_students: int
    graduated_students: int
    avg_gpa: float
    retention_rate_pct: float
    attrition_rate_pct: float
    completion_rate_pct: float | None = None
    revenue_at_risk: int
    revenue_lost: int
    international_total: int
    international_at_risk: int
    first_in_family_pass_rate: float | None = None
    continuing_family_pass_rate: float | None = None
    supported_student_pass_rate: float | None = None
    unsupported_student_pass_rate: float | None = None
    total_interventions: int
    avg_pass_rate: float | None = None


class RiskDriver(BaseModel):
    metric: str
    at_risk_avg: float | None = None
    healthy_avg: float | None = None
    unit: str | None = None


class EnrollmentForecastPoint(BaseModel):
    term_code: str
    ds: str
    active_students: float | None = None
    total_enrollments: float | None = None
    active_students_upper: float | None = None
    active_students_lower: float | None = None
    total_enrollments_upper: float | None = None
    total_enrollments_lower: float | None = None
    is_forecast: bool = False


class ForecastPoint(BaseModel):
    term_code: str
    ds: str
    pass_rate: float | None = None
    fail_rate: float | None = None
    withdrawal_rate: float | None = None
    pass_rate_upper: float | None = None
    pass_rate_lower: float | None = None
    fail_rate_upper: float | None = None
    fail_rate_lower: float | None = None
    withdrawal_rate_upper: float | None = None
    withdrawal_rate_lower: float | None = None
    is_forecast: bool = False


class RiskDistribution(BaseModel):
    risk_category: str
    count: int


# --- Outreach / Early Alert Models ---


class OutreachStudent(BaseModel):
    student_id: int
    full_name: str
    email: str
    program_name: str | None = None
    faculty: str | None = None
    campus: str | None = None
    student_status: str | None = None
    gpa: float | None = None
    risk_level: str | None = None
    risk_score: float | None = None
    risk_category: str | None = None
    pass_rate_pct: float | None = None
    courses_failed: int | None = None
    total_lms_activities: int | None = None
    lms_active_days: int | None = None
    pending_follow_ups: int | None = None
    total_support_interactions: int | None = None
    recommended_action: str | None = None
    domestic_international: str | None = None
    first_in_family: bool | None = None


class RetentionByFaculty(BaseModel):
    faculty: str
    total_students: int
    active_count: int
    at_risk_count: int
    withdrawn_count: int
    graduated_count: int
    retention_rate_pct: float | None = None


# --- Intervention Planner Models ---


class InterventionRequest(BaseModel):
    student_id: int


class InterventionPlan(BaseModel):
    student_id: int
    student_name: str | None = None
    intervention_type: str | None = None
    urgency: str | None = None
    summary: str | None = None
    risk_factors: list[str] | None = None
    meeting_agenda: list[str] | None = None
    talking_points: list[str] | None = None
    action_items: list[str] | None = None
    referrals: list[str] | None = None
    follow_up_schedule: str | None = None
    success_criteria: str | None = None


# --- Outreach Composer Models ---


class OutreachRequest(BaseModel):
    student_id: int
    tone: str = "empathetic"  # empathetic, formal, nudge
    intervention_plan: str | None = None  # JSON string of the plan to base email on
    custom_context: str | None = None


class OutreachEmail(BaseModel):
    student_id: int
    student_name: str | None = None
    student_email: str | None = None
    subject: str | None = None
    body: str | None = None
    tone: str | None = None
    intervention_type: str | None = None


# --- Outreach Tracking / Intervention Case Models ---


class OutreachLogEntry(BaseModel):
    student_id: int
    student_name: str | None = None
    tone: str | None = None
    subject: str | None = None
    sent_at: str | None = None
    status: str = "outreach_sent"  # outreach_sent, student_responded, meeting_scheduled, follow_up_required, resolved
    intervention_type: str | None = None
    notes: list[str] | None = None
    next_follow_up: str | None = None
    resolved_at: str | None = None


class OutreachLogRequest(BaseModel):
    student_id: int
    student_name: str | None = None
    tone: str | None = None
    subject: str | None = None
    intervention_type: str | None = None


class CaseUpdateRequest(BaseModel):
    student_id: int
    status: str | None = None
    note: str | None = None
    next_follow_up: str | None = None


class EffectivenessMetrics(BaseModel):
    intervened_count: int = 0
    not_intervened_count: int = 0
    intervened_avg_gpa: float | None = None
    not_intervened_avg_gpa: float | None = None
    intervened_pass_rate: float | None = None
    not_intervened_pass_rate: float | None = None
    intervened_retention_pct: float | None = None
    not_intervened_retention_pct: float | None = None
    intervened_avg_lms: float | None = None
    not_intervened_avg_lms: float | None = None


class EffectivenessByType(BaseModel):
    intervention_type: str
    count: int = 0
    avg_gpa: float | None = None
    pass_rate: float | None = None
    resolved_count: int = 0


class EffectivenessByEquity(BaseModel):
    group: str
    intervened_pass_rate: float | None = None
    not_intervened_pass_rate: float | None = None
    gap_pp: float | None = None
    count: int = 0


# --- Intervention Outcomes Models ---


class OutcomeStudent(BaseModel):
    student_id: int
    full_name: str | None = None
    faculty: str | None = None
    program_name: str | None = None
    domestic_international: str | None = None
    first_in_family: bool | None = None
    intervention_type: str | None = None
    gpa_before: float | None = None
    gpa_after: float | None = None
    gpa_change: float | None = None
    pass_rate_before: float | None = None
    pass_rate_after: float | None = None
    lms_before: int | None = None
    lms_after: int | None = None
    risk_before: str | None = None
    risk_after: str | None = None
    outcome: str | None = None  # de-risked, improved, unchanged, declined


class OutcomeSummary(BaseModel):
    total_intervened: int = 0
    de_risked: int = 0
    improved: int = 0
    unchanged: int = 0
    declined: int = 0
    avg_gpa_lift: float | None = None
    avg_pass_rate_lift: float | None = None
    avg_lms_lift: float | None = None
    retention_rate: float | None = None


class OutcomeTrendPoint(BaseModel):
    month: str
    avg_gpa: float | None = None
    avg_pass_rate: float | None = None
    avg_lms_activities: float | None = None
    at_risk_count: int | None = None
    de_risked_cumulative: int | None = None


class OutcomeByFaculty(BaseModel):
    faculty: str
    intervened: int = 0
    de_risked: int = 0
    de_risked_pct: float | None = None
    avg_gpa_lift: float | None = None


class OutcomeByEquity(BaseModel):
    group: str
    intervened: int = 0
    de_risked: int = 0
    avg_gpa_lift: float | None = None
    avg_pass_rate_lift: float | None = None


# --- Genie Chat Models ---


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str | None = None
    sql_query: str | None = None
