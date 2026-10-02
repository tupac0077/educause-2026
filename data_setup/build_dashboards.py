#!/usr/bin/env python3
import json, subprocess, urllib.request, urllib.error

HOST = "https://fevm-serverless-student360-v2.cloud.databricks.com"
WH = "8e556c6c71086033"
SP = "d7ed3475-7ea8-4fd1-8ddb-7f19ea833877"
CAT = "serverless_student360_v2_catalog"
G = f"{CAT}.gold"
TOK = json.loads(subprocess.check_output(["databricks","auth","token","--host",HOST],text=True,cwd="/tmp"))["access_token"]

def api(method, path, body=None):
    req = urllib.request.Request(f"{HOST}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {TOK}", "Content-Type": "application/json"}, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read().decode()[:400]}")
        raise

def ds(name, disp, sql):
    return {"name": name, "displayName": disp, "queryLines": [sql]}

def q(dataset, fields):
    return [{"name": "main", "query": {"datasetName": dataset,
            "fields": [{"name": n, "expression": e} for n, e in fields], "disaggregated": False}}]

def counter(name, dataset, field, expr, label, x, w=3):
    return {"widget": {"name": name, "queries": q(dataset, [(field, expr)]),
            "spec": {"version": 2, "widgetType": "counter",
                     "encodings": {"value": {"fieldName": field, "displayName": label}}}},
            "position": {"x": x, "y": 0, "width": w, "height": 3}}

def bar(name, dataset, xf, xe, yf, ye, xl, yl, x, y, w=6, h=6, color=None):
    enc = {"x": {"fieldName": xf, "scale": {"type": "categorical"}, "displayName": xl},
           "y": {"fieldName": yf, "scale": {"type": "quantitative"}, "displayName": yl}}
    fields = [(xf, xe), (yf, ye)]
    if color:
        cf, ce, cl = color
        enc["color"] = {"fieldName": cf, "scale": {"type": "categorical"}, "displayName": cl}
        fields.append((cf, ce))
    return {"widget": {"name": name, "queries": q(dataset, fields),
            "spec": {"version": 3, "widgetType": "bar", "encodings": enc}},
            "position": {"x": x, "y": y, "width": w, "height": h}}

def line(name, dataset, xf, xe, yf, ye, xl, yl, x, y, w=6, h=6):
    return {"widget": {"name": name, "queries": q(dataset, [(xf, xe), (yf, ye)]),
            "spec": {"version": 3, "widgetType": "line",
                     "encodings": {"x": {"fieldName": xf, "scale": {"type": "temporal"}, "displayName": xl},
                                   "y": {"fieldName": yf, "scale": {"type": "quantitative"}, "displayName": yl}}}},
            "position": {"x": x, "y": y, "width": w, "height": h}}

def pie(name, dataset, af, ae, cf, ce, al, cl, x, y, w=6, h=6):
    return {"widget": {"name": name, "queries": q(dataset, [(cf, ce), (af, ae)]),
            "spec": {"version": 3, "widgetType": "pie",
                     "encodings": {"angle": {"fieldName": af, "scale": {"type": "quantitative"}, "displayName": al},
                                   "color": {"fieldName": cf, "scale": {"type": "categorical"}, "displayName": cl}}}},
            "position": {"x": x, "y": y, "width": w, "height": h}}

def create(display, datasets, widgets):
    serialized = {"datasets": datasets, "pages": [{"name": "overview", "displayName": "Overview", "layout": widgets}]}
    r = api("POST", "/api/2.0/lakeview/dashboards",
            {"display_name": display, "warehouse_id": WH, "serialized_dashboard": json.dumps(serialized)})
    did = r["dashboard_id"]
    api("POST", f"/api/2.0/lakeview/dashboards/{did}/published", {"warehouse_id": WH})
    try:
        api("PATCH", f"/api/2.0/permissions/dashboards/{did}",
            {"access_control_list": [{"service_principal_name": SP, "permission_level": "CAN_READ"}]})
        grant = "CAN_READ ok"
    except Exception:
        grant = "grant FAILED"
    print(f"  {display} -> {did} (published; {grant})")
    return did

# 1. Financial Health
fh = create("Northstar Financial Health",
    [ds("kpi","KPIs", f"SELECT sum(operating_revenue) total_rev, sum(operating_expense) total_exp, round((sum(operating_revenue)-sum(operating_expense))/sum(operating_revenue)*100,1) margin_pct, max_by(days_cash_on_hand, month) days_cash FROM {G}.fin_institution_monthly"),
     ds("monthly","Monthly", f"SELECT month, net_contribution FROM {G}.fin_institution_monthly ORDER BY month"),
     ds("revmix","Revenue mix", f"SELECT category, amount_usd FROM {G}.fin_revenue_mix"),
     ds("cash","Days cash", f"SELECT month, days_cash_on_hand FROM {G}.fin_institution_monthly ORDER BY month")],
    [counter("c1","kpi","total_rev","`total_rev`","Operating revenue (24mo)",0),
     counter("c2","kpi","total_exp","`total_exp`","Operating expense (24mo)",3),
     counter("c3","kpi","margin_pct","`margin_pct`","Net operating margin %",6),
     counter("c4","kpi","days_cash","`days_cash`","Days cash on hand",9),
     line("w1","monthly","month","`month`","net","SUM(`net_contribution`)","Month","Net contribution",0,3),
     pie("w2","revmix","amt","SUM(`amount_usd`)","category","`category`","Amount","Category",6,3),
     line("w3","cash","month","`month`","dch","SUM(`days_cash_on_hand`)","Month","Days cash",0,9,12,5)])

# 2. Research Finance
rf = create("Northstar Research Finance",
    [ds("kpi","KPIs", f"SELECT sum(direct_cost_usd) total_direct, sum(fa_recovered_usd) total_fa, sum(CASE WHEN risk_level='At Risk' THEN 1 ELSE 0 END) at_risk, round(avg(fa_rate),3) avg_fa FROM {G}.fin_research_awards"),
     ds("bycollege","F&A by college", f"SELECT college, fa_recovered_usd FROM {G}.fin_research_awards"),
     ds("bysponsor","Cost by sponsor", f"SELECT sponsor, direct_cost_usd FROM {G}.fin_research_awards"),
     ds("bystatus","Awards by status", f"SELECT status FROM {G}.fin_research_awards")],
    [counter("c1","kpi","total_direct","`total_direct`","Direct cost",0),
     counter("c2","kpi","total_fa","`total_fa`","F&A recovered",3),
     counter("c3","kpi","at_risk","`at_risk`","Awards at risk",6),
     counter("c4","kpi","avg_fa","`avg_fa`","Avg F&A rate",9),
     bar("w1","bycollege","college","`college`","fa","SUM(`fa_recovered_usd`)","College","F&A recovered",0,3),
     bar("w2","bysponsor","sponsor","`sponsor`","dc","SUM(`direct_cost_usd`)","Sponsor","Direct cost",6,3),
     pie("w3","bystatus","cnt","COUNT(`status`)","status","`status`","Awards","Status",0,9,12,5)])

# 3. Enrollment Finance
ef = create("Northstar Enrollment Finance",
    [ds("kpi","KPIs", f"SELECT sum(net_tuition) net_tuition, sum(tuition_charged) gross_tuition, sum(aid_awarded) total_aid, round(sum(aid_awarded)/sum(tuition_charged)*100,1) discount_rate FROM {G}.finance_accounts"),
     ds("netcollege","Net tuition by college", f"SELECT college, net_tuition FROM {G}.finance_accounts"),
     ds("funnel","Funnel", f"SELECT college, 'Applied' stage, applied AS value FROM {G}.fin_enrollment_funnel UNION ALL SELECT college,'Admitted',admitted FROM {G}.fin_enrollment_funnel UNION ALL SELECT college,'Enrolled',enrolled FROM {G}.fin_enrollment_funnel"),
     ds("aidpct","Aid % by college", f"SELECT college, round(sum(aid_awarded)/sum(tuition_charged)*100,1) aid_pct FROM {G}.finance_accounts GROUP BY college")],
    [counter("c1","kpi","net_tuition","`net_tuition`","Net tuition revenue",0),
     counter("c2","kpi","gross_tuition","`gross_tuition`","Gross tuition",3),
     counter("c3","kpi","total_aid","`total_aid`","Total aid awarded",6),
     counter("c4","kpi","discount_rate","`discount_rate`","Tuition discount %",9),
     bar("w1","netcollege","college","`college`","net","SUM(`net_tuition`)","College","Net tuition",0,3),
     bar("w2","funnel","college","`college`","val","SUM(`value`)","College","Students",6,3,color=("stage","`stage`","Stage")),
     bar("w3","aidpct","college","`college`","aid","SUM(`aid_pct`)","College","Aid % of tuition",0,9,12,5)])

print("\nDASH_FINANCIAL_HEALTH=" + fh)
print("DASH_RESEARCH_FINANCE=" + rf)
print("DASH_ENROLLMENT_FINANCE=" + ef)
