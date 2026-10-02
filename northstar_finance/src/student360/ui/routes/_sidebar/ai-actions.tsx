import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useListOutreach,
  useGenerateInterventionPlan,
  useComposeOutreach,
  useLogOutreach,
  useLogPlanning,
  useGetOutreachLog,
  useListFacultyNames,
  chat,
  type InterventionPlan,
  type OutreachEmail,
  type OutreachStudent,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { edition, shortOrgUnit } from "@/lib/edition";
import { useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  Mail,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  ArrowRight,
  Copy,
  RefreshCw,
  User,
  FileText,
  Pencil,
  Send,
  MessageCircle,
  Target,
  Brain,
  ListChecks,
  CalendarCheck,
  PanelLeftOpen,
  PanelLeftClose,
  X,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/_sidebar/ai-actions")({
  component: () => <AiActionsPage />,
});

// --- Types ---

interface ChatMessage {
  id: string;
  role: "ai" | "user" | "system";
  content: string;
  component?: React.ReactNode;
  timestamp: Date;
  // Student IDs whose names were detected in the AI's response — rendered as
  // clickable chips that jump straight into the intervention workflow.
  mentionedStudentIds?: number[];
}

type ProgressStep =
  | "student"
  | "assessment"
  | "strategy"
  | "action-plan"
  | "outreach"
  | "review";

type StepStatus = "pending" | "active" | "done";

interface StepDef {
  id: ProgressStep;
  label: string;
  icon: LucideIcon;
  subtext?: string;
}

const STEPS: StepDef[] = [
  { id: "student", label: "Student Selection", icon: User },
  { id: "assessment", label: "Risk Assessment", icon: Search },
  { id: "strategy", label: "Intervention Strategy", icon: Brain },
  { id: "action-plan", label: "Action Plan", icon: ListChecks },
  { id: "outreach", label: "Outreach Composition", icon: Mail },
  { id: "review", label: "Review & Send", icon: CalendarCheck },
];

// --- Helpers ---

function msgId() {
  return Math.random().toString(36).slice(2, 10);
}

function EmailBody({ text }: { text: string }) {
  const processed = text.replace(/^(Dear\s+[^,]+,)\s*\n(?!\n)/m, "$1\n\n");
  const paragraphs = processed.split(/\n\n+/);
  return (
    <div className="text-sm leading-relaxed space-y-3">
      {paragraphs.map((para, i) => {
        const lines = para.split(/\n/).filter((l) => l.trim() !== "");
        const isList = lines.every(
          (l) =>
            l.trim().startsWith("-") ||
            l.trim().startsWith("*") ||
            l.trim().startsWith("•")
        );
        if (isList && lines.length > 0) {
          return (
            <ul key={i} className="space-y-1 pl-1">
              {lines.map((line, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="text-violet-400 mt-0.5 flex-shrink-0">
                    &#8226;
                  </span>
                  <span>{line.trim().replace(/^[-*•]\s*/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (lines.length > 1) {
          return (
            <div key={i}>
              {lines.map((line, j) => (
                <div key={j}>{line}</div>
              ))}
            </div>
          );
        }
        return <p key={i}>{para}</p>;
      })}
    </div>
  );
}

// --- Main Page ---

function AiActionsPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [currentStep, setCurrentStep] = useState<ProgressStep>("student");
  const [stepStatuses, setStepStatuses] = useState<Record<ProgressStep, StepStatus>>({
    student: "active",
    assessment: "pending",
    strategy: "pending",
    "action-plan": "pending",
    outreach: "pending",
    review: "pending",
  });
  const [stepSubtexts, setStepSubtexts] = useState<Record<string, string>>({});

  const [selectedStudent, setSelectedStudent] = useState<OutreachStudent | null>(null);
  const [plan, setPlan] = useState<InterventionPlan | null>(null);
  const [_email, setEmail] = useState<OutreachEmail | null>(null);
  const [tone, setTone] = useState("empathetic");
  const [searchFilter, setSearchFilter] = useState("");
  const [sent, setSent] = useState(false);
  const [editFrom, setEditFrom] = useState(`Student Success Team <${edition.supportEmail}>`);
  const [editTo, setEditTo] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Student panel state
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelSearch, setPanelSearch] = useState("");
  const [panelRisk, setPanelRisk] = useState<string>("all");
  const [panelFaculty, setPanelFaculty] = useState<string>("all");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Pull a wide pool of outreach candidates so the chat-mention chip detector
  // can match any student Genie might surface (not just the first 50 highest-risk).
  const { data: resp, isLoading: loadingStudents } = useListOutreach({
    params: { limit: 5000 },
  });
  const students = resp?.data ?? [];
  const { data: facultyResp } = useListFacultyNames();
  const facultyNames = facultyResp?.data ?? [];
  const planMutation = useGenerateInterventionPlan();
  const emailMutation = useComposeOutreach();
  const logMutation = useLogOutreach();
  const planningMutation = useLogPlanning();
  const [chatConversationId, setChatConversationId] = useState<string | undefined>(undefined);
  const [chatLoading, setChatLoading] = useState(false);
  const { data: logResp, refetch: refetchLog } = useGetOutreachLog();
  const outreachLog = logResp?.data ?? {};

  const filteredStudents = searchFilter
    ? students.filter(
        (s) =>
          s.full_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          s.program_name?.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : students.filter(
        (s) =>
          s.risk_category === "Very High" ||
          s.risk_category === "High" ||
          s.risk_level === "High"
      );

  // Panel-specific filtering (separate from chat-embedded list)
  const panelStudents = students.filter((s) => {
    if (panelSearch) {
      const q = panelSearch.toLowerCase();
      if (
        !s.full_name.toLowerCase().includes(q) &&
        !s.program_name?.toLowerCase().includes(q) &&
        !s.email?.toLowerCase().includes(q)
      )
        return false;
    }
    if (panelRisk !== "all") {
      const cat = (s.risk_category || s.risk_level || "").toLowerCase();
      if (panelRisk === "high" && !["high", "very high"].includes(cat)) return false;
      if (panelRisk === "medium" && cat !== "medium") return false;
      if (panelRisk === "low" && !["low", "very low"].includes(cat)) return false;
    }
    if (panelFaculty !== "all" && s.faculty !== panelFaculty) return false;
    return true;
  });

  const panelHasFilters = panelSearch || panelRisk !== "all" || panelFaculty !== "all";
  const clearPanelFilters = () => {
    setPanelSearch("");
    setPanelRisk("all");
    setPanelFaculty("all");
  };

  useEffect(() => {
    // Scroll the messages container itself rather than calling scrollIntoView
    // on a child — scrollIntoView can scroll the wrong ancestor when this view
    // sits inside multiple nested scrollable containers. Defer with rAF so the
    // scroll happens after the layout reflows (important when toggling the panel).
    const id = requestAnimationFrame(() => {
      const el = messagesRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [messages, panelOpen]);

  const addMessage = (msg: Omit<ChatMessage, "id" | "timestamp">) => {
    setMessages((prev) => [...prev, { ...msg, id: msgId(), timestamp: new Date() }]);
  };

  const advanceStep = (from: ProgressStep, to: ProgressStep, subtext?: string) => {
    setStepStatuses((prev) => ({ ...prev, [from]: "done", [to]: "active" }));
    setCurrentStep(to);
    if (subtext) {
      setStepSubtexts((prev) => ({ ...prev, [from]: subtext }));
    }
  };

  const completeStep = (step: ProgressStep, subtext?: string) => {
    setStepStatuses((prev) => ({ ...prev, [step]: "done" }));
    if (subtext) {
      setStepSubtexts((prev) => ({ ...prev, [step]: subtext }));
    }
  };

  // --- Flow handlers ---

  const handleSelectStudent = (student: OutreachStudent) => {
    setSelectedStudent(student);
    setPlan(null);
    setEmail(null);
    setSent(false);

    addMessage({
      role: "user",
      content: `Plan an intervention for ${student.full_name}`,
    });

    advanceStep("student", "assessment", student.full_name);

    addMessage({
      role: "ai",
      content: `Analyzing ${student.full_name}'s profile — risk factors, engagement data, and academic history...`,
    });

    planMutation.mutate(
      { student_id: student.student_id },
      {
        onSuccess: (resp) => {
          const p = resp.data;
          setPlan(p);
          advanceStep("assessment", "strategy", `${p.urgency} risk`);

          // Write an early 'planning' entry to the intervention log so this
          // student appears in the Tracker's Planning column before the
          // outreach email is composed/sent.
          planningMutation.mutate(
            {
              student_id: student.student_id,
              student_name: student.full_name,
              tone: "",
              subject: "",
              intervention_type: p.intervention_type,
            },
            { onSuccess: () => refetchLog() }
          );

          addMessage({
            role: "ai",
            content: "",
            component: <PlanCard plan={p} student={student} />,
          });

          advanceStep("strategy", "action-plan", p.intervention_type ?? undefined);

          setTimeout(() => {
            addMessage({
              role: "ai",
              content:
                "I've generated a comprehensive intervention plan. Would you like to compose a personalized outreach email? Choose a tone:",
              component: (
                <ToneSelector
                  tone={tone}
                  onToneChange={setTone}
                  onCompose={() => handleComposeEmail(student, p)}
                />
              ),
            });
            completeStep("action-plan", `${p.action_items?.length ?? 0} items`);
          }, 300);
        },
        onError: () => {
          addMessage({
            role: "ai",
            content:
              "I wasn't able to generate a plan right now. This could be a temporary issue with the AI service. Would you like to try again?",
            component: (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSelectStudent(student)}
                  className="gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </Button>
              </div>
            ),
          });
        },
      }
    );
  };

  const handleComposeEmail = (
    student?: OutreachStudent,
    planOverride?: InterventionPlan
  ) => {
    const s = student || selectedStudent;
    const p = planOverride || plan;
    if (!s || !p) return;

    advanceStep("action-plan", "outreach");

    addMessage({
      role: "user",
      content: `Compose a ${tone} outreach email`,
    });

    addMessage({
      role: "ai",
      content: `Drafting a ${tone} email tailored to ${s.full_name}'s situation and the intervention plan...`,
    });

    emailMutation.mutate(
      {
        student_id: s.student_id,
        tone,
        intervention_plan: JSON.stringify(p),
      },
      {
        onSuccess: (resp) => {
          const e = resp.data;
          setEmail(e);
          setEditFrom(`Student Success Team <${edition.supportEmail}>`);
          setEditTo(`${e.student_name || ""} <${e.student_email || ""}>`);
          setEditSubject(e.subject || "");
          setEditBody(e.body || "");
          setIsEditing(false);

          advanceStep("outreach", "review", `${tone} tone`);

          addMessage({
            role: "ai",
            content: "",
            component: (
              <EmailCard
                editFrom={editFrom}
                editTo={`${e.student_name || ""} <${e.student_email || ""}>`}
                editSubject={e.subject || ""}
                editBody={e.body || ""}
                isEditing={isEditing}
                tone={tone}
                onEditFrom={setEditFrom}
                onEditTo={setEditTo}
                onEditSubject={setEditSubject}
                onEditBody={setEditBody}
                onToggleEditing={setIsEditing}
                onSend={() => handleSendEmail(s, e)}
                onCopy={() =>
                  handleCopy(
                    `Subject: ${e.subject}\n\n${e.body}`
                  )
                }
                onRegenerate={() => handleRegenerateEmail(s, p)}
                copied={copied}
                sent={sent}
              />
            ),
          });
        },
        onError: () => {
          addMessage({
            role: "ai",
            content:
              "I couldn't compose the email right now. Would you like to try again?",
            component: (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleComposeEmail(s, p)}
                  className="gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </Button>
              </div>
            ),
          });
        },
      }
    );
  };

  const handleRegenerateEmail = (s: OutreachStudent, p: InterventionPlan) => {
    setSent(false);
    handleComposeEmail(s, p);
  };

  const handleSendEmail = (s: OutreachStudent, e: OutreachEmail) => {
    const toMatch = editTo.match(/<([^>]+)>/);
    const toEmail = toMatch ? toMatch[1] : editTo.trim();
    const finalTo = toEmail || e.student_email || "";
    const finalSubject = editSubject || e.subject || "";
    const finalBody = editBody || e.body || "";

    const mailtoUrl = `mailto:${encodeURIComponent(finalTo)}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(finalBody)}`;
    window.open(mailtoUrl, "_blank");

    logMutation.mutate(
      {
        student_id: s.student_id,
        student_name: s.full_name,
        tone,
        subject: finalSubject,
        intervention_type: plan?.intervention_type,
      },
      { onSuccess: () => refetchLog() }
    );
    setSent(true);
    completeStep("review", "Sent");

    addMessage({
      role: "system",
      content: `Outreach sent to ${s.full_name}. The intervention has been logged and you can track progress in the Intervention Tracker.`,
      component: (
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" asChild>
            <Link to="/tracker">View Tracker</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={handleStartOver}>
            New Intervention
          </Button>
        </div>
      ),
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartOver = () => {
    setMessages([]);
    setSelectedStudent(null);
    setPlan(null);
    setEmail(null);
    setSent(false);
    setIsEditing(false);
    setInputValue("");
    setSearchFilter("");
    setChatConversationId(undefined);
    setChatLoading(false);
    setCurrentStep("student");
    setStepStatuses({
      student: "active",
      assessment: "pending",
      strategy: "pending",
      "action-plan": "pending",
      outreach: "pending",
      review: "pending",
    });
    setStepSubtexts({});
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || chatLoading) return;
    const val = text.trim();

    addMessage({ role: "user", content: val });
    const thinkingId = msgId();
    setMessages((prev) => [
      ...prev,
      { id: thinkingId, role: "ai", content: "Thinking...", timestamp: new Date() },
    ]);
    setChatLoading(true);

    try {
      const resp = await chat({ message: val, conversation_id: chatConversationId });
      const r = resp.data;
      if (r.conversation_id) setChatConversationId(r.conversation_id);
      const responseText = r.response || "(no response)";
      // Detect students mentioned in the response. Prefer email matches (unique),
      // then fall back to full-name matches deduped to one student per name
      // (the synthetic data has many homonyms like multiple "Ryan Wilson"s).
      const mentioned: number[] = [];
      const matchedNames = new Set<string>();
      const emailsInResponse = new Set(
        Array.from(responseText.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g))
          .map((m) => m[0].toLowerCase())
      );
      for (const s of students) {
        if (emailsInResponse.has((s.email || "").toLowerCase())) {
          mentioned.push(s.student_id);
          matchedNames.add(s.full_name);
        }
      }
      for (const s of students) {
        if (matchedNames.has(s.full_name)) continue;
        if (responseText.includes(s.full_name)) {
          mentioned.push(s.student_id);
          matchedNames.add(s.full_name);
        }
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? { ...m, content: responseText, mentionedStudentIds: mentioned.length > 0 ? mentioned : undefined }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                content:
                  "Sorry, I couldn't reach the assistant. " +
                  ((err as Error)?.message ?? "Try again in a moment."),
              }
            : m
        )
      );
    } finally {
      setChatLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputValue.trim();
    if (!val || chatLoading) return;
    setInputValue("");
    if (currentStep === "student") {
      setSearchFilter(val);
    }
    void sendMessage(val);
  };

  const handleSuggestion = (text: string) => {
    if (chatLoading) return;
    setSearchFilter("");
    void sendMessage(text);
  };

  const isInitial = messages.length === 0;
  const showStudentList =
    currentStep === "student" && messages.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Intervention Planner</h1>
          <p className="text-muted-foreground">
            AI-guided intervention planning with live progress tracking — describe what you need and the AI will guide you
          </p>
        </div>
      </div>

      {/* Main layout: student panel + chat + progress sidebar */}
      <div className="flex gap-4 items-start" style={{ minHeight: "calc(100vh - 200px)" }}>

        {/* Student browse panel */}
        {panelOpen && (
          <div
            className="flex flex-col rounded-xl border bg-card flex-shrink-0 overflow-hidden"
            style={{ width: 300, height: "calc(100vh - 200px)" }}
          >
            {/* Panel header */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold">Students</span>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {panelStudents.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPanelOpen(false)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={panelSearch}
                  onChange={(e) => setPanelSearch(e.target.value)}
                  placeholder="Search by name or program..."
                  className="w-full bg-muted/50 border border-border rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="px-3 pb-3 space-y-2">
              <div className="flex gap-2">
                <select
                  value={panelRisk}
                  onChange={(e) => setPanelRisk(e.target.value)}
                  className="flex-1 bg-muted/50 border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="high">High / Very High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low / Very Low</option>
                </select>
                <select
                  value={panelFaculty}
                  onChange={(e) => setPanelFaculty(e.target.value)}
                  className="flex-1 bg-muted/50 border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 appearance-none cursor-pointer truncate"
                >
                  <option value="all">All {edition.orgUnitLabelPlural}</option>
                  {facultyNames.map((f) => (
                    <option key={f} value={f}>
                      {shortOrgUnit(f)}
                    </option>
                  ))}
                </select>
              </div>
              {panelHasFilters && (
                <button
                  onClick={clearPanelFilters}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                  Clear filters
                </button>
              )}
            </div>

            {/* Student list */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
              {loadingStudents ? (
                <div className="space-y-2 pt-1">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : panelStudents.length === 0 ? (
                <div className="text-xs text-muted-foreground p-4 text-center border rounded-lg border-dashed mt-1">
                  No students match your filters.
                </div>
              ) : (
                panelStudents.map((s) => (
                  <PanelStudentRow
                    key={s.student_id}
                    student={s}
                    isSelected={selectedStudent?.student_id === s.student_id}
                    hasOutreach={!!outreachLog[s.student_id] && outreachLog[s.student_id].status !== "planning"}
                    onClick={() => handleSelectStudent(s)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col rounded-xl border bg-card min-w-[400px]" style={{ height: "calc(100vh - 200px)" }}>
          {/* Chat messages */}
          <div ref={messagesRef} className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
            {isInitial ? (
              <InitialHero onSuggestion={handleSuggestion} />
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    students={students}
                    onSelectStudent={handleSelectStudent}
                  />
                ))}

                {/* Student list embedded in chat */}
                {showStudentList && !panelOpen && (
                  <div className="space-y-2 pl-12">
                    {loadingStudents ? (
                      <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                          <Skeleton key={i} className="h-14 rounded-lg" />
                        ))}
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-4 text-center border rounded-lg border-dashed">
                        No matching students found. Try a different search.
                      </div>
                    ) : (
                      filteredStudents.slice(0, 10).map((s) => (
                        <StudentRow
                          key={s.student_id}
                          student={s}
                          hasOutreach={!!outreachLog[s.student_id] && outreachLog[s.student_id].status !== "planning"}
                          onClick={() => handleSelectStudent(s)}
                        />
                      ))
                    )}
                    {filteredStudents.length > 10 && (
                      <div className="text-xs text-muted-foreground text-center py-1">
                        Showing 10 of {filteredStudents.length} — search to narrow results
                      </div>
                    )}
                  </div>
                )}

                {/* Hint to open panel when chat shows student list */}
                {showStudentList && !panelOpen && (
                  <div className="pl-12">
                    <button
                      onClick={() => setPanelOpen(true)}
                      className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1 mt-1"
                    >
                      <PanelLeftOpen className="h-3 w-3" />
                      Open student panel for more filtering options
                    </button>
                  </div>
                )}

                {/* Loading indicators */}
                {(planMutation.isPending || emailMutation.isPending) && (
                  <div className="flex items-start gap-3 pl-1">
                    <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                      <Loader2 className="h-4 w-4 text-violet-600 animate-spin" />
                    </div>
                    <div className="pt-1.5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse delay-75" />
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse delay-150" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Input bar */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              {!panelOpen && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 flex-shrink-0"
                  onClick={() => setPanelOpen(true)}
                  title="Open student panel"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              )}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={chatLoading}
                placeholder={
                  chatLoading
                    ? "Thinking..."
                    : currentStep === "student"
                      ? "Search for a student or describe who you'd like to help..."
                      : "Ask a follow-up question..."
                }
                className="flex-1 bg-transparent border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 placeholder:text-muted-foreground/60 disabled:opacity-60"
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 rounded-lg bg-violet-600 hover:bg-violet-700"
                disabled={!inputValue.trim() || chatLoading}
              >
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>

        {/* Build Progress sidebar — hidden when the student panel is open so the
            chat has enough horizontal room to keep answers readable. */}
        <div className={`w-72 flex-shrink-0 ${panelOpen ? "hidden xl:block" : ""}`}>
          <Card className="sticky top-4">
            <CardContent className="p-5">
              <div className="text-xs font-bold tracking-wider text-muted-foreground mb-5 uppercase">
                Intervention Progress
              </div>

              <div className="space-y-0">
                {STEPS.map((step, idx) => {
                  const status = stepStatuses[step.id];
                  const sub = stepSubtexts[step.id];
                  const isLast = idx === STEPS.length - 1;

                  return (
                    <div key={step.id} className="flex items-start gap-3">
                      {/* Icon + connector line */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                            status === "done"
                              ? "bg-violet-600 text-white"
                              : status === "active"
                                ? "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500/30"
                                : "bg-muted text-muted-foreground/50"
                          }`}
                        >
                          {status === "done" ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <step.icon className="h-4 w-4" />
                          )}
                        </div>
                        {!isLast && (
                          <div
                            className={`w-px h-8 transition-colors ${
                              status === "done"
                                ? "bg-violet-500"
                                : "bg-border"
                            }`}
                          />
                        )}
                      </div>

                      {/* Label */}
                      <div className="pt-1.5 min-w-0">
                        <div
                          className={`text-sm font-medium transition-colors ${
                            status === "active"
                              ? "text-violet-600 dark:text-violet-400"
                              : status === "done"
                                ? "text-foreground"
                                : "text-muted-foreground/60"
                          }`}
                        >
                          {step.label}
                        </div>
                        {sub && (
                          <div className="text-xs text-muted-foreground truncate">
                            {sub}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t space-y-2">
                {selectedStudent && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
                    <div className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-[9px] font-bold text-violet-700">
                      {selectedStudent.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {selectedStudent.full_name}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {selectedStudent.risk_category}
                      </div>
                    </div>
                  </div>
                )}
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                    onClick={handleStartOver}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Start New Intervention
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function InitialHero({
  onSuggestion,
}: {
  onSuggestion: (text: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-8">
      <div className="h-16 w-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-6">
        <Sparkles className="h-8 w-8 text-violet-600" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Plan an Intervention</h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Describe who you'd like to help and the AI agent will guide you through
        risk assessment, strategy, and outreach — or use the progress panel to
        jump to any step.
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        <SuggestionChip
          text="Help me intervene with a high-risk student"
          onClick={onSuggestion}
        />
        <SuggestionChip
          text="Show all students needing outreach"
          onClick={onSuggestion}
        />
        <SuggestionChip
          text="Follow up on a previous intervention"
          onClick={onSuggestion}
        />
      </div>
    </div>
  );
}

function SuggestionChip({
  text,
  onClick,
}: {
  text: string;
  onClick: (text: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(text)}
      className="px-4 py-2 text-sm border rounded-full hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-300 dark:hover:border-violet-700 transition-colors text-muted-foreground hover:text-foreground"
    >
      {text}
    </button>
  );
}

function ChatBubble({
  message,
  students,
  onSelectStudent,
}: {
  message: ChatMessage;
  students?: OutreachStudent[];
  onSelectStudent?: (s: OutreachStudent) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-violet-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-lg">
          <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
        </div>
      </div>
    );
  }

  const isSystem = message.role === "system";

  const mentioned = (message.mentionedStudentIds && students)
    ? students.filter((s) => message.mentionedStudentIds!.includes(s.student_id))
    : [];

  return (
    <div className="flex items-start gap-3">
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isSystem
            ? "bg-green-100 dark:bg-green-900/30"
            : "bg-violet-100 dark:bg-violet-900/30"
        }`}
      >
        {isSystem ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Sparkles className="h-4 w-4 text-violet-600" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2 pt-0.5">
        {message.content && (
          <div
            className={`text-sm whitespace-pre-wrap break-words ${isSystem ? "text-green-700 dark:text-green-400 font-medium" : ""}`}
          >
            {message.content}
          </div>
        )}
        {mentioned.length > 0 && onSelectStudent && (
          <div className="pt-1">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Plan an intervention for:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mentioned.slice(0, 8).map((s) => (
                <button
                  key={s.student_id}
                  onClick={() => onSelectStudent(s)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800 text-xs text-violet-800 dark:text-violet-300 transition-colors"
                  title={`Start intervention plan for ${s.full_name}${s.program_name ? " — " + s.program_name : ""}`}
                >
                  <User className="h-3 w-3" />
                  <span>{s.full_name}</span>
                  {s.program_name && (
                    <span className="text-[10px] opacity-60">· {s.program_name.replace(/^(Bachelor|Master) of /, "")}</span>
                  )}
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </button>
              ))}
            </div>
          </div>
        )}
        {message.component}
      </div>
    </div>
  );
}

function StudentRow({
  student,
  hasOutreach,
  onClick,
}: {
  student: OutreachStudent;
  hasOutreach: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
        hasOutreach
          ? "border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/10 hover:border-green-300"
          : "hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            hasOutreach
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              : "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
          }`}
        >
          {hasOutreach ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            student.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
          )}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm flex items-center gap-2">
            <span className="truncate">{student.full_name}</span>
            {hasOutreach && (
              <span className="text-[10px] font-normal text-green-600 dark:text-green-400 flex-shrink-0">
                Outreach Sent
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {student.program_name} &middot; GPA{" "}
            {student.gpa?.toFixed(1) ?? "N/A"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <Badge
          variant={
            student.risk_category === "Very High" ||
            student.risk_category === "High"
              ? "destructive"
              : student.risk_category === "Medium"
                ? "secondary"
                : "outline"
          }
          className="text-[10px]"
        >
          {student.risk_category || student.risk_level}
        </Badge>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </button>
  );
}

function PanelStudentRow({
  student,
  isSelected,
  hasOutreach,
  onClick,
}: {
  student: OutreachStudent;
  isSelected: boolean;
  hasOutreach: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all text-xs ${
        isSelected
          ? "border-violet-400 dark:border-violet-600 bg-violet-50 dark:bg-violet-950/30 ring-1 ring-violet-400/30"
          : hasOutreach
            ? "border-green-200 dark:border-green-800/40 bg-green-50/40 dark:bg-green-950/10 hover:border-green-300"
            : "border-border hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
      }`}
    >
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
          isSelected
            ? "bg-violet-600 text-white"
            : hasOutreach
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              : "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
        }`}
      >
        {hasOutreach && !isSelected ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          student.full_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate flex items-center gap-1.5">
          {student.full_name}
          {isSelected && (
            <span className="text-[9px] font-normal text-violet-600 dark:text-violet-400">
              Selected
            </span>
          )}
        </div>
        <div className="text-muted-foreground truncate text-[10px]">
          {student.program_name} &middot; GPA {student.gpa?.toFixed(1) ?? "N/A"}
        </div>
      </div>
      <Badge
        variant={
          student.risk_category === "Very High" || student.risk_category === "High"
            ? "destructive"
            : student.risk_category === "Medium"
              ? "secondary"
              : "outline"
        }
        className="text-[9px] flex-shrink-0 h-5 px-1.5"
      >
        {(student.risk_category || student.risk_level || "")
          .replace("Very ", "V.")}
      </Badge>
    </button>
  );
}

function PlanCard({
  plan,
}: {
  plan: InterventionPlan;
  student: OutreachStudent;
}) {
  return (
    <Card className="border-violet-200 dark:border-violet-800/50 overflow-hidden">
      <div className="px-5 py-3 bg-violet-50/50 dark:bg-violet-950/20 border-b border-violet-100 dark:border-violet-800/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-violet-600" />
          <span className="text-sm font-semibold text-violet-900 dark:text-violet-300">
            Intervention Plan
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[10px] border-violet-300 text-violet-600"
          >
            {plan.intervention_type}
          </Badge>
          <Badge
            variant={
              plan.urgency === "Critical"
                ? "destructive"
                : plan.urgency === "High"
                  ? "secondary"
                  : "outline"
            }
            className="text-[10px]"
          >
            {plan.urgency}
          </Badge>
        </div>
      </div>
      <CardContent className="p-5 space-y-4">
        {plan.summary && (
          <div className="p-3 rounded-lg bg-violet-50/70 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-800/30">
            <div className="text-xs font-semibold text-violet-700 dark:text-violet-400 mb-1">
              Assessment
            </div>
            <p className="text-sm">{plan.summary}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {plan.risk_factors && plan.risk_factors.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                Risk Factors
              </div>
              <ul className="space-y-1">
                {plan.risk_factors.map((f, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground flex items-start gap-1.5"
                  >
                    <span className="text-red-400 mt-0.5">-</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.referrals && plan.referrals.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                <FileText className="h-3 w-3 text-blue-500" />
                Referrals
              </div>
              <ul className="space-y-1">
                {plan.referrals.map((r, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground flex items-start gap-1.5"
                  >
                    <span className="text-blue-400 mt-0.5">-</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {plan.meeting_agenda && plan.meeting_agenda.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1.5 flex items-center gap-1">
              <CalendarCheck className="h-3 w-3 text-violet-500" />
              Meeting Agenda
            </div>
            <ol className="space-y-1 list-decimal list-inside">
              {plan.meeting_agenda.map((item, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ol>
          </div>
        )}

        {plan.talking_points && plan.talking_points.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1.5 flex items-center gap-1">
              <MessageCircle className="h-3 w-3 text-amber-500" />
              Talking Points
            </div>
            <div className="space-y-1">
              {plan.talking_points.map((tp, i) => (
                <div
                  key={i}
                  className="text-xs p-2 rounded bg-muted/50 text-muted-foreground"
                >
                  {tp}
                </div>
              ))}
            </div>
          </div>
        )}

        {plan.action_items && plan.action_items.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1.5 flex items-center gap-1">
              <Target className="h-3 w-3 text-green-500" />
              Action Items
            </div>
            <ul className="space-y-1">
              {plan.action_items.map((a, i) => (
                <li
                  key={i}
                  className="text-xs flex items-start gap-1.5"
                >
                  <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {plan.follow_up_schedule && (
            <div className="p-2.5 rounded-lg bg-muted/50">
              <div className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                Follow-up Schedule
              </div>
              <div className="text-xs">{plan.follow_up_schedule}</div>
            </div>
          )}
          {plan.success_criteria && (
            <div className="p-2.5 rounded-lg bg-muted/50">
              <div className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                Success Criteria
              </div>
              <div className="text-xs">{plan.success_criteria}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ToneSelector({
  tone,
  onToneChange,
  onCompose,
}: {
  tone: string;
  onToneChange: (t: string) => void;
  onCompose: () => void;
}) {
  const [localTone, setLocalTone] = useState(tone);
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex rounded-lg border overflow-hidden">
        {(["empathetic", "formal", "nudge"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setLocalTone(t);
              onToneChange(t);
            }}
            className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              localTone === t
                ? "bg-violet-600 text-white"
                : "hover:bg-violet-50 dark:hover:bg-violet-900/20"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <Button
        size="sm"
        onClick={() => {
          onToneChange(localTone);
          onCompose();
        }}
        className="gap-1.5 bg-violet-600 hover:bg-violet-700"
      >
        <Mail className="h-3.5 w-3.5" />
        Compose Email
      </Button>
    </div>
  );
}

function EmailCard({
  editFrom,
  editTo,
  editSubject,
  editBody,
  isEditing,
  tone,
  onEditFrom,
  onEditTo,
  onEditSubject,
  onEditBody,
  onToggleEditing,
  onSend,
  onCopy,
  onRegenerate,
  copied,
  sent,
}: {
  editFrom: string;
  editTo: string;
  editSubject: string;
  editBody: string;
  isEditing: boolean;
  tone: string;
  onEditFrom: (v: string) => void;
  onEditTo: (v: string) => void;
  onEditSubject: (v: string) => void;
  onEditBody: (v: string) => void;
  onToggleEditing: (v: boolean) => void;
  onSend: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
  copied: boolean;
  sent: boolean;
}) {
  const [localFrom, setLocalFrom] = useState(editFrom);
  const [localTo, setLocalTo] = useState(editTo);
  const [localSubject, setLocalSubject] = useState(editSubject);
  const [localBody, setLocalBody] = useState(editBody);
  const [localEditing, setLocalEditing] = useState(isEditing);

  const syncAndSend = () => {
    onEditFrom(localFrom);
    onEditTo(localTo);
    onEditSubject(localSubject);
    onEditBody(localBody);
    setTimeout(onSend, 0);
  };

  if (sent) {
    return (
      <Card className="border-green-200 dark:border-green-800/50">
        <CardContent className="p-6 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
          <div className="font-semibold text-green-700 dark:text-green-400">
            Outreach sent successfully
          </div>
          <div className="text-xs text-muted-foreground">
            Sent to {localTo} &middot; Subject: {localSubject}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-200 dark:border-emerald-800/50 overflow-hidden">
      <div className="px-5 py-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-800/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
            Outreach Email
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[10px] border-emerald-300 text-emerald-600 capitalize"
          >
            {tone} tone
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            className="h-6 gap-1 text-[10px]"
          >
            <RefreshCw className="h-2.5 w-2.5" />
            Regenerate
          </Button>
        </div>
      </div>
      <CardContent className="p-0">
        {/* Email header */}
        <div className="px-5 py-3 border-b bg-muted/20 space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium w-14 flex-shrink-0">
              From:
            </span>
            <input
              value={localFrom}
              onChange={(e) => {
                setLocalFrom(e.target.value);
                onEditFrom(e.target.value);
              }}
              className="flex-1 bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-violet-500 focus:outline-none py-0.5 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium w-14 flex-shrink-0">
              To:
            </span>
            <input
              value={localTo}
              onChange={(e) => {
                setLocalTo(e.target.value);
                onEditTo(e.target.value);
              }}
              className="flex-1 bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-violet-500 focus:outline-none py-0.5 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium w-14 flex-shrink-0">
              Subject:
            </span>
            <input
              value={localSubject}
              onChange={(e) => {
                setLocalSubject(e.target.value);
                onEditSubject(e.target.value);
              }}
              className="flex-1 bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-violet-500 focus:outline-none py-0.5 font-semibold transition-colors"
            />
          </div>
        </div>

        {/* Email body */}
        <div className="px-5 py-4">
          {localEditing ? (
            <div className="space-y-2">
              <textarea
                value={localBody}
                onChange={(e) => {
                  setLocalBody(e.target.value);
                  onEditBody(e.target.value);
                }}
                rows={12}
                className="w-full text-sm leading-relaxed bg-transparent border border-muted rounded-lg p-3 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLocalEditing(false);
                    onToggleEditing(false);
                  }}
                  className="gap-1 text-xs"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Done Editing
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="cursor-text group relative"
              onClick={() => {
                setLocalEditing(true);
                onToggleEditing(true);
              }}
            >
              <EmailBody text={localBody} />
              <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 bg-white dark:bg-zinc-900"
                >
                  <Pencil className="h-2.5 w-2.5" />
                  Click to edit
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-3 border-t flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground">
            Generated by Databricks AI &middot; Llama 3.3 70B
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCopy}
              className="gap-1 text-xs h-7"
            >
              {copied ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              size="sm"
              onClick={syncAndSend}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs h-7"
            >
              <Send className="h-3 w-3" />
              Send via Email Client
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
