import { createFileRoute, useRouter, Outlet, useMatch } from "@tanstack/react-router";
import { useListStudents, useGetOutreachLog } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Search, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_sidebar/students")({
  component: () => <StudentsWrapper />,
});

function StudentsWrapper() {
  // Check if a child route (student detail) is active
  const childMatch = useMatch({ from: "/_sidebar/students/$studentId", shouldThrow: false });

  if (childMatch) {
    // Child route is active — render the student detail via Outlet
    return <Outlet />;
  }

  // No child route — show the student list
  return <StudentsPage />;
}

function StudentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");

  const { data: resp, isLoading } = useListStudents({
    params: {
      search: search || undefined,
      risk_level: riskFilter,
      limit: 100,
    },
  });
  const students = resp?.data ?? [];

  const { data: logResp } = useGetOutreachLog();
  const outreachLog = logResp?.data ?? {};

  const riskBadge = (level: string | null | undefined) => {
    if (!level) return null;
    const variant =
      level === "High"
        ? "destructive"
        : level === "Medium"
          ? "secondary"
          : "outline";
    return <Badge variant={variant as "destructive" | "secondary" | "outline"}>{level}</Badge>;
  };

  const goToStudent = (studentId: number) => {
    router.navigate({ to: "/students/$studentId", params: { studentId: String(studentId) } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Students</h1>
        <p className="text-muted-foreground">
          Search and filter student profiles
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
          />
        </div>
        <Button variant={!riskFilter ? "default" : "outline"} size="sm" onClick={() => setRiskFilter(undefined)}>All</Button>
        <Button
          variant={riskFilter === "High" ? "destructive" : "outline"}
          size="sm"
          onClick={() => setRiskFilter(riskFilter === "High" ? undefined : "High")}
          className={riskFilter !== "High" ? "text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" : ""}
        >High Risk</Button>
        <Button
          variant={riskFilter === "Medium" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setRiskFilter(riskFilter === "Medium" ? undefined : "Medium")}
          className={riskFilter !== "Medium" ? "text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700" : ""}
        >Medium Risk</Button>
        <Button
          variant={riskFilter === "Low" ? "default" : "outline"}
          size="sm"
          onClick={() => setRiskFilter(riskFilter === "Low" ? undefined : "Low")}
          className={riskFilter !== "Low" ? "text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700" : "bg-green-600 hover:bg-green-700 text-white"}
        >Low Risk</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{students.length} students</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Program</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium text-right">GPA</th>
                    <th className="py-2 pr-4 font-medium text-right">Pass Rate</th>
                    <th className="py-2 pr-4 font-medium text-right">Failed</th>
                    <th className="py-2 pr-4 font-medium">Risk</th>
                    <th className="py-2 pr-4 font-medium">Outreach</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const log = outreachLog[s.student_id];
                    return (
                      <tr
                        key={s.student_id}
                        className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => goToStudent(s.student_id)}
                      >
                        <td className="py-2 pr-4">
                          <span className="font-medium">{s.full_name}</span>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{s.program_name}</td>
                        <td className="py-2 pr-4"><Badge variant="outline">{s.student_status}</Badge></td>
                        <td className="py-2 pr-4 text-right">{s.gpa?.toFixed(1) ?? "-"}</td>
                        <td className="py-2 pr-4 text-right">{s.pass_rate_pct?.toFixed(0) ?? "-"}%</td>
                        <td className="py-2 pr-4 text-right">{s.courses_failed ?? 0}</td>
                        <td className="py-2 pr-4">{riskBadge(s.risk_level)}</td>
                        <td className="py-2 pr-4">
                          {log ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">Sent</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
