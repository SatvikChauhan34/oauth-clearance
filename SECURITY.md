# Security review

Scope: `server.mjs`, `lib/*`, the page (`build/template.html` → `public/index.html`) and deployment config. The review is threat-model driven: a public demo URL, anonymous visitors, an LLM agent that fetches web pages, and a paid API key on the server.

## Threats and mitigations

| # | Threat | Mitigation | Where |
|---|---|---|---|
| 1 | **API key leak.** The key ends up in the repo, the logs or the browser. | Read only from env vars. Never echoed, logged or sent to the client. `.env` is git-ignored; `.env.example` holds no values; `render.yaml` marks the key `sync: false`. Upstream API errors are logged server-side (status and body only) and the client gets a generic message. | `server.mjs`, `.gitignore` |
| 2 | **SSRF via agent tools.** The model, or a web page injecting instructions, makes the server fetch `169.254.169.254`, `localhost` or internal services. | `safeFetch`: http(s) only, ports 80/443, no credentials in URLs, DNS-resolved addresses must be public (IPv4 and IPv6 private, loopback, link-local, CGNAT and multicast ranges blocked), every redirect re-validated, max 5 redirects, 2 MB and 15 s caps. Tested in `npm test`. | `lib/netguard.mjs` |
| 3 | **Stored XSS.** Model output or fetched text contains HTML or JS that renders in visitors' browsers. | Every dynamic value goes through `esc()`. Links only render if they start with http(s). Ids are validated against `^[a-z0-9-]{3,80}$`. A strict CSP allows only the page's own hashed inline scripts, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'none'` and `form-action 'none'`. | `template.html`, `server.mjs` |
| 4 | **Library poisoning.** Anyone writes fake "guides" into the shared library. | There is no public write endpoint. Only the server stores guides, after a generation it ran itself. Storage is capped at 500 files, oldest removed first. | `server.mjs` |
| 5 | **Cost and abuse (denial of wallet).** Scripts burn the API quota or budget. | Per-IP hourly limit, global daily limit, concurrency cap, 6-minute hard stop per run, 16 agent turns max. Input limited to 120 characters with control characters stripped; request bodies capped at 64 KB; JSON content-type required. | `server.mjs`, `lib/runner.mjs` |
| 6 | **Rate-limit bypass via a spoofed `X-Forwarded-For`.** | The header is only trusted with `TRUST_PROXY=1`, and then only its last entry (the one the platform proxy appends) is used. | `server.mjs` |
| 7 | **Prompt injection from fetched pages.** | The agent's tools are read-only (search, read, probe, directory and library lookups). Fetched text is passed as tool output, not instructions. The only thing the agent can produce is a guide, which is normalised and rendered escaped (see 3). Generated guides carry an "AI-generated, not human-reviewed" banner. | `lib/runner.mjs`, `lib/agent.mjs` |
| 8 | **Clickjacking, MIME sniffing, referrer leaks.** | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, restrictive `Permissions-Policy`, `COOP: same-origin`, and HSTS behind TLS. | `server.mjs` |
| 9 | **Path traversal.** | Only fixed routes are served, with no static file handler. Generated-guide filenames are server-made (`slug-<8 hex>`) and filtered by regex when listed. | `server.mjs` |
| 10 | **Supply chain.** | Zero runtime dependencies (Node built-ins only). The only third-party resource is Google Fonts CSS and font files, allowed by the CSP. | `package.json` |
| 11 | **Visitor privacy.** | No accounts, cookies or analytics. Onboarding answers are stored server-side as three enum values (role, audience, access) per random browser ID: no name, email or IP. The dialog says so before anyone answers. Step checkmarks stay in the visitor's own `localStorage`. Searches go to the search engine from the server, not from the visitor's browser. | `server.mjs` |
| 12 | **Saved-answers endpoint abuse.** Junk or oversized data, or the export being read by others. | `POST /api/setup` accepts only a v4 UUID and whitelisted enum values (2 KB body), is rate-limited per IP, and caps total records. Writes are serialised and atomic. The export needs `ADMIN_TOKEN` (constant-time compare) and returns 404 otherwise. CSV cells are guarded against formula injection. | `server.mjs` |

## Residual risks and recommendations

- **DNS rebinding.** A hostile domain could resolve to a public address for the check and a private one for the fetch. That window is narrow, and the fetch never sends credentials. To close it fully, pin the connection to the checked IP (custom `http.Agent` lookup) or run behind an egress proxy that blocks private ranges.
- **Admin token.** Treat `ADMIN_TOKEN` like a password: keep it in the host's secret settings and rotate it if it's shared.
- **In-memory rate limits.** They reset when the server restarts and aren't shared across instances. That's fine for a single free instance. For more, put the limits in Redis or use the platform's rate limiting.
- **Keyless search.** DuckDuckGo may throttle cloud IPs. The agent then falls back to reading provider docs directly. Set `BRAVE_API_KEY` for reliability.
- **API key hygiene.** Use a key scoped only to the Generative Language API, set a budget alert or quota cap in Google Cloud, and **rotate the key** if it has ever been pasted into chats, tickets or screenshots.
- **Content accuracy.** Generated guides can be wrong. They're labelled, show their evidence and confidence, and the curated library is kept separate.

## How to verify

```bash
npm test                                   # includes SSRF, parser and agent-loop tests
curl -sI http://localhost:3000/ | grep -i -E "content-security|x-frame|nosniff|referrer"
curl -s -X POST localhost:3000/api/guides  # → 404 (no public write endpoint)
```
