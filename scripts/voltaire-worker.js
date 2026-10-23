/**
 * voltaire-worker.js — serves the VOLTAIRE world from R2 at
 * voltaire.playbeat.digital (Workers Domain on this hostname) and backs the
 * sign-in session API for the world site (Task 28).
 *
 * Static:  "/" → index.html, pretty paths, range + ETag (unchanged).
 * API:     POST /api/auth/firebase  {idToken} → verify via Google tokeninfo
 *                                   → HttpOnly signed session cookie
 *          GET  /api/auth/me        → current session user
 *          POST /api/auth/logout    → clear the cookie
 *
 * The session scheme mirrors the main app (src/lib/auth.ts): a base64url
 * JSON payload + "." + HMAC-SHA256-hex signature, stored in an HttpOnly
 * cookie. The world site has no database — the verified Firebase identity
 * IS the session.
 */
const MIME = {
  html: "text/html; charset=utf-8",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  svg: "image/svg+xml",
};

/* ── session config ─────────────────────────────────────────────────── */
const SESSION_SECRET = "2fab4976fed786724d20e1190af5ea13d49815051abca594a74161a009f2913a";
const SESSION_COOKIE = "pb_world_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const FIREBASE_PROJECT_ID = "gen-lang-client-0800809003";
const TOKEN_MAX_LEN = 4096;

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ── base64url (unicode-safe) ───────────────────────────────────────── */
function b64urlEncode(str) {
  const bytes = enc.encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(segment) {
  const bin = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return dec.decode(bytes);
}

/* ── HMAC-SHA256 hex ────────────────────────────────────────────────── */
async function hmacHex(data) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ── session tokens ─────────────────────────────────────────────────── */
async function makeSessionToken(user) {
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    uid: user.uid,
    name: user.name,
    email: user.email,
    provider: user.provider,
    photoUrl: user.photoUrl ?? null,
    iat,
    exp: iat + SESSION_MAX_AGE,
  };
  const segment = b64urlEncode(JSON.stringify(payload));
  return segment + "." + (await hmacHex(segment));
}

async function readSession(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(
    new RegExp(SESSION_COOKIE.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&") + "=([^;]+)")
  );
  if (!match) return null;
  const token = match[1];
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const segment = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = await hmacHex(segment);
  if (signature.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) return null;
  let payload;
  try {
    payload = JSON.parse(b64urlDecode(segment));
  } catch {
    return null;
  }
  if (
    typeof payload.uid !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.exp !== "number" ||
    payload.exp <= Math.floor(Date.now() / 1000)
  ) {
    return null;
  }
  return payload;
}

/* ── Firebase ID-token verification — proper RS256/JWKS ────────────
 * Google's oauth2 tokeninfo endpoint REJECTS Firebase ID tokens (they
 * are signed by the securetoken infrastructure, not Google OAuth), so the
 * token is verified the way the Firebase Admin SDK does it:
 *   1. RS256 signature against the public JWK for the token's `kid`
 *      (https://www.googleapis.com/service_accounts/v1/jwk/
 *       securetoken@system.gserviceaccount.com)
 *   2. iss === https://securetoken.google.com/<projectId>
 *   3. aud === <projectId>, sub present, exp in the future
 * Claims in the raw payload: email_verified is a REAL boolean and
 * `firebase` is a nested OBJECT (tokeninfo returned strings — not here). */
const JWK_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
let jwkCache = null; // { keys: JsonWebKey[], fetchedAt: number }

async function getFirebaseKeys() {
  if (jwkCache && Date.now() - jwkCache.fetchedAt < 6 * 60 * 60 * 1000) {
    return jwkCache.keys;
  }
  const res = await fetch(JWK_URL);
  if (!res.ok) throw new Error("jwk fetch failed");
  const data = await res.json();
  jwkCache = { keys: data.keys || [], fetchedAt: Date.now() };
  return jwkCache.keys;
}

function b64urlToBytes(segment) {
  const bin = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function verifyIdToken(idToken) {
  if (!idToken || idToken.length > TOKEN_MAX_LEN) return null;
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const header = JSON.parse(b64urlDecode(h));
    const payload = JSON.parse(b64urlDecode(p));
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
    const now = Math.floor(Date.now() / 1000);
    if (
      payload.aud !== FIREBASE_PROJECT_ID ||
      payload.iss !== "https://securetoken.google.com/" + FIREBASE_PROJECT_ID ||
      typeof payload.exp !== "number" ||
      payload.exp <= now ||
      typeof payload.sub !== "string" ||
      !payload.sub ||
      payload.sub.length > 128
    ) {
      return null;
    }
    const keys = await getFirebaseKeys();
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signatureOk = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      b64urlToBytes(s),
      enc.encode(h + "." + p)
    );
    if (!signatureOk) return null;

    let provider = "phone";
    const fb = payload.firebase;
    if (fb && typeof fb === "object" && typeof fb.sign_in_provider === "string") {
      if (fb.sign_in_provider === "google.com") provider = "google";
      else if (fb.sign_in_provider === "github.com") provider = "github";
      else if (fb.sign_in_provider === "facebook.com") provider = "facebook";
      else if (fb.sign_in_provider === "password") provider = "password";
    }
    return {
      uid: payload.sub,
      provider,
      email: typeof payload.email === "string" ? payload.email.toLowerCase() : null,
      name:
        typeof payload.name === "string" && payload.name.trim()
          ? payload.name.trim().slice(0, 60)
          : null,
      photoUrl: typeof payload.picture === "string" ? payload.picture : null,
      phone:
        typeof payload.phone_number === "string" && payload.phone_number.startsWith("+")
          ? payload.phone_number
          : null,
    };
  } catch {
    return null;
  }
}

/* ── helpers ────────────────────────────────────────────────────────── */
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function withCookie(res, value, maxAge) {
  res.headers.append(
    "Set-Cookie",
    SESSION_COOKIE + "=" + value + "; Max-Age=" + maxAge + "; Path=/; HttpOnly; Secure; SameSite=Lax"
  );
  return res;
}

/* ── API router ─────────────────────────────────────────────────────── */
async function handleApi(request, url) {
  const path = url.pathname;

  if (path === "/api/auth/firebase" && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const idToken =
      body && typeof body.idToken === "string" ? body.idToken.trim() : "";
    const identity = await verifyIdToken(idToken);
    if (!identity) {
      return json(
        { error: "That sign-in couldn’t be verified — please try again." },
        401
      );
    }
    const user = {
      uid: identity.uid,
      provider: identity.provider,
      email:
        identity.email ??
        (identity.phone
          ? identity.phone.replace(/\D/g, "").slice(0, 24) + "@phone.playbeat.digital"
          : identity.uid.replace(/\W/g, "").slice(0, 24) + "@firebase.playbeat.digital"),
      name:
        identity.name ??
        (identity.phone
          ? identity.phone
          : (identity.email || "PlayBeat rider").split("@")[0]),
      photoUrl: identity.photoUrl,
    };
    const token = await makeSessionToken(user);
    return withCookie(json({ user }), token, SESSION_MAX_AGE);
  }

  if (path === "/api/auth/me" && request.method === "GET") {
    const session = await readSession(request);
    if (!session) return json({ error: "Not signed in" }, 401);
    return json({
      user: {
        uid: session.uid,
        name: session.name,
        email: session.email,
        provider: session.provider,
        photoUrl: session.photoUrl,
      },
    });
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    return withCookie(json({ ok: true }), "", 0);
  }

  return json({ error: "Not found" }, 404);
}

/* ── static serving from R2 ─────────────────────────────────────────── */
const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, url);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let key = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!key) key = "index.html";
    if (key.endsWith("/")) key += "index.html";
    let object = await env.VOLTAIRE.get(key, {
      onlyIf: request.headers,
      range: request.headers,
    });
    if (object === null) {
      object = await env.VOLTAIRE.get(key + "/index.html", {
        onlyIf: request.headers,
        range: request.headers,
      });
    }
    if (object === null) {
      return new Response("Not found in the world", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    const ext = key.split(".").pop() || "";
    if (!headers.get("content-type")) {
      headers.set("content-type", MIME[ext] || "application/octet-stream");
    }
    headers.set("etag", object.httpEtag);
    headers.set(
      "cache-control",
      key === "index.html" || key === "signin.html"
        ? "public, max-age=300"
        : "public, max-age=3600"
    );
    if (object.range) {
      const end = object.range.end ?? object.size - 1;
      headers.set("content-range", `bytes ${object.range.offset}-${end}/${object.size}`);
    }
    const status = object.body
      ? request.headers.get("range") && object.range
        ? 206
        : 200
      : 304;
    return new Response(object.body, { headers, status });
  },
};

export default worker;
