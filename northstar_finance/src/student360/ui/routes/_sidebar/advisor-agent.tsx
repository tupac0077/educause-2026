import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  streamAgent,
  sendAgentFeedback,
  type AgentMessage,
  type ApprovalAction,
} from "@/lib/agent";
import {
  Send, GraduationCap, User, Loader2, Wrench, Brain, ThumbsUp, ThumbsDown,
  CheckCircle2, XCircle, ChevronDown, ChevronRight, ShieldAlert, Sparkles,
} from "lucide-react";
import { NS } from "@/components/apx/ns-charts";
import { Markdown } from "@/components/apx/markdown";
import { useConfig, orgQ } from "@/lib/config";

export const Route = createFileRoute("/_sidebar/advisor-agent")({
  component: () => <AdvisorAgentPage />,
});

type ThinkingEntry =
  | { kind: "reasoning"; text: string }
  | { kind: "tool_call"; callId: string; name: string; args: string }
  | { kind: "tool_output"; callId: string; output: string };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  thinking?: ThinkingEntry[];
  traceId?: string | null;
  approval?: ApprovalAction | null;
  approvalResolved?: boolean;
  feedback?: "up" | "down";
};

const SUGGESTIONS = [
  "Which students need the most urgent attention right now?",
  "Show me high-risk students in the College of Engineering",
  "Which courses have the highest fail rates?",
  "How has the pass rate changed over the last 3 semesters?",
  "Look at student 42 and propose an intervention",
  "Which colleges have the highest attrition risk?",
];

const ADVISOR_ENDPOINT = "/api/advisor/stream";

function AdvisorAgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cfg = useConfig();
  const genieUrl = cfg && cfg.genie_advisor ? `${cfg.host}/genie/rooms/${cfg.genie_advisor}${orgQ(cfg)}` : "";

  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const runTurn = useCallback(async (history: ChatMessage[]) => {
    // The assistant placeholder is already the last message (added by sendMessage).
    const wire: AgentMessage[] = history.map((m) => ({ role: m.role, content: m.content }));
    const patchLast = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = fn(next[next.length - 1]);
        return next;
      });

    await streamAgent(
      wire,
      {
        onText: (delta) => patchLast((m) => ({ ...m, content: m.content + delta })),
        onReasoning: (delta) =>
          patchLast((m) => {
            const t = [...(m.thinking ?? [])];
            const last = t[t.length - 1];
            if (last && last.kind === "reasoning") last.text += delta;
            else t.push({ kind: "reasoning", text: delta });
            return { ...m, thinking: t };
          }),
        onToolCall: (c) =>
          patchLast((m) => ({
            ...m,
            thinking: [...(m.thinking ?? []), { kind: "tool_call", callId: c.call_id, name: c.name, args: c.arguments }],
          })),
        onToolOutput: (o) =>
          patchLast((m) => ({
            ...m,
            thinking: [...(m.thinking ?? []), { kind: "tool_output", callId: o.call_id, output: o.output }],
          })),
        onApprovalRequired: (a) => patchLast((m) => ({ ...m, approval: a })),
        onDone: (traceId) => patchLast((m) => ({ ...m, traceId })),
        onError: (err) => patchLast((m) => ({ ...m, content: m.content || `Sorry, I hit an error: ${err}` })),
      },
      null,
      undefined,
      ADVISOR_ENDPOINT,
    );
    setLoading(false);
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || loading) return;
      setInput("");
      setLoading(true);
      const history: ChatMessage[] = [...messagesRef.current, { role: "user", content: text }];
      setMessages([
        ...history,
        { role: "assistant", content: "", thinking: [], traceId: null, approval: null },
      ]);
      void runTurn(history);
    },
    [loading, runTurn],
  );

  const resolveApproval = (idx: number, decision: "APPROVE" | "REJECT") => {
    const msg = messages[idx];
    if (!msg?.approval) return;
    setMessages((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], approvalResolved: true };
      return next;
    });
    sendMessage(`${decision} ${msg.approval.call_id}`);
  };

  const giveFeedback = (idx: number, value: "up" | "down") => {
    const msg = messages[idx];
    if (!msg?.traceId) return;
    setMessages((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], feedback: value };
      return next;
    });
    void sendAgentFeedback(msg.traceId, value);
  };

  return (
    <div className="ns-theme flex flex-col" style={{ minHeight: 0, height: "calc(100vh - 4rem)" }}>
      <div className="mb-3">
        <h1 className="ns-display text-3xl font-semibold flex items-center gap-2" style={{ color: NS.navy }}>
          <GraduationCap className="h-7 w-7" /> Advisor Genie
          {genieUrl && (
            <a
              href={genieUrl}
              target="_blank"
              rel="noreferrer"
              title="Open in Databricks Genie"
              aria-label="Open in Databricks Genie"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:opacity-80 transition"
              style={{ background: "rgba(9,64,116,0.1)", color: NS.navy }}
            >
              <Sparkles className="h-4 w-4" />
            </a>
          )}
        </h1>
        <p className="ns-muted text-sm mt-1">
          An action-taking agent for student success — it queries data via Databricks Genie, analyzes
          at-risk students and course outcomes, and logs advising interventions with your approval.
        </p>
      </div>

      <div className="ns-card flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center gap-4 pt-8 pb-4">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(9,64,116,0.08)" }}>
                <GraduationCap className="h-6 w-6" style={{ color: NS.navy }} />
              </div>
              <div>
                <h3 className="ns-display text-lg font-semibold">Ask about your students</h3>
                <p className="ns-muted text-sm mt-1">
                  At-risk students, course fail rates, college performance, term trends — and log interventions.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl w-full">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="ns-card text-left py-2 px-3 text-xs hover:opacity-90 transition" onClick={() => sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "rgba(9,64,116,0.1)" }}>
                  <GraduationCap className="h-4 w-4" style={{ color: NS.navy }} />
                </div>
              )}
              <div
                className="max-w-[86%] rounded-xl p-3 text-sm"
                style={
                  msg.role === "user"
                    ? { background: NS.navy, color: "white" }
                    : { background: "var(--ns-surface)", border: "1px solid var(--ns-line)" }
                }
              >
                {msg.role === "assistant" && !!msg.thinking?.length && <ThinkingPanel entries={msg.thinking} />}
                {msg.content ? (
                  msg.role === "assistant" ? (
                    <Markdown>{msg.content}</Markdown>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm font-sans">{msg.content}</pre>
                  )
                ) : msg.role === "assistant" && loading && i === messages.length - 1 ? (
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: NS.navy }} />
                ) : null}

                {msg.approval && !msg.approvalResolved && (
                  <ApprovalCard
                    action={msg.approval}
                    onApprove={() => resolveApproval(i, "APPROVE")}
                    onReject={() => resolveApproval(i, "REJECT")}
                  />
                )}

                {msg.role === "assistant" && msg.traceId && !loading && (
                  <div className="flex items-center gap-1 mt-2 opacity-70">
                    <button className="h-6 px-1" onClick={() => giveFeedback(i, "up")}>
                      <ThumbsUp className={`h-3.5 w-3.5 ${msg.feedback === "up" ? "text-green-600" : ""}`} />
                    </button>
                    <button className="h-6 px-1" onClick={() => giveFeedback(i, "down")}>
                      <ThumbsDown className={`h-3.5 w-3.5 ${msg.feedback === "down" ? "text-red-600" : ""}`} />
                    </button>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center" style={{ background: NS.navy }}>
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="p-3" style={{ borderTop: "1px solid var(--ns-line)" }}>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about at-risk students, courses, trends — or propose an intervention..."
              disabled={loading}
              className="flex-1 bg-transparent"
            />
            <Button type="submit" disabled={loading || !input.trim()} style={{ background: NS.navy }}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ThinkingPanel({ entries }: { entries: ThinkingEntry[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2 rounded-md border border-border/60 bg-background/40">
      <button type="button" className="flex items-center gap-1 w-full px-2 py-1 text-xs font-medium opacity-80" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Brain className="h-3 w-3" /> Thinking &amp; tools ({entries.length})
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-1">
          {entries.map((e, i) => {
            if (e.kind === "reasoning")
              return <p key={i} className="text-xs italic text-muted-foreground whitespace-pre-wrap">{e.text}</p>;
            if (e.kind === "tool_call")
              return (
                <div key={i} className="text-xs flex items-start gap-1">
                  <Wrench className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="font-mono">{e.name}({truncate(e.args, 120)})</span>
                </div>
              );
            return (
              <div key={i} className="text-xs pl-4 text-muted-foreground font-mono whitespace-pre-wrap">
                → {truncate(e.output, 300)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ action, onApprove, onReject }: { action: ApprovalAction; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="mt-3 rounded-md border border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 p-3">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold">Approval required</span>
        <Badge variant="outline" className="text-[10px]">{action.tool}</Badge>
      </div>
      <p className="text-sm mb-2">{action.summary}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onApprove}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
        <Button size="sm" variant="outline" onClick={onReject}><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}
