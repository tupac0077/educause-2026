#!/usr/bin/env python3
"""Execute a series of ;-separated SQL statements against a Databricks SQL warehouse
via the Statement Execution API. Auth token comes from the Databricks CLI OAuth cache.

Usage: python3 run_sql.py <file.sql>
"""
import json
import subprocess
import sys
import time
import urllib.request

HOST = "https://fevm-serverless-student360-v2.cloud.databricks.com"
WAREHOUSE = "8e556c6c71086033"


def token() -> str:
    out = subprocess.check_output(
        ["databricks", "auth", "token", "--host", HOST], text=True, cwd="/tmp"
    )
    return json.loads(out)["access_token"]


def run(stmt: str, tok: str) -> dict:
    body = json.dumps(
        {"warehouse_id": WAREHOUSE, "statement": stmt, "wait_timeout": "50s"}
    ).encode()
    req = urllib.request.Request(
        f"{HOST}/api/2.0/sql/statements",
        data=body,
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        resp = json.load(r)
    # Poll if still running
    sid = resp.get("statement_id")
    while resp.get("status", {}).get("state") in ("PENDING", "RUNNING"):
        time.sleep(2)
        g = urllib.request.Request(
            f"{HOST}/api/2.0/sql/statements/{sid}",
            headers={"Authorization": f"Bearer {tok}"},
        )
        with urllib.request.urlopen(g) as r:
            resp = json.load(r)
    return resp


def split_statements(sql: str) -> list[str]:
    # Split on ';' that ends a line (naive but fine for our generated scripts;
    # no ';' appears inside our string literals).
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


def main():
    sql = open(sys.argv[1]).read()
    tok = token()
    stmts = split_statements(sql)
    print(f"Running {len(stmts)} statements from {sys.argv[1]}\n")
    for i, stmt in enumerate(stmts, 1):
        label = " ".join(stmt.split())[:70]
        resp = run(stmt, tok)
        state = resp.get("status", {}).get("state")
        if state == "SUCCEEDED":
            rows = resp.get("result", {}).get("data_array")
            extra = f" -> {rows[0]}" if rows and len(rows) == 1 and len(rows[0]) == 1 else ""
            print(f"[{i}/{len(stmts)}] OK   {label}{extra}")
        else:
            err = resp.get("status", {}).get("error", {}).get("message", "")
            print(f"[{i}/{len(stmts)}] FAIL {label}\n      {err}")
            sys.exit(1)
    print("\nAll statements succeeded.")


if __name__ == "__main__":
    main()
