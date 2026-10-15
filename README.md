# SnapDesign Inbox

A separate deployment of [agentaler/agentic-inbox](https://github.com/agentaler/agentic-inbox) for `snapdesign.ai`, preserving its custom mailbox sign-in and authenticator-app two-step verification. Upstream source: `02d0a8804717f909618bea8619d3c4e624405d8b`. Originally built by [Cloudflare](https://github.com/cloudflare/agentic-inbox); Apache-2.0 license and source notices are retained.

This is the studio's email client. It does not enable automatic customer notifications in the SnapDesign portal.

## Configuration

- Worker: `snapdesign-inbox`
- Mail domain: `snapdesign.ai`
- Production R2 bucket: `snapdesign-inbox` (private)
- Preview R2 bucket: `snapdesign-inbox-preview` (configured name, not provisioned; preview builds disabled)
- Durable Objects: mailbox storage, email agent, and MCP, scoped to this Worker
- Web address: [mail.snapdesign.ai](https://mail.snapdesign.ai)

No mail, passwords, sessions, 2FA enrollments, or other storage from the original deployment are copied.

## Sign-in

The login page is `/login`. Each mailbox signs in with its address and password, and server-side checks restrict it to its own mailbox. The `admin` login uses the private `ADMIN_PASSWORD` Worker secret and can manage all mailboxes. With that secret absent, admin password login is disabled.

Two-step verification is supported for mailbox and admin password logins. Each person must enroll their own authenticator and confirm a code; installing the code alone does not enable 2FA. Keep admin credentials in a password manager. Mailbox passwords are hashed; the server stores TOTP secrets privately to verify codes.

Set an independent `SESSION_SECRET` of at least 32 characters as a Worker secret. The source otherwise generates a key in private R2. Optional `POLICY_AUD` and `TEAM_DOMAIN` allow a verified Cloudflare Access JWT to act as admin. They are unnecessary for custom sign-in and must not be copied from the other project's Access application. Optional `MCP_TOKEN` grants admin-level MCP access; leave unset unless explicitly needed.

## Build and check

Use Node.js 22 or newer and npm. Dependencies are pinned by `package-lock.json`.

```sh
npm ci
npm run typecheck
npm test
npm run build
```

The auth tests use synthetic credentials and in-memory storage; they are not proof of a configured Cloudflare account or a full production security audit. No upstream lint or browser-test command exists.

## Deploy to Cloudflare

Commit and push this repository before deploying. Cloudflare Workers Builds is connected to this repository's `main` branch. Build command: `npm run typecheck && npm test && npm run build`; deploy command: `npx wrangler deploy`. The custom domain is tracked in Wrangler; workers.dev and preview URLs are disabled. See the deployment record for remaining owner setup.

If provisioning a fresh environment with authorized CLI access, create the bucket only once (the current production bucket already exists):

```sh
npx wrangler login
npx wrangler r2 bucket create snapdesign-inbox
npm run deploy
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
```

Enter secret values interactively or in Cloudflare's private Worker settings. Never commit them or copy the other project's credentials. The initial deployment is closed to private data until an admin sign-in is configured. Keep the existing apex website and `app.snapdesign.ai` on their current hosting. Provision the separate preview bucket before enabling any preview builds.

Follow [DEPLOYMENT.md](DEPLOYMENT.md) for DNS, mailbox creation, mail verification, and current evidence. Do not route production mail until intended mailboxes exist: the inherited receiver ignores addresses without a stored mailbox.

## Receiving and sending

Cloudflare Email Routing delivers incoming mail to this Worker's `email()` handler. Create intended mailboxes first, then add Email Routing rules for those addresses (or deliberately choose catch-all routing), and activate the domain's required MX/TXT records.

Outbound mail uses the `EMAIL` send binding. [Cloudflare Email Sending](https://developers.cloudflare.com/email-service/) must be available for the account, with the sending domain verified. General outbound sending requires Workers Paid; routing alone is not proof that arbitrary-recipient sending is enabled. Do not buy a plan or accept new terms without the owner.

The inherited AI agent can read mail, draft replies, and send after confirmation; inbound mail triggers its auto-draft path. Review that behavior before routing confidential customer mail. Forward-copy destinations must be verified in Cloudflare. There is no automatic email integration with the SnapDesign portal.
