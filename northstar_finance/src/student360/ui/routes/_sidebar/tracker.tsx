import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useGetOutreachLog,
  useUpdateCase,
  type OutreachLogEntry,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
  ExternalLink,
  ClipboardList,
} from "lucide-react";

export const Route = createFileRoute("/_sidebar/tracker")({
  component: () => <TrackerPage />,
});

const STAGES = [
  { key: "planning", label: "Planning", icon: <ClipboardList className="h-4 w-4" />, color: "#a855f7", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-500" },
  { key: "outreach_sent", label: "Outreach Sent", icon: <Send className="h-4 w-4" />, color: "#3b82f6", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  { key: "student_responded", label: "Responded", icon: <MessageCircle className="h-4 w-4" />, color: "#8b5cf6", bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-500" },
  { key: "meeting_scheduled", label: "Meeting Scheduled", icon: <Calendar className="h-4 w-4" />, color: "#f59e0b", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  { key: "follow_up_required", label: "Follow-up", icon: <AlertTriangle className="h-4 w-4" />, color: "#f97316", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-500" },
  { key: "resolved", label: "Resolved", icon: <CheckCircle2 className="h-4 w-4" />, color: "#22c55e", bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500" },
];

function StudentCard({
  entry,
  stageConfig,
  onAdvance,
  onAddNote,
}: {
  entry: OutreachLogEntry;
  stageConfig: typeof STAGES[0];
  onAdvance: (status: string) => void;
  onAddNote: (note: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const currentIdx = STAGES.findIndex((s) => s.key === entry.status);
  const daysSinceSent = entry.sent_at
    ? Math.floor((Date.now() - new Date(entry.sent_at).getTime()) / 86400000)
    : 0;

  return (
    <div
      className="bg-white dark:bg-zinc-900 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Card header */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link
              to={`/students/${entry.student_id}`}
              className="font-semibold text-sm hover:underline block truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {entry.student_name}
            </Link>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {entry.intervention_type || "General Outreach"}
            </div>
          </div>
          <div className="flex-shrink-0 text-muted-foreground">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{daysSinceSent}d ago</span>
          {entry.notes && entry.notes.length > 1 && (
            <>
              <span className="text-muted-foreground/30">|</span>
              <MessageCircle className="h-3 w-3" />
              <span>{entry.notes.length} notes</span>
            </>
          )}
          {entry.next_follow_up && (
            <>
              <span className="text-muted-foreground/30">|</span>
              <span className="text-orange-600 font-medium">{entry.next_follow_up}</span>
            </>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150" onClick={(e) => e.stopPropagation()}>
          {/* Activity log */}
          {entry.notes && entry.notes.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {entry.notes.map((note, i) => (
                <div key={i} className="text-[11px] text-muted-foreground py-0.5 pl-2 border-l-2 border-muted">{note}</div>
              ))}
            </div>
          )}

          {/* Add note */}
          <div className="flex gap-1.5">
            <Input
              placeholder="Add note..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && noteInput.trim()) {
                  onAddNote(noteInput.trim());
                  setNoteInput("");
                }
              }}
              className="flex-1 h-7 text-[11px]"
            />
            <Button
              variant="outline" size="sm" className="h-7 text-[10px] px-2"
              onClick={() => { if (noteInput.trim()) { onAddNote(noteInput.trim()); setNoteInput(""); } }}
              disabled={!noteInput.trim()}
            >
              Add
            </Button>
          </div>

          {/* Move actions */}
          <div className="flex gap-1.5 flex-wrap">
            {entry.status !== "resolved" && currentIdx < STAGES.length - 1 && (() => {
              const next = STAGES[currentIdx + 1];
              return (
                <button
                  className="h-7 px-3 rounded-md text-[10px] font-semibold flex items-center gap-2 text-white transition-all duration-150 hover:brightness-110 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: next.color }}
                  onClick={() => onAdvance(next.key)}
                >
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-[9px] opacity-80">Move to</span>
                    <span className="text-[10px]">{next.label}</span>
                  </span>
                </button>
              );
            })()}
            {entry.status !== "resolved" && (
              <button
                className="h-7 px-3 rounded-md text-[10px] font-semibold gap-1 flex items-center border border-green-300 text-green-600 bg-white transition-all duration-150 hover:bg-green-50 hover:border-green-400 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => onAdvance("resolved")}
              >
                <CheckCircle2 className="h-3 w-3" />
                Resolve
              </button>
            )}
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" asChild>
              <Link to={`/students/${entry.student_id}`}>
                <ExternalLink className="h-3 w-3" />
                360
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackerPage() {
  const { data: logResp, refetch: refetchLog } = useGetOutreachLog();
  const cases = logResp?.data ?? {};
  const caseList = Object.values(cases);

  const updateMutation = useUpdateCase();

  const handleAdvance = (studentId: number, newStatus: string) => {
    updateMutation.mutate(
      { student_id: studentId, status: newStatus },
      { onSuccess: () => refetchLog() }
    );
  };

  const handleAddNote = (studentId: number, note: string) => {
    updateMutation.mutate(
      { student_id: studentId, note },
      { onSuccess: () => refetchLog() }
    );
  };

  const columns = STAGES.map((stage) => ({
    ...stage,
    cases: caseList
      .filter((c) => c.status === stage.key)
      .sort((a, b) => (b.sent_at ?? "").localeCompare(a.sent_at ?? "")),
  }));

  const totalCases = caseList.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Intervention Tracker</h1>
          <p className="text-muted-foreground">
            Track student cases through the intervention pipeline
          </p>
        </div>
        {totalCases > 0 && (
          <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
            {totalCases} active cases
          </Badge>
        )}
      </div>

      {totalCases === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-muted py-20 text-center">
          <Plus className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <div className="font-semibold text-lg">No cases yet</div>
          <div className="text-sm text-muted-foreground mt-1 mb-5">
            Send outreach via AI Actions to start tracking interventions
          </div>
          <Button variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold hover:bg-indigo-100" asChild>
            <a href="/ai-actions">Go to AI Actions</a>
          </Button>
        </div>
      ) : (
        /* Kanban board */
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 220px)" }}>
          {columns.map((col) => (
            <div
              key={col.key}
              className={`flex-shrink-0 w-64 rounded-xl ${col.bg} ${col.border} border flex flex-col`}
            >
              {/* Column header */}
              <div className="p-3 flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                <span className={`text-sm font-semibold ${col.text}`}>{col.label}</span>
                <Badge
                  variant="outline"
                  className={`ml-auto text-[10px] font-bold ${col.border} ${col.text}`}
                >
                  {col.cases.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto">
                {col.cases.map((c) => (
                  <StudentCard
                    key={c.student_id}
                    entry={c}
                    stageConfig={col}
                    onAdvance={(status) => handleAdvance(c.student_id, status)}
                    onAddNote={(note) => handleAddNote(c.student_id, note)}
                  />
                ))}

                {col.cases.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground/50">
                    No students at this stage
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
