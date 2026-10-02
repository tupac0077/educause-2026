import SidebarLayout from "@/components/apx/sidebar-layout";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { edition } from "@/lib/edition";
import { usePersona, canSee } from "@/lib/persona";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  BookOpen,
  Building2,
  TrendingUp,
  BarChart3,
  SlidersHorizontal,
  Wand2,
  ClipboardCheck,
  Award,
  Shield,
  Bot,
  Zap,
  GraduationCap,
  Activity,
  FlaskConical,
  Wallet,
  Landmark,
  HeartPulse,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/_sidebar")({
  component: () => <Layout />,
});

// Data Governance tab toggle. The governance page reads the catalog's
// information_schema and runs the gold.mask_* functions via the app service
// principal (scoped grants applied by deploy.sh — no metastore-level access).
// Set to false (or comment the block below out) to hide the tab if your
// workspace doesn't permit those grants.
const SHOW_GOVERNANCE_TAB = true;

function Layout() {
  const location = useLocation();
  const { persona } = usePersona();

  const overviewItems = [
    {
      to: "/dashboard",
      label: "Key Metrics",
      icon: <LayoutDashboard size={16} />,
      match: (path: string) => path === "/dashboard",
    },
    {
      to: "/analytics",
      label: "Forecast & Analytics",
      icon: <BarChart3 size={16} />,
      match: (path: string) => path === "/analytics",
    },
    {
      to: "/financial-health",
      label: "Financial Health",
      icon: <Activity size={16} />,
      match: (path: string) => path === "/financial-health",
    },
    {
      to: "/research-finance",
      label: "Research Finance",
      icon: <FlaskConical size={16} />,
      match: (path: string) => path === "/research-finance",
    },
    {
      to: "/enrollment-finance",
      label: "Enrollment Finance",
      icon: <Wallet size={16} />,
      match: (path: string) => path === "/enrollment-finance",
    },
  ];

  const dataItems = [
    ...(SHOW_GOVERNANCE_TAB
      ? [
          {
            to: "/governance",
            label: "Data Catalog",
            icon: <Shield size={16} />,
            match: (path: string) => path === "/governance",
          },
        ]
      : []),
    {
      to: "/finance",
      label: "Finance",
      icon: <Landmark size={16} />,
      match: (path: string) => path === "/finance",
    },
    {
      to: "/intervention",
      label: "Intervention",
      icon: <HeartPulse size={16} />,
      match: (path: string) => path === "/intervention",
    },
    {
      to: "/students",
      label: "Students",
      icon: <Users size={16} />,
      match: (path: string) => path.startsWith("/students"),
    },
    {
      to: "/courses",
      label: "Courses",
      icon: <BookOpen size={16} />,
      match: (path: string) => path === "/courses",
    },
    {
      to: "/faculty",
      label: edition.orgUnitLabel,
      icon: <Building2 size={16} />,
      match: (path: string) => path === "/faculty",
    },
    {
      to: "/trends",
      label: "Trends",
      icon: <TrendingUp size={16} />,
      match: (path: string) => path === "/trends",
    },
  ];

  const aiItems = [
    {
      to: "/finance-copilot",
      label: "Finance Genie",
      icon: <Bot size={16} />,
      match: (path: string) => path === "/finance-copilot",
    },
    {
      to: "/finance-actions",
      label: "AI Actions",
      icon: <Zap size={16} />,
      match: (path: string) => path === "/finance-actions",
    },
    {
      to: "/advisor-agent",
      label: "Advisor Genie",
      icon: <GraduationCap size={16} />,
      match: (path: string) => path === "/advisor-agent",
    },
  ];

  const interventionItems = [
    {
      to: "/ai-actions",
      label: "Intervention Actions",
      icon: <Wand2 size={16} />,
      match: (path: string) => path === "/ai-actions",
    },
    {
      to: "/tracker",
      label: "Intervention Tracker",
      icon: <ClipboardCheck size={16} />,
      match: (path: string) => path === "/tracker",
    },
    {
      to: "/outcomes",
      label: "Intervention Outcomes",
      icon: <Award size={16} />,
      match: (path: string) => path === "/outcomes",
    },
    {
      to: "/simulator",
      label: "Intervention Simulator",
      icon: <SlidersHorizontal size={16} />,
      match: (path: string) => path === "/simulator",
    },
  ];

  const visible = (items: typeof overviewItems) =>
    items.filter((item) => canSee(persona, item.to));

  const renderNav = (items: typeof overviewItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.to}>
        <Link
          to={item.to}
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg",
            item.match(location.pathname)
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      </SidebarMenuItem>
    ));

  const groups: { label: string; items: typeof overviewItems }[] = [
    { label: "Overview", items: overviewItems },
    { label: "Conversations", items: aiItems },
    { label: "Data", items: dataItems },
    { label: "Intervention", items: interventionItems },
  ];

  return (
    <SidebarLayout>
      {groups.map(({ label, items }) => {
        const shown = visible(items);
        if (shown.length === 0) return null;
        return (
          <SidebarGroup key={label}>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderNav(shown)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
      {canSee(persona, "/platform") && (
        <SidebarGroup>
          <SidebarGroupLabel>See how it's working</SidebarGroupLabel>
          <SidebarGroupContent>
            <Link to="/platform" className="block px-1 py-1">
              <img
                src="/see-how.jpg"
                alt="See how it's working — Databricks Data + AI"
                className="w-full rounded-lg border border-sidebar-border hover:opacity-90 transition-opacity"
              />
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </SidebarLayout>
  );
}
