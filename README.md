# EDUCAUSE 2026 — Northstar University, Office of Finance (Databricks App)

An action-taking **Genie + agent** demo app for higher-education finance, built on
Databricks Apps (FastAPI backend + React/TanStack Router frontend). It ships with
synthetic data, two Genie spaces, three AI/BI dashboards, and two agent chat
surfaces ("Finance Genie" and "Advisor Genie").

The app is **workspace-agnostic**: the backend reads everything from `app.yml` env,
and the frontend reads host/org/catalog/resource-IDs at runtime from `GET /api/config`.
No code changes or per-workspace rebuilds are needed — a single installer provisions
all resources and deploys.

## Install it on your workspace (one command)

```bash
# 1. Authenticate the Databricks CLI to YOUR workspace
databricks auth login --host https://<your-workspace>.cloud.databricks.com

# 2. Provision data + Genie + dashboards + MLflow + app, then deploy
cd northstar_finance
python3 install/install.py \
  --host https://<your-workspace>.cloud.databricks.com \
  --catalog <a_unity_catalog_you_can_create_schemas_in>
```

### Prerequisites
1. **Databricks CLI** (v0.2xx) authenticated to the target workspace.
2. **A Unity Catalog** you can create schemas in (pass as `--catalog`), plus a
   **serverless SQL warehouse** (auto-selected, or pass `--warehouse <id>`).
3. **The agent model `databricks-gpt-5-4`** served and READY. Dashboards and Genie
   spaces install without it; only the two agent chat pages need it.

See **`northstar_finance/install/INSTALL.md`** for the full runbook (what gets
provisioned, adding users, uninstall).

## Repo layout
```
northstar_finance/   # the app (backend + ui + install/)
data_setup/          # synthetic-data SQL run by the installer
```
