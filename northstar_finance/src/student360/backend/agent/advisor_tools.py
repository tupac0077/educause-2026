"""Advisor (student-success) agent tools: Genie + read SQL, and one human-gated
write (log an advisor intervention). Mirrors the shape of the finance tools.

Read tools execute inline; the WRITE tool (`log_intervention`) is gated behind
explicit user approval (see loop.py).
"""
from __future__ import annotations

import json
import os

from databricks.sdk import WorkspaceClient

from ..genie import ask_genie as _ask_genie
from ..dbsql import execute_sql
from ..sql import GOLD

WRITE_TOOLS = {"log_intervention"}


def _esc(s: str) -> str:
    return (s or "").replace("'", "''")


def _advisor_space() -> str:
    return os.getenv("ADVISOR_GENIE_SPACE_ID", "").strip()


TOOL_SPECS = [
    {
        "type": "function",
        "function": {
            "name": "ask_genie",
            "description": "Answer an open-ended analytical question about Northstar University student-success data (at-risk students, GPA, course pass/fail rates, colleges, term trends, support interactions) using the Databricks AI/BI Genie space. Use for 'how many', 'which', 'trend', and investigative questions. Returns a synthesized answer and the SQL Genie ran.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {"type": "string", "description": "A clear, specific student-success question in English."}
                },
                "required": ["question"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_at_risk_students",
            "description": "List students most in need of attention, ranked by ML risk score (highest first). Returns name, college, program, GPA, risk level/score, and pending follow-ups.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "description": "Max rows (1-50)."}},
                "required": ["limit"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_student_academics",
            "description": "Get one student's academic profile: program, college, GPA, pass rate, courses passed/failed/withdrawn, degree completion, engagement, support history, and risk.",
            "parameters": {
                "type": "object",
                "properties": {"student_id": {"type": "integer", "description": "The student id."}},
                "required": ["student_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_course_fail_rates",
            "description": "List the courses with the highest fail rates. Returns course code/name, college, fail count, total enrolled, and fail-rate percent.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "description": "Max rows (1-50)."}},
                "required": ["limit"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_term_trends",
            "description": "Return enrollment and outcome trends by term (total enrollments, active students, pass/fail/withdrawal rates) for trend analysis.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "log_intervention",
            "description": "WRITE ACTION (requires human approval). Record a student-success intervention (e.g. advising outreach, tutoring referral, wellness check) for a student in the intervention log.",
            "parameters": {
                "type": "object",
                "properties": {
                    "student_id": {"type": "integer", "description": "The student id."},
                    "intervention_type": {"type": "string", "description": "e.g. advising_outreach, tutoring_referral, wellness_check, academic_plan."},
                    "note": {"type": "string", "description": "Short description of the intervention and rationale."},
                },
                "required": ["student_id", "intervention_type", "note"],
            },
        },
    },
]


def summarize_action(name: str, args: dict) -> str:
    if name == "log_intervention":
        return (f"Log a '{args.get('intervention_type','intervention')}' intervention for student "
                f"{args.get('student_id')} — {args.get('note','')}")
    return f"{name}({args})"


def execute_tool(ws: WorkspaceClient, name: str, args: dict, actor: str) -> str:
    """Execute an advisor tool and return a string result for the model."""
    try:
        if name == "ask_genie":
            r = _ask_genie(ws, args["question"], space_id=_advisor_space())
            return (r.answer + (f"\n\n[SQL]\n{r.sql}" if r.sql else ""))[:4000]

        if name == "get_at_risk_students":
            limit = max(1, min(int(args.get("limit", 10)), 50))
            rows = execute_sql(ws, f"""
                SELECT s.student_id, s.full_name, s.faculty AS college, s.program_name, s.gpa,
                       s.risk_level, p.risk_score, p.risk_category, s.pending_follow_ups,
                       CAST(s.last_support_date AS STRING) last_support_date
                FROM {GOLD}.student_360 s
                JOIN {GOLD}.student_risk_predictions p ON s.student_id = p.student_id
                ORDER BY p.risk_score DESC LIMIT {limit}
            """)
            return json.dumps(rows)[:4000]

        if name == "get_student_academics":
            sid = int(args["student_id"])
            rows = execute_sql(ws, f"""
                SELECT s.student_id, s.full_name, s.faculty AS college, s.program_name, s.program_level,
                       s.gpa, s.pass_rate_pct, s.courses_passed, s.courses_failed, s.courses_withdrawn,
                       s.degree_completion_pct, s.total_lms_activities, s.pending_follow_ups,
                       s.student_status, CAST(s.last_support_date AS STRING) last_support_date,
                       p.risk_score, p.risk_category
                FROM {GOLD}.student_360 s
                LEFT JOIN {GOLD}.student_risk_predictions p ON s.student_id = p.student_id
                WHERE s.student_id = {sid}
            """)
            return json.dumps(rows[0] if rows else {"error": "not found"})[:2500]

        if name == "get_course_fail_rates":
            limit = max(1, min(int(args.get("limit", 10)), 50))
            rows = execute_sql(ws, f"""
                SELECT course_code, course_name, faculty AS college, fail_count, total_enrolled, fail_rate_pct
                FROM {GOLD}.course_analytics
                WHERE fail_rate_pct IS NOT NULL AND course_name IS NOT NULL
                ORDER BY fail_rate_pct DESC LIMIT {limit}
            """)
            return json.dumps(rows)[:4000]

        if name == "get_term_trends":
            rows = execute_sql(ws, f"""
                SELECT year, term, term_code, total_enrollments, active_students,
                       pass_rate_pct, fail_rate_pct, withdrawal_rate_pct
                FROM {GOLD}.term_trends ORDER BY year, term_code
            """)
            return json.dumps(rows)[:4000]

        # --- WRITE action (only reached after approval) ---
        if name == "log_intervention":
            sid = int(args["student_id"])
            itype = _esc(args.get("intervention_type", "advising_outreach"))
            note = _esc(args.get("note", ""))
            execute_sql(ws, f"""
                INSERT INTO {GOLD}.intervention_log
                    (student_id, student_name, tone, subject, sent_at, status, intervention_type, notes, next_follow_up)
                SELECT {sid}, full_name, 'advisor', '{itype}', current_timestamp(), 'logged',
                       '{itype}', array('{note}'), NULL
                FROM {GOLD}.student_360 WHERE student_id = {sid}
            """)
            return f"Intervention '{itype}' logged for student {sid} by {actor}."

        return json.dumps({"error": f"unknown tool {name}"})
    except Exception as e:  # noqa: BLE001
        return json.dumps({"error": str(e)[:300]})
