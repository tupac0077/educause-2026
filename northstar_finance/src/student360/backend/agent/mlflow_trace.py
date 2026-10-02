"""Best-effort MLflow tracing for agent turns.

All calls are wrapped so a tracing failure never breaks a chat turn. If
mlflow-skinny isn't importable or Databricks tracking isn't reachable, the
agent still runs and trace_id is simply None.
"""
from __future__ import annotations

import contextlib
import os

_EXPERIMENT_READY = False


def _ensure_experiment():
    global _EXPERIMENT_READY
    if _EXPERIMENT_READY:
        return
    import mlflow  # noqa: F401

    mlflow.set_tracking_uri("databricks")
    path = os.getenv("AGENT_MLFLOW_EXPERIMENT_PATH", "/Shared/northstar_finance/agent-traces")
    try:
        mlflow.set_experiment(path)
    except Exception:  # noqa: BLE001
        exp_id = os.getenv("AGENT_MLFLOW_EXPERIMENT_ID", "")
        if exp_id:
            mlflow.set_experiment(experiment_id=exp_id)
    _EXPERIMENT_READY = True


class _Turn:
    def __init__(self):
        self.trace_id: str | None = None


@contextlib.contextmanager
def trace_turn(name: str, inputs: dict):
    """Context manager wrapping one agent turn in an MLflow span. Yields a holder
    whose .trace_id is populated (best effort)."""
    holder = _Turn()
    span_cm = None
    try:
        import mlflow

        _ensure_experiment()
        span_cm = mlflow.start_span(name=name)
        span = span_cm.__enter__()
        try:
            span.set_inputs(inputs)
        except Exception:  # noqa: BLE001
            pass
        try:
            holder.trace_id = getattr(span, "trace_id", None) or getattr(span, "request_id", None)
        except Exception:  # noqa: BLE001
            holder.trace_id = None
    except Exception:  # noqa: BLE001
        span_cm = None
    try:
        yield holder
    finally:
        if span_cm is not None:
            with contextlib.suppress(Exception):
                span_cm.__exit__(None, None, None)
