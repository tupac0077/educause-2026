"""Small SQL execution helper shared by the agent tools (mirrors router._execute_sql)."""
from __future__ import annotations

import os
import time

from databricks.sdk import WorkspaceClient

_warehouse_cache: str | None = None


def get_warehouse_id(ws: WorkspaceClient) -> str:
    global _warehouse_cache
    if _warehouse_cache:
        return _warehouse_cache
    configured = os.getenv("DATABRICKS_WAREHOUSE_ID", "").strip()
    if configured:
        _warehouse_cache = configured
        return configured
    for wh in ws.warehouses.list():
        if wh.state and wh.state.value == "RUNNING":
            _warehouse_cache = wh.id
            return wh.id
    whs = list(ws.warehouses.list())
    if whs:
        _warehouse_cache = whs[0].id
        return whs[0].id
    raise RuntimeError("No SQL warehouse available")


def execute_sql(ws: WorkspaceClient, query: str) -> list[dict]:
    """Execute a statement and return rows as dicts."""
    from databricks.sdk.service.sql import StatementState

    resp = ws.statement_execution.execute_statement(
        warehouse_id=get_warehouse_id(ws), statement=query, wait_timeout="50s"
    )
    sid = getattr(resp, "statement_id", None)

    def state_name(r) -> str:
        s = getattr(getattr(r, "status", None), "state", None)
        return str(s.value) if hasattr(s, "value") else str(s)

    state = state_name(resp).upper()
    deadline = time.time() + 120
    while sid and state in {"PENDING", "RUNNING"} and time.time() < deadline:
        time.sleep(2)
        resp = ws.statement_execution.get_statement(sid)
        state = state_name(resp).upper()

    if state == str(StatementState.SUCCEEDED.value):
        if resp.manifest and resp.result:
            cols = [c.name for c in resp.manifest.schema.columns]
            out = []
            for row in resp.result.data_array or []:
                out.append({c: (row[i] if i < len(row) else None) for i, c in enumerate(cols)})
            return out
        return []
    if state in {str(StatementState.FAILED.value), str(StatementState.CANCELED.value), str(StatementState.CLOSED.value)}:
        raise RuntimeError(getattr(getattr(resp, "status", None), "error", None) or f"SQL failed state={state}")
    return []
