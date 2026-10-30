// SSRF-safe fetch for agent tools. The model chooses URLs (and web pages can try to steer it),
// so every request is checked: public http(s) hosts only, standard ports, re-checked on every redirect,
// response size and time capped.
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;

function ipv4Private(ip) {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}
export function isPrivateAddress(ip) {
  if (isIP(ip) === 4) return ipv4Private(ip);
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1") return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); if (mapped) return ipv4Private(mapped[1]);
  return /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || /^ff/.test(v) || v.startsWith("64:ff9b:") || v.startsWith("2001:db8");
}

export async function assertPublicUrl(raw, lookup = dnsLookup) {
  let u;
  try { u = new URL(raw); } catch { throw new Error("Invalid URL"); }
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) URLs are allowed");
  if (u.username || u.password) throw new Error("URLs with credentials are not allowed");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("Only standard ports are allowed");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i.test(host)) throw new Error("Internal hosts are not allowed");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addrs.length || addrs.some(a => isPrivateAddress(a.address))) throw new Error("Private or internal addresses are not allowed");
  return u;
}

async function readCapped(res) {
  if (!res.body?.getReader) return (await res.text()).slice(0, MAX_BYTES);
  const reader = res.body.getReader(), chunks = []; let n = 0;
  for (;;) { const { value, done } = await reader.read(); if (done) break; n += value.length; chunks.push(value); if (n >= MAX_BYTES) { reader.cancel().catch(() => {}); break; } }
  return new TextDecoder().decode(Buffer.concat(chunks.map(c => Buffer.from(c))).subarray(0, MAX_BYTES));
}

// followRedirects=false returns the first response (used by the authorize-endpoint probe).
export async function safeFetch(raw, { fetchImpl = fetch, lookup = dnsLookup, headers = {}, followRedirects = true, timeoutMs = 15000 } = {}) {
  let url = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url, lookup);
    const res = await fetchImpl(url, { redirect: "manual", headers, signal: AbortSignal.timeout(timeoutMs) });
    const loc = res.headers?.get?.("location");
    if (followRedirects && res.status >= 300 && res.status < 400 && loc) { url = new URL(loc, url).toString(); continue; }
    const text = await readCapped(res);
    return { status: res.status, url, location: loc || "", text };
  }
  throw new Error("Too many redirects");
}
