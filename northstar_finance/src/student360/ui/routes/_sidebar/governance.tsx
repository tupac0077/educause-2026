import { createFileRoute } from "@tanstack/react-router";
import { useGovernanceOverviewSuspense, useGovernanceAdvisorView } from "@/lib/api";
import { useEffect } from "react";
import { usePersona } from "@/lib/persona";
import type { ColumnTag, MaskingDemo, FacultyRowCount, TableTag, AdvisorView } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { edition, shortOrgUnit } from "@/lib/edition";
import {
  Shield,
  Eye,
  EyeOff,
  Tag,
  Lock,
  Users,
  UserCheck,
  GraduationCap,
  Landmark,
} from "lucide-react";

export const Route = createFileRoute("/_sidebar/governance")({
  component: () => (
    <ErrorBoundary fallback={<div>Error loading governance data</div>}>
      <Suspense fallback={<GovernanceSkeleton />}>
        <GovernancePage />
      </Suspense>
    </ErrorBoundary>
  ),
});

function GovernanceSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

const TAG_COLORS: Record<string, string> = {
  pii: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  sensitivity: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  mortarcaps: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  data_classification: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  governance: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

function tagColor(tagName: string) {
  for (const [key, cls] of Object.entries(TAG_COLORS)) {
    if (tagName.startsWith(key)) return cls;
  }
  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}

type Persona = "admin" | "science" | "finance";

const PERSONAS: { id: Persona; label: string; description: string; icon: typeof Shield }[] = [
  { id: "admin", label: "Admin (You)", description: "student360_admins + pii_readers", icon: UserCheck },
  { id: "science", label: "SIT Advisor", description: "sit_advisors group only", icon: GraduationCap },
  { id: "finance", label: "Finance Team", description: "finance_team — dashboard data", icon: Landmark },
];

function GovernancePage() {
  const { data: resp } = useGovernanceOverviewSuspense();
  const gov = resp.data;
  const { persona: appPersona } = usePersona();
  // Which "View As" governance personas are available depends on the app-wide persona.
  const allowedGovPersonas: Persona[] =
    appPersona === "finance" ? ["finance"] : appPersona === "sit" ? ["science"] : ["admin", "science", "finance"];
  const [persona, setPersona] = useState<Persona>(allowedGovPersonas[0]);
  useEffect(() => {
    if (!allowedGovPersonas.includes(persona)) setPersona(allowedGovPersonas[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appPersona]);
  const visiblePersonaOptions = PERSONAS.filter((p) => allowedGovPersonas.includes(p.id));
  const visibleColumnTags = edition.isUsDemo
    ? gov.column_tags.filter((tag) => !tag.tag_name.startsWith("mortarcaps"))
    : gov.column_tags;
  const visibleTableTags = edition.isUsDemo
    ? gov.table_tags.filter((tag) => !tag.tag_name.startsWith("mortarcaps"))
    : gov.table_tags;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7" /> Data Catalog
        </h1>
        <p className="text-muted-foreground">
          Unity Catalog ABAC controls aligned to {edition.governanceStandard}
          {gov.current_user && <span className="ml-1">- Logged in as <span className="font-medium text-foreground">{gov.current_user}</span></span>}
        </p>
      </div>

      {/* View As selector — only when more than one persona view is available */}
      {visiblePersonaOptions.length > 1 && (
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">View As</span>
            <span className="text-xs text-muted-foreground">— switch persona to see how ABAC controls change the data view</span>
          </div>
          <div className="flex gap-3">
            {visiblePersonaOptions.map((p) => {
              const Icon = p.icon;
              const active = persona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">{p.label}</div>
                    <div className={`text-[10px] ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{p.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      )}

      {persona === "finance" ? (
        <FinanceGovernanceView />
      ) : (
      <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold">Column Masks</span>
            </div>
            <div className="text-2xl font-bold">3 PII Fields</div>
            <div className="text-xs text-muted-foreground mt-1">
              {persona === "admin"
                ? "You have pii_readers access - PII is unmasked"
                : `No pii_readers access - DOB, ${edition.nationalIdLabel}, Email are masked`}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold">Row Filters</span>
            </div>
            <div className="text-2xl font-bold">
              {persona === "admin" ? `${gov.row_filter_counts.length} ${edition.orgUnitLabelPlural}` : `1 ${edition.orgUnitLabel}`}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {persona === "admin"
                ? `Admin access - all ${edition.orgUnitLabelPluralLower} visible`
                : `Restricted to ${edition.advisorOrgUnit} only`}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-semibold">UC Tags</span>
            </div>
            <div className="text-2xl font-bold">
              {visibleColumnTags.length + visibleTableTags.length} Tags
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              PII classification + {edition.governanceStandard} alignment
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Persona-specific view */}
      {persona === "admin" ? (
        <>
          {gov.masking_demo && <MaskingDemoCard demo={gov.masking_demo} persona="admin" />}
          <RowFilterCard counts={gov.row_filter_counts} persona="admin" />
        </>
      ) : (
        <AdvisorViewCard />
      )}

      {/* Tag Inventory - always visible */}
      <TagInventoryCard columnTags={visibleColumnTags} tableTags={visibleTableTags} />
      </>
      )}
    </div>
  );
}

type FinanceColTag = { table_name: string; column_name: string; tag_name: string; tag_value: string };
type FinanceTblTag = { table_name: string; tag_name: string; tag_value: string };
type FinanceGov = {
  column_tags: FinanceColTag[];
  table_tags: FinanceTblTag[];
  tables: { name: string; description: string }[];
};

function FinanceGovernanceView() {
  const [data, setData] = useState<FinanceGov | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch("/api/governance/finance")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setErr(true));
  }, []);

  if (err) return <Card><CardContent className="pt-5 text-sm text-muted-foreground">Unable to load finance governance metadata.</CardContent></Card>;
  if (!data) return <Skeleton className="h-64" />;

  const tblTagsByTable: Record<string, FinanceTblTag[]> = {};
  for (const t of data.table_tags) (tblTagsByTable[t.table_name] ||= []).push(t);
  const colTagsByTable: Record<string, FinanceColTag[]> = {};
  for (const c of data.column_tags) (colTagsByTable[c.table_name] ||= []).push(c);
  const totalTags = data.column_tags.length + data.table_tags.length;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2"><Landmark className="h-4 w-4 text-emerald-600" /><span className="text-sm font-semibold">Dashboard datasets</span></div>
            <div className="text-2xl font-bold">{data.tables.length} tables</div>
            <div className="text-xs text-muted-foreground mt-1">Sources behind the Financial Dashboard</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2"><Tag className="h-4 w-4 text-purple-500" /><span className="text-sm font-semibold">UC Classification Tags</span></div>
            <div className="text-2xl font-bold">{totalTags} Tags</div>
            <div className="text-xs text-muted-foreground mt-1">confidential / restricted / internal</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2"><Lock className="h-4 w-4 text-red-500" /><span className="text-sm font-semibold">Confidential columns</span></div>
            <div className="text-2xl font-bold">{data.column_tags.filter((c) => c.tag_value === "confidential").length}</div>
            <div className="text-xs text-muted-foreground mt-1">Monetary + sensitive fields</div>
          </CardContent>
        </Card>
      </div>

      {data.tables.map((tbl) => (
        <Card key={tbl.name}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-mono">
              <Tag className="h-4 w-4" /> gold.{tbl.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {tbl.description}
              {(tblTagsByTable[tbl.name] || []).map((t) => (
                <Badge key={t.tag_name + t.tag_value} variant="outline" className={`ml-2 ${tagColor(t.tag_value)}`}>{t.tag_name}: {t.tag_value}</Badge>
              ))}
            </p>
          </CardHeader>
          <CardContent>
            {(colTagsByTable[tbl.name] || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No column-level classifications.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b"><th className="py-2 pr-4 text-left font-semibold">Column</th><th className="py-2 text-left font-semibold">Classification</th></tr>
                </thead>
                <tbody>
                  {(colTagsByTable[tbl.name] || []).map((c) => (
                    <tr key={c.column_name + c.tag_name} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs font-medium">{c.column_name}</td>
                      <td className="py-2"><Badge variant="outline" className={`text-[11px] ${tagColor(c.tag_value)}`}>{c.tag_name}={c.tag_value}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}

function AdvisorViewCard() {
  const { data, isLoading } = useGovernanceAdvisorView(edition.advisorOrgUnit);

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data?.data) return null;

  const view = data.data;

  return (
    <>
      {/* Advisor stats */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            {view.persona} View — Row Filter Active
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            This advisor can only see students in <span className="font-medium">{view.faculty}</span>.
            Other {edition.orgUnitLabelPluralLower} are completely invisible.
          </p>
        </CardHeader>
        <CardContent>
          {view.stats && (
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{view.stats.student_count}</div>
                <div className="text-xs text-muted-foreground">Students Visible</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{view.stats.avg_gpa?.toFixed(2) ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Avg GPA</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{view.stats.at_risk_count}</div>
                <div className="text-xs text-muted-foreground">At Risk</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{view.stats.international_count}</div>
                <div className="text-xs text-muted-foreground">International</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Masked sample data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-red-500" />
            Sample Student Records — Column Masks Applied
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            PII columns (email, DOB, {edition.nationalIdLabel}) are masked. The advisor sees partial data only.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-3 text-left font-semibold">ID</th>
                  <th className="py-2 pr-3 text-left font-semibold">Name</th>
                  <th className="py-2 pr-3 text-left font-semibold">
                    Email <Lock className="inline h-3 w-3 text-red-400 ml-0.5" />
                  </th>
                  <th className="py-2 pr-3 text-left font-semibold">
                    DOB <Lock className="inline h-3 w-3 text-red-400 ml-0.5" />
                  </th>
                  <th className="py-2 pr-3 text-left font-semibold">
                    {edition.nationalIdLabel} <Lock className="inline h-3 w-3 text-red-400 ml-0.5" />
                  </th>
                  <th className="py-2 pr-3 text-left font-semibold">Program</th>
                  <th className="py-2 pr-3 text-right font-semibold">GPA</th>
                  <th className="py-2 text-left font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody>
                {view.sample_students.map((s) => (
                  <tr key={s.student_id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs">{s.student_id}</td>
                    <td className="py-2.5 pr-3 font-medium">{s.full_name}</td>
                    <td className="py-2.5 pr-3">
                      <code className="text-xs bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-1.5 py-0.5 rounded">{s.email}</code>
                    </td>
                    <td className="py-2.5 pr-3">
                      <code className="text-xs bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-1.5 py-0.5 rounded">{s.date_of_birth}</code>
                    </td>
                    <td className="py-2.5 pr-3">
                      <code className="text-xs bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-1.5 py-0.5 rounded">{s.student_national_id}</code>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{s.program_name}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold">{s.gpa?.toFixed(2)}</td>
                    <td className="py-2.5">
                      <Badge variant="outline" className={
                        s.risk_level === "High" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
                        s.risk_level === "Medium" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
                        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      }>{s.risk_level}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function MaskingDemoCard({ demo, persona }: { demo: MaskingDemo; persona: Persona }) {
  const fields = [
    {
      label: "Date of Birth",
      privileged: demo.dob_privileged,
      masked: demo.dob_masked,
    },
    {
      label: edition.nationalIdLabel,
      privileged: demo.national_id_privileged,
      masked: demo.national_id_masked,
    },
    {
      label: "Email",
      privileged: demo.email_privileged,
      masked: demo.email_masked,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Column Masking — Side-by-Side Comparison
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Student: <span className="font-medium">{demo.full_name}</span> (ID: {demo.student_id})
          — same row, different access levels
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4 text-left font-semibold">Field</th>
                <th className="py-2 pr-4 text-left font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3 text-green-600" />
                    Your View (Admin)
                  </span>
                  <span className="block text-[10px] text-muted-foreground font-normal">
                    pii_readers + student360_admins
                  </span>
                </th>
                <th className="py-2 text-left font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <EyeOff className="h-3 w-3 text-red-500" />
                    Advisor View (Masked)
                  </span>
                  <span className="block text-[10px] text-muted-foreground font-normal">
                    science_advisors only
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.label} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{f.label}</td>
                  <td className="py-3 pr-4">
                    <code className="text-xs bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                      {f.privileged ?? "—"}
                    </code>
                  </td>
                  <td className="py-3">
                    <code className="text-xs bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-2 py-1 rounded">
                      {f.masked ?? "—"}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TagInventoryCard({
  columnTags,
  tableTags,
}: {
  columnTags: ColumnTag[];
  tableTags: TableTag[];
}) {
  const byColumn: Record<string, ColumnTag[]> = {};
  for (const t of columnTags) {
    if (!byColumn[t.column_name]) byColumn[t.column_name] = [];
    byColumn[t.column_name].push(t);
  }
  const displayColumnName = (columnName: string) =>
    edition.isUsDemo && columnName === "student_national_id"
      ? "ssn"
      : columnName;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Unity Catalog Tag Inventory — gold.student_360
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tableTags.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Table Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {tableTags.map((t) => (
                <Badge key={t.tag_name} variant="outline" className={tagColor(t.tag_name)}>
                  {t.tag_name}: {t.tag_value}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Column Tags
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-semibold">Column</th>
                  <th className="py-2 text-left font-semibold">Tags</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byColumn).map(([col, tags]) => (
                  <tr key={col} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs font-medium">{displayColumnName(col)}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                          <Badge
                            key={`${t.tag_name}-${t.tag_value}`}
                            variant="outline"
                            className={`text-[11px] ${tagColor(t.tag_name)}`}
                          >
                            {t.tag_name}={t.tag_value}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RowFilterCard({ counts, persona }: { counts: FacultyRowCount[]; persona: Persona }) {
  const total = counts.reduce((sum, c) => sum + c.student_count, 0);
  const maxCount = Math.max(...counts.map((c) => c.student_count));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Row-Level Security - {edition.orgUnitLabel}-Scoped Access
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {persona === "admin"
            ? `Admin view: all ${total.toLocaleString()} students across ${counts.length} ${edition.orgUnitLabelPluralLower} are visible.`
            : `Advisor view: only students in your assigned ${edition.orgUnitLabel.toLowerCase()} are visible.`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {counts.map((c) => {
            const pct = (c.student_count / maxCount) * 100;
            const shortName = shortOrgUnit(c.faculty);
            return (
              <div key={c.faculty} className="flex items-center gap-3">
                <span className="text-sm w-48 truncate font-medium" title={c.faculty}>
                  {shortName}
                </span>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm font-semibold w-16 text-right">
                  {c.student_count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
