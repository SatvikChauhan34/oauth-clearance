// Guide-generation agent loop. Works with the Google Gemini API (default) or the OpenAI Responses API.
// All tools run on this server: web_search, read_url, probe_authorize_endpoint, check_composio_directory, get_library_guide.
import { TOOL_DEFS, buildPrompt, condenseGuide, checkComposio, probeUrl } from "./agent.mjs";
import { safeFetch } from "./netguard.mjs";

const MAX_TURNS = 16;
const UA = { "user-agent": "Mozilla/5.0 (compatible; OAuthClearance/1.0)", "accept-language": "en-US,en;q=0.9" };
const TOOL_NAMES = ["web_search", "read_url", "probe_authorize_endpoint", "check_composio_directory", "get_library_guide"];

export const htmlToText = html => String(html)
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<svg[\s\S]*?<\/svg>/gi, " ")
  .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x?27;|&#39;/g, "'")
  .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

// DuckDuckGo HTML results -> [{title, url, snippet}]
export function parseDuckDuckGo(html) {
  const out = [];
  const blocks = String(html).split(/<div[^>]+class="[^"]*\bresult\b[^"]*"/i).slice(1);
  for (const b of blocks) {
    const tag = b.match(/<a\b[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/i); if (!tag) continue;
    const href = (tag[0].match(/href="([^"]+)"/i) || [])[1] || "";
    let url = href.replace(/&amp;/g, "&");
    const uddg = url.match(/[?&]uddg=([^&]+)/); if (uddg) url = decodeURIComponent(uddg[1]);
    if (url.startsWith("//")) url = "https:" + url;
    if (!/^https?:\/\//.test(url) || /duckduckgo\.com\/y\.js/.test(url)) continue; // skip ads
    const sn = b.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(a|div|td)>/i);
    out.push({ title: htmlToText(tag[1]), url, snippet: sn ? htmlToText(sn[1]).slice(0, 300) : "" });
    if (out.length >= 8) break;
  }
  return out;
}

export function makeTools({ directory, library, fetchImpl = fetch, lookup, env = process.env }) {
  const net = { fetchImpl, headers: UA, ...(lookup ? { lookup } : {}) };
  return {
    web_search: async ({ query }) => {
      const q = String(query || "").slice(0, 300); if (!q) throw new Error("Empty query");
      if (env.BRAVE_API_KEY) {
        const r = await fetchImpl("https://api.search.brave.com/res/v1/web/search?count=8&q=" + encodeURIComponent(q), { headers: { accept: "application/json", "x-subscription-token": env.BRAVE_API_KEY }, signal: AbortSignal.timeout(12000) });
        if (!r.ok) throw new Error(`Search failed (${r.status})`);
        const j = await r.json();
        return { query: q, results: (j.web?.results || []).slice(0, 8).map(x => ({ title: x.title, url: x.url, snippet: htmlToText(x.description || "").slice(0, 300) })) };
      }
      const r = await safeFetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q), net);
      const results = parseDuckDuckGo(r.text);
      if (!results.length) throw new Error("Search returned no results (the search engine may be rate-limiting this server). Read the provider's developer docs directly with read_url instead.");
      return { query: q, results };
    },
    read_url: async ({ url }) => {
      let u = String(url || ""); if (!/^https?:\/\//i.test(u)) u = "https://" + u;
      const r = await safeFetch(u, net);
      const text = htmlToText(r.text);
      return { url: r.url, status: r.status, text: text.slice(0, 12000), truncated: text.length > 12000 };
    },
    probe_authorize_endpoint: async ({ authorize_url, scope }) => {
      const url = probeUrl(String(authorize_url), scope);
      try {
        const r = await safeFetch(url, { ...net, followRedirects: false, timeoutMs: 12000 });
        return { requested: url, status: r.status, redirect_to: r.location.slice(0, 400), body_text: htmlToText(r.text).slice(0, 1500) };
      } catch (e) { return { requested: url, error: String(e.message || e) }; }
    },
    check_composio_directory: async ({ name }) => checkComposio(directory, String(name)),
    get_library_guide: async ({ slug }) => { const g = library[String(slug).toLowerCase()]; if (!g) throw new Error("No library guide with that slug"); return condenseGuide(g); },
  };
}

export function parseJsonLoose(text) {
  const t = String(text || "");
  try { return JSON.parse(t); } catch {}
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  throw new Error("The agent's reply was not valid JSON");
}

async function execTool(tools, name, input, send) {
  const label = { web_search: `Search → ${input?.query}`, read_url: `Read → ${input?.url}`, probe_authorize_endpoint: `Probe → ${input?.authorize_url}` }[name] || `${name} → ${JSON.stringify(input || {}).slice(0, 90)}`;
  send({ type: "log", kind: "tool", message: label });
  if (!tools[name]) return { ok: false, data: { error: `Unknown tool ${name}` } };
  try {
    const data = await tools[name](input || {});
    if (name === "probe_authorize_endpoint") send({ type: "log", kind: "ok", message: `Provider said: ${JSON.stringify(data).slice(0, 140)}` });
    return { ok: true, data };
  } catch (e) {
    send({ type: "log", kind: "err", message: `${name} failed: ${String(e.message || e).slice(0, 120)}` });
    return { ok: false, data: { error: String(e.message || e) } };
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
class ApiError extends Error { constructor(status, body) { super(`LLM API error ${status}`); this.status = status; this.body = body; } }
async function postJson(fetchImpl, url, headers, body, signal) {
  const r = await fetchImpl(url, { method: "POST", signal, headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  if (!r.ok) throw new ApiError(r.status, (await r.text()).slice(0, 500));
  return r.json();
}
const retryable = e => e instanceof ApiError && [429, 500, 503].includes(e.status);

// ---------- Google Gemini (generateContent with function calling)
async function runGemini({ prompt, tools, send, signal, cfg, fetchImpl }) {
  const base = cfg.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
  const toolSpec = [{ functionDeclarations: TOOL_NAMES.map(n => ({ name: n, description: TOOL_DEFS[n].description, parameters: TOOL_DEFS[n].inputSchema })) }];
  const contents = [{ role: "user", parts: [{ text: prompt }] }];
  let models = [...cfg.models], model = null;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (signal?.aborted) throw new Error("Stopped");
    let res;
    for (let attempt = 0; ; attempt++) {
      const m = model || models[0];
      try {
        res = await postJson(fetchImpl, `${base}/models/${m}:generateContent`, { "x-goog-api-key": cfg.key },
          { contents, tools: toolSpec, generationConfig: { maxOutputTokens: 32000, temperature: 0.4 } }, signal);
        model = m; break;
      } catch (e) {
        // Before a model has answered, fall through the model list on overload/quota/not-found. After that, stay on it
        // (its thought signatures are tied to it) and back off.
        if (!model && e instanceof ApiError && [404, 429, 500, 503].includes(e.status) && models.length > 1) { send({ type: "log", kind: "tool", message: `Model ${m} unavailable (${e.status}); trying ${models[1]}` }); models.shift(); continue; }
        if (retryable(e) && attempt < 3) { await sleep(2000 * (attempt + 1)); continue; }
        throw e;
      }
    }
    const cand = res.candidates?.[0];
    if (!cand?.content?.parts?.length) throw new Error(`The model returned no content (${cand?.finishReason || res.promptFeedback?.blockReason || "unknown reason"})`);
    contents.push(cand.content); // keep thought signatures intact
    const calls = cand.content.parts.filter(p => p.functionCall);
    if (!calls.length) {
      const text = cand.content.parts.filter(p => p.text && !p.thought).map(p => p.text).join("\n");
      send({ type: "text", chars: text.length });
      return parseJsonLoose(text);
    }
    const parts = [];
    for (const p of calls) {
      const r = await execTool(tools, p.functionCall.name, p.functionCall.args, send);
      parts.push({ functionResponse: { name: p.functionCall.name, ...(p.functionCall.id ? { id: p.functionCall.id } : {}), response: r.ok ? { result: r.data } : r.data } });
    }
    contents.push({ role: "user", parts });
  }
  throw new Error("The agent did not finish within its turn budget");
}

// ---------- OpenAI (Responses API)
async function runOpenAI({ prompt, tools, send, signal, cfg, fetchImpl }) {
  const base = cfg.baseUrl || "https://api.openai.com/v1";
  const toolSpec = TOOL_NAMES.map(n => ({ type: "function", name: n, description: TOOL_DEFS[n].description, parameters: TOOL_DEFS[n].inputSchema }));
  let body = { model: cfg.models[0], input: prompt, tools: toolSpec, max_output_tokens: 32000 };
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (signal?.aborted) throw new Error("Stopped");
    let res;
    for (let attempt = 0; ; attempt++) {
      try { res = await postJson(fetchImpl, `${base}/responses`, { authorization: `Bearer ${cfg.key}` }, body, signal); break; }
      catch (e) { if (retryable(e) && attempt < 3) { await sleep(2000 * (attempt + 1)); continue; } throw e; }
    }
    const calls = [], texts = [];
    for (const item of res.output || []) {
      if (item.type === "function_call") calls.push(item);
      if (item.type === "message") for (const c of item.content || []) if (c.type === "output_text") texts.push(c.text);
    }
    if (!calls.length) { const t = texts.join("\n"); send({ type: "text", chars: t.length }); return parseJsonLoose(t); }
    const outputs = [];
    for (const c of calls) { let args = {}; try { args = JSON.parse(c.arguments || "{}"); } catch {} const r = await execTool(tools, c.name, args, send); outputs.push({ type: "function_call_output", call_id: c.call_id, output: JSON.stringify(r.data) }); }
    body = { model: cfg.models[0], previous_response_id: res.id, input: outputs, tools: toolSpec, max_output_tokens: 32000 };
  }
  throw new Error("The agent did not finish within its turn budget");
}

export const DEFAULT_GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
export function llmConfigFromEnv(env = process.env) {
  const provider = (env.LLM_PROVIDER || (env.GEMINI_API_KEY ? "gemini" : env.OPENAI_API_KEY ? "openai" : "")).toLowerCase();
  const custom = env.MODEL ? env.MODEL.split(",").map(s => s.trim()).filter(Boolean) : null;
  if (provider === "gemini") return { provider, key: env.GEMINI_API_KEY, models: custom || DEFAULT_GEMINI_MODELS, baseUrl: env.LLM_BASE_URL };
  if (provider === "openai") return { provider, key: env.OPENAI_API_KEY, models: custom || ["gpt-4.1"], baseUrl: env.LLM_BASE_URL };
  return null;
}

export async function runAgent({ input, existing = null, send = () => {}, signal, cfg, directory, library, fetchImpl = fetch, lookup, env }) {
  const tools = makeTools({ directory, library, fetchImpl, lookup, env });
  const prompt = buildPrompt(input, { mode: "server", existing });
  return (cfg.provider === "openai" ? runOpenAI : runGemini)({ prompt, tools, send, signal, cfg, fetchImpl });
}
