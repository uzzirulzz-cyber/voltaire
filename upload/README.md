# PlayBeat AI — playbeatdigital.world

A **ComfyUI-node-graph-inspired AI chat app**. Ambient wired-node canvas, a live
"prompt → route → generate → deliver" pipeline, and Firebase-backed sessions —
wrapped in the PlayBeat dark/lime aesthetic.

![stack](https://img.shields.io/badge/stack-Node.js%20%C2%B7%20Express%20%C2%B7%20Firebase%20Admin%20SDK%20%C2%B7%20Firestore%20%C2%B7%20OpenAI--compatible-8B5CF6)

## Architecture

```
┌────────────────────────────┐        ┌────────────────────────────────────┐
│  Browser (public/)          │        │  server.js (Express)               │
│  · node-graph ambient canvas│  HTTPS │  · verifyIdToken()  ← Firebase auth │
│  · session sidebar          │ ─────→ │  · /api/chat        → prompt the    │
│  · chat bubbles + composer  │        │       model (key stays server-side) │
│  · Firebase client sign-in  │        │  · conversations/messages → Firestore│
│    Google · GitHub · Email  │        │  Firebase Admin SDK                │
└────────────────────────────┘        └────────────────────────────────────┘
                                          Firestore: users · conversations/{id}/messages
```

## Quick start

```bash
cd playbeatdigital-world
npm install

# 1. Firebase Console → Project settings → Service accounts
#    → "Generate new private key"  (project: gen-lang-client-0800809003)
# 2. Save it as:
cp config/serviceAccountKey.example.json config/serviceAccountKey.json
#    then paste your REAL private_key / private_key_id / client_id
# 3. (client sign-in) Firebase Console → Project settings → Web apps
#    → add a web app, paste its config into public/js/firebase-client.js
# 4. (optional, for a real model) put your key in .env:
cp .env.example .env        # set OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL
#    → without a key the server answers through a built-in mock pipeline

npm start                   # → http://localhost:3000
```

`GET /api/health` reports Firebase + AI pipeline status.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/api/health` | – | Server / Firebase / AI status |
| POST | `/api/auth/session` | Bearer ID token | Verify token, upsert `users/{uid}` |
| GET/POST | `/api/conversations` | Bearer ID token | List / create sessions |
| GET  | `/api/conversations/:id/messages` | Bearer ID token | Load a session's messages |
| POST | `/api/chat` | Bearer ID token | Append user msg → run model → append assistant msg |

## Firestore schema

```
users/{uid}                          { email, name, picture, provider, lastLogin }
conversations/{autoId}               { uid, title, model, messageCount, createdAt, updatedAt }
conversations/{autoId}/messages/{id} { role, content, model?, at }
```

## Notes

- The model API key never reaches the browser — the server proxies every prompt.
- `config/serviceAccountKey.json` must stay private (Admin SDK full-access key).
- The model endpoint is OpenAI-compatible; point `OPENAI_BASE_URL` at any
  compatible provider (OpenRouter, Groq, Together, a local llama.cpp server…).
