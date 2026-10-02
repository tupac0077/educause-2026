#!/usr/bin/env python3
"""
One-command portable installer for the Northstar University — Office of Finance
Databricks App.

Provisions everything on a target workspace and deploys the app:
  1. schemas <catalog>.gold + <catalog>.silver
  2. synthetic data (runs ../data_setup/*.sql, catalog-substituted)
  3. two Genie spaces (from install/templates/genie_*.json)
  4. three AI/BI dashboards, published (from install/templates/dash_*.json)
  5. MLflow experiment (/Shared/northstar_finance/agent-traces)
  6. the Databricks App (creates it, reads its service principal)
  7. grants the app service principal UC + warehouse + Genie + experiment access
  8. writes app.yml with every captured id
  9. builds the frontend, assembles .build/, imports it, and deploys

Usage:
  python3 install/install.py --host https://<ws>.cloud.databricks.com \
      --catalog <catalog> [--warehouse <id>] [--org <org-id>] \
      [--profile <cli-profile>] [--app-name northstar-finance] \
      [--parent-path /Users/<you>] [--skip-build]

Auth: uses the Databricks CLI token cache for --host (run `databricks auth login
--host <host>` first), or --profile. Stdlib only.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)                 # .../northstar_finance
DATA_SETUP = os.path.join(PROJECT, "..", "data_setup")
TEMPLATES = os.path.join(HERE, "templates")
PLACEHOLDER_CATALOG = "serverless_student360_v2_catalog"   # literal used in the .sql files
TOKEN_PLACEHOLDER = "__CATALOG__"                          # used in the json templates
EXPERIMENT_PATH = "/Shared/northstar_finance/agent-traces"
AGENT_MODEL = "databricks-gpt-5-4"

# ---------------------------------------------------------------------------
# small http / cli helpers
# ---------------------------------------------------------------------------

class Ctx:
    def __init__(self, host: str, profile: str | None):
        self.host = host.rstrip("/")
        self.profile = profile
        self._tok = None

    def token(self) -> str:
        if self._tok:
            return self._tok
        cmd = ["databricks", "auth", "token", "--host", self.host]
        if self.profile:
            cmd += ["--profile", self.profile]
        out = subprocess.check_output(cmd, text=True, cwd="/tmp")
        self._tok = json.loads(out)["access_token"]
        return self._tok

    def api(self, method: str, path: str, body=None, ok=(200, 201)):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            f"{self.host}{path}", data=data, method=method,
            headers={"Authorization": f"Bearer {self.token()}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req) as r:
                raw = r.read().decode()
                return (r.status, json.loads(raw) if raw.strip() else {})
        except urllib.error.HTTPError as e:
            return (e.code, {"_error": e.read().decode()[:500]})


def die(msg: str):
    print(f"\n✗ {msg}", file=sys.stderr)
    sys.exit(1)


def step(n, msg):
    print(f"\n\033[1m[{n}]\033[0m {msg}")


# ---------------------------------------------------------------------------
# SQL (statement execution API)
# ---------------------------------------------------------------------------

def run_sql(ctx: Ctx, warehouse: str, stmt: str) -> tuple[str, str]:
    code, resp = ctx.api("POST", "/api/2.0/sql/statements",
                         {"warehouse_id": warehouse, "statement": stmt, "wait_timeout": "50s"})
    if code not in (200, 201):
        return "ERROR", resp.get("_error", str(resp))
    sid = resp.get("statement_id")
    state = resp.get("status", {}).get("state")
    while state in ("PENDING", "RUNNING"):
        time.sleep(2)
        _, resp = ctx.api("GET", f"/api/2.0/sql/statements/{sid}")
        state = resp.get("status", {}).get("state")
    if state == "SUCCEEDED":
        return "SUCCEEDED", ""
    return state or "UNKNOWN", (resp.get("status", {}).get("error", {}) or {}).get("message", "")


def split_statements(sql: str) -> list[str]:
    parts, buf = [], []
    for line in sql.splitlines():
        if line.strip().startswith("--") or not line.strip():
            continue
        buf.append(line)
        if line.rstrip().endswith(";"):
            parts.append("\n".join(buf).rstrip().rstrip(";"))
            buf = []
    if any(x.strip() for x in buf):
        parts.append("\n".join(buf))
    return [p for p in parts if p.strip()]


def run_sql_file(ctx: Ctx, warehouse: str, path: str, catalog: str):
    sql = open(path).read().replace(PLACEHOLDER_CATALOG, catalog)
    stmts = split_statements(sql)
    print(f"    {os.path.basename(path)}: {len(stmts)} statements")
    for i, s in enumerate(stmts, 1):
        state, err = run_sql(ctx, warehouse, s)
        if state != "SUCCEEDED":
            die(f"{os.path.basename(path)} stmt {i} failed [{state}]: {err}\n    SQL: {' '.join(s.split())[:160]}")


# ---------------------------------------------------------------------------
# steps
# ---------------------------------------------------------------------------

def pick_warehouse(ctx: Ctx, warehouse: str | None) -> str:
    if warehouse:
        return warehouse
    code, resp = ctx.api("GET", "/api/2.0/sql/warehouses")
    whs = resp.get("warehouses", []) if code == 200 else []
    if not whs:
        die("No SQL warehouses found; pass --warehouse <id>.")
    # prefer a running serverless warehouse, else first
    running = [w for w in whs if w.get("state") == "RUNNING"]
    chosen = (running or whs)[0]
    print(f"    auto-selected warehouse {chosen['id']} ({chosen.get('name')!r}, state={chosen.get('state')})")
    return chosen["id"]


def ensure_warehouse_started(ctx: Ctx, warehouse: str):
    ctx.api("POST", f"/api/2.0/sql/warehouses/{warehouse}/start")  # best-effort; serverless auto-starts


def current_user(ctx: Ctx) -> str:
    code, resp = ctx.api("GET", "/api/2.0/preview/scim/v2/Me")
    return resp.get("userName", "") if code == 200 else ""


def create_genie(ctx: Ctx, warehouse: str, catalog: str, template: str, parent_path: str) -> str:
    tpl = json.load(open(os.path.join(TEMPLATES, template)))
    ss = tpl["serialized_space"].replace(TOKEN_PLACEHOLDER, catalog)
    body = {
        "title": tpl.get("title"),
        "description": tpl.get("description") or "",
        "warehouse_id": warehouse,
        "serialized_space": ss,
    }
    if parent_path:
        body["parent_path"] = parent_path
    code, resp = ctx.api("POST", "/api/2.0/genie/spaces", body)
    if code not in (200, 201):
        die(f"Genie create failed ({template}) [{code}]: {resp.get('_error', resp)}")
    sid = resp.get("space_id") or resp.get("id")
    print(f"    created Genie space {tpl.get('title')!r} -> {sid}")
    return sid


def create_dashboard(ctx: Ctx, warehouse: str, catalog: str, template: str, parent_path: str) -> str:
    tpl = json.load(open(os.path.join(TEMPLATES, template)))
    sd = tpl["serialized_dashboard"].replace(TOKEN_PLACEHOLDER, catalog)
    body = {"display_name": tpl.get("display_name"), "warehouse_id": warehouse, "serialized_dashboard": sd}
    if parent_path:
        body["parent_path"] = parent_path
    code, resp = ctx.api("POST", "/api/2.0/lakeview/dashboards", body)
    if code not in (200, 201):
        die(f"Dashboard create failed ({template}) [{code}]: {resp.get('_error', resp)}")
    did = resp.get("dashboard_id")
    # publish
    pc, pr = ctx.api("POST", f"/api/2.0/lakeview/dashboards/{did}/published",
                     {"embed_credentials": True, "warehouse_id": warehouse})
    published = "published" if pc in (200, 201) else f"publish-failed({pc})"
    print(f"    created dashboard {tpl.get('display_name')!r} -> {did} [{published}]")
    return did


def ensure_experiment(ctx: Ctx) -> str:
    code, resp = ctx.api("POST", "/api/2.0/mlflow/experiments/create", {"name": EXPERIMENT_PATH})
    if code in (200, 201):
        return resp.get("experiment_id", "")
    # already exists -> look it up
    gc, gr = ctx.api("GET", f"/api/2.0/mlflow/experiments/get-by-name?experiment_name={urllib.parse.quote(EXPERIMENT_PATH)}")
    return (gr.get("experiment", {}) or {}).get("experiment_id", "") if gc == 200 else ""


def ensure_app(ctx: Ctx, app_name: str) -> dict:
    code, resp = ctx.api("GET", f"/api/2.0/apps/{app_name}")
    if code == 200:
        print(f"    app {app_name!r} already exists")
        return resp
    print(f"    creating app {app_name!r} ...")
    cc, cr = ctx.api("POST", "/api/2.0/apps", {"name": app_name,
                     "description": "Northstar University — Office of Finance"})
    if cc not in (200, 201):
        die(f"App create failed [{cc}]: {cr.get('_error', cr)}")
    # poll until the SP is assigned / app is out of provisioning
    for _ in range(60):
        gc, gr = ctx.api("GET", f"/api/2.0/apps/{app_name}")
        if gc == 200 and (gr.get("service_principal_client_id") or gr.get("service_principal_id")):
            return gr
        time.sleep(5)
    die("App did not finish provisioning (no service principal after 5 min).")


def grant_sp(ctx: Ctx, warehouse: str, catalog: str, sp: str, genie_ids: list[str], exp_id: str):
    stmts = [
        f"GRANT USE CATALOG ON CATALOG {catalog} TO `{sp}`",
        f"GRANT USE SCHEMA ON SCHEMA {catalog}.gold TO `{sp}`",
        f"GRANT USE SCHEMA ON SCHEMA {catalog}.silver TO `{sp}`",
        f"GRANT SELECT ON SCHEMA {catalog}.gold TO `{sp}`",
        f"GRANT SELECT ON SCHEMA {catalog}.silver TO `{sp}`",
        f"GRANT MODIFY ON TABLE {catalog}.gold.finance_action_log TO `{sp}`",
        f"GRANT MODIFY ON TABLE {catalog}.gold.aid_appeals TO `{sp}`",
        f"GRANT MODIFY ON TABLE {catalog}.gold.intervention_log TO `{sp}`",
        f"GRANT EXECUTE ON FUNCTION {catalog}.gold.mask_email TO `{sp}`",
        f"GRANT EXECUTE ON FUNCTION {catalog}.gold.mask_dob TO `{sp}`",
        f"GRANT EXECUTE ON FUNCTION {catalog}.gold.mask_national_id TO `{sp}`",
    ]
    for s in stmts:
        state, err = run_sql(ctx, warehouse, s)
        if state != "SUCCEEDED":
            print(f"    ⚠ grant skipped [{state}]: {' '.join(s.split())[:80]} — {err[:80]}")
    ctx.api("PATCH", f"/api/2.0/permissions/warehouses/{warehouse}",
            {"access_control_list": [{"service_principal_name": sp, "permission_level": "CAN_USE"}]})
    for gid in genie_ids:
        ctx.api("PATCH", f"/api/2.0/permissions/genie/{gid}",
                {"access_control_list": [{"service_principal_name": sp, "permission_level": "CAN_RUN"}]})
    if exp_id:
        ctx.api("PATCH", f"/api/2.0/permissions/experiments/{exp_id}",
                {"access_control_list": [{"service_principal_name": sp, "permission_level": "CAN_EDIT"}]})
    print(f"    granted app SP {sp} catalog/warehouse/genie/experiment access")


def write_app_yml(path: str, *, catalog, warehouse, genie_finance, genie_advisor,
                  dash_fh, dash_rf, dash_ef, org):
    y = f"""command: ["uvicorn", "student360.backend.app:app", "--workers", "1"]

# OBO (on-behalf-of-user) scopes minted into X-Forwarded-Access-Token.
# model-serving is required for the agent's LLM calls to /serving-endpoints.
user_authorization:
  scopes:
    - model-serving
    - sql
    - dashboards.genie
    - catalog.catalogs:read
    - catalog.schemas:read
    - catalog.tables:read
    - iam.current-user:read

env:
  - name: STUDENT360_CATALOG
    value: {catalog}
  - name: STUDENT360_EDITION
    value: northstar_finance
  - name: DATABRICKS_WAREHOUSE_ID
    value: "{warehouse}"
  - name: GENIE_SPACE_ID
    value: "{genie_finance}"
  - name: ADVISOR_GENIE_SPACE_ID
    value: "{genie_advisor}"
  - name: AGENT_MODEL
    value: {AGENT_MODEL}
  - name: AGENT_MLFLOW_EXPERIMENT_PATH
    value: "{EXPERIMENT_PATH}"
  - name: DASH_FINANCIAL_HEALTH
    value: "{dash_fh}"
  - name: DASH_RESEARCH_FINANCE
    value: "{dash_rf}"
  - name: DASH_ENROLLMENT_FINANCE
    value: "{dash_ef}"
  - name: WORKSPACE_ORG
    value: "{org}"
"""
    open(path, "w").write(y)


def build_and_deploy(ctx: Ctx, app_name: str, me: str):
    # frontend build
    if not os.path.isdir(os.path.join(PROJECT, "node_modules")):
        print("    npm install ...")
        subprocess.check_call(["npm", "install"], cwd=PROJECT)
    print("    vite build ...")
    subprocess.check_call(["npx", "vite", "build"], cwd=PROJECT)
    # assemble .build/
    build = os.path.join(PROJECT, ".build")
    src = os.path.join(PROJECT, "src", "student360")
    subprocess.check_call(["rm", "-rf", os.path.join(build, "student360")])
    os.makedirs(os.path.join(build, "student360"), exist_ok=True)
    subprocess.check_call(["cp", "-R", os.path.join(src, "backend"), os.path.join(build, "student360", "backend")])
    subprocess.check_call(["cp", "-R", os.path.join(src, "__dist__"), os.path.join(build, "student360", "__dist__")])
    for f in ("__init__.py", "_metadata.py", "_metadata.pyi", "_version.pyi"):
        if os.path.exists(os.path.join(src, f)):
            subprocess.check_call(["cp", os.path.join(src, f), os.path.join(build, "student360", f)])
    os.makedirs(os.path.join(build, "config"), exist_ok=True)
    subprocess.check_call(["cp", os.path.join(PROJECT, "app.yml"), os.path.join(build, "app.yml")])
    # requirements.txt: reuse existing pinned file if present, else minimal
    req = os.path.join(build, "requirements.txt")
    if not os.path.exists(req):
        open(req, "w").write("databricks-sdk\nfastapi\nuvicorn\npydantic\npydantic-settings\nopenai>=1.54.0\nmlflow-skinny>=2.19.0\n")
    # import-dir + deploy
    ws_path = f"/Workspace/Users/{me}/{app_name}_build"
    print(f"    importing build to {ws_path} ...")
    cmd = ["databricks", "workspace", "import-dir", build, ws_path, "--overwrite"]
    if ctx.profile:
        cmd += ["--profile", ctx.profile]
    subprocess.check_call(cmd, cwd="/tmp")
    print("    deploying app ...")
    dcmd = ["databricks", "apps", "deploy", app_name, "--source-code-path", ws_path]
    if ctx.profile:
        dcmd += ["--profile", ctx.profile]
    subprocess.check_call(dcmd, cwd="/tmp")


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Portable installer for the Northstar Finance app.")
    ap.add_argument("--host", required=True, help="Target workspace URL, e.g. https://xxx.cloud.databricks.com")
    ap.add_argument("--catalog", required=True, help="Unity Catalog to create the schemas/data in (you need CREATE on it).")
    ap.add_argument("--warehouse", help="SQL warehouse id (auto-selected if omitted).")
    ap.add_argument("--org", default="", help="Workspace org id (for deep-link URLs in the UI). Optional.")
    ap.add_argument("--profile", help="Databricks CLI profile to auth with (else uses --host token cache).")
    ap.add_argument("--app-name", default="northstar-finance")
    ap.add_argument("--parent-path", default="", help="Workspace folder for Genie spaces + dashboards (default: /Users/<you>).")
    ap.add_argument("--skip-build", action="store_true", help="Provision only; skip frontend build + deploy.")
    args = ap.parse_args()

    ctx = Ctx(args.host, args.profile)
    catalog = args.catalog
    me = current_user(ctx) or ""
    parent = args.parent_path or (f"/Users/{me}" if me else "")

    step(1, f"Preflight (host={ctx.host}, user={me or '?'})")
    warehouse = pick_warehouse(ctx, args.warehouse)
    ensure_warehouse_started(ctx, warehouse)
    # model availability check (advisory)
    mc, mr = ctx.api("GET", f"/api/2.0/serving-endpoints/{AGENT_MODEL}")
    print(f"    agent model {AGENT_MODEL}: {'READY' if mc == 200 else 'NOT FOUND (agents will 404 until available)'}")

    step(2, f"Schemas in {catalog}")
    for s in (f"CREATE CATALOG IF NOT EXISTS {catalog}",
              f"CREATE SCHEMA IF NOT EXISTS {catalog}.gold",
              f"CREATE SCHEMA IF NOT EXISTS {catalog}.silver"):
        state, err = run_sql(ctx, warehouse, s)
        print(f"    {s} -> {state}{(' — ' + err[:80]) if err else ''}")

    step(3, "Synthetic data (data_setup/*.sql, catalog-substituted; 06_grants.sql skipped — SP grants happen post-app)")
    files = sorted(glob.glob(os.path.join(DATA_SETUP, "0*.sql")))
    files = [f for f in files if not os.path.basename(f).startswith("06_")]
    for f in files:
        run_sql_file(ctx, warehouse, f, catalog)

    step(4, "Genie spaces")
    genie_finance = create_genie(ctx, warehouse, catalog, "genie_finance.json", parent)
    genie_advisor = create_genie(ctx, warehouse, catalog, "genie_advisor.json", parent)

    step(5, "AI/BI dashboards (created + published)")
    dash_fh = create_dashboard(ctx, warehouse, catalog, "dash_financial_health.json", parent)
    dash_rf = create_dashboard(ctx, warehouse, catalog, "dash_research_finance.json", parent)
    dash_ef = create_dashboard(ctx, warehouse, catalog, "dash_enrollment_finance.json", parent)

    step(6, "MLflow experiment")
    exp_id = ensure_experiment(ctx)
    print(f"    {EXPERIMENT_PATH} -> {exp_id or '(best-effort; not captured)'}")

    step(7, f"App {args.app_name!r}")
    app = ensure_app(ctx, args.app_name)
    sp = app.get("service_principal_client_id") or app.get("service_principal_id")
    print(f"    app service principal: {sp}")

    step(8, "Grant the app service principal")
    grant_sp(ctx, warehouse, catalog, sp, [genie_finance, genie_advisor], exp_id)

    step(9, "Write app.yml")
    write_app_yml(os.path.join(PROJECT, "app.yml"), catalog=catalog, warehouse=warehouse,
                  genie_finance=genie_finance, genie_advisor=genie_advisor,
                  dash_fh=dash_fh, dash_rf=dash_rf, dash_ef=dash_ef, org=args.org)
    print("    wrote app.yml")

    if args.skip_build:
        print("\n--skip-build set: provisioning done; app.yml written. Build/deploy manually.")
    else:
        step(10, "Build frontend + deploy app")
        build_and_deploy(ctx, args.app_name, me)

    _, app = ctx.api("GET", f"/api/2.0/apps/{args.app_name}")
    print("\n\033[1m✓ Install complete\033[0m")
    print(f"  App URL:        {app.get('url', '(see Compute > Apps)')}")
    print(f"  Catalog:        {catalog}  (schemas gold, silver)")
    print(f"  Warehouse:      {warehouse}")
    print(f"  Genie finance:  {genie_finance}")
    print(f"  Genie advisor:  {genie_advisor}")
    print(f"  Dashboards:     FH={dash_fh}  RF={dash_rf}  EF={dash_ef}")
    print(f"  MLflow exp:     {exp_id or EXPERIMENT_PATH}")
    print(f"  App SP:         {sp}")
    print("\n  Grant end users access: see install/INSTALL.md ('Granting access to more users').")


if __name__ == "__main__":
    main()
