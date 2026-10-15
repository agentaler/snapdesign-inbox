import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { Hono } from "hono";
import { canAccessMailbox, resolveSession, setMailboxPassword } from "../workers/lib/auth";
import { requireAdmin, requireMailbox, type MailboxContext } from "../workers/lib/mailbox";
import { base32Encode, hotp, newTotpSecret, saveTotp } from "../workers/lib/totp";
import authRoutes from "../workers/routes/auth";
import type { Env } from "../workers/types";

// Only synthetic, in-memory storage. No Cloudflare account or real credentials.
const objects = new Map<string, string>();
const adminPassword = randomBytes(32).toString("base64url");
const mailboxPassword = randomBytes(32).toString("base64url");
let limiterAllows = true;
let durableObjectReads = 0;
const env = {
	DOMAINS: "snapdesign.ai",
	ADMIN_PASSWORD: adminPassword,
	SESSION_SECRET: randomBytes(48).toString("base64url"),
	BUCKET: {
		get: async (key: string) => objects.has(key) ? { json: async () => JSON.parse(objects.get(key)!) } : null,
		head: async (key: string) => objects.has(key) ? { key } : null,
		put: async (key: string, value: string) => { objects.set(key, value); },
		delete: async (key: string) => { objects.delete(key); },
	},
	LOGIN_LIMITER: { limit: async () => ({ success: limiterAllows }) },
	MAILBOX: {
		idFromName: (name: string) => name,
		get: () => { durableObjectReads++; return {}; },
	},
} as unknown as Env;

const app = new Hono<MailboxContext>();
app.use("*", async (c, next) => { c.set("session", await resolveSession(c)); await next(); });
app.route("/", authRoutes);
app.get("/protected/:mailboxId", requireMailbox, (c) => c.json({ ok: true }));
app.get("/admin", requireAdmin, (c) => c.json({ ok: true }));

const request = (path: string, options?: RequestInit, bindings = env) =>
	app.request(`https://inbox.example.test${path}`, options, bindings);
const login = (email: string, password: string, code?: string, bindings = env) => request("/api/v1/auth/login", {
	method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, code }),
}, bindings);
const cookie = (response: Response) => response.headers.get("set-cookie")!.split(";")[0];

test("anonymous and forged sessions cannot access mailboxes or admin actions", async () => {
	for (const path of ["/protected/hello%40snapdesign.ai", "/admin"]) {
		assert.equal((await request(path)).status, 403);
		assert.equal((await request(path, { headers: { Cookie: "inbox_session=forged.invalid" } })).status, 403);
	}
	assert.equal((await request("/api/v1/auth/me")).status, 401);
	assert.equal(durableObjectReads, 0);
});

test("admin login fails closed when its secret is absent or password is wrong", async () => {
	assert.equal((await login("admin", adminPassword, undefined, { ...env, ADMIN_PASSWORD: undefined })).status, 401);
	assert.equal((await login("admin", "incorrect")).status, 401);
});

test("valid admin sign-in uses Secure HttpOnly SameSite cookies and rejects tampering", async () => {
	const response = await login("admin", adminPassword);
	assert.equal(response.status, 200);
	const header = response.headers.get("set-cookie")!;
	for (const flag of ["HttpOnly", "Secure", "SameSite=Lax"]) assert.ok(header.includes(flag));
	assert.equal((await request("/admin", { headers: { Cookie: cookie(response) } })).status, 200);
	assert.equal((await request("/admin", { headers: { Cookie: cookie(response) + "tampered" } })).status, 403);
	assert.equal((await request("/admin", { headers: { Cookie: cookie(response) } }, { ...env, ADMIN_PASSWORD: randomBytes(32).toString("hex") })).status, 403);
});

test("mailbox credentials cannot access another mailbox or admin controls", async () => {
	objects.set("mailboxes/hello@snapdesign.ai.json", "{}");
	objects.set("mailboxes/private@snapdesign.ai.json", "{}");
	await setMailboxPassword(env, "hello@snapdesign.ai", mailboxPassword);
	assert.equal((await login("hello@snapdesign.ai", "incorrect")).status, 401);
	const response = await login("hello@snapdesign.ai", mailboxPassword);
	assert.equal(response.status, 200);
	const headers = { Cookie: cookie(response) };
	assert.equal((await request("/protected/hello%40snapdesign.ai", { headers })).status, 200);
	const reads = durableObjectReads;
	assert.equal((await request("/protected/private%40snapdesign.ai", { headers })).status, 403);
	assert.equal(durableObjectReads, reads, "foreign mailbox denied before reading its Durable Object");
	assert.equal((await request("/admin", { headers })).status, 403);
	assert.equal(canAccessMailbox({ role: "mailbox", mailbox: "hello@snapdesign.ai" }, "private@snapdesign.ai"), false);
	await setMailboxPassword(env, "hello@snapdesign.ai", randomBytes(32).toString("hex"));
	assert.equal((await request("/protected/hello%40snapdesign.ai", { headers })).status, 403);
});

test("HOTP matches RFC 4226 published test vectors", async () => {
	const secret = new TextEncoder().encode("12345678901234567890");
	assert.equal(base32Encode(secret), "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
	const expected = ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"];
	for (let counter = 0; counter < expected.length; counter++) assert.equal(await hotp(secret, counter), expected[counter]);
});

test("2FA-enabled login requires a valid code and rejects sequential replay", async () => {
	const secret = newTotpSecret();
	const { base32Decode } = await import("../workers/lib/totp");
	await saveTotp(env, "admin", { secret, enabled: true, createdAt: new Date().toISOString() });
	const noCode = await login("admin", adminPassword);
	assert.equal(noCode.status, 401);
	assert.equal((await noCode.json()).twoFactorRequired, true);
	assert.equal(noCode.headers.get("set-cookie"), null);
	assert.equal((await login("admin", adminPassword, "invalid")).status, 401);
	const code = await hotp(base32Decode(secret), Math.floor(Date.now() / 30_000));
	assert.equal((await login("admin", adminPassword, code)).status, 200);
	const replay = await login("admin", adminPassword, code);
	assert.equal(replay.status, 401);
	assert.equal(replay.headers.get("set-cookie"), null);
});

test("configured login rate limiter rejects attempts before authentication", async () => {
	limiterAllows = false;
	const response = await login("admin", adminPassword);
	assert.equal(response.status, 429);
	assert.equal(response.headers.get("set-cookie"), null);
	limiterAllows = true;
});
