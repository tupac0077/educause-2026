# Installing the Northstar University — Office of Finance app on a new workspace

A single script provisions all data + AI/BI + agent resources on a target Databricks
workspace and deploys the app. The app itself is workspace-agnostic: the backend reads
everything from `app.yml` env, and the frontend reads host/org/catalog/resource-IDs at
runtime from `GET /api/config`, so **no code changes or rebuild-per-workspace are needed** —
the installer just provisions resources and writes a fresh `app.yml`.

## What gets provisioned

| # | Resource |
|---|----------|
| 1 | Schemas `<catalog>.gold` and `<catalog>.silver` |
| 2 | Synthetic data — runs `data_setup/*.sql` (catalog-substituted): `student_360`, `finance_accounts`, `revenue_at_risk`, `aid_appeals`, `budget_vs_actual`, `intervention_log`, `finance_action_log`, courses/enrollments/support, masking UDFs, PII + classification tags |
| 3 | Two **Genie spaces** — "Northstar Office of Finance" and "Student 360 Advisor" (from `install/templates/genie_*.json`) |
| 4 | Three **AI/BI dashboards**, created and published — Financial Health, Research Finance, Enrollment Finance (from `install/templates/dash_*.json`) |
| 5 | **MLflow experiment** `/Shared/northstar_finance/agent-traces` |
| 6 | The **Databricks App** (created; its service principal is read back) |
| 7 | **Grants** to the app service principal (UC SELECT/MODIFY/EXECUTE, warehouse CAN_USE, Genie CAN_RUN, experiment CAN_EDIT) |
| 8 | A fresh **`app.yml`** with every captured id |
| 9 | Frontend build + `.build/` assembly + `workspace import-dir` + `apps deploy` |

## Prerequisites

1. **Databricks CLI** (v0.2xx) authenticated to the target workspace:
   ```bash
   databricks auth login --host https://<your-workspace>.cloud.databricks.com
   # or use a named profile and pass --profile <name>
   ```
2. **A Unity Catalog** you have `CREATE SCHEMA` on (pass its name as `--catalog`). The
   installer will `CREATE CATALOG IF NOT EXISTS` (best-effort) then create the schemas.
3. **A SQL warehouse** (serverless recommended). Omit `--warehouse` to auto-select the
   first running one, or pass an id.
4. **The agent model `databricks-gpt-5-4`** served and READY in the workspace. Check:
   ```bash
   databricks serving-endpoints get databricks-gpt-5-4
   # or: curl -H "Authorization: Bearer $(databricks auth token --host <host> | jq -r .access_token)" \
   #        <host>/api/2.0/serving-endpoints/databricks-gpt-5-4
   ```
   If it's not available, everything else still installs; only the two Genie **agents**
   (Finance Genie / Advisor Genie) will 404 until a compatible model exists. You can then
   change `AGENT_MODEL` in `app.yml` and redeploy.
5. **Python 3.10+** and **Node.js + npm** on the machine running the installer (for the
   frontend build). Use `--skip-build` to provision only and build/deploy yourself later.

## Run it

```bash
cd northstar_finance
python3 install/install.py \
  --host https://<your-workspace>.cloud.databricks.com \
  --catalog <your_catalog> \
  [--warehouse <warehouse-id>] \
  [--org <workspace-org-id>] \
  [--profile <cli-profile>] \
  [--app-name northstar-finance] \
  [--parent-path /Users/<you>] \
  [--skip-build]
```

- `--org` is the numeric workspace id in your URL (`?o=NNNN`). Optional; only affects the
  `?o=` suffix on deep-link URLs shown inside the app.
- `--parent-path` is the workspace folder that will hold the Genie spaces and dashboards
  (defaults to `/Users/<you>`).

On success it prints the app URL and every provisioned id. Open the URL — the app defaults
to the **Financial Health** page.

## Granting access to more users

The app runs **all queries as its own service principal**, so end users only need (a)
workspace membership and (b) app "Can use". Direct catalog querying is a separate, optional
grant. **Gotcha:** UC `GRANT` works for account-level users, but the warehouse/app/Genie
permission APIs return `Principal does not exist` until the user is a **workspace member** —
add them first.

```bash
HOST=https://<your-workspace>.cloud.databricks.com
TOK=$(databricks auth token --host $HOST | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
USER=someone@example.com

# 1) add to the workspace (required before warehouse/app/genie perms)
curl -sS -X POST "$HOST/api/2.0/preview/scim/v2/Users" -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' \
  -d "{\"schemas\":[\"urn:ietf:params:scim:schemas:core:2.0:User\"],\"userName\":\"$USER\"}"

# 2) (optional) direct catalog read — ONE principal per GRANT statement, catalog-level cascades
#    run these via the SQL editor or the statements API:
#    GRANT USE CATALOG, USE SCHEMA, SELECT ON CATALOG <catalog> TO `someone@example.com`;

# 3) app "Can use"
curl -sS -X PATCH "$HOST/api/2.0/permissions/apps/northstar-finance" -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' \
  -d "{\"access_control_list\":[{\"user_name\":\"$USER\",\"permission_level\":\"CAN_USE\"}]}"

# 4) (optional) warehouse Can use + Genie Can run for direct use outside the app
#    PATCH /api/2.0/permissions/warehouses/<id>   permission_level CAN_USE
#    PATCH /api/2.0/permissions/genie/<space_id>  permission_level CAN_RUN
```

Grant a whole group by using `"group_name"` instead of `"user_name"` in the ACL, and
`` TO `account users` `` in the SQL grant.

## Uninstall

```bash
databricks apps delete northstar-finance          # remove the app
# delete the Genie spaces + dashboards from the UI (or DELETE /api/2.0/genie/spaces/<id>
#   and DELETE /api/2.0/lakeview/dashboards/<id>)
# drop the data:  DROP SCHEMA <catalog>.gold CASCADE;  DROP SCHEMA <catalog>.silver CASCADE;
```

## Notes / first-run validation

- `data_setup/06_grants.sql` is **intentionally skipped** by the installer (it hard-codes the
  original workspace's SP). SP grants are applied dynamically in step 7 against the *new*
  app's service principal.
- The Genie and dashboard templates were exported verbatim from a working install and only
  the catalog name is templated (`__CATALOG__`), so they carry the exact tables, sample
  questions, instructions, and widgets.
- On the very first real install, sanity-check: (a) the chosen warehouse actually started;
  (b) `databricks-gpt-5-4` (or your substitute) is READY; (c) the two Genie spaces answer a
  sample question; (d) the app opens on Financial Health and the Finance/Advisor Genie chats
  return answers; (e) the app SP shows the expected grants (`SHOW GRANTS TO \`<sp>\``).
