"""Generic, config-driven tool-calling agent loop (OpenAI-compatible).

Both the Finance and Advisor agents share this loop; they differ only by an
``AgentConfig`` (system prompt, tool specs, write-tool set, executor, and an
in-process pending-approval store). Genie is just one tool among several; WRITE
tools are gated behind explicit human approval. Emits SSE-style event dicts
consumed by the stream routes. MLflow tracing is best-effort.

Event dicts yielded (serialized as `data: <json>` by the route):
  {"type":"response.reasoning_summary_text.delta","delta": str}
  {"type":"response.output_item.done","item":{"type":"function_call","call_id","name","arguments"}}
  {"type":"response.output_item.done","item":{"type":"function_call_output","call_id","output"}}
  {"type":"response.requires_approval","action":{"tool","call_id","summary","args"}}
  {"type":"response.output_text.delta","delta": str}
  {"type":"response.completed","trace_id": str|None}
  {"type":"error","error": str}
"""
from __future__ import annotations

import json
import os
import re
from collections.abc import Callable, Iterator
from dataclasses import dataclass, field

from databricks.sdk import WorkspaceClient

from .auth import bearer, host_of
from .mlflow_trace import trace_turn


@dataclass
class AgentConfig:
    name: str                                  # trace prefix, e.g. "finance_agent"
    system_prompt: str
    tool_specs: list                           # OpenAI function-calling specs
    write_tools: set                           # names requiring human approval
    execute_tool: Callable[[WorkspaceClient, str, dict, str], str]
    summarize_action: Callable[[str, dict], str]
    pending: dict = field(default_factory=dict)  # call_id -> {name,args}; needs --workers 1


def _client(ws: WorkspaceClient, obo_token: str | None):
    from openai import OpenAI

    return OpenAI(base_url=f"{host_of(ws)}/serving-endpoints", api_key=bearer(ws, obo_token))


def _to_openai(cfg: AgentConfig, history: list[dict]) -> list[dict]:
    msgs = [{"role": "system", "content": cfg.system_prompt}]
    for m in history:
        role = m.get("role")
        if role in ("user", "assistant") and (m.get("content") or "").strip():
            msgs.append({"role": role, "content": m["content"]})
    return msgs


def _chunk_text(text: str) -> Iterator[str]:
    words = re.findall(r"\S+\s*", text)
    buf = ""
    for w in words:
        buf += w
        if len(buf) >= 24:
            yield buf
            buf = ""
    if buf:
        yield buf


def _tool_calls_to_dicts(tool_calls) -> list[dict]:
    return [
        {"id": tc.id, "type": "function",
         "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
        for tc in tool_calls
    ]


def run_agent_turn(
    cfg: AgentConfig, ws: WorkspaceClient, history: list[dict], actor: str, obo_token: str | None
) -> Iterator[dict]:
    """Run one agent turn for the given config. Yields event dicts."""
    model = os.getenv("AGENT_MODEL", "databricks-gpt-5-4")
    last_user = next((m["content"] for m in reversed(history) if m.get("role") == "user"), "") or ""

    # --- Approval command handling (resume a gated write) ---
    m = re.match(r"\s*(APPROVE|REJECT)\s+([A-Za-z0-9_\-]+)", last_user.strip(), re.I)
    if m:
        verb, call_id = m.group(1).upper(), m.group(2)
        pending = cfg.pending.pop(call_id, None)
        with trace_turn(f"{cfg.name}.approval", {"verb": verb, "call_id": call_id}) as turn:
            if not pending:
                for c in _chunk_text("That action has expired or was already handled. Please re-run the request."):
                    yield {"type": "response.output_text.delta", "delta": c}
            elif verb == "REJECT":
                yield {"type": "response.output_item.done",
                       "item": {"type": "function_call_output", "call_id": call_id,
                                "output": "Rejected by user; no changes made."}}
                for c in _chunk_text(f"Understood — I did not execute {pending['name']}. No changes were made."):
                    yield {"type": "response.output_text.delta", "delta": c}
            else:
                result = cfg.execute_tool(ws, pending["name"], pending["args"], actor)
                yield {"type": "response.output_item.done",
                       "item": {"type": "function_call_output", "call_id": call_id, "output": result}}
                for c in _chunk_text(f"Done. {result}"):
                    yield {"type": "response.output_text.delta", "delta": c}
            yield {"type": "response.completed", "trace_id": turn.trace_id}
        return

    # --- Normal tool-calling loop ---
    try:
        client = _client(ws, obo_token)
    except Exception as e:  # noqa: BLE001
        yield {"type": "error", "error": f"Agent model client init failed: {e}"}
        yield {"type": "response.completed", "trace_id": None}
        return

    conv = _to_openai(cfg, history)
    with trace_turn(f"{cfg.name}.turn", {"user_input": last_user}) as turn:
        try:
            for _ in range(8):  # max tool hops
                resp = client.chat.completions.create(
                    model=model, messages=conv, tools=cfg.tool_specs,
                    tool_choice="auto", temperature=0.1,
                )
                msg = resp.choices[0].message
                tool_calls = msg.tool_calls or []

                if not tool_calls:
                    text = msg.content or "(no response)"
                    for c in _chunk_text(text):
                        yield {"type": "response.output_text.delta", "delta": c}
                    yield {"type": "response.completed", "trace_id": turn.trace_id}
                    return

                conv.append({"role": "assistant", "content": msg.content or "",
                             "tool_calls": _tool_calls_to_dicts(tool_calls)})

                gated = False
                for tc in tool_calls:
                    name = tc.function.name
                    try:
                        args = json.loads(tc.function.arguments or "{}")
                    except json.JSONDecodeError:
                        args = {}
                    yield {"type": "response.output_item.done",
                           "item": {"type": "function_call", "call_id": tc.id,
                                    "name": name, "arguments": tc.function.arguments or "{}"}}

                    if name in cfg.write_tools:
                        cfg.pending[tc.id] = {"name": name, "args": args}
                        yield {"type": "response.requires_approval",
                               "action": {"tool": name, "call_id": tc.id,
                                          "summary": cfg.summarize_action(name, args), "args": args}}
                        note = f"I've prepared this action and need your approval:\n\n**{cfg.summarize_action(name, args)}**\n\nApprove or reject below."
                        for c in _chunk_text(note):
                            yield {"type": "response.output_text.delta", "delta": c}
                        gated = True
                        break
                    else:
                        output = cfg.execute_tool(ws, name, args, actor)
                        yield {"type": "response.output_item.done",
                               "item": {"type": "function_call_output", "call_id": tc.id, "output": output}}
                        conv.append({"role": "tool", "tool_call_id": tc.id, "content": output})

                if gated:
                    yield {"type": "response.completed", "trace_id": turn.trace_id}
                    return
            for c in _chunk_text("I couldn't finish that within the step budget. Please narrow the request."):
                yield {"type": "response.output_text.delta", "delta": c}
            yield {"type": "response.completed", "trace_id": turn.trace_id}
        except Exception as e:  # noqa: BLE001
            yield {"type": "error", "error": str(e)[:400]}
            yield {"type": "response.completed", "trace_id": turn.trace_id}
