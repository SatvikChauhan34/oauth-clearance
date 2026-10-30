# Verification log

An adversarial fact-checking agent re-checked 39 high-impact claims across the 12 guides against primary sources (provider docs, changelogs, terms, staff posts) on 2026-10-30, and edited the guides in place.

**34 confirmed · 5 corrected · 0 unverifiable**

## Corrections

### slack: Existing installs of unlisted apps became subject to the limit on 2026-03-03
- Before: for new apps and installs since 29 May 2025, and for all existing installs since 3 March 2026
- After: for apps created and installs made since 29 May 2025 (Slack's changelog says pre-existing installs are not impacted; third-party claims of a 3 March 2026 cutover are unconfirmed)
- Sources: https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps/, https://www.allanninal.dev/slack/non-marketplace-history-clamp/, https://github.com/zeroclaw-labs/zeroclaw/issues/1839

### slack: Marketplace minimum active installs is 5 (expect 5 to submit)
- Before: Requires a minimum number of active installs (5 or 10, see uncertain); Start getting 5-10 active installs
- After: 10 active workspaces since July 2026, maintained throughout the entire review
- Sources: https://docs.slack.dev/changelog/2026/09/01/slack-marketplace-install-requirement, https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide

### salesforce: New Connected App creation disabled by default since Spring '26
- Before: Sources disagree on whether the default-off started in Winter '26 or Spring '26.
- After: Salesforce's own docs tie the change to Spring '26.
- Sources: https://developer.salesforce.com/docs/platform/sfdx-dev/guide/sfdx-dev-auth-connected-app.html

### salesforce: AppExchange security review ~4-5 weeks; $999 per attempt (reported)
- Before: ~4–5 weeks per submission (Salesforce guidance as reported); $999 per attempt (reported)
- After: ~3–9 weeks per submission (ISVforce ~3–4 weeks to report; 2023 blog 6–9 week queue); $999 per attempt official, waived for free
- Sources: https://developer.salesforce.com/blogs/2023/04/prepare-your-app-to-pass-the-appexchange-security-review, https://developer.salesforce.com/docs/atlas.en-us.244.0.packagingGuide.meta/packagingGuide/security_review_complete_the_review_cycle.htm

### outlook: Mail.Read/ReadWrite/ReadBasic user-consentable by default; managed policy only affects files/sites
- Before: Mail.ReadBasic, Mail.Read, Mail.ReadWrite and Mail.Send (delegated) are user-consentable by default but may be gated by tenant policy; managed policy (MC1097272) files/sites only, severity low
- After: Microsoft-managed default consent policy (rollout Oct-Nov 2025, MC1163922) excludes Mail.Read/ReadWrite/ReadBasic, Calendars, Chat, EWS/IMAP from user consent even for verified publishers; Mail.Send still user-consentable; severity high
- Sources: https://learn.microsoft.com/en-gb/entra/identity/enterprise-apps/manage-app-consent-policies, https://mc.merill.net/message/MC1163922, https://m365admin.handsontek.net/?p=16752

## Confirmed

| App | Claim | Sources |
|---|---|---|
| slack | Non-Marketplace commercially distributed apps limited to 1 req/min and 15 objects for conversations.history/replies since 2025-05-29 | https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps/ |
| slack | API Terms (effective 2025-10-10) restrict commercial distribution without authorization (Marketplace) | https://slack.com/terms-of-service/api |
| slack | Marketplace review: preliminary up to 10 business days, functional up to 10 weeks | https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide |
| slack | PKCE GA 2026-03-30; one-way public client; 30-day refresh tokens | https://docs.slack.dev/changelog/2026/03/30/pkce |
| slack | Token rotation: 12h access tokens, single-use refresh, irreversible | https://docs.slack.dev/authentication/using-token-rotation |
| twitter | No free tier since Feb 2026; pay-per-use, no subscriptions | https://docs.x.com/x-api/getting-started/pricing https://www.medianama.com/2026/02/223-x-developer-api-pricing-pay-per-use-model/ |
| twitter | Pricing $0.015 per post create, $0.20 per post with URL, 3M read cap | https://docs.x.com/x-api/getting-started/pricing |
| twitter | Programmatic replies only allowed when author mentioned/quoted you | https://docs.x.com/x-api/posts/manage-tweets/introduction.md https://roboin.io/article/en/2026/02/24/x-limits-api-based-automated-replies-to-combat-engagement-farming/ |
| twitter | OAuth 2.0 access token 2h; auth code 30s | https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code.md |
| xero | Paid tiers from 2 Mar 2026: Starter 5 free, Core 50 AUD 35, Plus 1,000 AUD 245 (cert), Advanced AUD 1,445 | https://developer.xero.com/pricing https://developer.xero.com/faq/pricing-and-policy-updates |
| xero | Granular scopes mandatory for apps created on/after 2 Mar 2026; existing apps by 13 Sep 2027 | https://devblog.xero.com/upcoming-changes-to-xero-accounting-api-scopes-705c5a9621a0 |
| xero | Access token 30 min, refresh 60 days, 30-min grace on used refresh token | https://devblog.xero.com/xero-api-token-management-best-practices-and-troubleshooting-01853f4244a9 |
| docusign | 20-API-call go-live requirement removed Oct 2025; instant/review(<=48h)/not allowed; type locked | https://community.docusign.com/go-live-70/no-more-20-api-calls-introducing-the-streamlined-integration-go-live-experience-in-apps-keys-25623 |
| docusign | Public (multi-tenant) integration requires Partner Program | https://community.docusign.com/go-live-70/go-live-for-a-public-integration-when-every-customer-uses-their-own-docusign-account-27596 https://www.docusign.com/blog/developers/isv-developers-enhance-your-product-by-building-a-docusign-connector |
| docusign | Auth code access token 8h; refresh 30 days; extended scope adds 30 days | https://www.docusign.com/blog/developers/authorization-code-grant-refresh-tokens |
| salesforce | Since early Sept 2025 most users blocked from uninstalled connected apps | https://admin.salesforce.com/blog/2025/get-ready-for-changes-to-connected-app-usage-restrictions https://www.soliantconsulting.com/blog/salesforce-connected-app-security-changes-sept2025/ |
| notion | Developer portal + PATs May 12 2026; unique tokens per authorization for new public connections June 8 2026; bot_id keying | https://developers.notion.com/page/changelog https://developers.notion.com/changelog/space-level-integrations-will-be-deprecated-soon-migrate-your-oauth-flows |
| notion | Marketplace listing optional; reviews reply in 5-10 business days | https://developers.notion.com/guides/get-started/marketplace-listing.md |
| github | OAuth Apps up to 10 callback URLs and expiring tokens default for new apps since 2026-08-14 | https://github.blog/changelog/2026-08-14-multiple-redirect-uris-and-token-refresh-for-oauth-apps https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app |
| github | Wildcard matching kept for single-callback apps created before Aug 3 2026; PKCE S256 only | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps |
| github | Paid Marketplace listing needs verified publisher and 100 installs / 200 users | https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app |
| gmail | gmail.send sensitive; readonly/modify/metadata/compose restricted | https://developers.google.com/workspace/gmail/api/auth/scopes |
| gmail | 100 test users; 7-day expiry in Testing; 100-user lifetime unverified cap | https://support.google.com/cloud/answer/15549945 |
| gmail | CASA revalidation annually | https://support.google.com/cloud/answer/13465431 |
| gmail | Sensitive review up to 10 days; brand verification minutes or 2-3 business days | https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification |
| shopify | New public apps (on/after Apr 1 2026) must use expiring offline tokens: 1h access, 90-day refresh; existing apps by Jan 1 2027 | https://shopify.dev/changelog/expiring-offline-access-tokens-required-for-public-apps-april-1-2026 https://shopify.dev/docs/apps/auth/access-token-types/offline |
| shopify | Distribution method can't be changed | https://shopify.dev/docs/apps/launch/distribution/select-distribution-method |
| shopify | Next-gen dev platform GA Sep 3 2025; admin-created custom apps can no longer be created | https://shopify.dev/changelog/next-gen-dev-platform-ga https://shopify.dev/docs/apps/build/authentication-authorization/legacy/admin-custom-apps |
| linkedin | 60-day access tokens; refresh tokens only for approved partners (365 days) | https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens |
| linkedin | CM API: rejection requires new app; version 202511 sunset Nov 16 2026 | https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review |
| outlook | Unverified multitenant apps stepped up to admin consent (AADSTS90094), on by default | https://learn.microsoft.com/entra/identity/enterprise-apps/configure-risk-based-step-up-consent https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview |
| outlook | Refresh tokens 90-day max inactive, not configurable; publisher verification free | https://learn.microsoft.com/en-us/entra/identity-platform/configurable-token-lifetimes https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview |
| zoom | Private apps only within own account; beta share URL 4 weeks + two 4-week extensions with Zoom approval | https://developers.zoom.us/docs/distribute/sharing-private-and-beta-apps/ |
| zoom | Access token 1h, refresh token 90 days, new refresh token on each refresh | https://developers.zoom.us/docs/integrations/oauth/ |

## Live endpoint probes (2026-10-30)

Each provider's authorize endpoint was requested from a real browser with an invalid client_id and `https://example.com/callback` (no accounts, no credentials).

| App | Probe | Provider returned | Outcome |
|---|---|---|---|
| docusign | Demo authorize (account-d.docusign.com) with fake integration key | `'Something went wrong — The client id provided is not registered with Docusign.'` | confirmed |
| github | Authorize endpoint with fake client_id while signed out | `Redirects to github.com/login with return_to preserved; client_id is validated only after sign-in` | partial |
| gmail | Authorize endpoint with fake client_id (scope gmail.readonly) | `Google error page: 'Access blocked: Authorization Error' — Error 401: invalid_client ('The OAuth client was not found.')` | confirmed |
| gmail | OIDC discovery https://accounts.google.com/.well-known/openid-configuration | `code_challenge_methods_supported: plain, S256 → PKCE supported; token endpoint oauth2.googleapis.com/token; revocation endpoint present` | confirmed |
| linkedin | Authorization endpoint with fake client_id, scope 'openid profile' | `Plain page: 'The passed in client_id is invalid'` | confirmed |
| notion | api.notion.com/v1/oauth/authorize with fake client_id while signed out | `Redirects to Notion login; client validated after sign-in` | partial |
| outlook | /common/oauth2/v2.0/authorize with all-zero GUID client_id, scope Mail.Read offline_access | `AADSTS700038: <id> is not a valid application identifier` | confirmed |
| salesforce | login.salesforce.com authorize with fake client_id | `error=invalid_client_id&error_description=client identifier invalid (also what you see during the ~10 min propagation window after creating an app)` | confirmed |
| shopify | Not probed | `Authorize URL is per-shop ({shop}.myshopify.com); needs a dev store, which requires creating an account — out of scope for an automated agent.` | skipped |
| slack | Authorize endpoint with fake client_id while signed out | `Redirects to 'Find your workspace' sign-in; Slack resolves the workspace before validating client_id` | partial |
| twitter | x.com/i/oauth2/authorize with fake client_id + PKCE params while signed out | `'Log in to X to continue' — client validated after sign-in` | partial |
| xero | login.xero.com authorize with fake client_id | `Error page: 'unauthorized_client — Unknown client or client not enabled' (HTTP 500 page)` | confirmed |
| zoom | Authorize endpoint with fake client_id | `JSON {errorCode: 4702, errorMessage: 'Invalid client_id: …'}` | confirmed |
