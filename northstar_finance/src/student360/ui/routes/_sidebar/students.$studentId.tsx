import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useGetStudentSuspense,
  useGetStudentEnrollmentsSuspense,
  useGetStudentSupportSuspense,
  useGetStudentCohort,
  useGetOutreachLog,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { edition } from "@/lib/edition";
import { ArrowLeft, CheckCircle2, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_sidebar/students/$studentId")({
  component: () => (
    <ErrorBoundary fallback={<div>Error loading student</div>}>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <StudentDetail />
      </Suspense>
    </ErrorBoundary>
  ),
});

function ComparisonBar({ label, value, cohortValue, unit, higherIsBetter = true }: {
  label: string; value: number; cohortValue: number; unit?: string; higherIsBetter?: boolean;
}) {
  const maxVal = Math.max(value, cohortValue, 1);
  const studentPct = (value / maxVal) * 100;
  const cohortPct = (cohortValue / maxVal) * 100;
  const isBetter = higherIsBetter ? value >= cohortValue : value <= cohortValue;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className={isBetter ? "text-green-600" : "text-red-500"}>
          {value.toFixed(1)}{unit} vs {cohortValue.toFixed(1)}{unit} avg
        </span>
      </div>
      <div className="flex gap-1 items-center">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${isBetter ? "bg-green-500" : "bg-red-400"}`}
            style={{ width: `${studentPct}%` }}
          />
        </div>
      </div>
      <div className="flex gap-1 items-center">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-muted-foreground/30 rounded-full" style={{ width: `${cohortPct}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground">cohort</span>
      </div>
    </div>
  );
}

function StudentDetail() {
  const { studentId } = Route.useParams();
  const id = Number(studentId);

  const { data: studentResp } = useGetStudentSuspense({ params: { student_id: id } });
  const s = studentResp.data;

  const { data: enrollResp } = useGetStudentEnrollmentsSuspense({ params: { student_id: id } });
  const enrollments = enrollResp.data;

  const { data: supportResp } = useGetStudentSupportSuspense({ params: { student_id: id } });
  const support = supportResp.data;

  const { data: cohortResp } = useGetStudentCohort({ params: { student_id: id } });
  const cohort = cohortResp?.data;

  const { data: logResp } = useGetOutreachLog();
  const outreachEntry = logResp?.data?.[id];

  const riskColor = s.risk_level === "High" || s.risk_category === "Very High" || s.risk_category === "High"
    ? "destructive" : s.risk_level === "Medium" || s.risk_category === "Medium" ? "secondary" : "outline";

  // Degree progress percentage
  const degPct = s.degree_completion_pct ?? 0;

  // Grade distribution from enrollments
  const gradeDist: Record<string, number> = {};
  enrollments.forEach((e) => {
    if (e.grade) gradeDist[e.grade] = (gradeDist[e.grade] || 0) + 1;
  });
  const gradeOrder = edition.isUsDemo
    ? ["A", "B", "C", "D", "F", "W"]
    : ["HD", "D", "CR", "P", "F", "W"];
  const gradeColors: Record<string, string> = {
    A: "bg-emerald-500", B: "bg-green-500", C: "bg-blue-500",
    HD: "bg-emerald-500", D: "bg-green-500", CR: "bg-blue-500",
    P: "bg-yellow-500", F: "bg-red-500", W: "bg-gray-400",
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/students"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{s.full_name}</h1>
          <p className="text-muted-foreground">{s.email}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{s.student_status}</Badge>
            <Badge variant={riskColor as "destructive" | "secondary" | "outline"}>
              {s.risk_category || s.risk_level || "Unknown"} Risk
            </Badge>
            {s.domestic_international && <Badge variant="outline">{s.domestic_international}</Badge>}
            {s.first_in_family && <Badge variant="outline">{edition.firstGenLabel}</Badge>}
            {outreachEntry && (
              <Badge variant="outline" className="gap-1 border-green-300 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Outreach Sent
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {s.risk_score != null && (
            <div className="text-center">
              <div className="text-4xl font-bold text-red-500">{(s.risk_score * 100).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">ML Risk Score</div>
            </div>
          )}
          {!outreachEntry && (
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <Link to="/ai-actions">
                <Wand2 className="h-3 w-3" />
                Plan Intervention
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Top row: Program, Academic, Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Program</CardTitle></CardHeader>
          <CardContent>
            <div className="font-semibold">{s.program_name}</div>
            <div className="text-sm text-muted-foreground">{s.faculty} &middot; {s.program_level}</div>
            <div className="text-sm mt-1">Campus: {s.campus} &middot; Cohort: {s.cohort}</div>
            {/* Degree progress bar */}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Degree Progress</span>
                <span className="font-medium">{degPct.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${degPct >= 75 ? "bg-green-500" : degPct >= 50 ? "bg-blue-500" : "bg-orange-500"}`}
                  style={{ width: `${Math.min(degPct, 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {s.total_credits_earned ?? 0} / {s.credit_points_required ?? 0} {edition.creditsLabel}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Academic Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GPA {s.gpa?.toFixed(2) ?? "N/A"}</div>
            <div className="text-sm">Pass rate: {s.pass_rate_pct?.toFixed(0) ?? 0}% &middot; Failed: {s.courses_failed ?? 0}</div>
            {/* Grade distribution mini chart */}
            {enrollments.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-muted-foreground mb-1">Grade Distribution</div>
                <div className="flex h-4 rounded-full overflow-hidden">
                  {gradeOrder.filter((g) => gradeDist[g]).map((g) => (
                    <div
                      key={g}
                      className={`${gradeColors[g] || "bg-gray-300"}`}
                      style={{ width: `${((gradeDist[g] || 0) / enrollments.length) * 100}%` }}
                      title={`${g}: ${gradeDist[g]}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {gradeOrder.filter((g) => gradeDist[g]).map((g) => (
                    <span key={g} className="text-[10px] text-muted-foreground">
                      <span className={`inline-block w-2 h-2 rounded-full ${gradeColors[g]} mr-0.5`} />
                      {g}: {gradeDist[g]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Demographics</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div>Age: {s.age} &middot; {s.gender}</div>
              <div>Origin: {s.country_of_origin}</div>
              <div>{s.financial_aid ? "Receives financial aid" : "No financial aid"}{s.first_in_family ? ` · ${edition.firstGenLabel}` : ""}</div>
              <div className="text-muted-foreground">Enrolled: {s.enrollment_date}</div>
              <div className="text-muted-foreground">{s.terms_enrolled ?? 0} terms completed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohort comparison + Engagement + Support */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cohort Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              vs Cohort {cohort?.cohort_size ? `(${cohort.cohort_size} students)` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cohort && cohort.cohort_avg_gpa ? (
              <div className="space-y-3">
                <ComparisonBar
                  label="GPA"
                  value={parseFloat(cohort.student_gpa || "0")}
                  cohortValue={parseFloat(cohort.cohort_avg_gpa || "0")}
                />
                <ComparisonBar
                  label="Pass Rate"
                  value={parseFloat(cohort.student_pass_rate || "0")}
                  cohortValue={parseFloat(cohort.cohort_avg_pass_rate || "0")}
                  unit="%"
                />
                <ComparisonBar
                  label="LMS Activity"
                  value={parseFloat(cohort.student_lms_activities || "0")}
                  cohortValue={parseFloat(cohort.cohort_avg_lms_activities || "0")}
                />
                <ComparisonBar
                  label="LMS Hours"
                  value={parseFloat(cohort.student_lms_minutes || "0") / 60}
                  cohortValue={parseFloat(cohort.cohort_avg_lms_minutes || "0") / 60}
                  unit="h"
                />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Loading cohort data...</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">LMS Engagement</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold">{s.total_lms_activities ?? 0}</div><div className="text-xs text-muted-foreground">Activities</div></div>
              <div><div className="text-2xl font-bold">{s.total_lms_minutes ? (s.total_lms_minutes / 60).toFixed(0) : 0}h</div><div className="text-xs text-muted-foreground">Total Time</div></div>
              <div><div className="text-2xl font-bold">{s.lms_active_days ?? 0}</div><div className="text-xs text-muted-foreground">Active Days</div></div>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between text-sm">
              <span>Lectures viewed: {s.lectures_viewed ?? 0}</span>
              <span>Forum posts: {s.forum_posts ?? 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Support Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold">{s.total_support_interactions ?? 0}</div><div className="text-xs text-muted-foreground">Sessions</div></div>
              <div><div className="text-2xl font-bold">{s.mental_health_interactions ?? 0}</div><div className="text-xs text-muted-foreground">Mental Health</div></div>
              <div><div className="text-2xl font-bold">{s.pending_follow_ups ?? 0}</div><div className="text-xs text-muted-foreground">Pending Follow-ups</div></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Enrollments */}
      <Card>
        <CardHeader><CardTitle>Course Enrollments ({enrollments.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left">
              <th className="py-2 pr-4 font-medium">Course</th>
              <th className="py-2 pr-4 font-medium">Term</th>
              <th className="py-2 pr-4 font-medium">Grade</th>
              <th className="py-2 pr-4 font-medium text-right">Mark</th>
              <th className="py-2 pr-4 font-medium text-right">Credits</th>
            </tr></thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.enrollment_id} className="border-b">
                  <td className="py-2 pr-4"><span className="font-medium">{e.course_code}</span> <span className="text-muted-foreground">{e.course_name}</span></td>
                  <td className="py-2 pr-4">{e.term_code}</td>
                  <td className="py-2 pr-4"><Badge variant={e.grade === "F" ? "destructive" : e.grade === "HD" ? "default" : "outline"}>{e.grade}</Badge></td>
                  <td className="py-2 pr-4 text-right">{e.mark ?? "-"}</td>
                  <td className="py-2 pr-4 text-right">{e.credit_points_earned ?? 0}{edition.creditsAbbreviation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Support History */}
      {support.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Support History ({support.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {support.map((si) => (
                <div key={si.interaction_id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{si.support_type}</span>
                      <Badge variant="outline">{si.channel}</Badge>
                      {si.follow_up_required && <Badge variant="destructive">Follow-up needed</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{si.notes}</p>
                    <div className="text-xs text-muted-foreground mt-1">{si.interaction_date} &middot; {si.duration_minutes}min &middot; {si.outcome}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
