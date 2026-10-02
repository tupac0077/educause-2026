import { Outlet, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import SidebarUserFooter from "@/components/apx/sidebar-user-footer";
import { ModeToggle } from "@/components/apx/mode-toggle";
import Logo from "@/components/apx/logo";
import { Users } from "lucide-react";
import { usePersona, PERSONA_LABELS, PERSONA_ORDER, PERSONA_HOME, type AppPersona } from "@/lib/persona";

function PersonaSelector() {
  const { persona, setPersona } = usePersona();
  const navigate = useNavigate();
  return (
    <label className="flex items-center gap-2 rounded-full border-2 border-indigo-500/70 bg-indigo-50 dark:bg-indigo-950/40 pl-3 pr-2 py-1 shadow-sm">
      <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      <span className="hidden sm:inline text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
        Viewing as
      </span>
      <select
        value={persona}
        onChange={(e) => {
          const next = e.target.value as AppPersona;
          setPersona(next);
          void navigate({ to: PERSONA_HOME[next] });
        }}
        className="bg-white dark:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-700 rounded-full text-sm font-semibold px-3 py-1 text-indigo-900 dark:text-indigo-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {PERSONA_ORDER.map((p) => (
          <option key={p} value={p}>
            {PERSONA_LABELS[p]}
          </option>
        ))}
      </select>
    </label>
  );
}

interface SidebarLayoutProps {
  children?: ReactNode;
}

function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 py-2">
            <Logo />
          </div>
        </SidebarHeader>
        <SidebarContent>{children}</SidebarContent>
        <SidebarFooter>
          <SidebarUserFooter />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1 cursor-pointer" />
          <div className="flex-1" />
          <PersonaSelector />
          <ModeToggle />
        </header>
        <div className="flex flex-1 justify-center overflow-auto">
          <div className="flex flex-1 flex-col gap-4 p-6 max-w-7xl">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
export default SidebarLayout;
