// Workspace config fetched at runtime from /api/config, so the built UI has no
// hardcoded host / org / catalog / resource IDs and runs on any workspace.
import { useEffect, useState } from "react";

export type AppConfig = {
  host: string;
  org: string;
  catalog: string;
  warehouse_id: string;
  genie_finance: string;
  genie_advisor: string;
  dash_financial_health: string;
  dash_research_finance: string;
  dash_enrollment_finance: string;
};

const EMPTY: AppConfig = {
  host: "", org: "", catalog: "", warehouse_id: "",
  genie_finance: "", genie_advisor: "",
  dash_financial_health: "", dash_research_finance: "", dash_enrollment_finance: "",
};

let _cache: AppConfig | null = null;
let _inflight: Promise<AppConfig> | null = null;

export async function fetchConfig(): Promise<AppConfig> {
  if (_cache) return _cache;
  if (!_inflight) {
    _inflight = fetch("/api/config")
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((c: AppConfig) => {
        _cache = { ...EMPTY, ...c };
        return _cache;
      })
      .catch(() => EMPTY);
  }
  return _inflight;
}

/** React hook: returns the config once loaded, or null while loading. */
export function useConfig(): AppConfig | null {
  const [cfg, setCfg] = useState<AppConfig | null>(_cache);
  useEffect(() => {
    let on = true;
    void fetchConfig().then((c) => {
      if (on) setCfg(c);
    });
    return () => {
      on = false;
    };
  }, []);
  return cfg;
}

/** "?o=<org>" query suffix (empty if org unknown). */
export function orgQ(cfg: AppConfig): string {
  return cfg.org ? `?o=${cfg.org}` : "";
}
