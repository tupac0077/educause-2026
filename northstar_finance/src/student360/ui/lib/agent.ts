// Hand-written client for the action-taking finance agent (SSE) and the
// finance data endpoints. NOT auto-generated — keep out of the openapi codegen.

export type AgentMessage = { role: "user" | "assistant"; content: string };

export type ApprovalAction = {
  tool: string;
  call_id: string;
  summary: string;
  args: Record<string, unknown>;
};

export interface StreamHandlers {
  onText?: (delta: string) => void;
  onReasoning?: (delta: string) => void;
  onToolCall?: (c: { call_id: string; name: string; arguments: string }) => void;
  onToolOutput?: (o: { call_id: string; output: string }) => void;
  onApprovalRequired?: (a: ApprovalAction) => void;
  onDone?: (trace_id: string | null) => void;
  onError?: (err: string) => void;
}

function dispatch(ev: any, h: StreamHandlers) {
  switch (ev?.type) {
    case "response.output_text.delta":
      if (ev.delta) h.onText?.(ev.delta);
      break;
    case "response.reasoning_summary_text.delta":
      if (ev.delta) h.onReasoning?.(ev.delta);
      break;
    case "response.output_item.done": {
      const item = ev.item || {};
      if (item.type === "function_call")
        h.onToolCall?.({ call_id: item.call_id, name: item.name, arguments: item.arguments });
      else if (item.type === "function_call_output")
        h.onToolOutput?.({ call_id: item.call_id, output: item.output });
      break;
    }
    case "response.requires_approval":
      if (ev.action) h.onApprovalRequired?.(ev.action);
      break;
    case "response.completed":
      h.onDone?.(ev.trace_id ?? null);
      break;
    case "error":
      h.onError?.(ev.error ?? "Unknown error");
      break;
  }
}

/**
 * POST /api/agent/stream and consume the SSE body. Uses fetch + a ReadableStream
 * reader (EventSource can't POST). Buffers partial lines across chunks.
 */
export async function streamAgent(
  messages: AgentMessage[],
  handlers: StreamHandlers,
  conversationId?: string | null,
  signal?: AbortSignal,
  endpoint: string = "/api/agent/stream",
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, conversation_id: conversationId ?? null }),
      signal,
    });
  } catch (e) {
    handlers.onError?.((e as Error).message);
    return;
  }
  if (!res.ok || !res.body) {
    handlers.onError?.(`HTTP ${res.status} ${res.statusText}`);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneCalled = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const rawLine of rawEvent.split("\n")) {
          if (!rawLine.startsWith("data:")) continue;
          const payload = rawLine.slice(5).trim();
          if (payload === "[DONE]") {
            doneCalled = true;
            handlers.onDone?.(null);
            return;
          }
          let ev: unknown;
          try {
            ev = JSON.parse(payload);
          } catch {
            continue;
          }
          dispatch(ev, handlers);
        }
      }
    }
  } catch (e) {
    if ((e as Error).name !== "AbortError") handlers.onError?.((e as Error).message);
  } finally {
    if (!doneCalled) handlers.onDone?.(null);
  }
}

export async function sendAgentFeedback(
  trace_id: string,
  value: "up" | "down",
  rationale?: string | null,
): Promise<void> {
  try {
    await fetch("/api/agent/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trace_id, value, rationale: rationale ?? null }),
    });
  } catch {
    /* feedback is best-effort */
  }
}

// --- Finance data endpoints (typed) ---

export type FinanceSummary = {
  total_revenue_at_risk_usd: number;
  overdue_balance_usd: number;
  pending_appeals: number;
  pending_appeals_usd: number;
  over_budget_colleges: number;
};

export type AidAppeal = {
  appeal_id: string;
  student_id: number;
  full_name: string;
  college: string;
  appeal_type: string;
  requested_amount_usd: number;
  reason: string;
  status: string;
  submitted_at: string;
};

export type RevenueAtRisk = {
  student_id: number;
  full_name: string;
  college: string;
  expected_annual_tuition: number;
  risk_score: number;
  risk_category: string;
  revenue_at_risk_usd: number;
  primary_driver: string;
};

export type ActionLogEntry = {
  action_id: string;
  action_type: string;
  student_id: number | null;
  appeal_id: string | null;
  amount_usd: number | null;
  status: string;
  decision_notes: string | null;
  actor: string | null;
  created_at: string;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const getFinanceSummary = () => getJson<FinanceSummary>("/api/finance/summary");
export const getAidAppeals = (status = "pending") =>
  getJson<AidAppeal[]>(`/api/finance/aid-appeals?status=${encodeURIComponent(status)}`);
export const getRevenueAtRisk = (limit = 25) =>
  getJson<RevenueAtRisk[]>(`/api/finance/revenue-at-risk?limit=${limit}`);
export const getActionLog = () => getJson<ActionLogEntry[]>("/api/finance/action-log");
