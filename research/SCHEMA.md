# Guide JSON schema (one file per app: data/guides/<slug>.json)

Purpose: tell a developer building an AI agent exactly what it takes to get THEIR OWN OAuth app
(client_id/secret registered with the provider) ready so their end users can connect the app.
Two clocks matter: (1) time to a working token in development, (2) time until ANY user (outside your own
account/org) can connect at production scale — including review/approval waiting.

```json
{
  "slug": "gmail",                       // lowercase, matches Composio slug lowercased
  "name": "Gmail (Google Workspace APIs)",
  "provider": "Google",
  "website": "https://...",
  "category": "Email",
  "composio_managed": true,              // from Composio managed-auth directory (given to you)
  "verdict": "One sentence a developer can act on.",
  "difficulty": { "score": 1-5, "label": "Instant|Easy|Moderate|Hard|Gated", "rationale": "..." },
     // 1 Instant: self-serve, no review for any user. 2 Easy: self-serve, light/optional review.
     // 3 Moderate: review or verification needed for production but predictable (days).
     // 4 Hard: security assessment / multi-week review / business verification.
     // 5 Gated: partner program, sales contact, or paid tier required just to get access.
  "timeline": {
    "first_token":  { "estimate": "15–30 min", "note": "..." },
    "production":   { "estimate": "4–8+ weeks", "active_effort": "2–5 days", "waiting": "3–6 weeks", "note": "what drives it" }
  },
  "cost": "Free | paid plan required ($...) | assessment fee $...",
  "paths": [  // distribution modes that change requirements; 1–3 entries
    { "name": "Private / single workspace", "who_for": "...", "review": "none", "limits": "..." },
    { "name": "Public multi-tenant", "who_for": "...", "review": "...", "limits": "..." }
  ],
  "prerequisites": [ { "item": "...", "owner": "human|agent", "note": "..." } ],
  "steps": [
    { "phase": "Prepare|Register|Configure|Test|Review|Launch", "title": "...", "detail": "concrete, with exact console names/menus/fields",
      "owner": "agent|human|both", "time": "10 min", "wait": "optional wait e.g. 'Google review 3–5 business days'", "url": "https://..." }
  ],
  "review": {
    "required": "never|conditional|always",
    "trigger": "what makes review required (e.g. restricted scopes, >100 users, public listing)",
    "process": "...", "typical_wait": "...",
    "reviewers_check": ["..."], "common_rejections": ["..."]
  },
  "pre_approval_limits": ["e.g. Max 100 test users; refresh tokens expire after 7 days in Testing"],
  "oauth": {
    "authorize_url": "...", "token_url": "...", "pkce": "required|supported|not supported|unknown",
    "refresh_tokens": "...", "access_token_lifetime": "...",
    "redirect_uri_rules": "https only? localhost? exact match? wildcards? max count?",
    "scopes": "how scopes work, sensitive tiers, granular perms",
    "tenant_notes": "multi-tenant, per-instance base URLs, admin consent, etc."
  },
  "gotchas": [ { "title": "...", "detail": "...", "severity": "high|medium|low", "evidence": ["e1"] } ],
  "blockers": [ { "symptom": "error or situation the dev hits", "cause": "...", "fix": "what to do / who to contact" } ],
  "agent_vs_human": {
    "agent_can": ["research scopes", "draft privacy policy", "draft scope justification text", "generate config", "verify redirect URIs", "write demo video script", ...],
    "human_must": ["sign in / 2FA", "accept developer terms", "verify domain ownership", "pay", "submit business documents", "record demo video", "click submit"]
  },
  "evidence": [
    { "id": "e1", "claim": "short factual claim", "source": "https://exact-doc-url", "type": "official_docs|tested|community|inferred",
      "status": "verified|reported|uncertain", "note": "quote <=15 words or what you saw" }
  ],
  "uncertain": ["things you could NOT confirm, contradictory sources, things that vary case by case"],
  "last_checked": "2026-10-29"
}
```

Rules
- Today is 2026-10-29. Provider policies change: prefer the provider's CURRENT official docs; note dates.
- Every non-obvious claim in gotchas/review/timeline/limits must reference an evidence id with a real URL you actually opened.
- Timelines are ranges; say what drives the wait. Never invent precise numbers; if community-reported, mark type=community.
- Mark anything you could not confirm as status "uncertain" and list it in `uncertain`. Being honest beats being complete.
- Write for a developer under time pressure: concrete console names, menu paths, field names, exact error strings.
