// OAuth Clearance server: serves the guide library and runs the live guide-generation agent.
// Zero dependencies (Node 18+). Configuration is via environment variables only (see README / .env.example).
import http from "node:http";
import crypto from "node:crypto";
import { readFile, writeFile, mkdir, readdir, stat, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeGuide, checkComposio } from "./lib/agent.mjs";
import { runAgent, llmConfigFromEnv } from "./lib/runner.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const env = process.env;
const PORT = Number(env.PORT || 3000);
const MOCK = env.MOCK === "1";
const CFG = llmConfigFromEnv(env);
const TRUST_PROXY = env.TRUST_PROXY === "1";             // set on Render/Railway/Fly (behind their proxy)
const LIMIT_IP_HOUR = Number(env.GEN_PER_HOUR || 10);    // per client IP
const LIMIT_DAY = Number(env.GEN_PER_DAY || 150);        // whole server: protects API spend
const MAX_CONCURRENT = Number(env.GEN_CONCURRENCY || 3);
const MAX_STORED = 500;
const GEN_DIR = join(ROOT, "data", "generated");

const directory = JSON.parse(await readFile(join(ROOT, "data", "composio_directory.json"), "utf8"));
const library = {};
for (const f of await readdir(join(ROOT, "data", "guides"))) if (f.endsWith(".json")) { const g = JSON.parse(await readFile(join(ROOT, "data", "guides", f), "utf8")); library[g.slug] = g; }
await mkdir(GEN_DIR, { recursive: true });

// Page + strict Content-Security-Policy built from hashes of the page's own inline scripts.
const PAGE = await readFile(join(ROOT, "public", "index.html"), "utf8");
const scriptHashes = [...PAGE.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => `'sha256-${crypto.createHash("sha256").update(m[1]).digest("base64")}'`);
const CSP = [
  "default-src 'none'", `script-src ${scriptHashes.join(" ")}`, "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com", "img-src 'self' data:", "connect-src 'self'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
].join("; ");
const SEC_HEADERS = {
  "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()", "cross-origin-opener-policy": "same-origin",
  ...(TRUST_PROXY ? { "strict-transport-security": "max-age=31536000; includeSubDomains" } : {}),
};

// ---- abuse limits
const ipHits = new Map(); let dayCount = 0, dayStart = Date.now(), running = 0;
function clientIp(req) {
  if (TRUST_PROXY && req.headers["x-forwarded-for"]) { const parts = String(req.headers["x-forwarded-for"]).split(",").map(s => s.trim()).filter(Boolean); return parts[parts.length - 1]; }
  return req.socket.remoteAddress || "unknown";
}
function checkLimits(ip) {
  const now = Date.now();
  if (now - dayStart > 864e5) { dayStart = now; dayCount = 0; ipHits.clear(); }
  if (dayCount >= LIMIT_DAY) return "This demo has reached its daily generation limit. Try again tomorrow, or browse the library.";
  if (running >= MAX_CONCURRENT) return "The agent is busy with other requests. Try again in a minute.";
  const list = (ipHits.get(ip) || []).filter(t => now - t < 36e5);
  if (list.length >= LIMIT_IP_HOUR) return "You've generated the maximum number of guides for this hour. Try again later.";
  list.push(now); ipHits.set(ip, list); dayCount++; return null;
}

const cleanInput = s => String(s ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim();
const newId = slug => `${String(slug || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "app"}-${crypto.randomBytes(4).toString("hex")}`;
async function storeGuide(id, guide) {
  await writeFile(join(GEN_DIR, `${id}.json`), JSON.stringify(guide));
  const files = (await readdir(GEN_DIR)).filter(f => f.endsWith(".json"));
  if (files.length > MAX_STORED) {
    const withTime = await Promise.all(files.map(async f => ({ f, t: (await stat(join(GEN_DIR, f))).mtimeMs })));
    for (const { f } of withTime.sort((a, b) => a.t - b.t).slice(0, files.length - MAX_STORED)) await unlink(join(GEN_DIR, f)).catch(() => {});
  }
}
function mockGuide(input) {
  const g = JSON.parse(JSON.stringify(library.notion));
  return { ...g, slug: input.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: `${input} (MOCK — demo data)`, verdict: "MOCK MODE: this is the Notion guide relabeled to test the pipeline. Set an API key for real research.", confidence: "low" };
}

const send = (res, code, body, type = "application/json; charset=utf-8", extra = {}) => { res.writeHead(code, { "content-type": type, "cache-control": "no-store", ...SEC_HEADERS, ...extra }); res.end(typeof body === "string" ? body : JSON.stringify(body)); };
const readBody = (req, limit) => new Promise((ok, bad) => {
  let d = "", n = 0;
  req.on("data", c => { n += c.length; if (n > limit) { bad(Object.assign(new Error("Request too large"), { code: 413 })); req.destroy(); } else d += c; });
  req.on("end", () => { try { ok(JSON.parse(d || "{}")); } catch { bad(Object.assign(new Error("Invalid JSON"), { code: 400 })); } });
  req.on("error", bad);
});

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if ((req.method === "GET" || req.method === "HEAD") && (url.pathname === "/" || url.pathname === "/index.html"))
      return send(res, 200, PAGE, "text/html; charset=utf-8", { "content-security-policy": CSP, "cache-control": "no-cache" });
    if (req.method === "GET" && url.pathname === "/api/health") return send(res, 200, { ok: true, live: !!(CFG?.key) || MOCK });
    if (req.method === "GET" && url.pathname === "/api/guides") {
      const out = {};
      for (const f of (await readdir(GEN_DIR)).filter(f => /^[a-z0-9-]{3,80}\.json$/.test(f))) { try { out[f.slice(0, -5)] = JSON.parse(await readFile(join(GEN_DIR, f), "utf8")); } catch {} }
      return send(res, 200, out);
    }
    if (req.method === "POST" && url.pathname === "/api/generate") {
      if (!String(req.headers["content-type"] || "").startsWith("application/json")) return send(res, 415, "Expected JSON.", "text/plain; charset=utf-8");
      const body = await readBody(req, 64 * 1024);
      const input = cleanInput(body.input);
      if (input.length < 2 || input.length > 120) return send(res, 400, "Enter an app name or website (2–120 characters).", "text/plain; charset=utf-8");
      const existing = body.existing && typeof body.existing === "object" && JSON.stringify(body.existing).length < 40000 ? body.existing : null;
      if (!CFG?.key && !MOCK) return send(res, 503, "Live generation is not configured on this server.", "text/plain; charset=utf-8");
      const limited = checkLimits(clientIp(req));
      if (limited) return send(res, 429, limited, "text/plain; charset=utf-8");
      running++;
      res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", connection: "keep-alive", ...SEC_HEADERS });
      const ctl = new AbortController(); res.on("close", () => { if (!res.writableFinished) ctl.abort(); });
      const emit = ev => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(ev)}\n\n`); };
      const ping = setInterval(() => emit({ type: "ping" }), 15000);
      const hardStop = setTimeout(() => ctl.abort(), 6 * 60 * 1000);
      try {
        let raw;
        if (MOCK) { for (const m of ["check_composio_directory → " + input, "Search → " + input + " OAuth app", "Read → developer docs", "Probe → authorize endpoint"]) { emit({ type: "log", kind: "tool", message: m }); await new Promise(r => setTimeout(r, 400)); } raw = mockGuide(input); }
        else raw = await runAgent({ input, existing, send: emit, signal: ctl.signal, cfg: CFG, directory, library, env });
        const guide = normalizeGuide(raw, { mode: MOCK ? "mock" : "server" });
        let id = null;
        if (!guide.error) {
          guide.query = input;
          if (/^[a-z0-9_]{1,60}$/.test(String(body.catalogSlug || ""))) guide.catalog_slug = body.catalogSlug;
          const hit = checkComposio(directory, guide.name.replace(/\s*\(.*\)$/, "")).exact[0] || checkComposio(directory, input).exact[0];
          guide.composio_managed = hit ? /managed/.test(hit.composio) : undefined;
          id = newId(guide.slug); await storeGuide(id, guide);
        }
        emit({ type: "guide", id, guide });
      } catch (e) {
        console.error(`[generate] ${input}:`, e.status || "", String(e.message || e), e.body ? String(e.body).slice(0, 300) : "");
        const msg = ctl.signal.aborted ? "The run was stopped." : e.status === 429 ? "The AI service is over its quota right now. Try again in a few minutes."
          : e.status >= 500 ? "The AI service is temporarily unavailable. Try again shortly." : /valid JSON/.test(e.message) ? "The agent's answer couldn't be read. Try again; an exact product name helps." : "Something went wrong while generating this guide. Try again.";
        emit({ type: "error", message: msg });
      } finally { running--; clearInterval(ping); clearTimeout(hardStop); res.end(); }
      return;
    }
    send(res, 404, { error: "Not found" });
  } catch (e) {
    if (!res.headersSent) send(res, e.code === 413 ? 413 : e.code === 400 ? 400 : 500, { error: e.code ? e.message : "Server error" });
    if (!e.code) console.error("[server]", e);
  }
}).listen(PORT, () => console.log(`OAuth Clearance on http://localhost:${PORT} (${CFG?.key ? `live generation: ${CFG.provider}` : MOCK ? "MOCK mode" : "library only: no API key set"})`));
