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

These tests do not validate distributed/concurrent lockout or TOTP replay, cross-isolate session invalidation, external email deliverability, or production enrollment in 2FA. The source caches mailbox password records for up to 30 seconds. No comprehensive security audit, customer email, payment, or plan upgrade was performed. The separate live mail test below verifies same-domain SMTP delivery.

## External setup status

- GitHub: true fork created at `agentaler/snapdesign-inbox`; prepared source published to `main` as `0f55481dd594742403426766f7d2e41c38638cc0` before deployment.
- Cloudflare dashboard: owner signed in to Agentaler. Account has an existing Workers Paid subscription and the original `agentic-inbox` deployment.
- Wrangler: `whoami` returned unauthenticated.
- Public DNS inspection: Cloudflare nameservers; no apex MX/TXT or `mail` CNAME answers on initial check. Dashboard has existing `cf-bounce` MX/SPF/DKIM and `_dmarc` reject records; preserve these. Apex and app CNAMEs point to separate Railway services.
- Cloudflare GitHub Build `d7115968-f834-403a-ae1f-42279c5aabe4`: SUCCESS on 15 October at 06:32 UTC. Build command `npm run typecheck && npm test && npm run build` passed, including all seven auth tests; deploy command `npx wrangler deploy` succeeded. Worker version `59130ff1-3ac3-4109-968a-c840713e85c2` received 100% traffic. This initial manual build displays an empty commit message; the repository's published main head at build time was the commit above, not a directly displayed Cloudflare commit attestation.
- Automatic builds are connected to `agentaler/snapdesign-inbox`, production branch `main`; preview builds disabled. Existing account build integration was used; no new token or plan was purchased.
- Source commit `5ee47a8eb1b2cd3e044e63886162dff709f414dc` was then automatically built as `41095807-d680-405c-9fe4-5fa09936a8e3`. Cloudflare explicitly linked this commit and reported build/deploy SUCCESS at 06:41 UTC; code deployment version `28e42105-747e-47b1-8ac7-d6901e1a6070`. Post-deploy probes: login 200, mailbox API 401 without a session, workers.dev 404. Later owner secret changes may create a separate runtime configuration version.
- Documentation commit `54187b8825e3e23298240b3f4f8c6eb4cf2089b4` was automatically built as `d5ff02c3-035b-49c5-94c1-2f90eafa8029`. Cloudflare explicitly linked this commit, passed all build gates, and reported success at 06:55:19 UTC; Worker version `f69ae83f-7c07-41c4-bb7a-d75666290a5a`. Authenticated mailbox management still worked after deployment. This is the observed deployment used for the mail tests below; subsequent documentation builds may create a newer version.
- Production R2 bucket `snapdesign-inbox`: created, public access Disabled. Preview bucket remains unprovisioned because preview builds are disabled. Worker has separate Durable Objects and login namespace `3002`.
- Custom domain `mail.snapdesign.ai`: attached; HTTPS login page renders. Wrangler now retains this domain and disables workers.dev/preview URLs on subsequent builds.
- Live anonymous probes: root redirects to login; login returns 200; auth identity, mailbox/config API, MCP and agent endpoints return 401. API responses have `Cache-Control: no-store`; all tested responses have `X-Frame-Options: DENY`. See `evidence/live-anonymous-probes.json`.
- Email Sending dashboard: snapdesign.ai Enabled, DNS Configured, daily allowance displayed as 1,000 messages. Existing bounce MX/SPF/DKIM and DMARC reject records retained. Actual delivery was subsequently tested as recorded below.
- Email Routing: activated receiving DNS after creating `hello@snapdesign.ai`. Public DNS resolves apex MX to route3/route1/route2.mx.cloudflare.net with priorities 11/72/89, and SPF to `v=spf1 include:_spf.mx.cloudflare.net ~all`. Existing sending records and website records were preserved. The owner subsequently configured catch-all to Worker `snapdesign-inbox`; the dashboard now shows it Active. The previously prepared exact-address rule was not saved. The inherited receiver ignores addresses without a stored mailbox, even with catch-all enabled.
- Admin login: owner submitted private `ADMIN_PASSWORD` and signed in; authenticated mailbox management and creation were verified in the live UI. `SESSION_SECRET` is optional; absent, the inherited app generates a separate signing secret in this private R2 bucket. No credentials or TOTP enrollments were copied from the other project.
- Mailboxes: `hello@snapdesign.ai` (SnapDesign), `bella@snapdesign.ai` (Bella), `sales@snapdesign.ai` (SnapDesign Sales), `support@snapdesign.ai` (SnapDesign Support), and `designer@snapdesign.ai` (SnapDesign Designer) exist. Hello has a separate password set. At the last mailbox-settings inspection, the four new mailboxes still displayed No password and admin two-step verification displayed Off. Independent random initial passwords were generated in a private local file outside this repository, with directory/file modes 0700/0600; they have not been entered by the agent. Owner credential submission is pending. Mailbox-user login and live authenticator challenge remain unverified.

## Live email verification

- Owner-authorized test reference `SNAP-INBOX-20261015-A`: sent from `hello@snapdesign.ai` to `bella@snapdesign.ai` on 15 October 2026 at 07:10 UTC. The message appeared in Hello Sent and Bella Inbox; its received body was read.
- Received source headers report SPF pass for the envelope sender at `cf-bounce.snapdesign.ai`, DKIM pass for `snapdesign.ai`, and DMARC pass for `snapdesign.ai` under its reject policy. See `evidence/mail-delivery-headers.json`. The separate HELO SPF result is none, not the envelope SPF result.
- Replied from Bella to Hello at 07:12 UTC. Hello Inbox displayed the received reply and its matching test reference/body. Both legs passed through Cloudflare Email Sending and incoming Worker delivery; these were two setup messages, not customer communications.
- The inherited email agent automatically generated a draft after incoming mail, as shown in the UI. No generated draft was sent.
- This verifies same-domain SMTP sending, receipt, persistence, and UI rendering. Gmail/Outlook or other external delivery/inbox placement, attachment delivery, mailbox-user login, and a production 2FA challenge were not tested. An external test address has not been provided.

## Owner/setup steps

1. Admin secret setup and sign-in are complete. Never put credentials in GitHub, build variables, or chat. Optionally set a separate random `SESSION_SECRET` of at least 32 characters; otherwise private R2 holds an automatically generated signing key.
2. GitHub fork, production bucket, Worker and custom domain are provisioned. Keep R2 private. Use GitHub main builds for future code deployments.
3. Check deployment activity after each main update; record the Worker version and source commit without claiming manual builds display commit evidence they do not expose.
4. Preview builds are disabled; provision an independent preview bucket before ever enabling previews.
5. Submit the four generated initial passwords through each mailbox's key-icon form. Users can subsequently change their passwords in Settings. Complete admin authenticator enrollment with its final Turn on action; each mailbox owner enrolls their own 2FA. Sign out and back in to verify the production authenticator challenge. Keep credentials and QR/OTP values out of chat and Git.
6. Receiving DNS and the owner's catch-all Worker route are active. Create a mailbox before using an additional address. Preserve apex/app website records and other authorized senders when changing DNS.
7. Sending DNS and same-domain send/reply delivery are verified. With a supplied external test recipient, verify external send/reply receipt and inspect authentication headers; do not infer inbox placement from API success.

## Deferred

- SnapDesign portal automatic notifications and customer emails.
- Migration of mail or credentials from the other project.
- New payment plans, subscriptions, or automatic AI changes.
