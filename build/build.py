"""Build the page: inline guide data + shared agent code into build/template.html.
Output: public/index.html (served by server.mjs; also works as a static page with the library only)
Run: python3 build/build.py"""
import json, glob, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "build"))
from catalog import CATALOG

guides = {}
for f in sorted(glob.glob(os.path.join(ROOT, "data/guides/*.json"))):
    g = json.load(open(f)); guides[g["slug"]] = g
ALIASES = {"twitter": ["X", "x.com", "twitter.com", "X API"], "outlook": ["Microsoft Outlook", "Microsoft Graph mail", "Outlook mail", "Office 365 mail"],
           "gmail": ["Google Mail"], "docusign": ["Docusign eSignature"], "salesforce": ["Sales Cloud"], "github": ["GitHub App"]}
for k, v in ALIASES.items():
    if k in guides: guides[k]["aliases"] = v

# Two-clock chart values (minutes) transcribed from each guide's timeline (production = path an agent product needs).
CHART = {
 "github":    {"first": 15, "prod": [60, 480],        "label": "same day"},
 "notion":    {"first": 15, "prod": [60, 480],        "label": "same day"},
 "linkedin":  {"first": 30, "prod": [120, 480],       "label": "same day (basic)"},
 "twitter":   {"first": 30, "prod": [1440, 4320],     "label": "1–3 days"},
 "outlook":   {"first": 20, "prod": [10080, 20160],   "label": "1–2 wks"},
 "salesforce":{"first": 45, "prod": [10080, 20160],   "label": "1–2 wks + per org"},
 "zoom":      {"first": 20, "prod": [30240, 60480],   "label": "3–6+ wks"},
 "shopify":   {"first": 45, "prod": [30240, 80640],   "label": "3–8+ wks"},
 "gmail":     {"first": 20, "prod": [40320, 80640],   "label": "4–8+ wks"},
 "docusign":  {"first": 15, "prod": [30240, 129600],  "label": "weeks–months"},
 "slack":     {"first": 15, "prod": [60480, 141120],  "label": "6–14+ wks"},
 "xero":      {"first": 20, "prod": [43200, 172800],  "label": "1–4+ mo (>50 orgs)"},
}
# Which of each guide's `paths` fits the onboarding answer "who will connect?" -> [own, pilot, public] indexes.
PATH_MAP = {"docusign": [0, 2, 1], "github": [0, 0, 0], "gmail": [1, 1, 2], "linkedin": [0, 0, 0], "notion": [0, 1, 2], "outlook": [0, 2, 2],
            "salesforce": [0, 1, 1], "shopify": [0, 0, 1], "slack": [0, 1, 2], "twitter": [0, 0, 0], "xero": [0, 1, 2], "zoom": [0, 1, 2]}
data = {
  "pathMap": PATH_MAP,
  "guides": guides,
  "catalog": [{"name": n, "slug": s, "managed": m, "category": c} for n, s, m, c in CATALOG],
  "chart": CHART,
  "directory": json.load(open(os.path.join(ROOT, "data/composio_directory.json"))),
  "verification": json.load(open(os.path.join(ROOT, "data/verification.json"))),
}
agent = open(os.path.join(ROOT, "lib/agent.mjs")).read()
agent = re.sub(r"^export\s+", "", agent, flags=re.M)
tpl = open(os.path.join(ROOT, "build/template.html")).read()
blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
page = tpl.replace("__DATA__", blob).replace("__AGENT__", agent)
os.makedirs(os.path.join(ROOT, "public"), exist_ok=True)
head, rest = page.split("</style>", 1)
full = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="OAuth app setup and approval guides for developers building AI agents.">'
        + head + "</style></head><body>" + rest + "</body></html>")
open(os.path.join(ROOT, "public/index.html"), "w").write(full)
print(f"built: {len(guides)} guides, {len(data['catalog'])} catalog apps, page {len(page)//1024} KB")
