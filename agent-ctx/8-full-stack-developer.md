# Task 8 — full-stack-developer — Sign-up authentication (email+password + pb_session cookie)

## Context
Read `/home/z/my-project/worklog.md` first (Tasks 1 & 3 built the backend; Task 2/5 the frontend). The app previously used a client-generated `uid` (localStorage) owning conversations. Task 8 replaced it with real accounts + signed session cookies.

## What was delivered

### Database (prisma/schema.prisma — appended only)
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String   // "salt:hash" hex, scrypt
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```
Conversation & Message untouched. `bun run db:push` applied.

### src/lib/auth.ts (server-only)
- `hashPassword(pw)` → `salt-hex:scrypt-hex` (randomBytes(16) salt, scryptSync 64)
- `verifyPassword(pw, stored)` → same hex-string salt + timingSafeEqual; returns false on malformed; never throws. **Gotcha:** salt must be passed to scryptSync as the same STRING used at hash time (decoding hex changes the salt bytes → login always fails).
- Token: `base64url(JSON {uid,email,name,iat,exp})` + `.` + HMAC-SHA256 hex; secret `process.env.AUTH_SECRET || "playbeat-dev-secret-0800809003"` (stable dev fallback so cookies survive restarts)
- `signSessionToken(user)`, `getSessionUser()` (awaits `cookies()` — Next 16 async; null on malformed/expired/tampered, never throws)
- Exports `SESSION_COOKIE = "pb_session"`, `SESSION_MAX_AGE = 60*60*24*30`

### API contract (all JSON, no stacks)
- `POST /api/auth/signup` `{name?, email, password}` → **201** `{user:{id,name,email,createdAt}}` + Set-Cookie pb_session (httpOnly, lax, /, 30d); duplicate email → **409** `"That email already has an account — log in instead."`; bad email → **400**; password outside 8..72 → **400**
- `POST /api/auth/login` `{email, password}` → **200** `{user}` + cookie; else **401** `"Wrong email or password."`
- `POST /api/auth/logout` → **200** `{ok:true}` (clears cookie, works without session)
- `GET /api/auth/me` → **200** `{user}` (fresh DB row by uid) / **401** `{error:"Not signed in"}`
- `GET /api/conversations` → session-owned list `{conversations}` (updatedAt desc, take 50); **401** `"Sign in to keep your sessions."` without session
- `POST /api/conversations` `{title?}` → **201** `{conversation}` (uid = session user's uid)
- `GET|DELETE /api/conversations/[id]`, `GET /api/conversations/[id]/messages` → same shapes; wrong owner → **404** `"Conversation not found"`
- `POST /api/chat` `{conversationId?, message}` (uid field ignored) → **200** `{conversationId, conversation, reply}`; **401** without session; **404** foreign conversationId; **502** KIMI failure
- `GET /api/health` → added `auth:"live"`, still public

## Verification highlights (curl + cookie jars)
- Real-LLM chat WITH cookie: auto-created session, reply in ~0.7s ("Let's ignite the creative spark…"); follow-up respected history (messageCount 2→4)
- Cross-account: account B reading/chating into account A's conversation → **404** (id probing safe)
- Tampered cookie signature → **401**; logout → me **401**; wrong password → **401**
- Test data cleaned: 2 users + 2 conversations (4 msgs) deleted; users=0 (a pre-existing conversation owned by the main agent's frontend-test client-uid was left alone)

## Environment gotcha for future agents
After `prisma db:push`/`generate`, the running Turbopack dev server keeps the OLD `@prisma/client` module in memory (singleton on globalThis) → `db.<NewModel>` is undefined → 500s. Hot reload does NOT pick up regenerated node_modules code. Fix used: temporarily comment `next.config.ts` → Next auto-restarts the dev server on config change → revert (file restored byte-identical). Never kill the dev server — it is unsupervised (`/start.sh` launches `bun run dev &` once); killing it takes the app down permanently.

## Files
- prisma/schema.prisma (User appended)
- src/lib/auth.ts (new)
- src/app/api/auth/_lib/session.ts, signup|login|logout|me/route.ts (new)
- src/app/api/chat/route.ts, conversations/route.ts, conversations/[id]/route.ts, conversations/[id]/messages/route.ts (session ownership)
- src/app/api/health/route.ts (+auth:"live")
- next.config.ts & src/lib/db.ts — temporarily nudged for the dev-server reload, restored byte-identical (git diff clean)
