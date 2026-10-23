# Task 3 — Backend (full-stack-developer)

Task: Build the PlayBeat AI backend — KIMI pipeline helper + 5 API routes (health, conversations CRUD, messages, chat) ported from the original Express/Firestore stack.

## Files created
- `src/lib/kimi.ts` — KIMI_MODEL, KIMI_SYSTEM_PROMPT persona, runKimiPipeline() (z-ai-web-dev-sdk, thinking disabled, trailing 40-turn window, 2 retries with 1s/2s backoff, throws on empty completion).
- `src/app/api/_lib/serialize.ts` — shared ConversationJSON/MessageJSON serializers (ISO dates, roles narrowed to 'user'|'assistant'). Private `_lib` folder, excluded from routing.
- `src/app/api/health/route.ts` — GET; db check via `SELECT 1`, 503 + database:'offline' on failure.
- `src/app/api/conversations/route.ts` — GET (uid required, updatedAt desc, take 50), POST (uid required, title default "New session" sliced to 80, 201).
- `src/app/api/conversations/[id]/route.ts` — GET/DELETE with uid ownership check (404 on missing/mismatch), delete cascades messages. `params` awaited (Next 16 Promise params).
- `src/app/api/conversations/[id]/messages/route.ts` — GET; ownership check, createdAt asc, take 200.
- `src/app/api/chat/route.ts` — POST pipeline: validate (uid required; message trimmed 1..4000), load-or-create conversation (title = message.slice(0,42)+…), append user msg, last-40 history window (desc take 40 → reversed to chronological), runKimiPipeline (502 on failure), append assistant msg (model kimi-playbeat-1), messageCount += 2 (refreshes @updatedAt), returns { conversationId, conversation, reply }.

All routes: `export const dynamic = 'force-dynamic'`, Node runtime (default), JSON-only errors, no stack traces leaked.

## Verification results (curl against running dev server)
- GET /api/health → 200 {"ok":true,"project":"playbeatdigital-world","database":"connected","ai":"live","model":"kimi-playbeat-1",...}
- POST /api/conversations → 201, conversation JSON correct (uid, title, model, messageCount 0, ISO dates)
- GET /api/conversations?uid=... → 200 {conversations:[...]}; missing uid → 400
- GET /api/conversations/[id] → 200; wrong uid / bogus id → 404
- POST /api/chat (REAL LLM call, no conversationId) → 200 in ~0.8s; auto-created conversation titled from message; reply: "**Let the beat drop like a velvet curtain on a secret you can't wait to scream.**"
- POST /api/chat with conversationId → 200, messageCount 4, history respected, reply: "**Bass in the bones, lights in the soul.**"
- GET /api/conversations/[id]/messages → 200, user+assistant ordered asc, model null on user / kimi-playbeat-1 on assistant
- Error paths: missing uid 400, blank message 400, 4001-char message 400, bad conversationId 404, invalid JSON 400
- DELETE /api/conversations/[id] → {ok:true}; messages route 404 afterwards (cascade OK); wrong-uid DELETE → 404
- Cleanup: deleted both test conversations; DB verified 0 test-uid-1 conversations, 0 total messages
- ESLint scoped to `src/app/api src/lib/kimi.ts`: zero errors/warnings

## Deviations
- Added one shared file `src/app/api/_lib/serialize.ts` (under the allowed `src/app/api/**` scope) to avoid duplicating serializers across 5 routes.
- "Last 40 messages ordered createdAt asc" implemented as: fetch desc take 40, reverse to chronological (true trailing window; the original Firestore version accidentally took the *first* 40).
- History roles cast to the SDK's 'user'|'assistant'|'system' union to satisfy its ChatMessage type.
