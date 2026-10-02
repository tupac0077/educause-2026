"""Real Databricks AI/BI Genie space integration.

Genie is Databricks' natural-language SQL surface: ask a question in English,
Genie picks tables, writes SQL, runs it, and returns a synthesized answer plus
the SQL it ran. The REST API is poll-based (no streaming), so we start a
conversation then poll the message until COMPLETED/FAILED/CANCELLED.

Ported from the northstar reference app's server/agent/tools/genie.ts. Uses the
Databricks SDK's api_client so auth is handled by whichever WorkspaceClient is
passed (OBO user client in prod, service-principal fallback in dev).
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass

from databricks.sdk import WorkspaceClient


@dataclass
class GenieResult:
    answer: str
    sql: str | None = None
    conversation_id: str | None = None


def genie_space_id() -> str:
    return os.getenv("GENIE_SPACE_ID", "").strip()


def ask_genie(
    ws: WorkspaceClient,
    question: str,
    space_id: str | None = None,
    conversation_id: str | None = None,
) -> GenieResult:
    """Ask the Genie space a question; return the synthesized answer + the SQL run.

    If ``conversation_id`` is given, the question is asked as a follow-up in that
    existing Genie conversation (so Genie keeps prior context); otherwise a new
    conversation is started. The returned ``conversation_id`` should be passed
    back on the next turn to keep the thread going.

    Polls up to ~2.5 min (50 * 3s). Each call is a single REST hop via the SDK.
    """
    sid = (space_id or genie_space_id()).strip()
    if not sid:
        return GenieResult(answer="Genie is not configured (GENIE_SPACE_ID is empty).")

    api = ws.api_client
    conv_id = (conversation_id or "").strip() or None
    try:
        if conv_id:
            # Follow-up message in an existing conversation (keeps context).
            resp = api.do(
                "POST",
                f"/api/2.0/genie/spaces/{sid}/conversations/{conv_id}/messages",
                body={"content": question},
            )
            msg_id = resp.get("message_id") or resp.get("id")
            conv_id = resp.get("conversation_id") or conv_id
        else:
            resp = api.do(
                "POST",
                f"/api/2.0/genie/spaces/{sid}/start-conversation",
                body={"content": question},
            )
            conv_id = resp.get("conversation_id")
            msg_id = resp.get("message_id")
    except Exception as e:  # noqa: BLE001
        # A stale/invalid conversation id can 400/404 — retry once as a new conversation.
        if conv_id:
            return ask_genie(ws, question, space_id=sid, conversation_id=None)
        return GenieResult(answer=f"Genie request failed: {e}")

    if not conv_id or not msg_id:
        return GenieResult(answer="Genie did not return a conversation id.")

    poll_path = f"/api/2.0/genie/spaces/{sid}/conversations/{conv_id}/messages/{msg_id}"
    for _ in range(50):
        time.sleep(3)
        try:
            msg = api.do("GET", poll_path)
        except Exception:  # noqa: BLE001 — transient; keep polling within budget
            continue
        status = msg.get("status")
        if status == "COMPLETED":
            text_parts: list[str] = []
            sql: str | None = None
            for att in msg.get("attachments", []) or []:
                if att.get("text", {}).get("content"):
                    text_parts.append(att["text"]["content"])
                q = att.get("query") or {}
                if q.get("description"):
                    text_parts.append(q["description"])
                if q.get("query"):
                    sql = q["query"]
            answer = "\n\n".join(text_parts) or "(Genie returned no text content.)"
            # If Genie ran SQL but returned no synthesized text, fetch the result rows.
            if sql and not text_parts:
                try:
                    res = api.do("GET", poll_path + "/query-result")
                    answer = f"Genie ran a query. Result: {res}"[:1500]
                except Exception:  # noqa: BLE001
                    pass
            return GenieResult(answer=answer, sql=sql, conversation_id=conv_id)
        if status in ("FAILED", "CANCELLED"):
            err = (msg.get("error") or {}).get("error") or f"Genie query {status.lower()}."
            return GenieResult(answer=f"[Genie error] {err}", conversation_id=conv_id)
    return GenieResult(answer="Genie query timed out.", conversation_id=conv_id)
