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

- GitHub destination: owner selected `agentaler/snapdesign-inbox`; GitHub browser account switched to `agentleon99`. Fork creation requested.
- Cloudflare dashboard: owner signed in to Agentaler. Account has an existing Workers Paid subscription and the original `agentic-inbox` deployment.
- Wrangler: `whoami` returned unauthenticated.
- Public DNS inspection: Cloudflare nameservers; no apex MX/TXT or `mail` CNAME answers on initial check. Dashboard has existing `cf-bounce` MX/SPF/DKIM and `_dmarc` reject records; preserve these. Apex and app CNAMEs point to separate Railway services.
- Worker deployment, bucket provisioning, custom domain, Email Routing, Email Sending verification, mailbox provisioning, and real inbox delivery: NOT RUN.

## Owner/setup steps

1. Confirm the repository destination and publish the prepared source.
2. Sign in to the Cloudflare account that owns `snapdesign.ai`; authorize its deployment tooling if necessary.
3. Provision only the separate buckets and Worker. Keep R2 public access disabled. Set independent `ADMIN_PASSWORD` and `SESSION_SECRET` in Worker secrets.
4. Attach `mail.snapdesign.ai` as a custom domain. Record Worker version ID and exact Git commit.
5. Sign in as admin, enroll an authenticator, and create the intended `@snapdesign.ai` mailboxes. Each mailbox owner sets a password and enrolls 2FA. Existing 2FA enrollments are not transferred.
6. Configure Email Routing with Cloudflare's required DNS records and address-to-Worker rules. Record prior DNS/rules first. Do not modify apex/app website records. Avoid catch-all until the handling of nonexistent mailboxes is explicitly understood.
7. Verify the sending domain and required DKIM/SPF/DMARC records in Email Service. Confirm account entitlement and any pricing before enabling a paid plan. Preserve other authorized senders when merging SPF.
8. With an owner-specified test recipient, send and reply to a test message; inspect receipt and authentication headers. Do not claim delivery from an API success alone. Run unauthenticated API/file/MCP probes and a live 2FA login check.

## Deferred

- SnapDesign portal automatic notifications and customer emails.
- Migration of mail or credentials from the other project.
- New payment plans, subscriptions, or automatic AI changes.
