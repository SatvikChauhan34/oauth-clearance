# OAuth Clearance

Guides for developers building AI agents. Each one says what it takes to create your own OAuth app with a provider and get it approved: how hard it is, how long it takes (including the wait for review), what can block you, and which steps an agent can do for you.

The project has three parts:

- **Library:** 12 researched, fact-checked guides.
- **Catalog:** 100 apps, seeded from Composio's managed-auth directory.
- **Live generation:** an agent that researches any app and writes a guide in the same format.

## Run it

```bash
npm start                              # library + catalog at http://localhost:3000
GEMINI_API_KEY=... npm start          # + live generation (or OPENAI_API_KEY=...)
MOCK=1 npm start                       # offline demo of the generation flow (returns sample data)
npm test                               # offline tests of the agent loop
```

- **Requirements:** Node 18+ and nothing to install. Python 3 is used only by `npm run build`, which rebuilds `public/index.html` after you edit `data/` or `build/template.html`.
- **Optional settings:**
  - `MODEL` overrides the model.
  - `LLM_PROVIDER` is `gemini` or `openai`. If unset, it's picked from whichever key is present.
  - `BRAVE_API_KEY` (optional) switches web search from the keyless default to the Brave Search API, which is more reliable from cloud servers.
  - See `.env.example` for every setting.
  - `GEN_PER_HOUR` / `GEN_PER_DAY` / `GEN_CONCURRENCY` cap generations per visitor, per day and at once (defaults 10 / 150 / 3).
  - `PORT` sets the port.
- **Static use:** `public/index.html` also works as a static page (library and catalog only).
- **Secrets:** no credentials are stored in the repo.

### Deploy (free tier)

**Render:**

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint** and select the repo. `render.yaml` holds the settings.
3. Paste `GEMINI_API_KEY` in the dashboard (it is marked secret and never stored in the repo). `TRUST_PROXY=1` and the limits are preset.

**Railway or Fly:** the start command is `node server.mjs` and the health check is `/api/health`.

### Saved data

Onboarding answers (`setups.json`) and generated guides (`generated/`) are saved in `DATA_DIR` (default `data/runtime/`).

- **Read the answers:** set `ADMIN_TOKEN`, then
  ```bash
  curl -H "Authorization: Bearer $ADMIN_TOKEN" https://<your-app>/api/admin/setups              # summary counts + rows
  curl -H "Authorization: Bearer $ADMIN_TOKEN" "https://<your-app>/api/admin/setups?format=csv" -o setups.csv
  ```
  Without the token the endpoint returns 404.
- **Keep it across restarts:** Render's free plan has no persistent disk, so saved data resets on every redeploy or restart. For lasting data, use the Starter plan with the disk block in `render.yaml` (mounted at `/var/data`).

## What I learned about the problem

- **What a provider OAuth app is.** It's the registration a developer creates once: client ID and secret, redirect URIs, scopes, and consent-screen branding.
  - Each end user who approves through that app becomes a **connection**.
  - The provider decides who can pass through the app and when: test-user caps, verification, security assessments, marketplace review, partner programs.
- **Where developers have a fallback.** Composio's managed-auth directory lists **125 toolkits** where Composio supplies the app and **262** where developers must bring their own. It was captured 2026-10-29 and is stored in `data/composio_directory.json`.
  - A managed app lets you build today.
  - You still need your own app for white-label consent, custom scopes or your own quota.
- **Where the pain is greatest.**
  - Bring-your-own apps, where there is no fallback.
  - Managed apps with long production paths, such as Gmail's restricted scopes or Slack's Marketplace terms, where developers get surprised late.
- **The question docs don't answer:** "an hour or eight weeks?" Both are often true for the same app. Gmail takes 15 minutes to a first token, and 4–8+ weeks to production with read scopes.

## Key product decisions

1. **Two clocks.** Every guide separates time to a first working token from time until real users can connect. The second is split into your own work and waiting on the provider.
2. **Paths before steps.** Requirements change with who connects: your own workspace, pilot customers, or the public. Each guide names the paths and what changes between them.
3. **Agent vs. you on every step.**
   - An agent can research scopes, draft privacy policies, scope justifications and demo scripts, generate config, and check redirect URIs.
   - A person must sign in, accept terms, pay, verify domains, upload business documents and press submit.
4. **One difficulty rubric.**
   - 1 Instant: no review, ever.
   - 2 Easy: optional listing review.
   - 3 Moderate: predictable verification, in days.
   - 4 Hard: security assessment, multi-week review or hard caps.
   - 5 Gated: partner program, sales or a paid tier just to get access.
5. **Evidence is part of the product.**
   - Every gotcha links to a source.
   - Each source is marked *verified*, *reported* or *uncertain*.
   - Live endpoint probes are shown.
   - Unconfirmed points are listed, not hidden.
6. **Generated guides look the same but say what they are.** Each carries a banner saying it was researched live and isn't human-reviewed, plus a confidence level.
7. **One-tap onboarding, no sign-in.** Three questions on the first visit, each answered with a single tap and auto-advancing, skippable at any point:
   - Your role (Product / Engineering / Operations / Sales / Founder / Other).
   - Who will connect (own team / pilot customers / public launch).
   - Whether the agent reads or only writes data.

   Each guide then highlights the matching path and opens with a short "For you" note: where to start for your role, which clock matters, and what to check about scopes. Answers are saved on the server anonymously, keyed by a random ID per browser (no name, email or IP); "Your setup" lets people change them. Sign-in was left out on purpose: it would block reviewers and shared guide links and add account security scope without helping the core problem.
8. **Scope: 12 deep guides across the difficulty range instead of 100 shallow ones.** The catalog of 100 apps makes every other app one click from a generated guide. 8 of the 12 are Composio-managed and 4 are bring-your-own.
   - Instant: GitHub.
   - Self-serve with caveats: Notion, LinkedIn basics, X.
   - Verification: Outlook, Salesforce.
   - Marketplace or security review: Slack, Zoom, Shopify, Gmail.
   - Paid or partner gates: Xero, DocuSign.

## How agents were used

| Stage | What ran | Output |
|---|---|---|
| Research | 4 research agents in parallel, 3 apps each. They read official docs first and labelled community-sourced numbers. | `data/guides/*.json` (schema: `research/SCHEMA.md`) |
| Verification | A separate fact-checking agent re-checked 39 high-impact claims against primary sources and corrected the guides. | `data/verification.json`, `VERIFICATION.md` |
| Setup attempts | Real browser requests to each provider's authorize endpoint with an invalid client_id. No accounts and no credentials were used. | `probes` in each guide |
| Live generation | One agent with tools: Composio directory lookup, library lookup, web search, page reading, endpoint probe. | A guide in the same schema, added to the library |

**What verification changed** (details in `VERIFICATION.md`):

- **Outlook:** since Microsoft notice MC1163922 (late 2025), mail-read permissions need admin consent by default, even from verified publishers. The guide had missed this.
- **Slack:** the Marketplace minimum is 10 active installs, not 5. The claimed 2026-03-03 date for existing installs isn't in Slack's own changelog, so the guide now marks it unconfirmed.
- **Salesforce:** security-review duration corrected to 3–9 weeks.
- **X:** the reply restriction is now backed by an official source.

**Assumptions the research overturned:**

- **Xero:** the 25-connection cap was replaced by paid tiers on 2 Mar 2026.
- **DocuSign:** the "20 API calls" go-live rule is gone.
- **GitHub:** OAuth Apps now allow up to 10 callback URLs.

## How live generation works

`server.mjs` streams progress to the page over server-sent events. The agent loop is in `lib/runner.mjs` and works with the Google Gemini API (default) or the OpenAI Responses API. If the preferred Gemini model is overloaded or out of quota on the first call, it falls back down a list of models. All tools run on the server:

- **`web_search`:** keyless DuckDuckGo results by default, or the Brave Search API if `BRAVE_API_KEY` is set.
- **`read_url`:** fetches a page and strips it to text.
- **`check_composio_directory`:** looks the app up in the stored directory.
- **`get_library_guide`:** returns a reviewed guide, for apps on the same platform or for calibration.
- **`probe_authorize_endpoint`:** requests the real authorize URL with an invalid client ID and records the provider's response.

The prompt, tool specs and output schema are in `lib/agent.mjs`. Model output is validated and normalised before it's rendered.

**Edge cases handled:**

- **Ambiguous names:** the agent notes the ambiguity under "uncertain".
- **Website URLs as input.**
- **Apps without OAuth:** `oauth_supported: "no"`, plus the alternative auth methods.
- **Non-existent apps:** an error with suggestions.
- **Apps sharing a platform with a library guide:** the agent pulls that guide for calibration.
- **Apps already in the library:** the reviewed guide opens.
- **Stale guides:** "Re-check with agent" re-verifies an existing guide.
- **Abuse:** each IP address has a per-hour generation limit.

## Repo layout

```
server.mjs                    HTTP server + generation endpoint (no dependencies)
lib/runner.mjs                agent loop (Gemini or OpenAI), tools
lib/netguard.mjs              SSRF-safe fetch used by every agent tool
lib/agent.mjs                 prompt, tool specs, schema, normalisation (also inlined into the page)
build/template.html           the page (HTML/CSS/JS); build/build.py inlines data + shared code
build/catalog.py              100-app catalog
data/guides/*.json            12 library guides
data/verification.json        fact-check log (readable version: VERIFICATION.md)
data/composio_directory.json  125 managed + 262 bring-your-own toolkits
public/index.html             built page
research/SCHEMA.md            guide schema + research rules
scripts/add_probes.py         records the endpoint probe results
test/agent-loop.test.mjs      offline tests (fake LLM API + fake websites)
```

## Security

See `SECURITY.md` for the full review. In short:

- **Keys:** read only from environment variables, never logged, never sent to the browser.
- **SSRF protection:** agent tools may only fetch public http(s) hosts on standard ports. Every redirect is re-checked, and responses are capped in size and time.
- **Untrusted content:** model output and fetched pages are always rendered escaped, and only http(s) links are shown.
- **Strict CSP:** a Content-Security-Policy that allows only hashed scripts, plus the usual hardening headers.
- **Only the server writes guides:** there is no public write endpoint.
- **Abuse limits:** generations are capped per visitor, per day and at once.

## Limitations

- **No apps were created or submitted.** Creating and submitting OAuth apps needs accounts, terms acceptance and sometimes payment, which belong to a human. Probes confirm endpoints and error messages, not approval outcomes.
- **Wait times are mostly community-reported.** Providers rarely publish SLAs, so waits are shown as ranges with the source type marked.
- **Policies change fast.** Five of the 12 providers changed materially in 2025–2026. Each guide shows its check date.
- **Some docs couldn't be read directly.** Xero's and DocuSign's docs only render with JavaScript. Parts of those guides come from official blogs and staff posts, marked as such.
- **Live path testing.** The agent loop is covered by offline tests (simulated APIs). The Gemini tool-calling protocol was also run against the real API with fixed tool results. Run one real generation after deploying to confirm search works from your host.
- **Free-tier quotas.** On a free Gemini key only some models have quota, so guides may come from a smaller, faster model and be less thorough.
- **Shopify wasn't probed.** Its authorize URL is per store and needs a development store.
