"""Finance agent tools: read (Genie + SQL), a pure draft tool, and human-gated writes.

Tool arg schemas follow OpenAI function-calling JSON schema (snake_case names,
all properties required). Read/draft tools execute inline; WRITE tools are gated
behind explicit user approval (see finance_agent.py).
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from databricks.sdk import WorkspaceClient

from ..genie import ask_genie as _ask_genie
from ..dbsql import execute_sql
from ..sql import GOLD

WRITE_TOOLS = {"decide_aid_appeal", "place_retention_hold", "escalate_to_collections"}


def _esc(s: str) -> str:
    return (s or "").replace("'", "''")


TOOL_SPECS = [
    {
        "type": "function",
        "function": {
            "name": "ask_genie",
            "description": "Answer an open-ended analytical question about Northstar University finance data (revenue at risk, tuition/aid accounts, delinquencies, aid appeals, budget vs actual) using the Databricks AI/BI Genie space. Use for 'how much', 'which', 'trend', and investigative questions. Returns a synthesized answer and the SQL Genie ran.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {"type": "string", "description": "A clear, specific finance question in English."}
                },
                "required": ["question"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_revenue_at_risk",
            "description": "List students with the highest expected tuition revenue at risk of loss from attrition. Returns student, college, risk score, revenue_at_risk_usd, and the primary driver.",
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
            "name": "get_aid_appeals",
            "description": "List financial-aid appeals, optionally filtered by status (pending/approved/denied).",
            "parameters": {
                "type": "object",
                "properties": {"status": {"type": "string", "description": "pending, approved, denied, or 'all'."}},
                "required": ["status"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_account",
            "description": "Get a single student's finance account: tuition, aid, balance due, days past due, delinquency status, plus GPA and risk.",
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
            "name": "draft_financial_outreach",
            "description": "Draft (do not send) a personalized outreach email to a student about their account — e.g. a payment-plan offer or an overdue balance reminder. Returns a subject and body for the advisor to review. This does not write anything.",
            "parameters": {
                "type": "object",
                "properties": {
                    "student_id": {"type": "integer", "description": "The student id."},
                    "tone": {"type": "string", "description": "empathetic, formal, or nudge."},
                },
                "required": ["student_id", "tone"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "decide_aid_appeal",
            "description": "WRITE ACTION (requires human approval). Approve or deny a financial-aid appeal. Records the decision in the finance action log and updates the appeal status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "appeal_id": {"type": "string", "description": "The appeal id, e.g. APL-0042."},
                    "decision": {"type": "string", "description": "approve or deny."},
                    "notes": {"type": "string", "description": "Short rationale for the decision."},
                },
                "required": ["appeal_id", "decision", "notes"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "place_retention_hold",
            "description": "WRITE ACTION (requires human approval). Allocate a retention-budget hold (financial incentive/support) to a revenue-at-risk student and record it in the finance action log.",
            "parameters": {
                "type": "object",
                "properties": {
                    "student_id": {"type": "integer", "description": "The student id."},
                    "amount_usd": {"type": "number", "description": "Retention support amount in USD."},
                    "notes": {"type": "string", "description": "Justification."},
                },
                "required": ["student_id", "amount_usd", "notes"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "escalate_to_collections",
            "description": "WRITE ACTION (requires human approval). Escalate a delinquent student account to collections review and record it in the finance action log.",
            "parameters": {
                "type": "object",
                "properties": {
                    "student_id": {"type": "integer", "description": "The student id."},
                    "notes": {"type": "string", "description": "Why the account is being escalated."},
                },
                "required": ["student_id", "notes"],
            },
        },
    },
]


def summarize_action(name: str, args: dict) -> str:
    """Human-readable summary shown in the approval prompt."""
    if name == "decide_aid_appeal":
        return f"{args.get('decision','?').title()} aid appeal {args.get('appeal_id')} — {args.get('notes','')}"
    if name == "place_retention_hold":
        return f"Place a ${float(args.get('amount_usd',0)):,.0f} retention hold on student {args.get('student_id')} — {args.get('notes','')}"
    if name == "escalate_to_collections":
        return f"Escalate student {args.get('student_id')} to collections review — {args.get('notes','')}"
    return f"{name}({args})"


def _log_action(ws: WorkspaceClient, action_type: str, actor: str, *, student_id=None,
                appeal_id=None, amount_usd=None, status="done", notes="", payload=None) -> str:
    action_id = "ACT-" + uuid.uuid4().hex[:10]
    ts = datetime.now(timezone.utc).isoformat()
    sid = "NULL" if student_id is None else str(int(student_id))
    aid = "NULL" if not appeal_id else f"'{_esc(appeal_id)}'"
    amt = "NULL" if amount_usd is None else str(float(amount_usd))
    execute_sql(ws, f"""
        INSERT INTO {GOLD}.finance_action_log
        (action_id, action_type, student_id, appeal_id, amount_usd, status, decision_notes, payload, actor, created_at)
        VALUES ('{action_id}', '{_esc(action_type)}', {sid}, {aid}, {amt}, '{_esc(status)}',
                '{_esc(notes)}', '{_esc(json.dumps(payload or {}))}', '{_esc(actor)}', timestamp '{ts}')
    """)
    return action_id


def execute_tool(ws: WorkspaceClient, name: str, args: dict, actor: str) -> str:
    """Execute a tool and return a string result for the model."""
    try:
        if name == "ask_genie":
            r = _ask_genie(ws, args["question"])
            return (r.answer + (f"\n\n[SQL]\n{r.sql}" if r.sql else ""))[:4000]

        if name == "get_revenue_at_risk":
            limit = max(1, min(int(args.get("limit", 10)), 50))
            rows = execute_sql(ws, f"""
                SELECT student_id, full_name, college, expected_annual_tuition, risk_score,
                       risk_category, revenue_at_risk_usd, primary_driver
                FROM {GOLD}.revenue_at_risk ORDER BY revenue_at_risk_usd DESC LIMIT {limit}
            """)
            return json.dumps(rows)[:4000]

        if name == "get_aid_appeals":
            status = (args.get("status") or "pending").lower()
            where = "" if status in ("all", "") else f"WHERE status = '{_esc(status)}'"
            rows = execute_sql(ws, f"""
                SELECT appeal_id, student_id, full_name, college, appeal_type,
                       requested_amount_usd, reason, status, CAST(submitted_at AS STRING) submitted_at
                FROM {GOLD}.aid_appeals {where} ORDER BY submitted_at DESC LIMIT 50
            """)
            return json.dumps(rows)[:4000]

        if name == "get_account":
            sid = int(args["student_id"])
            rows = execute_sql(ws, f"""
                SELECT a.student_id, a.full_name, a.college, a.term, a.tuition_charged, a.aid_awarded,
                       a.net_tuition, a.payments_received, a.balance_due, a.days_past_due,
                       a.payment_plan_flag, a.delinquency_status, s.gpa, s.student_status,
                       p.risk_category, p.risk_score
                FROM {GOLD}.finance_accounts a
                LEFT JOIN {GOLD}.student_360 s ON a.student_id = s.student_id
                LEFT JOIN {GOLD}.student_risk_predictions p ON a.student_id = p.student_id
                WHERE a.student_id = {sid}
            """)
            return json.dumps(rows[0] if rows else {"error": "not found"})[:2000]

        if name == "draft_financial_outreach":
            sid = int(args["student_id"])
            tone = _esc(args.get("tone", "empathetic"))
            rows = execute_sql(ws, f"""
                SELECT a.full_name, a.college, a.balance_due, a.days_past_due, a.delinquency_status,
                       a.payment_plan_flag, s.email
                FROM {GOLD}.finance_accounts a LEFT JOIN {GOLD}.student_360 s ON a.student_id=s.student_id
                WHERE a.student_id = {sid}
            """)
            if not rows:
                return json.dumps({"error": "student not found"})
            r = rows[0]
            prompt = _esc(
                f"You are a Northstar University student-accounts advisor. Write a {tone} outreach email "
                f"to {r.get('full_name')} about their student account. Balance due: ${r.get('balance_due')}, "
                f"{r.get('days_past_due')} days past due, status {r.get('delinquency_status')}. "
                "Offer help (payment plan, financial aid counseling). Return JSON {\"subject\":..,\"body\":..}. "
                "Use \\n for line breaks. Return ONLY JSON."
            )
            out = execute_sql(ws, f"SELECT ai_query('databricks-meta-llama-3-3-70b-instruct', '{prompt}') AS d")
            draft = out[0]["d"] if out else "{}"
            return json.dumps({"student_email": r.get("email"), "draft": draft})[:4000]

        # --- WRITE actions (only reached after approval) ---
        if name == "decide_aid_appeal":
            appeal_id = _esc(args["appeal_id"])
            decision = (args.get("decision") or "").lower()
            status = "approved" if decision.startswith("appr") else "denied"
            execute_sql(ws, f"""
                UPDATE {GOLD}.aid_appeals SET status='{status}', decided_at=current_date(), decided_by='{_esc(actor)}'
                WHERE appeal_id='{appeal_id}'
            """)
            aid = _log_action(ws, "decide_aid_appeal", actor, appeal_id=args["appeal_id"],
                              status=status, notes=args.get("notes", ""), payload=args)
            return f"Aid appeal {args['appeal_id']} set to {status}. Logged as {aid}."

        if name == "place_retention_hold":
            sid = int(args["student_id"])
            amt = float(args.get("amount_usd", 0))
            aid = _log_action(ws, "place_retention_hold", actor, student_id=sid, amount_usd=amt,
                              status="active", notes=args.get("notes", ""), payload=args)
            return f"Retention hold of ${amt:,.0f} placed on student {sid}. Logged as {aid}."

        if name == "escalate_to_collections":
            sid = int(args["student_id"])
            aid = _log_action(ws, "escalate_to_collections", actor, student_id=sid,
                              status="escalated", notes=args.get("notes", ""), payload=args)
            return f"Student {sid} escalated to collections review. Logged as {aid}."

        return json.dumps({"error": f"unknown tool {name}"})
    except Exception as e:  # noqa: BLE001
        return json.dumps({"error": str(e)[:300]})
