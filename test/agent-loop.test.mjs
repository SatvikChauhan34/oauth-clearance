// Offline tests: a fake fetch plays the LLM APIs and the provider websites; a fake DNS resolver plays the network.
// Run: npm test
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { runAgent, parseJsonLoose, parseDuckDuckGo } from "../lib/runner.mjs";
import { normalizeGuide } from "../lib/agent.mjs";
import { safeFetch, isPrivateAddress } from "../lib/netguard.mjs";

const directory = JSON.parse(await readFile(new URL("../data/composio_directory.json", import.meta.url)));
const library = {};
for (const f of await readdir(new URL("../data/guides/", import.meta.url))) { const g = JSON.parse(await readFile(new URL("../data/guides/" + f, import.meta.url))); library[g.slug] = g; }
const lookup = async host => [{ address: host.includes("internal-trap") ? "10.0.0.5" : "93.184.216.34" }];
const FINAL = JSON.stringify({ slug: "calendly", name: "Calendly (API v2)", provider: "Calendly", verdict: "ok", difficulty: { score: 2, rationale: "x" }, timeline: { first_token: { estimate: "20 min" }, production: { estimate: "same day" } }, steps: [{ phase: "Register", title: "Create app", owner: "human" }], evidence: [], confidence: "medium" });
const DDG = `<div class="result results_links web-result"><div class="links_main"><h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fdeveloper.calendly.com%2Fcreate-a-developer-account&amp;rut=abc">Creating an <b>OAuth</b> app | Calendly</a></h2><a class="result__snippet" href="x">Register your <b>OAuth</b> app in the developer portal.</a></div></div>
<div class="result results_links result--ad"><a class="result__a" href="https://duckduckgo.com/y.js?ad=1">Ad</a></div>`;
const res = (status, text, headers = {}) => ({ ok: status < 400, status, headers: new Map(Object.entries(headers)), text: async () => text, json: async () => JSON.parse(text) });
const site = url => url.includes("duckduckgo.com/html") ? res(200, DDG) : url.includes("client_id=probe") ? res(400, "<h1>Error</h1><p>invalid_client</p>") : res(200, "<main>OAuth docs for developers</main><script>evil()</script>");

async function testGemini() {
  const bodies = []; let n = 0; const urls = [];
  const fetchImpl = async (url, opts) => {
    url = String(url);
    if (!url.includes("generativelanguage")) return site(url);
    urls.push(url); n++;
    if (n === 1) return res(503, '{"error":"busy"}'); // first model overloaded -> fall back
    bodies.push(JSON.parse(opts.body));
    if (n === 2) return res(200, JSON.stringify({ candidates: [{ content: { role: "model", parts: [
      { functionCall: { id: "a1", name: "check_composio_directory", args: { name: "Calendly" } }, thoughtSignature: "SIG1" },
      { functionCall: { id: "a2", name: "web_search", args: { query: "calendly oauth app" } } }] } }] }));
    if (n === 3) return res(200, JSON.stringify({ candidates: [{ content: { role: "model", parts: [
      { functionCall: { id: "a3", name: "read_url", args: { url: "https://developer.calendly.com" } } },
      { functionCall: { id: "a4", name: "probe_authorize_endpoint", args: { authorize_url: "https://auth.calendly.com/oauth/authorize" } } },
      { functionCall: { id: "a5", name: "read_url", args: { url: "http://internal-trap.example/" } } }] } }] }));
    return res(200, JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: "thinking", thought: true }, { text: "```json\n" + FINAL + "\n```" }] } }] }));
  };
  const logs = [];
  const g = await runAgent({ input: "Calendly", cfg: { provider: "gemini", key: "k", models: ["m-big", "m-lite"] }, directory, library, fetchImpl, lookup, env: {}, send: e => logs.push(e) });
  assert.equal(g.slug, "calendly");
  assert.match(urls[0], /m-big/); assert.match(urls[1], /m-lite/); assert.match(urls[3], /m-lite/, "sticks to the model that answered");
  const turn2 = bodies[1].contents;
  assert.equal(turn2[1].parts[0].thoughtSignature, "SIG1", "thought signature echoed back");
  const fr = turn2[2].parts.map(p => p.functionResponse);
  assert.equal(fr[0].id, "a1"); assert.equal(fr[0].response.result.exact[0].composio, "managed OAuth available");
  assert.equal(fr[1].response.result.results[0].url, "https://developer.calendly.com/create-a-developer-account");
  const fr3 = bodies[2].contents[4].parts.map(p => p.functionResponse);
  assert.match(fr3[0].response.result.text, /OAuth docs for developers/); assert.doesNotMatch(fr3[0].response.result.text, /evil/);
  assert.match(fr3[1].response.result.body_text, /invalid_client/);
  assert.match(fr3[2].response.error, /Private or internal/, "SSRF attempt blocked and reported to the model");
  console.log("ok  gemini loop: model fallback, thought signatures kept, 5 tools, SSRF blocked, JSON parsed");
}
async function testOpenAI() {
  const calls = []; let n = 0;
  const fetchImpl = async (url, opts) => {
    if (!String(url).includes("api.openai.com")) return site(String(url));
    calls.push(JSON.parse(opts.body)); n++;
    if (n === 1) return res(200, JSON.stringify({ id: "r1", output: [{ type: "function_call", call_id: "c1", name: "get_library_guide", arguments: '{"slug":"notion"}' }, { type: "function_call", call_id: "c2", name: "get_library_guide", arguments: '{"slug":"nope"}' }] }));
    return res(200, JSON.stringify({ id: "r2", output: [{ type: "message", content: [{ type: "output_text", text: "Here: " + FINAL }] }] }));
  };
  const g = await runAgent({ input: "Calendly", cfg: { provider: "openai", key: "k", models: ["m"] }, directory, library, fetchImpl, lookup, env: {} });
  assert.equal(g.name, "Calendly (API v2)");
  assert.equal(calls[1].previous_response_id, "r1");
  assert.match(calls[1].input[0].output, /"slug":"notion"/); assert.match(calls[1].input[1].output, /No library guide/);
  console.log("ok  openai loop: function calls, tool errors passed back");
}
async function testNetguard() {
  for (const ip of ["127.0.0.1", "10.1.2.3", "169.254.169.254", "192.168.1.1", "172.20.0.1", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "0.0.0.0"]) assert.ok(isPrivateAddress(ip), ip);
  for (const ip of ["93.184.216.34", "8.8.8.8", "2606:4700::1111"]) assert.ok(!isPrivateAddress(ip), ip);
  const f = async () => res(200, "ok");
  for (const bad of ["http://169.254.169.254/latest/meta-data", "http://localhost:3000/", "file:///etc/passwd", "http://example.com:8080/", "http://user:pw@example.com/", "http://internal-trap.example/"])
    await assert.rejects(safeFetch(bad, { fetchImpl: f, lookup }), /allowed|Private|Invalid/, bad);
  const redirector = async url => String(url).includes("start") ? res(302, "", { location: "http://169.254.169.254/" }) : res(200, "secret");
  await assert.rejects(safeFetch("https://example.com/start", { fetchImpl: redirector, lookup }), /Private/, "redirect to metadata blocked");
  const ok = await safeFetch("https://example.com/", { fetchImpl: f, lookup }); assert.equal(ok.text, "ok");
  console.log("ok  netguard: private/loopback/metadata/ports/credentials/redirect-to-internal all blocked");
}
function testParsers() {
  const r = parseDuckDuckGo(DDG); assert.equal(r.length, 1); assert.equal(r[0].title, "Creating an OAuth app | Calendly"); assert.match(r[0].snippet, /developer portal/);
  const g = normalizeGuide(parseJsonLoose(FINAL));
  assert.equal(g.difficulty.label, "Easy"); assert.deepEqual(g.gotchas, []); assert.equal(g.review.required, "unknown");
  assert.equal(normalizeGuide({ name: "X", difficulty: { score: 9 } }).difficulty.score, 3);
  assert.equal(normalizeGuide({ error: "not_found", message: "?" }).error, "not_found");
  console.log("ok  parsers: search results (ads skipped), JSON extraction, guide normalisation");
}
await testGemini(); await testOpenAI(); await testNetguard(); testParsers();
console.log("all tests passed");
