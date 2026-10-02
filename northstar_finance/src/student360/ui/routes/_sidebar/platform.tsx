import { createFileRoute } from "@tanstack/react-router";
import { useState, type ComponentType, type CSSProperties } from "react";
import {
  Cable, Workflow, ShieldCheck, Gauge, BarChart3, Sparkles,
  Database, AppWindow, ExternalLink, ChevronDown, Network, BookOpen, Compass,
  Presentation,
} from "lucide-react";
import { NS } from "@/components/apx/ns-charts";
import { useConfig, orgQ, type AppConfig } from "@/lib/config";

export const Route = createFileRoute("/_sidebar/platform")({
  component: () => <PlatformPage />,
});

type Cap = {
  headline: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  pitch: string;
  bullets: string[];
  docUrl: string;
};
type Layer = {
  step: string;
  title: string;
  tagline: string;
  pitch: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  accent: string;
  caps: Cap[];
};

const LAYERS: Layer[] = [
  {
    step: "01 · Ingest + Transform",
    title: "Bring all your data in",
    tagline: "Every source. One place. Always fresh.",
    pitch:
      "Connect everything that runs your business and turn it into trusted, ready-to-use data — without an engineering team babysitting pipelines.",
    icon: Cable,
    accent: NS.navy,
    caps: [
      {
        headline: "Connect to anything, in clicks.",
        name: "Lakeflow Connect",
        icon: Cable,
        pitch: "Salesforce, Workday, SAP, your databases — point and click, no connector to write or maintain.",
        bullets: [
          "200+ sources out of the box: SaaS, databases, files, streams.",
          "Always fresh — schema changes handled for you.",
          "Retire the home-grown ingestion stack and the team that babysits it.",
        ],
        docUrl: "https://www.databricks.com/product/data-engineering/lakeflow-connect",
      },
      {
        headline: "ETL made simple for everyone.",
        name: "Spark Declarative Pipelines",
        icon: Workflow,
        pitch: "Describe what you want; the platform builds, runs, and self-heals the pipeline.",
        bullets: [
          "Ship pipelines in days, not quarters — write the logic, skip the plumbing.",
          "Built-in data quality flags bad rows before reports go wrong.",
          "One framework for batch and streaming.",
        ],
        docUrl: "https://www.databricks.com/product/data-engineering/spark-declarative-pipelines",
      },
    ],
  },
  {
    step: "02 · Govern + Define",
    title: "Govern it once",
    tagline: "One permission model. One definition. Trusted everywhere.",
    pitch:
      "Open your data to the business without losing sleep over compliance — every dataset, dashboard, and AI agent under one source of truth.",
    icon: ShieldCheck,
    accent: NS.slate,
    caps: [
      {
        headline: "Govern once, trust everywhere.",
        name: "Unity Catalog",
        icon: ShieldCheck,
        pitch: "Unified governance for every asset — tables, models, agents, files, dashboards — across clouds and teams.",
        bullets: [
          "Set a permission once; it applies to dashboards, Genie, agents, and tools alike.",
          "Pass your next audit in days, not months — every query and change logged automatically.",
          "Open the data to more people without opening the door to risk.",
        ],
        docUrl: "https://www.databricks.com/product/unity-catalog",
      },
      {
        headline: "A semantic layer for your business.",
        name: "Metric Views",
        icon: Gauge,
        pitch: "Define every KPI once in a governed semantic layer — every dashboard, Genie answer, and agent agrees.",
        bullets: [
          "One definition of revenue, margin, churn — used consistently across BI, AI, and apps.",
          "Ratios, distinct counts, YoY — aggregate correctly however your team slices.",
          "Change a definition once; every report and AI assistant updates automatically.",
        ],
        docUrl: "https://docs.databricks.com/aws/en/business-semantics/metric-views/",
      },
    ],
  },
  {
    step: "03 · Speak to your data",
    title: "Put it to work for every team",
    tagline: "See it. Ask it. Let agents act on it.",
    pitch:
      "Give every team the answers they need — dashboards, natural-language Q&A, or AI agents — all grounded in the same trusted data.",
    icon: Sparkles,
    accent: NS.orange,
    caps: [
      {
        headline: "Scale BI to everyone — no extra cost.",
        name: "AI/BI Dashboards",
        icon: BarChart3,
        pitch: "Agentic business intelligence: dashboards your team builds themselves, with Genie built in.",
        bullets: [
          "Turn a question into a published dashboard in minutes — no SQL, no BI specialist.",
          "Retire the legacy BI stack and its six-figure licenses.",
          "Same permissions as the underlying data — no parallel access setup.",
        ],
        docUrl: "https://docs.databricks.com/aws/en/dashboards/",
      },
      {
        headline: "AI that knows your business.",
        name: "Genie",
        icon: Sparkles,
        pitch: "Talk to your data — explore any question, go beyond your dashboards.",
        bullets: [
          "Self-service for the 90% of questions that today queue up in your data team's inbox.",
          "Shows the SQL it ran and the chart it produced — never a black box.",
          "Trained on your tables and your vocabulary, not a generic model.",
        ],
        docUrl: "https://docs.databricks.com/aws/en/genie/",
      },
    ],
  },
  {
    step: "04 · Act",
    title: "Turn it into action",
    tagline: "Bring your apps to your data — not the other way around.",
    pitch:
      "Apps and agents in production, on the same platform as your data. No separate hosting, no separate identity, no separate compliance review.",
    icon: AppWindow,
    accent: NS.navy,
    caps: [
      {
        headline: "Transactional data, built for the agentic era.",
        name: "Lakebase",
        icon: Database,
        pitch: "Serverless Postgres next to your data and AI — designed for apps and agents.",
        bullets: [
          "Launches in under a second; pay only for what you use.",
          "Retire the operational DB outside your data platform — no nightly exports, no two sources of truth.",
          "One identity, one bill, one governance model with the rest of your platform.",
        ],
        docUrl: "https://docs.databricks.com/aws/en/lakebase/index.html",
      },
      {
        headline: "Bring your apps to your data.",
        name: "Databricks Apps",
        icon: AppWindow,
        pitch: "Secure, governed apps — built and deployed in the same place as your data and AI.",
        bullets: [
          "Idea to live app in days — investigation consoles, approval flows, copilots.",
          "No separate hosting, no separate sign-on, no separate audit trail.",
          "Production-grade by default: per-user access, full audit, managed credentials.",
        ],
        docUrl: "https://www.databricks.com/product/databricks-apps",
      },
    ],
  },
];

function buildResources(cfg: AppConfig) {
  const q = orgQ(cfg);
  const H = cfg.host;
  return [
    { label: "Unity Catalog", sub: cfg.catalog, icon: ShieldCheck, url: `${H}/explore/data/${cfg.catalog}${q}` },
    { label: "SQL Warehouse", sub: "Serverless", icon: Gauge, url: `${H}/sql/warehouses/${cfg.warehouse_id}${q}` },
    { label: "Genie · Office of Finance", sub: "Finance Genie", icon: Sparkles, url: `${H}/genie/rooms/${cfg.genie_finance}${q}` },
    { label: "Genie · Student 360 Advisor", sub: "Advisor Genie", icon: Network, url: `${H}/genie/rooms/${cfg.genie_advisor}${q}` },
    { label: "AI/BI Dashboard", sub: "Financial Health", icon: BarChart3, url: `${H}/dashboardsv3/${cfg.dash_financial_health}/published${q}` },
    { label: "Databricks App", sub: "northstar-finance", icon: AppWindow, url: `${H}/apps${q}` },
    { label: "Databricks One", sub: "Business-user home", icon: Compass, url: `${H}/one${q}` },
    { label: "Student 360 presentation", sub: "Google Slides deck", icon: Presentation, url: "https://docs.google.com/presentation/d/1dT2WW9jH-ubQIyPwC2kvMNDXOIBmOZt5Z1z1m4bHwTo/edit?slide=id.obj_25b3651c8632#slide=id.obj_25b3651c8632" },
  ];
}

function CapabilityRow({ cap }: { cap: Cap }) {
  const [open, setOpen] = useState(false);
  const Icon = cap.icon;
  return (
    <div className="ns-card overflow-hidden" style={{ borderColor: open ? "var(--ns-line)" : undefined }}>
      <button type="button" className="w-full flex items-center gap-3 p-3 text-left" onClick={() => setOpen((o) => !o)}>
        <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(9,64,116,0.1)" }}>
          <Icon className="h-4 w-4" style={{ color: NS.navy }} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">{cap.headline}</span>
          <span className="block text-xs ns-muted">{cap.name}</span>
        </span>
        <ChevronDown className={`h-4 w-4 ns-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 pl-14">
          <p className="text-sm mb-2">{cap.pitch}</p>
          <ul className="text-sm ns-muted list-disc pl-4 space-y-1 mb-2">
            {cap.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
          <a href={cap.docUrl} target="_blank" rel="noreferrer" className="text-sm font-medium inline-flex items-center gap-1" style={{ color: NS.navy }}>
            Learn more <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

function LayerBand({ layer, index }: { layer: Layer; index: number }) {
  const Big = layer.icon;
  const reverse = index % 2 === 1;
  const scene = (
    <div className="flex items-center justify-center">
      <div className="h-40 w-40 rounded-3xl flex items-center justify-center" style={{ background: `${layer.accent}14`, border: `1px solid ${layer.accent}33` }}>
        <Big className="h-16 w-16" style={{ color: layer.accent }} />
      </div>
    </div>
  );
  return (
    <section className="ns-card p-6">
      <div className={`grid gap-6 lg:grid-cols-2 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        {scene}
        <div>
          <div className="text-xs uppercase tracking-widest ns-muted font-semibold">{layer.step}</div>
          <h2 className="ns-display text-2xl font-semibold mt-1" style={{ color: NS.navy }}>{layer.title}</h2>
          <div className="text-sm font-medium mt-0.5" style={{ color: layer.accent }}>{layer.tagline}</div>
          <p className="text-sm ns-muted mt-2">{layer.pitch}</p>
          <div className="space-y-2 mt-4">
            {layer.caps.map((c) => <CapabilityRow key={c.name} cap={c} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function PlatformPage() {
  const cfg = useConfig();
  const resources = cfg ? buildResources(cfg) : [];
  return (
    <div className="ns-theme space-y-6">
      {/* Hero */}
      <div className="text-center flex flex-col items-center gap-3">
        <img src="/see-how.jpg" alt="See how it's working — Databricks Data + AI" className="rounded-xl border max-w-md w-full" style={{ borderColor: "var(--ns-line)" }} />
        <h1 className="ns-display text-4xl font-semibold" style={{ color: NS.navy }}>Databricks Data + AI</h1>
        <p className="ns-muted text-sm max-w-2xl">
          See how it's working — the platform behind this app. From raw sources to a governed lakehouse,
          to dashboards, Genie, and agents, to apps that act — one platform, one governance model.{" "}
          <a
            href="https://www.uta.edu/administration/analytics/databricks"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline"
            style={{ color: NS.navy }}
          >
            Link
          </a>{" "}
          to an example of what an enterprise deployment at a{" "}
          <a
            href="https://www.uta.edu/administration/analytics/databricks"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline"
            style={{ color: NS.navy }}
          >
            university
          </a>{" "}
          looks like.
        </p>
      </div>

      {/* Layers */}
      {LAYERS.map((l, i) => <LayerBand key={l.title} layer={l} index={i} />)}

      {/* Resource strip */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4" style={{ color: NS.navy }} />
          <h2 className="ns-display text-lg font-semibold">This app, on the platform</h2>
        </div>
        <p className="ns-muted text-sm mb-4">The governed resources powering Northstar University — open each in Databricks.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resources.map((r) => {
            const Icon = r.icon;
            return (
              <a key={r.label} href={r.url} target="_blank" rel="noreferrer" className="ns-card p-4 flex items-center gap-3 hover:opacity-90 transition">
                <span className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(9,64,116,0.1)" }}>
                  <Icon className="h-4 w-4" style={{ color: NS.navy }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{r.label}</span>
                  <span className="block text-xs ns-muted truncate">{r.sub}</span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 ns-muted shrink-0" />
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
