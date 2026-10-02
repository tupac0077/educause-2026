"""Resolve (host, bearer token) for calling Databricks serving endpoints + Genie.

Prefers the caller's OBO token (attributes serving-endpoint usage to the viewing
user); falls back to the app service-principal creds from the WorkspaceClient.
"""
from __future__ import annotations

from databricks.sdk import WorkspaceClient


def host_of(ws: WorkspaceClient) -> str:
    return ws.config.host.rstrip("/")


def bearer(ws: WorkspaceClient, obo_token: str | None = None) -> str:
    """Return a bearer token for calling /serving-endpoints (no 'Bearer ' prefix).

    Uses the APP SERVICE-PRINCIPAL token, not the user's OBO token: the OBO token
    only carries the scopes the app's OAuth consent was created with, and adding
    `model-serving` after the app already exists does not retroactively grant it
    (yields '403 ... does not have required scopes: model-serving'). The SP's
    machine-to-machine token has full API scope, so the agent LLM calls succeed.
    `obo_token` is accepted for signature compatibility but intentionally ignored.
    """
    headers = ws.config.authenticate() or {}
    auth = headers.get("Authorization", "")
    return auth.split(" ", 1)[1] if auth.startswith("Bearer ") else auth
