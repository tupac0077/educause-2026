import { createFileRoute } from "@tanstack/react-router";
import { useListCourses, useListFacultyNames } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { edition, shortOrgUnit } from "@/lib/edition";

export const Route = createFileRoute("/_sidebar/courses")({
  component: () => <CoursesPage />,
});

function CoursesPage() {
  const [facultyFilter, setFacultyFilter] = useState<string | undefined>(undefined);

  const { data: facResp } = useListFacultyNames();
  const faculties = facResp?.data ?? [];

  const { data: resp, isLoading } = useListCourses({ params: { faculty: facultyFilter } });
  const courses = resp?.data ?? [];

  const performanceFlag = (failRate: number | null | undefined) => {
    if (!failRate) return null;
    if (failRate > 30) return <Badge variant="destructive">Critical</Badge>;
    if (failRate > 20) return <Badge variant="secondary">Warning</Badge>;
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Course Analytics</h1>
        <p className="text-muted-foreground">Performance metrics by course — sorted by fail rate</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={!facultyFilter ? "default" : "outline"} size="sm" onClick={() => setFacultyFilter(undefined)}>All {edition.orgUnitLabelPlural}</Button>
        {faculties.map((f) => (
          <Button key={f} variant={facultyFilter === f ? "default" : "outline"} size="sm" onClick={() => setFacultyFilter(f)}>
            {shortOrgUnit(f)}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>{courses.length} courses</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(10)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Code</th>
                  <th className="py-2 pr-4 font-medium">Course Name</th>
                  <th className="py-2 pr-4 font-medium">Delivery</th>
                  <th className="py-2 pr-4 font-medium text-right">Enrolled</th>
                  <th className="py-2 pr-4 font-medium text-right">Avg Mark</th>
                  <th className="py-2 pr-4 font-medium text-right">Pass</th>
                  <th className="py-2 pr-4 font-medium text-right">Fail</th>
                  <th className="py-2 pr-4 font-medium text-right">Fail Rate</th>
                  <th className="py-2 pr-4 font-medium">Flag</th>
                </tr></thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.course_id} className="border-b">
                      <td className="py-2 pr-4 font-mono">{c.course_code}</td>
                      <td className="py-2 pr-4">{c.course_name}</td>
                      <td className="py-2 pr-4"><Badge variant="outline">{c.delivery_mode}</Badge></td>
                      <td className="py-2 pr-4 text-right">{c.total_enrolled}</td>
                      <td className="py-2 pr-4 text-right">{c.avg_mark?.toFixed(1) ?? "-"}</td>
                      <td className="py-2 pr-4 text-right">{c.pass_count}</td>
                      <td className="py-2 pr-4 text-right">{c.fail_count}</td>
                      <td className="py-2 pr-4 text-right font-medium">{c.fail_rate_pct?.toFixed(1) ?? 0}%</td>
                      <td className="py-2 pr-4">{performanceFlag(c.fail_rate_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
