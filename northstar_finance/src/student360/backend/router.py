import os

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.iam import User as UserOut

from .core import Dependencies, create_router
from .models import (
    AdvisorSampleRow,
    AdvisorView,
    AdvisorViewStats,
    ChatRequest,
    ChatResponse,
    ColumnTag,
    CourseAnalytics,
    DashboardStats,
    EnrollmentForecastPoint,
    EnrollmentRecord,
    ExecutiveMetrics,
    FacultyPerformance,
    FacultyRowCount,
    ForecastPoint,
    GovernanceOverview,
    InterventionPlan,
    InterventionRequest,
    MaskingDemo,
    OutcomeByEquity,
    OutcomeByFaculty,
    OutcomeStudent,
    OutcomeSummary,
    OutcomeTrendPoint,
    OutreachEmail,
    CaseUpdateRequest,
    EffectivenessByEquity,
    EffectivenessByType,
    EffectivenessMetrics,
    OutreachLogEntry,
    OutreachLogRequest,
    OutreachRequest,
    OutreachStudent,
    RetentionByFaculty,
    RiskDistribution,
    RiskDriver,
    Student360Detail,
    StudentSummary,
    SupportInteraction,
    TableTag,
    VersionOut,
)
from .sql import (
    DEFAULT_ADVISOR_ORG_UNIT,
    FIRST_GEN_LABEL,
    GOLD,
    ORG_UNIT_LABEL,
    ai_insights_query,
    cohort_comparison_query,
    course_analytics_query,
    dashboard_stats_query,
    enrollment_forecast_query,
    executive_metrics_query,
    faculties_list_query,
    faculty_performance_query,
    forecast_query,
    add_case_note_query,
    effectiveness_ai_summary_query,
    effectiveness_by_equity_query,
    effectiveness_comparison_query,
    get_intervention_log_query,
    insert_intervention_log,
    upsert_planning_intervention,
    intervention_outcomes_query,
    intervention_outcomes_ai_summary_query,
    intervention_plan_query,
    intervention_trend_query,
    set_follow_up_query,
    update_case_status_query,
    outreach_email_query,
    outreach_queue_query,
    retention_by_faculty_query,
    risk_distribution_query,
    risk_drivers_query,
    student_detail_query,
    student_enrollments_query,
    student_support_query,
    students_list_query,
    term_trends_query,
    governance_tags_query,
    governance_table_tags_query,
    governance_masking_demo_query,
    governance_masking_demo_fallback_query,
    governance_row_filter_counts_query,
    governance_advisor_view_query,
    governance_advisor_sample_query,
)

router = create_router()


def _org_unit_short_name(value: str | None) -> str:
    name = value or "Unknown"
    return name.replace("Faculty of ", "").replace("College of ", "")


def _execute_sql(ws: WorkspaceClient, query: str) -> list[dict]:
    """Execute SQL via the Statement Execution API and return rows as dicts."""
    import time

    from databricks.sdk.service.sql import StatementState

    warehouse_id = _get_warehouse_id(ws)
    response = ws.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=query,
        wait_timeout="50s",
    )
    statement_id = getattr(response, "statement_id", None)

    def _state_name(resp) -> str:
        raw_state = getattr(getattr(resp, "status", None), "state", None)
        if raw_state is None:
            return ""
        if hasattr(raw_state, "value"):
            return str(raw_state.value)
        return str(raw_state)

    state = _state_name(response).upper()
    deadline = time.time() + 120

    while statement_id and state in {"PENDING", "RUNNING"} and time.time() < deadline:
        time.sleep(2)
        response = ws.statement_execution.get_statement(statement_id)
        state = _state_name(response).upper()

    if state == str(StatementState.SUCCEEDED.value):
        if response.manifest and response.result:
            columns = [col.name for col in response.manifest.schema.columns]
            rows = []
            for data_array in response.result.data_array or []:
                row = {}
                for i, col_name in enumerate(columns):
                    row[col_name] = data_array[i] if i < len(data_array) else None
                rows.append(row)
            return rows
        return []

    if state in {str(StatementState.FAILED.value), str(StatementState.CANCELED.value), str(StatementState.CLOSED.value)}:
        raise RuntimeError(getattr(getattr(response, "status", None), "error", None) or f"SQL statement failed with state={state}")

    # Timeout or unknown terminal state; return empty to preserve API behavior.
    return []


_warehouse_cache: str | None = None


def _get_warehouse_id(ws: WorkspaceClient) -> str:
    global _warehouse_cache
    if _warehouse_cache:
        return _warehouse_cache
    configured_warehouse_id = os.getenv("DATABRICKS_WAREHOUSE_ID", "").strip()
    if configured_warehouse_id:
        _warehouse_cache = configured_warehouse_id
        return configured_warehouse_id
    warehouses = list(ws.warehouses.list())
    for wh in warehouses:
        if wh.state and wh.state.value == "RUNNING":
            _warehouse_cache = wh.id
            return wh.id
    if warehouses:
        _warehouse_cache = warehouses[0].id
        return warehouses[0].id
    raise RuntimeError("No SQL warehouse available")


def _cast_row(row: dict, model_cls: type) -> dict:
    """Cast string values from SQL API to the types expected by a Pydantic model."""
    import typing
    import types
    hints = typing.get_type_hints(model_cls)
    out = {}
    for key, value in row.items():
        if key not in hints:
            out[key] = value
            continue
        hint = hints[key]
        origin = typing.get_origin(hint)
        # Handle both typing.Optional/Union[...] and PEP 604 unions (int | None),
        # whose origin is types.UnionType (not typing.Union) on Python 3.10+.
        if origin is typing.Union or origin is getattr(types, "UnionType", None):
            args = [a for a in typing.get_args(hint) if a is not type(None)]
            target = args[0] if args else str
        else:
            target = hint

        if value is None:
            out[key] = None
        elif target == int:
            try:
                out[key] = int(float(value))
            except (ValueError, TypeError):
                out[key] = None
        elif target == float:
            try:
                out[key] = float(value)
            except (ValueError, TypeError):
                out[key] = None
        elif target == bool:
            out[key] = str(value).lower() in ("true", "1", "yes")
        else:
            out[key] = value
    return out


# --- Info ---


@router.get("/version", response_model=VersionOut, operation_id="version")
async def version():
    return VersionOut.from_metadata()


@router.get("/current-user", response_model=UserOut, operation_id="currentUser")
def me(user_ws: Dependencies.UserClient):
    return user_ws.current_user.me()


@router.get("/config", operation_id="appConfig")
def app_config(ws: Dependencies.Client):
    """Workspace-specific config for the frontend (host + org + catalog + resource IDs),
    all derived at runtime from env / the WorkspaceClient. Lets the built UI run on any
    workspace with no rebuild — only app.yml env changes per install."""
    return {
        "host": (ws.config.host or "").rstrip("/"),
        "org": os.getenv("WORKSPACE_ORG", "").strip(),
        "catalog": os.getenv("STUDENT360_CATALOG", "").strip(),
        "warehouse_id": os.getenv("DATABRICKS_WAREHOUSE_ID", "").strip(),
        "genie_finance": os.getenv("GENIE_SPACE_ID", "").strip(),
        "genie_advisor": os.getenv("ADVISOR_GENIE_SPACE_ID", "").strip(),
        "dash_financial_health": os.getenv("DASH_FINANCIAL_HEALTH", "").strip(),
        "dash_research_finance": os.getenv("DASH_RESEARCH_FINANCE", "").strip(),
        "dash_enrollment_finance": os.getenv("DASH_ENROLLMENT_FINANCE", "").strip(),
    }


# --- Governance ---


@router.get("/governance", response_model=GovernanceOverview, operation_id="governanceOverview")
def governance_overview(
    ws: Dependencies.Client,
    user_ws: Dependencies.UserClient,
    sample_student_id: int = 1,
):
    # Use app SP for metadata queries (tags, schemas)
    col_tag_rows = _execute_sql(ws, governance_tags_query())
    column_tags = [ColumnTag(**r) for r in col_tag_rows]

    tbl_tag_rows = _execute_sql(ws, governance_table_tags_query())
    table_tags = [TableTag(**r) for r in tbl_tag_rows]

    # Use OBO (user identity) for masking demo — shows what THIS user sees
    try:
        mask_rows = _execute_sql(user_ws, governance_masking_demo_query(sample_student_id))
    except Exception:
        try:
            mask_rows = _execute_sql(ws, governance_masking_demo_query(sample_student_id))
        except Exception:
            mask_rows = _execute_sql(ws, governance_masking_demo_fallback_query(sample_student_id))
    masking_demo = MaskingDemo(**mask_rows[0]) if mask_rows else None

    # Row filter counts via OBO — admin sees all, advisor sees only their faculty
    try:
        filter_rows = _execute_sql(user_ws, governance_row_filter_counts_query())
    except Exception:
        filter_rows = _execute_sql(ws, governance_row_filter_counts_query())
    row_filter_counts = [FacultyRowCount(**_cast_row(r, FacultyRowCount)) for r in filter_rows]

    # Get current user name for display
    current_user = None
    try:
        me = user_ws.current_user.me()
        current_user = me.display_name or me.user_name
    except Exception:
        pass

    return GovernanceOverview(
        column_tags=column_tags,
        table_tags=table_tags,
        masking_demo=masking_demo,
        row_filter_counts=row_filter_counts,
        current_user=current_user,
    )


@router.get("/governance/advisor-view", response_model=AdvisorView, operation_id="governanceAdvisorView")
def governance_advisor_view(
    ws: Dependencies.Client,
    faculty: str = DEFAULT_ADVISOR_ORG_UNIT,
):
    """Simulates what a faculty advisor sees — filtered and masked."""
    stats_rows = _execute_sql(ws, governance_advisor_view_query(faculty))
    stats = None
    if stats_rows:
        stats = AdvisorViewStats(faculty=faculty, **_cast_row(stats_rows[0], AdvisorViewStats))

    sample_rows = _execute_sql(ws, governance_advisor_sample_query(faculty))
    samples = [AdvisorSampleRow(**_cast_row(r, AdvisorSampleRow)) for r in sample_rows]

    return AdvisorView(
        persona=f"{_org_unit_short_name(faculty)} Advisor",
        faculty=faculty,
        stats=stats,
        sample_students=samples,
    )


# --- Dashboard ---


@router.get("/dashboard/stats", response_model=DashboardStats, operation_id="dashboardStats")
def dashboard_stats(ws: Dependencies.Client):
    rows = _execute_sql(ws, dashboard_stats_query())
    if not rows:
        return DashboardStats(
            total_students=0, active_students=0, at_risk_students=0,
            avg_gpa=0.0, high_risk_count=0, medium_risk_count=0, low_risk_count=0,
        )
    r = rows[0]
    risk_rows = _execute_sql(ws, risk_distribution_query())
    risk_map = {row["risk_category"]: int(row["count"] or 0) for row in risk_rows}
    return DashboardStats(
        total_students=int(r["total_students"] or 0),
        active_students=int(r["active_students"] or 0),
        at_risk_students=int(r["at_risk_students"] or 0),
        avg_gpa=round(float(r["avg_gpa"] or 0), 2),
        high_risk_count=risk_map.get("High", 0) + risk_map.get("Very High", 0),
        medium_risk_count=risk_map.get("Medium", 0),
        low_risk_count=risk_map.get("Low", 0) + risk_map.get("Very Low", 0),
    )


@router.get(
    "/dashboard/risk-distribution",
    response_model=list[RiskDistribution],
    operation_id="riskDistribution",
)
def risk_distribution(ws: Dependencies.Client):
    rows = _execute_sql(ws, risk_distribution_query())
    return [RiskDistribution(risk_category=r["risk_category"] or "Unknown", count=int(r["count"] or 0)) for r in rows]


@router.get("/dashboard/executive", response_model=ExecutiveMetrics, operation_id="executiveMetrics")
def executive_metrics(ws: Dependencies.Client):
    rows = _execute_sql(ws, executive_metrics_query())
    if not rows:
        return ExecutiveMetrics(
            total_students=0, active_students=0, at_risk_students=0,
            withdrawn_students=0, graduated_students=0, avg_gpa=0.0,
            retention_rate_pct=0.0, attrition_rate_pct=0.0,
            revenue_at_risk=0, revenue_lost=0,
            international_total=0, international_at_risk=0,
            total_interventions=0,
        )
    return ExecutiveMetrics(**_cast_row(rows[0], ExecutiveMetrics))


# --- Students ---


@router.get("/students", response_model=list[StudentSummary], operation_id="listStudents")
def list_students(
    ws: Dependencies.Client,
    search: str | None = None,
    risk_level: str | None = None,
    faculty: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    rows = _execute_sql(ws, students_list_query(search, risk_level, faculty, status, limit, offset))
    return [StudentSummary(**_cast_row(r, StudentSummary)) for r in rows]


@router.get("/students/{student_id}", response_model=Student360Detail, operation_id="getStudent")
def get_student(student_id: int, ws: Dependencies.Client):
    rows = _execute_sql(ws, student_detail_query(student_id))
    if not rows:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Student not found")
    return Student360Detail(**_cast_row(rows[0], Student360Detail))


@router.get(
    "/students/{student_id}/support",
    response_model=list[SupportInteraction],
    operation_id="getStudentSupport",
)
def get_student_support(student_id: int, ws: Dependencies.Client):
    rows = _execute_sql(ws, student_support_query(student_id))
    return [SupportInteraction(**_cast_row(r, SupportInteraction)) for r in rows]


@router.get(
    "/students/{student_id}/enrollments",
    response_model=list[EnrollmentRecord],
    operation_id="getStudentEnrollments",
)
def get_student_enrollments(student_id: int, ws: Dependencies.Client):
    rows = _execute_sql(ws, student_enrollments_query(student_id))
    return [EnrollmentRecord(**_cast_row(r, EnrollmentRecord)) for r in rows]


# --- Courses ---


@router.get("/courses", response_model=list[CourseAnalytics], operation_id="listCourses")
def list_courses(ws: Dependencies.Client, faculty: str | None = None):
    rows = _execute_sql(ws, course_analytics_query(faculty))
    return [CourseAnalytics(**_cast_row(r, CourseAnalytics)) for r in rows]


# --- Faculty ---


@router.get("/faculty", response_model=list[FacultyPerformance], operation_id="listFaculty")
def list_faculty(ws: Dependencies.Client):
    rows = _execute_sql(ws, faculty_performance_query())
    return [FacultyPerformance(**_cast_row(r, FacultyPerformance)) for r in rows]


@router.get("/faculty/names", response_model=list[str], operation_id="listFacultyNames")
def list_faculty_names(ws: Dependencies.Client):
    rows = _execute_sql(ws, faculties_list_query())
    return [r["faculty"] for r in rows if r["faculty"]]


# --- Trends ---


@router.get("/trends", operation_id="termTrends")
def term_trends(ws: Dependencies.Client):
    return _execute_sql(ws, term_trends_query())


@router.get("/trends/forecast", response_model=list[ForecastPoint], operation_id="trendsForecast")
def trends_forecast(ws: Dependencies.Client):
    rows = _execute_sql(ws, forecast_query())
    return [ForecastPoint(**_cast_row(r, ForecastPoint)) for r in rows]


# --- Analytics (AI Functions) ---


@router.get("/analytics/risk-drivers", response_model=list[RiskDriver], operation_id="riskDrivers")
def risk_drivers(ws: Dependencies.Client):
    rows = _execute_sql(ws, risk_drivers_query())
    return [RiskDriver(**_cast_row(r, RiskDriver)) for r in rows]


@router.get("/analytics/ai-insights", operation_id="aiInsights")
def ai_insights(ws: Dependencies.Client):
    rows = _execute_sql(ws, ai_insights_query())
    if not rows or not rows[0].get("insights"):
        return []
    import json
    try:
        return json.loads(rows[0]["insights"])
    except (json.JSONDecodeError, TypeError):
        return [{"icon": "alert", "title": "Analysis unavailable", "body": str(rows[0].get("insights", ""))}]


@router.get("/analytics/enrollment-forecast", response_model=list[EnrollmentForecastPoint], operation_id="enrollmentForecast")
def enrollment_forecast(ws: Dependencies.Client):
    rows = _execute_sql(ws, enrollment_forecast_query())
    return [EnrollmentForecastPoint(**_cast_row(r, EnrollmentForecastPoint)) for r in rows]


# --- Outreach / Early Alerts ---


@router.get(
    "/outreach",
    response_model=list[OutreachStudent],
    operation_id="listOutreach",
)
def list_outreach(
    ws: Dependencies.Client,
    priority: str | None = None,
    faculty: str | None = None,
    limit: int = 50,
):
    rows = _execute_sql(ws, outreach_queue_query(priority, faculty, limit))
    return [OutreachStudent(**_cast_row(r, OutreachStudent)) for r in rows]


# --- Retention ---


@router.get(
    "/retention",
    response_model=list[RetentionByFaculty],
    operation_id="listRetention",
)
def list_retention(ws: Dependencies.Client):
    rows = _execute_sql(ws, retention_by_faculty_query())
    return [RetentionByFaculty(**_cast_row(r, RetentionByFaculty)) for r in rows]


# --- Cohort Comparison ---


@router.get(
    "/students/{student_id}/cohort",
    operation_id="getStudentCohort",
)
def get_student_cohort(student_id: int, ws: Dependencies.Client):
    rows = _execute_sql(ws, cohort_comparison_query(student_id))
    if not rows:
        return {}
    return rows[0]


# --- Intervention Planner ---


@router.post("/intervention/plan", response_model=InterventionPlan, operation_id="generateInterventionPlan")
def generate_intervention_plan(req: InterventionRequest, ws: Dependencies.Client):
    import json
    rows = _execute_sql(ws, intervention_plan_query(req.student_id))
    if not rows:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Student not found")
    row = rows[0]
    plan_raw = row.get("plan_json", "{}")
    # Strip markdown fences if present
    import re
    plan_raw = re.sub(r'```json\n?|```\n?', '', str(plan_raw))
    try:
        plan = json.loads(plan_raw)
    except (json.JSONDecodeError, TypeError):
        plan = {"summary": str(plan_raw), "intervention_type": "Academic Advising", "urgency": "Medium"}
    return InterventionPlan(
        student_id=req.student_id,
        student_name=row.get("student_name"),
        **{k: v for k, v in plan.items() if k in InterventionPlan.model_fields},
    )


# --- Outreach Composer ---


@router.post("/outreach/compose", response_model=OutreachEmail, operation_id="composeOutreach")
def compose_outreach(req: OutreachRequest, ws: Dependencies.Client):
    import json
    import re
    context = req.intervention_plan or req.custom_context or ""
    rows = _execute_sql(ws, outreach_email_query(req.student_id, req.tone, context))
    if not rows:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Student not found")
    row = rows[0]
    email_raw = str(row.get("email_json", "{}"))
    # Strip markdown fences
    email_raw = re.sub(r'```json\s*|```\s*', '', email_raw).strip()
    # Try parsing — handle double-encoded JSON from ai_query
    email = None
    for attempt in range(3):
        try:
            parsed = json.loads(email_raw)
            if isinstance(parsed, dict) and ("subject" in parsed or "body" in parsed):
                email = parsed
                break
            elif isinstance(parsed, str):
                email_raw = parsed
            else:
                break
        except (json.JSONDecodeError, TypeError):
            break
    if not email:
        # Fallback: try to extract subject and body from raw text
        subject_match = re.search(r'"subject"\s*:\s*"([^"]*)"', email_raw)
        body_match = re.search(r'"body"\s*:\s*"(.*)"', email_raw, re.DOTALL)
        email = {
            "subject": subject_match.group(1) if subject_match else "Check-in from Student Success Team",
            "body": body_match.group(1) if body_match else email_raw,
        }
    body = email.get("body", "")
    # Convert literal \n to actual newlines
    body = body.replace("\\n", "\n")
    return OutreachEmail(
        student_id=req.student_id,
        student_name=row.get("student_name"),
        student_email=row.get("student_email"),
        subject=email.get("subject", ""),
        body=body,
        tone=req.tone,
    )


# --- Outreach Tracking / Case Management (Delta table backed) ---


def _intervention_log_rows(ws: WorkspaceClient) -> list[dict]:
    """Read intervention_log, tolerating a workspace where the table doesn't exist yet
    (it's created by 03_Apply_Governance.py; first-ever deploys may race it)."""
    try:
        return _execute_sql(ws, get_intervention_log_query())
    except Exception as e:
        if "TABLE_OR_VIEW_NOT_FOUND" in str(e):
            return []
        raise


def _parse_log_rows(rows: list[dict]) -> dict[int, OutreachLogEntry]:
    result = {}
    for r in rows:
        sid = int(r.get("student_id", 0))
        notes_raw = r.get("notes")
        if isinstance(notes_raw, str):
            import json as _json
            try:
                notes_raw = _json.loads(notes_raw)
            except Exception:
                notes_raw = [notes_raw] if notes_raw else []
        elif notes_raw is None:
            notes_raw = []
        result[sid] = OutreachLogEntry(
            student_id=sid,
            student_name=r.get("student_name"),
            tone=r.get("tone"),
            subject=r.get("subject"),
            sent_at=str(r.get("sent_at", "")) if r.get("sent_at") else None,
            status=r.get("status", "outreach_sent"),
            intervention_type=r.get("intervention_type"),
            notes=notes_raw,
            next_follow_up=r.get("next_follow_up"),
            resolved_at=str(r.get("resolved_at", "")) if r.get("resolved_at") else None,
        )
    return result


@router.post("/outreach/log", response_model=OutreachLogEntry, operation_id="logOutreach")
def log_outreach(req: OutreachLogRequest, ws: Dependencies.Client):
    _execute_sql(ws, insert_intervention_log(
        req.student_id,
        req.student_name or "",
        req.tone or "empathetic",
        req.subject or "",
        req.intervention_type,
    ))
    rows = _execute_sql(ws, f"SELECT * FROM {GOLD}.intervention_log WHERE student_id = {req.student_id}")
    if rows:
        return list(_parse_log_rows(rows).values())[0]
    return OutreachLogEntry(student_id=req.student_id, student_name=req.student_name, status="outreach_sent")


@router.post("/outreach/planning", response_model=OutreachLogEntry, operation_id="logPlanning")
def log_planning(req: OutreachLogRequest, ws: Dependencies.Client):
    """Write an intervention log entry with status='planning' as soon as the AI
    plan is generated. The Tracker uses this to show a 'Planning' column for
    interventions that are mid-workflow but not yet sent."""
    _execute_sql(ws, upsert_planning_intervention(
        req.student_id,
        req.student_name or "",
        req.intervention_type,
    ))
    rows = _execute_sql(ws, f"SELECT * FROM {GOLD}.intervention_log WHERE student_id = {req.student_id}")
    if rows:
        return list(_parse_log_rows(rows).values())[0]
    return OutreachLogEntry(student_id=req.student_id, student_name=req.student_name, status="planning")


@router.get("/outreach/log", response_model=dict[int, OutreachLogEntry], operation_id="getOutreachLog")
def get_outreach_log(ws: Dependencies.Client):
    rows = _intervention_log_rows(ws)
    return _parse_log_rows(rows)


@router.post("/outreach/case-update", response_model=OutreachLogEntry, operation_id="updateCase")
def update_case(req: CaseUpdateRequest, ws: Dependencies.Client):
    if req.status:
        _execute_sql(ws, update_case_status_query(req.student_id, req.status))
    if req.note:
        _execute_sql(ws, add_case_note_query(req.student_id, req.note))
    if req.next_follow_up:
        _execute_sql(ws, set_follow_up_query(req.student_id, req.next_follow_up))
    rows = _execute_sql(ws, f"SELECT * FROM {GOLD}.intervention_log WHERE student_id = {req.student_id}")
    if not rows:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No outreach logged for this student")
    return list(_parse_log_rows(rows).values())[0]


# --- Intervention Effectiveness ---


@router.get("/effectiveness/comparison", response_model=EffectivenessMetrics, operation_id="effectivenessComparison")
def effectiveness_comparison(ws: Dependencies.Client):
    log_rows = _intervention_log_rows(ws)
    intervened_ids = [int(r.get("student_id", 0)) for r in log_rows]
    rows = _execute_sql(ws, effectiveness_comparison_query(intervened_ids))
    if not rows:
        return EffectivenessMetrics()
    return EffectivenessMetrics(**_cast_row(rows[0], EffectivenessMetrics))


@router.get("/effectiveness/by-type", response_model=list[EffectivenessByType], operation_id="effectivenessByType")
def effectiveness_by_type(ws: Dependencies.Client):
    log_rows = _intervention_log_rows(ws)
    log = _parse_log_rows(log_rows)
    type_counts: dict[str, EffectivenessByType] = {}
    for entry in log.values():
        t = entry.intervention_type or "General Outreach"
        if t not in type_counts:
            type_counts[t] = EffectivenessByType(intervention_type=t)
        type_counts[t].count += 1
        if entry.status == "resolved":
            type_counts[t].resolved_count += 1
    return list(type_counts.values())


@router.get("/effectiveness/by-equity", response_model=list[EffectivenessByEquity], operation_id="effectivenessByEquity")
def effectiveness_by_equity(ws: Dependencies.Client):
    log_rows = _intervention_log_rows(ws)
    intervened_ids = [int(r.get("student_id", 0)) for r in log_rows]
    rows = _execute_sql(ws, effectiveness_by_equity_query(intervened_ids))
    return [EffectivenessByEquity(**_cast_row(r, EffectivenessByEquity)) for r in rows]


@router.get("/effectiveness/ai-summary", operation_id="effectivenessAiSummary")
def effectiveness_ai_summary(ws: Dependencies.Client):
    log_rows = _intervention_log_rows(ws)
    intervened_ids = [int(r.get("student_id", 0)) for r in log_rows]
    rows = _execute_sql(ws, effectiveness_ai_summary_query(intervened_ids))
    if not rows:
        return {"summary": "No data available yet."}
    return {"summary": rows[0].get("summary", "No summary generated.")}


# --- Intervention Outcomes ---


@router.get("/outcomes/students", response_model=list[OutcomeStudent], operation_id="outcomeStudents")
def outcome_students(ws: Dependencies.Client):
    rows = _execute_sql(ws, intervention_outcomes_query())
    return [OutcomeStudent(**_cast_row(r, OutcomeStudent)) for r in rows]


@router.get("/outcomes/summary", response_model=OutcomeSummary, operation_id="outcomeSummary")
def outcome_summary(ws: Dependencies.Client):
    rows = _execute_sql(ws, intervention_outcomes_query())
    if not rows:
        return OutcomeSummary()
    students = [OutcomeStudent(**_cast_row(r, OutcomeStudent)) for r in rows]
    de_risked = sum(1 for s in students if s.outcome == "de-risked")
    improved = sum(1 for s in students if s.outcome == "improved")
    unchanged = sum(1 for s in students if s.outcome == "unchanged")
    declined = sum(1 for s in students if s.outcome == "declined")
    gpa_lifts = [s.gpa_change for s in students if s.gpa_change is not None]
    pass_lifts = [(s.pass_rate_after or 0) - (s.pass_rate_before or 0) for s in students if s.pass_rate_after is not None]
    lms_lifts = [(s.lms_after or 0) - (s.lms_before or 0) for s in students if s.lms_after is not None]
    retained = sum(1 for s in students if s.outcome in ("de-risked", "improved", "unchanged"))
    return OutcomeSummary(
        total_intervened=len(students),
        de_risked=de_risked,
        improved=improved,
        unchanged=unchanged,
        declined=declined,
        avg_gpa_lift=round(sum(gpa_lifts) / len(gpa_lifts), 2) if gpa_lifts else None,
        avg_pass_rate_lift=round(sum(pass_lifts) / len(pass_lifts), 1) if pass_lifts else None,
        avg_lms_lift=round(sum(lms_lifts) / len(lms_lifts), 0) if lms_lifts else None,
        retention_rate=round(retained / len(students) * 100, 1) if students else None,
    )


@router.get("/outcomes/trend", response_model=list[OutcomeTrendPoint], operation_id="outcomeTrend")
def outcome_trend(ws: Dependencies.Client):
    rows = _execute_sql(ws, intervention_trend_query())
    return [OutcomeTrendPoint(**_cast_row(r, OutcomeTrendPoint)) for r in rows]


@router.get("/outcomes/by-faculty", response_model=list[OutcomeByFaculty], operation_id="outcomeByFaculty")
def outcome_by_faculty(ws: Dependencies.Client):
    rows = _execute_sql(ws, intervention_outcomes_query())
    if not rows:
        return []
    students = [OutcomeStudent(**_cast_row(r, OutcomeStudent)) for r in rows]
    faculties: dict[str, OutcomeByFaculty] = {}
    for s in students:
        f = _org_unit_short_name(s.faculty)
        if f not in faculties:
            faculties[f] = OutcomeByFaculty(faculty=f)
        faculties[f].intervened += 1
        if s.outcome == "de-risked":
            faculties[f].de_risked += 1
    for f in faculties.values():
        f.de_risked_pct = round(f.de_risked / f.intervened * 100, 1) if f.intervened > 0 else 0
        matching = [s for s in students if _org_unit_short_name(s.faculty) == f.faculty]
        lifts = [s.gpa_change for s in matching if s.gpa_change is not None]
        f.avg_gpa_lift = round(sum(lifts) / len(lifts), 2) if lifts else None
    return sorted(faculties.values(), key=lambda x: x.de_risked_pct or 0, reverse=True)


@router.get("/outcomes/by-equity", response_model=list[OutcomeByEquity], operation_id="outcomeByEquity")
def outcome_by_equity(ws: Dependencies.Client):
    rows = _execute_sql(ws, intervention_outcomes_query())
    if not rows:
        return []
    students = [OutcomeStudent(**_cast_row(r, OutcomeStudent)) for r in rows]
    groups: list[OutcomeByEquity] = []
    # First-in-family
    fif = [s for s in students if s.first_in_family]
    non_fif = [s for s in students if not s.first_in_family]
    if fif:
        groups.append(OutcomeByEquity(
            group=FIRST_GEN_LABEL, intervened=len(fif),
            de_risked=sum(1 for s in fif if s.outcome == "de-risked"),
            avg_gpa_lift=round(sum(s.gpa_change or 0 for s in fif) / len(fif), 2),
            avg_pass_rate_lift=round(sum((s.pass_rate_after or 0) - (s.pass_rate_before or 0) for s in fif) / len(fif), 1),
        ))
    # International
    intl = [s for s in students if s.domestic_international == "International"]
    if intl:
        groups.append(OutcomeByEquity(
            group="International", intervened=len(intl),
            de_risked=sum(1 for s in intl if s.outcome == "de-risked"),
            avg_gpa_lift=round(sum(s.gpa_change or 0 for s in intl) / len(intl), 2),
            avg_pass_rate_lift=round(sum((s.pass_rate_after or 0) - (s.pass_rate_before or 0) for s in intl) / len(intl), 1),
        ))
    # Domestic
    dom = [s for s in students if s.domestic_international == "Domestic"]
    if dom:
        groups.append(OutcomeByEquity(
            group="Domestic", intervened=len(dom),
            de_risked=sum(1 for s in dom if s.outcome == "de-risked"),
            avg_gpa_lift=round(sum(s.gpa_change or 0 for s in dom) / len(dom), 2),
            avg_pass_rate_lift=round(sum((s.pass_rate_after or 0) - (s.pass_rate_before or 0) for s in dom) / len(dom), 1),
        ))
    return groups


@router.get("/outcomes/ai-summary", operation_id="outcomeAiSummary")
def outcome_ai_summary(ws: Dependencies.Client):
    rows = _execute_sql(ws, intervention_outcomes_ai_summary_query())
    if not rows:
        return {"summary": "No outcome data available."}
    return {"summary": rows[0].get("summary", "No summary generated.")}


# --- Genie Copilot (real AI/BI Genie space) ---


@router.post("/chat", response_model=ChatResponse, operation_id="chat")
def chat(req: ChatRequest, ws: Dependencies.Client):
    """Answer a finance question via the real Databricks AI/BI Genie space."""
    from .genie import ask_genie

    r = ask_genie(ws, req.message or "")
    return ChatResponse(response=r.answer, conversation_id=req.conversation_id, sql_query=r.sql)


# --- Action-Taking Finance Agent (SSE) ---


@router.post("/agent/stream", operation_id="agentStream")
def agent_stream(payload: dict, ws: Dependencies.Client, headers: Dependencies.Headers):
    """Stream an agent turn as Server-Sent Events. Body: {messages:[{role,content}], conversation_id?}."""
    import json as _json

    from fastapi.responses import StreamingResponse

    from .agent.finance_agent import run_turn

    messages = payload.get("messages", []) or []
    actor = headers.user_email or headers.user_name or "finance.user@northstar.edu"
    obo = headers.token.get_secret_value() if headers.token else None

    def gen():
        try:
            for ev in run_turn(ws, messages, actor, obo):
                yield f"data: {_json.dumps(ev)}\n\n"
        except Exception as e:  # noqa: BLE001
            yield f"data: {_json.dumps({'type': 'error', 'error': str(e)[:400]})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/advisor/stream", operation_id="advisorStream")
def advisor_stream(payload: dict, ws: Dependencies.Client, headers: Dependencies.Headers):
    """Stream an Advisor (student-success) agent turn as SSE. Body: {messages:[{role,content}]}."""
    import json as _json

    from fastapi.responses import StreamingResponse

    from .agent.advisor_agent import run_turn

    messages = payload.get("messages", []) or []
    actor = headers.user_email or headers.user_name or "advisor.user@northstar.edu"
    obo = headers.token.get_secret_value() if headers.token else None

    def gen():
        try:
            for ev in run_turn(ws, messages, actor, obo):
                yield f"data: {_json.dumps(ev)}\n\n"
        except Exception as e:  # noqa: BLE001
            yield f"data: {_json.dumps({'type': 'error', 'error': str(e)[:400]})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/agent/feedback", operation_id="agentFeedback")
def agent_feedback(payload: dict, ws: Dependencies.Client, headers: Dependencies.Headers):
    trace_id = payload.get("trace_id")
    value = payload.get("value")
    rationale = payload.get("rationale") or ""
    if not trace_id:
        return {"ok": False, "error": "missing trace_id"}
    actor = headers.user_email or "finance.user@northstar.edu"
    try:
        ws.api_client.do(
            "POST",
            f"/api/2.0/mlflow/traces/{trace_id}/assessments",
            body={"assessment": {
                "trace_id": trace_id,
                "assessment_name": "user_feedback",
                "source": {"source_type": "HUMAN", "source_id": actor},
                "feedback": {"value": value == "up"},
                "rationale": rationale,
            }},
        )
        return {"ok": True}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": str(e)[:200]}


# --- Finance read endpoints (dashboard tiles + AI Actions page) ---


@router.get("/finance/summary", operation_id="financeSummary")
def finance_summary(ws: Dependencies.Client):
    rar = _execute_sql(ws, f"SELECT round(sum(revenue_at_risk_usd)) v FROM {GOLD}.revenue_at_risk")
    overdue = _execute_sql(ws, f"SELECT round(sum(balance_due)) v FROM {GOLD}.finance_accounts WHERE delinquency_status IN ('Delinquent','Past Due')")
    appeals = _execute_sql(ws, f"SELECT count(*) n, round(sum(requested_amount_usd)) v FROM {GOLD}.aid_appeals WHERE status='pending'")
    overbud = _execute_sql(ws, f"SELECT count(*) n FROM {GOLD}.budget_vs_actual WHERE fiscal_period='FY2026' AND variance_usd > 0")
    return {
        "total_revenue_at_risk_usd": float((rar[0]["v"] if rar and rar[0]["v"] else 0) or 0),
        "overdue_balance_usd": float((overdue[0]["v"] if overdue and overdue[0]["v"] else 0) or 0),
        "pending_appeals": int((appeals[0]["n"] if appeals else 0) or 0),
        "pending_appeals_usd": float((appeals[0]["v"] if appeals and appeals[0]["v"] else 0) or 0),
        "over_budget_colleges": int((overbud[0]["n"] if overbud else 0) or 0),
    }


@router.get("/finance/aid-appeals", operation_id="financeAidAppeals")
def finance_aid_appeals(ws: Dependencies.Client, status: str = "pending"):
    where = "" if status in ("all", "") else f"WHERE status = '{status.replace(chr(39), '')}'"
    return _execute_sql(ws, f"""
        SELECT appeal_id, student_id, full_name, college, appeal_type, requested_amount_usd,
               reason, status, CAST(submitted_at AS STRING) submitted_at
        FROM {GOLD}.aid_appeals {where} ORDER BY submitted_at DESC LIMIT 100
    """)


@router.get("/finance/revenue-at-risk", operation_id="financeRevenueAtRisk")
def finance_revenue_at_risk(ws: Dependencies.Client, limit: int = 25):
    limit = max(1, min(int(limit), 100))
    return _execute_sql(ws, f"""
        SELECT student_id, full_name, college, expected_annual_tuition, risk_score,
               risk_category, revenue_at_risk_usd, primary_driver
        FROM {GOLD}.revenue_at_risk ORDER BY revenue_at_risk_usd DESC LIMIT {limit}
    """)


@router.get("/finance/action-log", operation_id="financeActionLog")
def finance_action_log(ws: Dependencies.Client):
    try:
        return _execute_sql(ws, f"""
            SELECT action_id, action_type, student_id, appeal_id, amount_usd, status,
                   decision_notes, actor, CAST(created_at AS STRING) created_at
            FROM {GOLD}.finance_action_log ORDER BY created_at DESC LIMIT 100
        """)
    except Exception:
        return []


_DASHBOARD_ENV = {
    "financial_health": "DASH_FINANCIAL_HEALTH",
    "research_finance": "DASH_RESEARCH_FINANCE",
    "enrollment_finance": "DASH_ENROLLMENT_FINANCE",
}


@router.get("/finance/dashboard-url", operation_id="financeDashboardUrl")
def finance_dashboard_url(ws: Dependencies.Client, key: str = ""):
    """Return embed + published URLs for an AI/BI dashboard (by key, from env)."""
    env_name = _DASHBOARD_ENV.get(key)
    dash = os.getenv(env_name, "").strip() if env_name else ""
    org = os.getenv("WORKSPACE_ORG", "").strip()
    host = (ws.config.host or "").rstrip("/")
    if not dash or not host:
        return {"dashboard_id": dash, "embed_url": "", "published_url": ""}
    q = f"?o={org}" if org else ""
    return {
        "dashboard_id": dash,
        "embed_url": f"{host}/embed/dashboardsv3/{dash}{q}",
        "published_url": f"{host}/dashboardsv3/{dash}/published{q}",
    }


@router.post("/advisor/chat", response_model=ChatResponse, operation_id="advisorChat")
def advisor_chat(req: ChatRequest, ws: Dependencies.Client):
    """Student-success Advisor agent — answers via the 'Student 360 Advisor' Genie space."""
    from .genie import ask_genie

    sid = os.getenv("ADVISOR_GENIE_SPACE_ID", "").strip()
    r = ask_genie(ws, req.message or "", space_id=sid, conversation_id=req.conversation_id)
    return ChatResponse(response=r.answer, conversation_id=r.conversation_id, sql_query=r.sql)


@router.get("/governance/finance", operation_id="governanceFinance")
def governance_finance(ws: Dependencies.Client):
    """Governance metadata (UC classification tags) for the Financial Dashboard's source tables."""
    cat = GOLD.rsplit(".", 1)[0]
    tables = ["finance_accounts", "revenue_at_risk", "aid_appeals", "budget_vs_actual"]
    tl = ",".join(f"'{t}'" for t in tables)
    col = _execute_sql(ws, f"""
        SELECT table_name, column_name, tag_name, tag_value
        FROM {cat}.information_schema.column_tags
        WHERE schema_name='gold' AND table_name IN ({tl})
        ORDER BY table_name, column_name
    """)
    tbl = _execute_sql(ws, f"""
        SELECT table_name, tag_name, tag_value
        FROM {cat}.information_schema.table_tags
        WHERE schema_name='gold' AND table_name IN ({tl})
        ORDER BY table_name
    """)
    labels = {
        "finance_accounts": "Student accounts (tuition, aid, balances)",
        "revenue_at_risk": "Revenue at risk from attrition",
        "aid_appeals": "Financial aid appeals",
        "budget_vs_actual": "Budget vs actual by college",
    }
    return {
        "column_tags": col,
        "table_tags": tbl,
        "tables": [{"name": t, "description": labels[t]} for t in tables],
    }


# --- Finance dashboard-page data (for the native Financial Health / Research / Enrollment pages) ---


@router.get("/finance/health", operation_id="financeHealth")
def finance_health(ws: Dependencies.Client):
    monthly = _execute_sql(ws, f"""
        SELECT CAST(month AS STRING) AS month, operating_revenue, operating_expense,
               net_contribution, days_cash_on_hand
        FROM {GOLD}.fin_institution_monthly ORDER BY month
    """)
    mix = _execute_sql(ws, f"SELECT category, amount_usd FROM {GOLD}.fin_revenue_mix ORDER BY amount_usd DESC")
    k = _execute_sql(ws, f"""
        SELECT ROUND(SUM(operating_revenue)) rev, ROUND(SUM(operating_expense)) exp,
               ROUND((SUM(operating_revenue)-SUM(operating_expense))/NULLIF(SUM(operating_revenue),0)*100,1) margin
        FROM {GOLD}.fin_institution_monthly
    """)
    latest = _execute_sql(ws, f"SELECT days_cash_on_hand FROM {GOLD}.fin_institution_monthly ORDER BY month DESC LIMIT 1")
    kr = k[0] if k else {}
    return {
        "kpis": {
            "operating_revenue": float(kr.get("rev") or 0),
            "operating_expense": float(kr.get("exp") or 0),
            "net_margin_pct": float(kr.get("margin") or 0),
            "days_cash_on_hand": int((latest[0]["days_cash_on_hand"] if latest else 0) or 0),
        },
        "monthly": monthly,
        "revenue_mix": mix,
    }


@router.get("/finance/research", operation_id="financeResearch")
def finance_research(ws: Dependencies.Client):
    k = _execute_sql(ws, f"""
        SELECT ROUND(SUM(direct_cost_usd)) direct, ROUND(SUM(fa_recovered_usd)) fa,
               SUM(CASE WHEN risk_level IN ('At Risk','High','Very High') THEN 1 ELSE 0 END) at_risk,
               ROUND(AVG(fa_rate),3) avg_fa
        FROM {GOLD}.fin_research_awards
    """)
    kr = k[0] if k else {}
    by_college = _execute_sql(ws, f"""
        SELECT college, ROUND(SUM(fa_recovered_usd)) fa_recovered, ROUND(SUM(direct_cost_usd)) direct_cost
        FROM {GOLD}.fin_research_awards GROUP BY college ORDER BY fa_recovered DESC
    """)
    by_sponsor = _execute_sql(ws, f"""
        SELECT sponsor, ROUND(SUM(direct_cost_usd)) direct_cost
        FROM {GOLD}.fin_research_awards GROUP BY sponsor ORDER BY direct_cost DESC
    """)
    by_status = _execute_sql(ws, f"SELECT status, COUNT(*) n FROM {GOLD}.fin_research_awards GROUP BY status ORDER BY n DESC")
    return {
        "kpis": {
            "direct_cost": float(kr.get("direct") or 0),
            "fa_recovered": float(kr.get("fa") or 0),
            "awards_at_risk": int(kr.get("at_risk") or 0),
            "avg_fa_rate": float(kr.get("avg_fa") or 0),
        },
        "by_college": by_college,
        "by_sponsor": by_sponsor,
        "by_status": by_status,
    }


@router.get("/finance/enrollment-econ", operation_id="financeEnrollmentEcon")
def finance_enrollment_econ(ws: Dependencies.Client):
    k = _execute_sql(ws, f"""
        SELECT ROUND(SUM(net_tuition)) net, ROUND(SUM(tuition_charged)) gross, ROUND(SUM(aid_awarded)) aid,
               ROUND(SUM(aid_awarded)/NULLIF(SUM(tuition_charged),0)*100,1) discount
        FROM {GOLD}.finance_accounts
    """)
    kr = k[0] if k else {}
    by_college = _execute_sql(ws, f"""
        SELECT college, ROUND(SUM(net_tuition)) net_tuition, ROUND(SUM(tuition_charged)) gross_tuition,
               ROUND(SUM(aid_awarded)) aid, ROUND(SUM(aid_awarded)/NULLIF(SUM(tuition_charged),0)*100,1) discount_pct
        FROM {GOLD}.finance_accounts GROUP BY college ORDER BY net_tuition DESC
    """)
    funnel = _execute_sql(ws, f"""
        SELECT college, SUM(applied) applied, SUM(admitted) admitted, SUM(enrolled) enrolled
        FROM {GOLD}.fin_enrollment_funnel GROUP BY college ORDER BY applied DESC
    """)
    summary = None
    try:
        srows = _execute_sql(ws, f"""
            SELECT enrolled_actual, enrolled_plan, enrolled_variance_pct, net_tuition_actual,
                   net_tuition_plan, net_tuition_variance_usd, projected_cash_impact_usd,
                   discount_rate_budget, census_date
            FROM {GOLD}.fin_enrollment_summary LIMIT 1
        """)
        if srows:
            s = srows[0]
            summary = {
                "enrolled_actual": int(float(s.get("enrolled_actual") or 0)),
                "enrolled_plan": int(float(s.get("enrolled_plan") or 0)),
                "enrolled_variance_pct": float(s.get("enrolled_variance_pct") or 0),
                "net_tuition_actual": float(s.get("net_tuition_actual") or 0),
                "net_tuition_plan": float(s.get("net_tuition_plan") or 0),
                "net_tuition_variance_usd": float(s.get("net_tuition_variance_usd") or 0),
                "projected_cash_impact_usd": float(s.get("projected_cash_impact_usd") or 0),
                "discount_rate_budget": float(s.get("discount_rate_budget") or 0),
                "census_date": s.get("census_date") or "",
            }
    except Exception:  # noqa: BLE001 — older installs without the summary table
        summary = None
    return {
        "kpis": {
            "net_tuition": float(kr.get("net") or 0),
            "gross_tuition": float(kr.get("gross") or 0),
            "total_aid": float(kr.get("aid") or 0),
            "discount_rate_pct": float(kr.get("discount") or 0),
        },
        "by_college": by_college,
        "funnel": funnel,
        "summary": summary,
    }
