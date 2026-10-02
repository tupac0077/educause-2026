import { createFileRoute } from "@tanstack/react-router";
import { useListFacultySuspense } from "@/lib/api";
import type { FacultyPerformance } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { edition } from "@/lib/edition";

export const Route = createFileRoute("/_sidebar/faculty")({
  component: () => (
    <ErrorBoundary fallback={<div>Error loading {edition.orgUnitLabel.toLowerCase()} data</div>}>
      <Suspense fallback={<div className="space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>}>
        <FacultyPage />
      </Suspense>
    </ErrorBoundary>
  ),
});

function FacultyPage() {
  const { data: resp } = useListFacultySuspense();
  const faculties = resp.data;

  const grouped = faculties.reduce<Record<string, FacultyPerformance[]>>((acc, f) => {
    if (!acc[f.faculty]) acc[f.faculty] = [];
    acc[f.faculty].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{edition.orgUnitLabel} Overview</h1>
        <p className="text-muted-foreground">Performance metrics by {edition.orgUnitLabel.toLowerCase()} and program level</p>
      </div>

      {Object.entries(grouped).map(([facultyName, levels]) => {
        const total = levels.reduce((s, l) => s + (l.total_students || 0), 0);
        const totalAtRisk = levels.reduce((s, l) => s + (l.at_risk_students || 0), 0);
        return (
          <Card key={facultyName}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{facultyName}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{total} students</Badge>
                  {totalAtRisk > 0 && <Badge variant="destructive">{totalAtRisk} at risk</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Level</th>
                  <th className="py-2 pr-4 font-medium text-right">Students</th>
                  <th className="py-2 pr-4 font-medium text-right">Avg GPA</th>
                  <th className="py-2 pr-4 font-medium text-right">Graduated</th>
                  <th className="py-2 pr-4 font-medium text-right">Grad Rate</th>
                  <th className="py-2 pr-4 font-medium text-right">At Risk</th>
                  <th className="py-2 pr-4 font-medium text-right">Attrition</th>
                  <th className="py-2 pr-4 font-medium text-right">Int'l</th>
                  <th className="py-2 pr-4 font-medium text-right">{edition.firstGenLabel}</th>
                </tr></thead>
                <tbody>
                  {levels.map((l) => (
                    <tr key={l.program_level} className="border-b">
                      <td className="py-2 pr-4">{l.program_level}</td>
                      <td className="py-2 pr-4 text-right">{l.total_students}</td>
                      <td className="py-2 pr-4 text-right">{l.avg_gpa?.toFixed(2)}</td>
                      <td className="py-2 pr-4 text-right">{l.graduated_students}</td>
                      <td className="py-2 pr-4 text-right">{l.graduation_rate_pct?.toFixed(1)}%</td>
                      <td className="py-2 pr-4 text-right">{l.at_risk_students}</td>
                      <td className="py-2 pr-4 text-right">{l.attrition_risk_pct?.toFixed(1)}%</td>
                      <td className="py-2 pr-4 text-right">{l.international_students}</td>
                      <td className="py-2 pr-4 text-right">{l.first_in_family_students}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
