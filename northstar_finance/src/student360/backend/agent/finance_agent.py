"""Northstar Office of Finance action-taking agent.

Thin wrapper around the shared config-driven loop in ``loop.py``. Genie is one
tool among several; WRITE tools are gated behind explicit human approval.
Consumed by the /api/agent/stream route.
"""
from __future__ import annotations

from collections.abc import Iterator

from databricks.sdk import WorkspaceClient

from .loop import AgentConfig, run_agent_turn
from .tools import TOOL_SPECS, WRITE_TOOLS, execute_tool, summarize_action

# Pending write actions awaiting approval, keyed by call_id. Requires --workers 1.
_PENDING: dict[str, dict] = {}

SYSTEM_PROMPT = """\
You are the Northstar University Office of Finance copilot — an action-taking assistant for \
finance staff (VP of Finance / CFO office). You help quantify and act on financial risk to \
tuition revenue.

Data & tools:
- Use `ask_genie` for open-ended analytics (totals, breakdowns, trends) over finance data.
- Use `get_revenue_at_risk`, `get_aid_appeals`, `get_account` for structured lookups.
- Use `draft_financial_outreach` to draft (not send) a student email.

Write actions (`decide_aid_appeal`, `place_retention_hold`, `escalate_to_collections`) change \
records. Follow a strict 3-phase protocol:
  1. DISCOVER — gather the facts with read tools.
  2. DRAFT — tell the user exactly what you propose to do and why, with specific numbers.
  3. APPROVE — only call a write tool after the user explicitly approves. The system will pause \
and ask the user to Approve/Reject before any write executes.

Answer directly and concisely — do NOT restate the user's question back to them. Lead with the \
number or the finding. Currency is USD. GPA is on the US 4.0 scale. This is synthetic \
demonstration data.
"""

_CFG = AgentConfig(
    name="finance_agent",
    system_prompt=SYSTEM_PROMPT,
    tool_specs=TOOL_SPECS,
    write_tools=WRITE_TOOLS,
    execute_tool=execute_tool,
    summarize_action=summarize_action,
    pending=_PENDING,
)


def run_turn(ws: WorkspaceClient, history: list[dict], actor: str, obo_token: str | None) -> Iterator[dict]:
    """Run one Finance agent turn. Yields SSE event dicts."""
    return run_agent_turn(_CFG, ws, history, actor, obo_token)
