// Shared agent definition: prompt, tool specs, output schema and helpers. Used by the server (lib/runner.mjs) and inlined into the page.
// Keep this file dependency-free; build/build.py inlines it into the page with `export` stripped.

export const TOOL_DEFS = {
  check_composio_directory: {
    description: "Look up an app in Composio's managed-auth directory (387 OAuth toolkits, captured 2026-10-29). Returns whether Composio offers a managed OAuth app (developer can start without registering) or the developer must bring their own, plus close name matches.",
    inputSchema: { type: "object", properties: { name: { type: "string", description: "App or product name, e.g. 'Google Calendar'" } }, required: ["name"] }
  },
  get_library_guide: {
    description: "Return a condensed, human-verified guide from our library (slugs: gmail, outlook, notion, slack, github, zoom, salesforce, linkedin, twitter, shopify, xero, docusign). Use it when the target app shares a provider platform (e.g. Google Calendar -> gmail, Microsoft Teams -> outlook, Instagram -> none) or to calibrate difficulty against a known app.",
    inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] }
  },
  web_search: {
    description: "Search the web. Returns result titles, URLs and snippets. Use queries like '<app> OAuth app developer register', '<app> app review marketplace requirements', '<app> oauth scopes'.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
  },
  read_url: {
    description: "Open a URL and return its visible text (truncated). Use for the provider's official developer docs: OAuth guide, app registration, app review / marketplace / verification policy pages.",
    inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }
  },
  probe_authorize_endpoint: {
    description: "Live setup attempt without an account: requests the provider's OAuth authorize URL with a deliberately invalid client_id and redirect_uri https://example.com/callback, and returns what the provider shows (e.g. 'invalid_client'). Confirms the endpoint exists and the exact error a developer sees. Pass the bare authorize URL; query params are added for you.",
    inputSchema: { type: "object", properties: { authorize_url: { type: "string" }, scope: { type: "string", description: "optional scope string to include" } }, required: ["authorize_url"] }
  }
};

export const GUIDE_SHAPE = `{
 "slug": "lowercase-id", "name": "App (which API)", "provider": "Company", "website": "https://developer-portal-url",
 "category": "e.g. CRM", "oauth_supported": "yes|no|partial",
 "auth_alternatives": "only if OAuth is missing/limited: API keys, PATs, etc.",
 "verdict": "1-2 sentences a developer can act on",
 "difficulty": {"score": 1, "label": "Instant|Easy|Moderate|Hard|Gated", "rationale": "..."},
 "timeline": {"first_token": {"estimate": "15–30 min", "note": "..."},
              "production": {"estimate": "range", "active_effort": "range", "waiting": "range", "note": "what drives the wait"}},
 "cost": "Free | paid tier needed | assessment fee ...",
 "paths": [{"name": "e.g. Private / own workspace", "who_for": "...", "review": "none|...", "limits": "..."}],
 "prerequisites": [{"item": "...", "owner": "human|agent", "note": "..."}],
 "steps": [{"phase": "Prepare|Register|Configure|Test|Review|Launch", "title": "...", "detail": "exact console names/menus/fields",
            "owner": "agent|human|both", "time": "10 min", "wait": "optional", "url": "https://..."}],
 "review": {"required": "never|conditional|always", "trigger": "...", "process": "...", "typical_wait": "...",
            "reviewers_check": ["..."], "common_rejections": ["..."]},
 "pre_approval_limits": ["..."],
 "oauth": {"authorize_url": "...", "token_url": "...", "pkce": "...", "refresh_tokens": "...", "access_token_lifetime": "...",
           "redirect_uri_rules": "...", "scopes": "...", "tenant_notes": "..."},
 "gotchas": [{"title": "...", "detail": "...", "severity": "high|medium|low", "evidence": ["e1"]}],
 "blockers": [{"symptom": "...", "cause": "...", "fix": "..."}],
 "agent_vs_human": {"agent_can": ["..."], "human_must": ["..."]},
 "evidence": [{"id": "e1", "claim": "...", "source": "https://url-you-actually-read-or-empty", "type": "official_docs|tested|community|inferred",
               "status": "verified|reported|uncertain", "note": "what you saw (<=15 word quote)"}],
 "probes": [{"what": "...", "result": "...", "outcome": "confirmed|partial|failed|skipped"}],
 "uncertain": ["..."],
 "confidence": "high|medium|low"
}`;

export const RUBRIC = `Difficulty (score/label):
1 Instant  - self-serve; any user can authorize right away; no review ever.
2 Easy     - self-serve; review only for optional marketplace listing.
3 Moderate - verification or review needed for production but predictable (days to ~2 weeks).
4 Hard     - security assessment, multi-week review, business verification, or hard user caps until approved.
5 Gated    - partner program, sales contact, or paid tier required just to get access to the useful APIs.
Score the path an AI-agent developer most likely needs (multi-tenant, public, scopes that read user data). If paths differ a lot, say so in rationale.`;

export function buildPrompt(input, ctx = {}) {
  const { mode = "browser", today = new Date().toISOString().slice(0, 10), existing = null } = ctx;
  const toolsLine = mode === "knowledge"
    ? "You have NO web access in this run (only the directory + library tools). Use your own knowledge, mark every claim type=inferred, status=uncertain unless it comes from a library guide, set confidence to low or medium, and say plainly in `uncertain` that nothing was checked against live sources."
    : "You can search the web, read pages and probe the authorize endpoint. Base claims on the provider's CURRENT official docs; label community-sourced numbers type=community. Only cite URLs you actually opened.";
  return `You are an integrations expert agent. A developer building an AI agent wants their end users to connect "${input}" via OAuth. Investigate what it takes to create THEIR OWN OAuth app with this provider and get it approved for production, then produce a guide.

Today is ${today}. ${toolsLine}

Work plan (be economical: at most ~6 tool rounds; call several tools in the same round when you can):
1. Resolve the input to a specific product + provider. If ambiguous (e.g. "Teams"), pick the most likely and note the ambiguity in "uncertain". If the input is a website, identify the product behind it.
2. check_composio_directory for the app. If the provider shares a platform with a library guide (Google, Microsoft, Atlassian, Meta...), call get_library_guide for it.
3. Find and read the official OAuth / app registration docs and the review / verification / marketplace policy.
4. probe_authorize_endpoint once you know the authorize URL (if the tool is available).
5. Write the guide.

What developers need most, in order: (a) how hard and how long, split into time to first working token vs time until any outside user can connect at production scale (active work vs waiting on the provider); (b) what triggers review and what reviewers check; (c) caps and limits before approval (test-user caps, tenant/connection caps, token expiry in test mode); (d) nuances that break agents (refresh-token behaviour, rate limits for unlisted apps, admin consent, data/AI-training restrictions, per-tenant base URLs); (e) a step plan saying which steps an agent can do (research, drafting privacy policy/scope justifications/demo script, generating config and code, verifying redirect URIs) and which a human must do (sign in/2FA, accept terms, verify domain, pay, submit business documents, record demo video, press submit).

If the app has no third-party OAuth at all, set oauth_supported "no", explain the alternative auth in auth_alternatives, keep steps short, and score difficulty for the alternative. If the input is not a real app, return {"error": "not_found", "message": "...", "suggestions": ["..."]}.

${RUBRIC}

Honesty rules: ranges not false precision; never invent URLs; anything you could not confirm goes in "uncertain" with status "uncertain"; evidence ids referenced from gotchas must exist.
${existing ? `\nAn existing guide is provided for re-checking. Verify its riskiest claims, correct anything stale, and keep what holds:\n${JSON.stringify(existing).slice(0, 30000)}\n` : ""}
Reply with ONLY one JSON object in exactly this shape (no prose before or after):
${GUIDE_SHAPE}`;
}

const LIB_KEYS = ["slug", "name", "verdict", "difficulty", "timeline", "cost", "paths", "review", "pre_approval_limits", "oauth", "gotchas", "uncertain"];
export function condenseGuide(g) {
  if (!g) return null;
  const o = {};
  for (const k of LIB_KEYS) if (g[k] !== undefined) o[k] = g[k];
  o.steps = (g.steps || []).map(s => ({ phase: s.phase, title: s.title, owner: s.owner, time: s.time, wait: s.wait }));
  return o;
}

export function checkComposio(dir, name) {
  const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const q = norm(name);
  const all = [...dir.managed.map(n => ({ n, managed: true })), ...dir.byo.map(n => ({ n, managed: false }))];
  const exact = all.filter(x => norm(x.n) === q);
  const close = all.filter(x => !exact.includes(x) && (norm(x.n).includes(q) || (q.includes(norm(x.n)) && norm(x.n).length > 3))).slice(0, 8);
  return {
    source: dir.source, captured: dir.captured,
    exact: exact.map(x => ({ name: x.n, composio: x.managed ? "managed OAuth available" : "bring your own OAuth app" })),
    close_matches: close.map(x => ({ name: x.n, composio: x.managed ? "managed OAuth available" : "bring your own OAuth app" })),
    note: exact.length || close.length ? "" : "Not in Composio's OAuth directory: either no OAuth toolkit exists there or the app uses API keys/other auth."
  };
}

export function probeUrl(authorizeUrl, scope) {
  const u = new URL(authorizeUrl.replace(/\{[^}]+\}/g, "common"));
  u.searchParams.set("client_id", "probe_invalid_client_00000000");
  u.searchParams.set("redirect_uri", "https://example.com/callback");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", "probe");
  if (scope) u.searchParams.set("scope", scope);
  return u.toString();
}

// Make a model-produced guide safe to render: fill defaults, coerce types, clamp score.
export function normalizeGuide(g, meta = {}) {
  if (!g || typeof g !== "object") throw new Error("Agent returned no guide");
  if (g.error) return g;
  const arr = v => Array.isArray(v) ? v : (v ? [v] : []);
  const str = v => (v == null ? "" : typeof v === "string" ? v : JSON.stringify(v));
  const labels = ["", "Instant", "Easy", "Moderate", "Hard", "Gated"];
  const d = g.difficulty || {};
  let score = Math.round(Number(d.score)); if (!(score >= 1 && score <= 5)) score = 3;
  const out = {
    ...g,
    slug: str(g.slug || g.name || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: str(g.name || "Unknown app"), provider: str(g.provider), website: str(g.website), category: str(g.category),
    verdict: str(g.verdict),
    difficulty: { score, label: labels[score], rationale: str(d.rationale) },
    timeline: {
      first_token: { estimate: str(g.timeline?.first_token?.estimate || "unknown"), note: str(g.timeline?.first_token?.note) },
      production: { estimate: str(g.timeline?.production?.estimate || "unknown"), active_effort: str(g.timeline?.production?.active_effort), waiting: str(g.timeline?.production?.waiting), note: str(g.timeline?.production?.note) }
    },
    cost: str(g.cost),
    paths: arr(g.paths), prerequisites: arr(g.prerequisites), steps: arr(g.steps),
    review: g.review && typeof g.review === "object" ? { ...g.review, reviewers_check: arr(g.review.reviewers_check), common_rejections: arr(g.review.common_rejections) } : { required: "unknown" },
    pre_approval_limits: arr(g.pre_approval_limits).map(str), oauth: g.oauth || {},
    gotchas: arr(g.gotchas), blockers: arr(g.blockers),
    agent_vs_human: { agent_can: arr(g.agent_vs_human?.agent_can).map(str), human_must: arr(g.agent_vs_human?.human_must).map(str) },
    evidence: arr(g.evidence), probes: arr(g.probes), uncertain: arr(g.uncertain).map(str),
    confidence: ["high", "medium", "low"].includes(g.confidence) ? g.confidence : "medium",
    generated: { at: new Date().toISOString(), ...meta },
    last_checked: new Date().toISOString().slice(0, 10)
  };
  return out;
}
