import { createFileRoute, Link } from "@tanstack/react-router";
import { useListOutreach, useListFacultyNames } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { edition, shortOrgUnit } from "@/lib/edition";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { AlertTriangle, Mail, Phone, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_sidebar/alerts")({
  component: () => <AlertsPage />,
});

function AlertsPage() {
  const [priority, setPriority] = useState<string | undefined>("urgent");
  const [facultyFilter, setFacultyFilter] = useState<string | undefined>(undefined);

  const { data: facResp } = useListFacultyNames();
  const faculties = facResp?.data ?? [];

  const { data: resp, isLoading } = useListOutreach({
    params: { priority, faculty: facultyFilter, limit: 50 },
  });
  const students = resp?.data ?? [];

  const urgentCount = students.filter(
    (s) => s.recommended_action?.startsWith("Urgent")
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Early Alerts</h1>
        <p className="text-muted-foreground">
          Students requiring outreach or intervention, prioritized by risk
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-800 dark:text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{urgentCount}</div>
                <div className="text-xs text-muted-foreground">Urgent actions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Mail className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {students.filter((s) => (s.pending_follow_ups ?? 0) > 0).length}
                </div>
                <div className="text-xs text-muted-foreground">Pending follow-ups</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Phone className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{students.length}</div>
                <div className="text-xs text-muted-foreground">Total in queue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={priority === "urgent" ? "destructive" : "outline"}
          size="sm"
          onClick={() => setPriority("urgent")}
        >
          Urgent
        </Button>
        <Button
          variant={priority === "monitor" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setPriority("monitor")}
        >
          Monitor
        </Button>
        <Button
          variant={!priority ? "default" : "outline"}
          size="sm"
          onClick={() => setPriority(undefined)}
        >
          All
        </Button>
        <div className="w-px bg-border mx-1" />
        <Button
          variant={!facultyFilter ? "default" : "outline"}
          size="sm"
          onClick={() => setFacultyFilter(undefined)}
        >
          All {edition.orgUnitLabelPlural}
        </Button>
        {faculties.map((f) => (
          <Button
            key={f}
            variant={facultyFilter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFacultyFilter(f)}
          >
            {shortOrgUnit(f)}
          </Button>
        ))}
      </div>

      {/* Student outreach cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No students match the current filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((s) => {
            const isUrgent = s.recommended_action?.startsWith("Urgent");
            const borderColor = isUrgent
              ? "border-l-red-500"
              : s.recommended_action?.startsWith("High")
              ? "border-l-orange-500"
              : s.recommended_action?.startsWith("Monitor")
              ? "border-l-yellow-500"
              : "border-l-muted";

            return (
              <Card key={s.student_id} className={`border-l-4 ${borderColor}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          to={`/students/${s.student_id}`}
                          className="font-semibold hover:underline"
                        >
                          {s.full_name}
                        </Link>
                        <Badge
                          variant={
                            s.risk_category === "Very High" || s.risk_category === "High"
                              ? "destructive"
                              : s.risk_category === "Medium"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {s.risk_category || s.risk_level || "Unknown"}
                        </Badge>
                        {s.domestic_international === "International" && (
                          <Badge variant="outline">International</Badge>
                        )}
                        {s.first_in_family && (
                          <Badge variant="outline">{edition.firstGenLabel}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {s.program_name} &middot; {shortOrgUnit(s.faculty)} &middot; {s.campus}
                      </div>
                      <div className={`mt-2 text-sm font-semibold ${isUrgent ? "text-red-800 dark:text-red-400" : "text-orange-700 dark:text-orange-400"}`}>
                        {s.recommended_action}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>GPA: {s.gpa?.toFixed(1) ?? "N/A"}</span>
                        <span>Pass rate: {s.pass_rate_pct?.toFixed(0) ?? 0}%</span>
                        <span>Failed: {s.courses_failed ?? 0}</span>
                        <span>LMS days: {s.lms_active_days ?? 0}</span>
                        <span>Support sessions: {s.total_support_interactions ?? 0}</span>
                        {(s.pending_follow_ups ?? 0) > 0 && (
                          <span className="text-red-800 dark:text-red-400 font-medium">
                            {s.pending_follow_ups} follow-ups pending
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {s.risk_score != null && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-800 dark:text-red-400">
                            {(s.risk_score * 100).toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">risk score</div>
                        </div>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/students/${s.student_id}`}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View 360
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
