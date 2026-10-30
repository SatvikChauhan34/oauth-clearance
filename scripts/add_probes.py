"""Attach live endpoint probes (run 2026-10-30 via a real browser) to guides.
Method: open the provider's authorize URL with a deliberately invalid client_id and
https://example.com/callback; record what the provider returns. This proves the endpoint,
parameter names, and the exact error a developer sees when the client_id is wrong/unpropagated."""
import json, glob
D = "2026-10-30"
P = {
 "gmail": [("Authorize endpoint with fake client_id (scope gmail.readonly)", "Google error page: 'Access blocked: Authorization Error' — Error 401: invalid_client ('The OAuth client was not found.')", "confirmed"),
           ("OIDC discovery https://accounts.google.com/.well-known/openid-configuration", "code_challenge_methods_supported: plain, S256 → PKCE supported; token endpoint oauth2.googleapis.com/token; revocation endpoint present", "confirmed")],
 "github": [("Authorize endpoint with fake client_id while signed out", "Redirects to github.com/login with return_to preserved; client_id is validated only after sign-in", "partial")],
 "slack": [("Authorize endpoint with fake client_id while signed out", "Redirects to 'Find your workspace' sign-in; Slack resolves the workspace before validating client_id", "partial")],
 "outlook": [("/common/oauth2/v2.0/authorize with all-zero GUID client_id, scope Mail.Read offline_access", "AADSTS700038: <id> is not a valid application identifier", "confirmed")],
 "zoom": [("Authorize endpoint with fake client_id", "JSON {errorCode: 4702, errorMessage: 'Invalid client_id: …'}", "confirmed")],
 "linkedin": [("Authorization endpoint with fake client_id, scope 'openid profile'", "Plain page: 'The passed in client_id is invalid'", "confirmed")],
 "salesforce": [("login.salesforce.com authorize with fake client_id", "error=invalid_client_id&error_description=client identifier invalid (also what you see during the ~10 min propagation window after creating an app)", "confirmed")],
 "xero": [("login.xero.com authorize with fake client_id", "Error page: 'unauthorized_client — Unknown client or client not enabled' (HTTP 500 page)", "confirmed")],
 "docusign": [("Demo authorize (account-d.docusign.com) with fake integration key", "'Something went wrong — The client id provided is not registered with Docusign.'", "confirmed")],
 "notion": [("api.notion.com/v1/oauth/authorize with fake client_id while signed out", "Redirects to Notion login; client validated after sign-in", "partial")],
 "twitter": [("x.com/i/oauth2/authorize with fake client_id + PKCE params while signed out", "'Log in to X to continue' — client validated after sign-in", "partial")],
 "shopify": [],
}
for f in glob.glob("data/guides/*.json"):
    g = json.load(open(f)); s = g["slug"]
    g["probes"] = [{"what": w, "result": r, "outcome": o, "date": D, "method": "Live browser request (no account created, no credentials used)"} for w, r, o in P.get(s, [])]
    if s == "shopify":
        g["probes"] = [{"what": "Not probed", "result": "Authorize URL is per-shop ({shop}.myshopify.com); needs a dev store, which requires creating an account — out of scope for an automated agent.", "outcome": "skipped", "date": D, "method": "n/a"}]
    if s == "gmail":
        g["uncertain"] = [u for u in g.get("uncertain", []) if "PKCE" not in u]
        g["oauth"]["pkce"] = "supported (S256 + plain, confirmed via Google OIDC discovery document on 2026-10-30)"
    json.dump(g, open(f, "w"), indent=2, ensure_ascii=False)
print("ok")
