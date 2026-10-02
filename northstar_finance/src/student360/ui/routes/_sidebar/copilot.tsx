import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { chat } from "@/lib/api";
import { edition } from "@/lib/edition";
import { Send, Bot, User, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_sidebar/copilot")({
  component: () => <CopilotPage />,
});

type Message = { role: "user" | "assistant"; content: string; sql?: string | null };

const SUGGESTIONS = [
  "Which students need the most urgent attention right now?",
  "Show me all high-risk students in Engineering",
  "Which courses have the highest fail rates?",
  "Compare pass rates across delivery modes",
  "How has the pass rate changed over the last 3 semesters?",
  `Which ${edition.firstGenLabel.toLowerCase()} students need support?`,
];

function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const resp = await chat({ message: text, conversation_id: conversationId });
      setConversationId(resp.data.conversation_id ?? undefined);
      setMessages((prev) => [...prev, { role: "assistant", content: resp.data.response, sql: resp.data.sql_query }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Finance Copilot</h1>
        <p className="text-muted-foreground">Ask questions about tuition revenue, financial aid, and student accounts in natural language — powered by Databricks Genie</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <Bot className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Ask me about your students</h3>
                <p className="text-sm text-muted-foreground mt-1">I can query student records, risk scores, course performance, and more.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} variant="outline" size="sm" className="text-left h-auto py-2 px-3 text-xs" onClick={() => sendMessage(s)}>{s}</Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4" /></div>}
              <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <pre className="whitespace-pre-wrap text-sm font-sans">{msg.content}</pre>
                {msg.sql && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer opacity-60">View SQL</summary>
                    <pre className="text-xs mt-1 p-2 bg-background/50 rounded overflow-x-auto font-mono">{msg.sql}</pre>
                  </details>
                )}
              </div>
              {msg.role === "user" && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center"><User className="h-4 w-4 text-primary-foreground" /></div>}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4" /></div>
              <div className="bg-muted rounded-lg p-3"><Loader2 className="h-4 w-4 animate-spin" /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </CardContent>
        <div className="border-t p-4">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about students, courses, risk scores..." disabled={loading} className="flex-1" />
            <Button type="submit" disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
