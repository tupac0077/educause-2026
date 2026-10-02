import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppPersona = "governance" | "finance" | "sit";

export const PERSONA_LABELS: Record<AppPersona, string> = {
  governance: "Governance Team",
  finance: "Finance Team",
  sit: "Student Success Team",
};

export const PERSONA_ORDER: AppPersona[] = ["governance", "finance", "sit"];

// Landing page navigated to when the persona is toggled.
export const PERSONA_HOME: Record<AppPersona, string> = {
  governance: "/governance",
  finance: "/financial-health",
  sit: "/dashboard",
};

// Sub-brand shown under "Northstar University" in the logo, per persona.
export const PERSONA_SUBTITLE: Record<AppPersona, string> = {
  governance: "",
  finance: "Office of Finance",
  sit: "Student 360",
};

const STORAGE_KEY = "app_persona";

function readPersona(): AppPersona {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "governance" || v === "finance" || v === "sit") return v;
  } catch {
    /* ignore */
  }
  return "finance";
}

type PersonaContextValue = { persona: AppPersona; setPersona: (p: AppPersona) => void };

const PersonaContext = createContext<PersonaContextValue>({
  persona: "finance",
  setPersona: () => {},
});

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<AppPersona>(readPersona);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, persona);
    } catch {
      /* ignore */
    }
  }, [persona]);

  return (
    <PersonaContext.Provider value={{ persona, setPersona: setPersonaState }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona(): PersonaContextValue {
  return useContext(PersonaContext);
}

// Routes hidden from the Finance Team / restricted for SIT.
const FINANCE_ONLY_ROUTES = new Set([
  "/finance-copilot", "/trends", "/governance",
  "/financial-health", "/research-finance", "/enrollment-finance", "/finance",
  "/platform",  // "See how it's working" — visible to all personas
]);
const FINANCE_EXCLUSIVE_ROUTES = new Set([
  "/finance-copilot",
  "/financial-health", "/research-finance", "/enrollment-finance", "/finance",
]);

export function canSee(persona: AppPersona, to: string): boolean {
  if (persona === "governance") return true;
  if (persona === "finance") return FINANCE_ONLY_ROUTES.has(to);
  // sit: everything except the finance-exclusive routes
  return !FINANCE_EXCLUSIVE_ROUTES.has(to);
}
