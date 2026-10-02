# Northstar University — Office of Finance | Demo Runbook

An action-taking AI app for university finance leadership, built on the Databricks Data
Intelligence Platform. It shows the full arc: **see** financial exposure → **ask** in natural
language (Genie) → **act** with a human-gated agent → **trust** it (MLflow traces + feedback).

- **Live app:** https://northstar-finance-7474654482161436.aws.databricksapps.com
- **Workspace:** https://fevm-serverless-student360-v2.cloud.databricks.com
- **Persona:** VP of Finance / CFO office at a fictional US university ("Northstar University").
- **Data:** 100% synthetic. 800 students, tuition/aid accounts, revenue-at-risk, aid appeals, budgets.

> Everything the audience sees is synthetic demonstration data. No real students.

---

## The story (headline numbers)
- **~$10.9M** of expected tuition revenue is **at risk** from student attrition.
- **99** financial-aid appeals are **pending** decision.
- Hundreds of accounts are **delinquent / past due**.
The question a CFO asks: *where is the exposure, and what do we do about it — today?*

---

## Capabilities this shows off
| Databricks capability | Where in the demo |
|---|---|
| **AI/BI Genie** (NL→SQL) | Finance Copilot answers plain-English questions and shows the SQL it ran |
| **Action-taking agent** (tool-calling) | Genie is one tool among several; the agent also reads accounts and **takes actions** |
| **Human-in-the-loop writes** | Approve/Reject gate before any record changes (aid decisions, retention holds, collections) |
| **MLflow tracing + feedback** | Every agent turn is traced; 👍/👎 writes an assessment |
| **Unity Catalog governance** | Governance page shows PII column masking + tags |
| **AI/BI dashboard** | Embedded finance dashboard (revenue-at-risk, delinquency, budget vs actual) |

---

## Demo click-path (≈8 minutes)

**1. Financial Health (home)** — open the app. Point out the KPI tiles: revenue at risk, overdue
balance, pending appeals. "This is the state of the book today."

**2. Finance Copilot — ask (Genie).** Open **Finance Copilot** and ask:
   - *"Which colleges have the most revenue at risk?"*
   - *"How much overdue balance do we have, and how is it split by delinquency status?"*
   Expand the **Thinking panel** — show that it called `ask_genie` and returned the exact SQL. This is
   real Genie NL→SQL over the finance tables, not a canned answer.

**3. Finance Copilot — act (the money moment).** Ask:
   - *"Review the pending aid appeals and recommend which to approve."*
   The agent reads the appeals, reasons, and then **proposes a write action** — an **Approve / Reject**
   card appears (e.g. "Approve aid appeal APL-0042 — loss of family income, strong recovery plan").
   Click **Approve**. The agent executes and confirms; the decision is written to
   `gold.finance_action_log` and the appeal status flips. **Nothing is written without your click.**

**4. AI Actions page.** Show the **pending aid-appeals queue** and **revenue-at-risk** tables, and the
   **action log** — the audit trail of what the agent did. Click a row to jump back into the Copilot
   pre-seeded to act on that student.

**5. Trust.** Mention every turn is traced in MLflow (`/Shared/northstar_finance/agent-traces`) and the
   👍/👎 buttons capture human feedback against the trace.

**6. Governance (optional).** Open the Governance page — PII columns (email, DOB, ID) are masked with
   Unity Catalog functions; show the classification tags.

---

## Try-it prompts
- "What is our total revenue at risk, broken down by college?"
- "Which students have the largest overdue balances?"
- "Review aid appeal APL-0007 and recommend a decision." → Approve/Reject
- "Place a retention hold on the highest revenue-at-risk student and explain why." → Approve/Reject
- "Draft an empathetic outreach email to the most delinquent account." (draft only — no write)
- "Escalate student 42 to collections review." → Approve/Reject

---

## Under the hood
- **Frontend:** React + TanStack Router (APX). Finance Copilot streams over SSE with a live thinking panel.
- **Backend:** FastAPI. `/api/chat` → real Genie; `/api/agent/stream` → tool-calling agent
  (`databricks-gpt-5-4`) with read tools, a draft tool, and three human-gated write tools.
- **Agent identity:** the LLM runs on the viewer's behalf (OBO); SQL + Genie run as the app service
  principal (granted SELECT/MODIFY + Genie CAN_RUN + warehouse CAN_USE).
- **Data:** `serverless_student360_v2_catalog.gold` (see `../data_setup/RESOURCES.md`).

## Reset / re-run
Aid decisions and agent actions persist in `gold.aid_appeals` and `gold.finance_action_log`. To reset
between demos, re-run `data_setup/02_finance.sql` (rebuilds appeals to all-pending and truncates via
`CREATE OR REPLACE`), and `TRUNCATE TABLE serverless_student360_v2_catalog.gold.finance_action_log`.

## Redeploy (Terraform-free)
See `../data_setup` / memory: build the frontend (`npm install && npx vite build`), reassemble `.build/`,
then `databricks apps deploy northstar-finance --source-code-path <workspace .build path>`.
