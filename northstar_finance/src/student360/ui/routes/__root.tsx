import { ThemeProvider } from "@/components/apx/theme-provider";
import { PersonaProvider } from "@/lib/persona";
import { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: () => (
    <ThemeProvider defaultTheme="dark" storageKey="apx-ui-theme">
      <PersonaProvider>
        <Outlet />
        <Toaster richColors />
      </PersonaProvider>
    </ThemeProvider>
  ),
});
