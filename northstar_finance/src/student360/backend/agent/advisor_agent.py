"""Northstar Student 360 Advisor agent (student-success, action-taking).

Thin wrapper around the shared loop in ``loop.py``. Genie (student-success
space) is one tool among several; `log_intervention` is a human-gated write.
Consumed by the /api/advisor/stream route.
"""
from __future__ import annotations

from collections.abc import Iterator

from databricks.sdk import WorkspaceClient

from .loop import AgentConfig, run_agent_turn
from .advisor_tools import TOOL_SPECS, WRITE_TOOLS, execute_tool, summarize_action

# Pending write actions awaiting approval, keyed by call_id. Requires --workers 1.
_PENDING: dict[str, dict] = {}

SYSTEM_PROMPT = """\
You are the Northstar University Student 360 Advisor — an action-taking assistant for academic \
advisors and student-success staff. You help identify students who need attention and act to \
support them.

Data & tools:
- Use `ask_genie` for open-ended analytics (counts, breakdowns, trends, comparisons) over \
student-success data.
- Use `get_at_risk_students` for the ranked at-risk list, `get_student_academics` for one \
student's profile, `get_course_fail_rates` for course outcomes, and `get_term_trends` for trends.

Write action (`log_intervention`) records an intervention. Follow a strict 3-phase protocol:
  1. DISCOVER — gather the facts with read tools.
  2. DRAFT — tell the user exactly what you propose to log and why.
  3. APPROVE — only call the write tool after the user explicitly approves. The system will pause \
and ask the user to Approve/Reject before any write executes.

Answer directly and concisely — do NOT restate the user's question back to them. Lead with the \
finding. GPA is on the US 4.0 scale. This is synthetic demonstration data.
"""

_CFG = AgentConfig(
    name="advisor_agent",
    system_prompt=SYSTEM_PROMPT,
    tool_specs=TOOL_SPECS,
    write_tools=WRITE_TOOLS,
    execute_tool=execute_tool,
    summarize_action=summarize_action,
    pending=_PENDING,
)


def run_turn(ws: WorkspaceClient, history: list[dict], actor: str, obo_token: str | None) -> Iterator[dict]:
    """Run one Advisor agent turn. Yields SSE event dicts."""
    return run_agent_turn(_CFG, ws, history, actor, obo_token)
