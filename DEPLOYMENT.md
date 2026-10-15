# SnapDesign Inbox deployment record

Date: 15 October 2026 (Asia/Ho_Chi_Minh).

## Implemented

- Cloned the requested customized source at `02d0a8804717f909618bea8619d3c4e624405d8b` into a separate `snapdesign-inbox` checkout.
- Configured Worker name, `snapdesign.ai`, independent production/preview buckets, and a separate login-rate-limit namespace.
- Updated browser titles to SnapDesign Inbox. Preserved custom authentication and optional authenticator-app 2FA.
- Added focused tests against the actual auth routes and mailbox authorization middleware using in-memory R2 doubles and synthetic credentials.

## Tested locally

- `npm ci --no-fund --no-audit`: PASS, existing peer-dependency warning; no dependency audit claimed.
- `npm run typecheck`: PASS, Wrangler-generated types and TypeScript build.
- `npm test`: PASS, seven tests, no skipped tests. Anonymous/forged-session denial; missing/wrong admin secret; secure cookie flags and tampering; cross-mailbox/admin denial and password session invalidation in the tested process; RFC HOTP vectors; 2FA challenge and sequential replay denial; configured limiter denial.
- `npx wrangler deploy --dry-run`: PASS, bundled Worker and isolated resource bindings validated without deployment.
- `npm run build`: PASS, client and Worker bundles generated with locked Wrangler 4.74.0 and Vite 6.4.1.

These tests do not validate Cloudflare storage behavior, distributed/concurrent lockout or TOTP replay, cross-isolate session invalidation, email delivery, or production enrollment in 2FA. The source caches mailbox password records for up to 30 seconds. No comprehensive security audit, outbound mail, customer email, payment, or plan upgrade was performed.

## External setup status

- GitHub: true fork created at `agentaler/snapdesign-inbox`; prepared source published to `main` as `0f55481dd594742403426766f7d2e41c38638cc0` before deployment.
- Cloudflare dashboard: owner signed in to Agentaler. Account has an existing Workers Paid subscription and the original `agentic-inbox` deployment.
- Wrangler: `whoami` returned unauthenticated.
- Public DNS inspection: Cloudflare nameservers; no apex MX/TXT or `mail` CNAME answers on initial check. Dashboard has existing `cf-bounce` MX/SPF/DKIM and `_dmarc` reject records; preserve these. Apex and app CNAMEs point to separate Railway services.
- Cloudflare GitHub Build `d7115968-f834-403a-ae1f-42279c5aabe4`: SUCCESS on 15 October at 06:32 UTC. Build command `npm run typecheck && npm test && npm run build` passed, including all seven auth tests; deploy command `npx wrangler deploy` succeeded. Worker version `59130ff1-3ac3-4109-968a-c840713e85c2` received 100% traffic. This initial manual build displays an empty commit message; the repository's published main head at build time was the commit above, not a directly displayed Cloudflare commit attestation.
- Automatic builds are connected to `agentaler/snapdesign-inbox`, production branch `main`; preview builds disabled. Existing account build integration was used; no new token or plan was purchased.
- Source commit `5ee47a8eb1b2cd3e044e63886162dff709f414dc` was then automatically built as `41095807-d680-405c-9fe4-5fa09936a8e3`. Cloudflare explicitly linked this commit and reported build/deploy SUCCESS at 06:41 UTC; code deployment version `28e42105-747e-47b1-8ac7-d6901e1a6070`. Post-deploy probes: login 200, mailbox API 401 without a session, workers.dev 404. Later owner secret changes may create a separate runtime configuration version.
- Production R2 bucket `snapdesign-inbox`: created, public access Disabled. Preview bucket remains unprovisioned because preview builds are disabled. Worker has separate Durable Objects and login namespace `3002`.
- Custom domain `mail.snapdesign.ai`: attached; HTTPS login page renders. Wrangler now retains this domain and disables workers.dev/preview URLs on subsequent builds.
- Live anonymous probes: root redirects to login; login returns 200; auth identity, mailbox/config API, MCP and agent endpoints return 401. API responses have `Cache-Control: no-store`; all tested responses have `X-Frame-Options: DENY`. See `evidence/live-anonymous-probes.json`.
- Email Sending dashboard: snapdesign.ai Enabled, DNS Configured, 0 of 1,000 daily quota used at inspection. Existing bounce MX/SPF/DKIM and DMARC reject records retained. No delivery is claimed from this configuration status.
- Email Routing: activated receiving DNS after creating `hello@snapdesign.ai`. Public DNS resolves apex MX to route3/route1/route2.mx.cloudflare.net with priorities 11/72/89, and SPF to `v=spf1 include:_spf.mx.cloudflare.net ~all`. Existing sending records and website records were preserved. The exact-address rule from `hello@snapdesign.ai` to `snapdesign-inbox` is prepared but awaiting the browser-required access-change confirmation before Save. Catch-all remains disabled.
- Admin login: owner submitted private `ADMIN_PASSWORD` and signed in; authenticated mailbox management and creation were verified in the live UI. `hello@snapdesign.ai` exists and its mailbox interface loads. It initially has no separate password, so only admin can open it. Owner handoff for a mailbox password and admin authenticator enrollment is pending; live 2FA enrollment/login and send/receive delivery remain unverified. No external test recipient has been supplied yet. `SESSION_SECRET` is optional; absent, the inherited app generates a separate signing secret in this private R2 bucket. No credentials or TOTP enrollments are copied from the other project.

## Owner/setup steps

1. Admin secret setup and sign-in are complete. Never put credentials in GitHub, build variables, or chat. Optionally set a separate random `SESSION_SECRET` of at least 32 characters; otherwise private R2 holds an automatically generated signing key.
2. GitHub fork, production bucket, Worker and custom domain are provisioned. Keep R2 private. Use GitHub main builds for future code deployments.
3. Check deployment activity after each main update; record the Worker version and source commit without claiming manual builds display commit evidence they do not expose.
4. Preview builds are disabled; provision an independent preview bucket before ever enabling previews.
5. Enroll the admin authenticator and set a password for the created `hello@snapdesign.ai` mailbox. Each mailbox owner enrolls their own 2FA. Existing 2FA enrollments are not transferred. Sign out and back in to verify the production authenticator challenge.
6. Configure Email Routing with Cloudflare's required DNS records and address-to-Worker rules. Record prior DNS/rules first. Do not modify apex/app website records. Avoid catch-all until the handling of nonexistent mailboxes is explicitly understood.
7. Verify the sending domain and required DKIM/SPF/DMARC records in Email Service. Confirm account entitlement and any pricing before enabling a paid plan. Preserve other authorized senders when merging SPF.
8. With an owner-specified test recipient, send and reply to a test message; inspect receipt and authentication headers. Do not claim delivery from an API success alone. Run unauthenticated API/file/MCP probes and a live 2FA login check.

## Deferred

- SnapDesign portal automatic notifications and customer emails.
- Migration of mail or credentials from the other project.
- New payment plans, subscriptions, or automatic AI changes.
