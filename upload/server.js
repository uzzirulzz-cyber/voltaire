/**
 * PlayBeat AI — playbeatdigital.world
 * A ComfyUI-node-graph-inspired AI chat app.
 *
 * Backend: Express + Firebase Admin SDK
 *  - Verifies Firebase ID tokens (Google / GitHub / Email sign-in)
 *  - Stores conversations & messages in Cloud Firestore
 *  - Proxies prompts to an OpenAI-compatible model (key stays server-side)
 *
 * Setup:
 *  1. npm install
 *  2. Firebase Console → Project settings → Service accounts → Generate new private key
 *     → save as config/serviceAccountKey.json
 *  3. (optional) set OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL in .env
 *     without a key the server runs a local mock pipeline so the UI still works
 *  4. npm start → http://localhost:3000
 */
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const PORT = process.env.PORT || 3000;
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0800809003";

/* AI provider config (all optional — mock fallback when unset) */
const AI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const AI_KEY = process.env.OPENAI_API_KEY || "";
const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/* ── Firebase Admin ────────────────────────────────────────────────────── */
const saPath = path.join(__dirname, "config", "serviceAccountKey.json");
if (!fs.existsSync(saPath)) {
  console.warn("\n⚠  config/serviceAccountKey.json missing — copy from");
  console.warn("   config/serviceAccountKey.example.json and paste your key.\n");
}
let db = null;
try {
  if (fs.existsSync(saPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(require(saPath)),
      projectId: PROJECT_ID,
    });
    db = admin.firestore();
    console.log("✔ Firebase Admin SDK initialized —", PROJECT_ID);
  }
} catch (e) { console.error("✖ Firebase init failed:", e.message); }

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

async function requireAuth(req, res, next) {
  if (!db) return res.status(503).json({ error: "Firebase not configured on server" });
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing Bearer token" });
  try { req.user = await admin.auth().verifyIdToken(token); next(); }
  catch (e) { res.status(401).json({ error: "Invalid or expired token" }); }
}

/* ── AI pipeline ───────────────────────────────────────────────────────── */
async function runPipeline(messages) {
  if (!AI_KEY) {
    // Local mock node so the graph stays alive without a provider key
    const last = messages[messages.length - 1]?.content || "";
    await new Promise(r => setTimeout(r, 700));
    return {
      role: "assistant",
      content: `⚡ **Local pipeline response** (no OPENAI_API_KEY set)\n\n` +
        `I received your prompt through the PlayBeat node graph:\n\n` +
        `> ${last.slice(0, 300)}\n\n` +
        `Wire up a model by setting \`OPENAI_API_KEY\` on the server and every ` +
        `node — prompt → route → generate → deliver — goes live.`,
      model: "playbeat-mock-1",
    };
  }
  const r = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_KEY}` },
    body: JSON.stringify({ model: AI_MODEL, messages, temperature: 0.7 }),
  });
  if (!r.ok) throw new Error(`Model provider error ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return { role: "assistant", content: d.choices[0].message.content, model: d.model || AI_MODEL };
}

/* ── Health ────────────────────────────────────────────────────────────── */
app.get("/api/health", (req, res) => res.json({
  ok: true, project: PROJECT_ID,
  firebase: db ? "connected" : "not-configured",
  ai: AI_KEY ? `live (${AI_MODEL})` : "mock-pipeline",
  time: new Date().toISOString(),
}));

/* ── Auth session / profile upsert ─────────────────────────────────────── */
app.post("/api/auth/session", requireAuth, async (req, res) => {
  const { uid, email, name, picture, firebase } = req.user;
  const profile = {
    uid, email: email || null, name: name || null, picture: picture || null,
    provider: firebase?.sign_in_provider || "unknown",
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection("users").doc(uid).set(profile, { merge: true });
  res.json({ uid, profile });
});

/* ── Conversations ─────────────────────────────────────────────────────── */
app.get("/api/conversations", requireAuth, async (req, res) => {
  const snap = await db.collection("conversations")
    .where("uid", "==", req.user.uid)
    .orderBy("updatedAt", "desc").limit(50).get();
  res.json({ conversations: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
});

app.post("/api/conversations", requireAuth, async (req, res) => {
  const ref = await db.collection("conversations").add({
    uid: req.user.uid,
    title: (req.body?.title || "New session").slice(0, 80),
    model: AI_MODEL,
    messageCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ id: ref.id });
});

app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
  const conv = await db.collection("conversations").doc(req.params.id).get();
  if (!conv.exists || conv.data().uid !== req.user.uid)
    return res.status(404).json({ error: "Conversation not found" });
  const snap = await conv.ref.collection("messages").orderBy("at", "asc").limit(200).get();
  res.json({ messages: snap.docs.map(d => d.data()) });
});

/* ── Chat: the pipeline endpoint ───────────────────────────────────────── */
app.post("/api/chat", requireAuth, async (req, res) => {
  const { conversationId, message } = req.body || {};
  if (!message || !String(message).trim())
    return res.status(400).json({ error: "message is required" });

  const convRef = db.collection("conversations").doc(conversationId || "");
  const conv = await convRef.get();
  if (!conv.exists || conv.data().uid !== req.user.uid)
    return res.status(404).json({ error: "Conversation not found" });

  const now = admin.firestore.FieldValue.serverTimestamp();
  await convRef.collection("messages").add({
    role: "user", content: String(message).slice(0, 4000), at: now,
  });

  // rebuild prompt window from history
  const hist = await convRef.collection("messages").orderBy("at", "asc").limit(40).get();
  const window_ = hist.docs.map(d => ({ role: d.data().role, content: d.data().content }));

  let reply;
  try { reply = await runPipeline(window_); }
  catch (e) { return res.status(502).json({ error: e.message }); }

  await convRef.collection("messages").add({ ...reply, at: now });
  if (conv.data().messageCount === 0) {
    await convRef.update({
      title: String(message).slice(0, 42) + (message.length > 42 ? "…" : ""),
    });
  }
  await convRef.update({
    messageCount: admin.firestore.FieldValue.increment(2),
    updatedAt: now,
  });

  res.json({ reply });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => {
  console.log(`\n▶ playbeatdigital.world running at http://localhost:${PORT}`);
  console.log(`  AI pipeline: ${AI_KEY ? AI_MODEL : "mock (set OPENAI_API_KEY to go live)"}\n`);
});
