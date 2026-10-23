/**
 * r2-deploy.ts — build + deploy the VOLTAIRE world to Cloudflare R2.
 *
 * Target: voltaire.playbeat.digital (bucket custom domain) with the
 * r2.dev public URL as fallback.
 *
 * Bucket layout:
 *   index.html   ← "VOLTAIRE — Full Regeneration (2).html", hero frame swapped
 *                   to the living film (sound toggle), assets → /img/world-*.jpg
 *   logo.html    ← "PlayBeat Voltaire (2).html" blue-fire V (PNG → /img/voltaire-logo.png)
 *   signin.html  ← "PlayBeat VOLTAIRE | Sign in / Sign up (3).html" (webp → /img/…)
 *   bots.html    ← "Model Bots (1).html" as-is
 *   img/world-01..12.jpg, img/voltaire-logo.png, img/voltaire-signin.webp
 *   media/voltaire-beat.mp4, media/voltaire-poster.jpg
 *
 * Auth: R2_* vars from .env (S3 sigv4 via aws4fetch + Bearer API token).
 */
import { AwsClient } from "aws4fetch";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const {
  R2_ACCOUNT_ID: ACCT,
  R2_API_TOKEN: TOKEN,
  R2_ACCESS_KEY_ID: KEY,
  R2_SECRET_ACCESS_KEY: SECRET,
  R2_ENDPOINT: EP,
} = process.env as Record<string, string>;
const BUCKET = "voltaire";
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCT}`;
const OUT = "/tmp/r2-bucket";

if (!ACCT || !TOKEN || !KEY || !SECRET || !EP) {
  console.error("Missing R2_* env vars (put them in .env)");
  process.exit(1);
}

/* ────────────────────────── build the bucket ────────────────────────── */

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".svg": "image/svg+xml",
};

async function build() {
  const rm = await (await import("node:fs/promises")).rm;
  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, "img"), { recursive: true });
  await mkdir(path.join(OUT, "media"), { recursive: true });

  // assets
  for (let i = 1; i <= 12; i++) {
    await copyFile(
      path.resolve("public/images/living", `world-orig-${String(i).padStart(2, "0")}.jpg`),
      path.join(OUT, "img", `world-${String(i).padStart(2, "0")}.jpg`),
    );
  }
  await copyFile("/tmp/voltaire-extract/uploadPlayBeatVoltai_01.png", path.join(OUT, "img/voltaire-logo.png"));
  await copyFile("/tmp/voltaire-extract/uploadPlayBeatVOLTAI_01.webp", path.join(OUT, "img/voltaire-signin.webp"));
  // The world page carries the ORIGINAL vibrant film (the user's reference),
  // NOT the main-site amber regrade in public/media — byte-identical upload.
  const FILM = "upload/VOLTAIRE — People Playing With The Beat.mp4";
  await copyFile(FILM, path.join(OUT, "media/voltaire-beat.mp4"));
  // Poster: the film's hero moment (~2.4s), extracted vibrant from the original.
  const poster = spawnSync("ffmpeg", [
    "-y", "-loglevel", "error", "-ss", "2.4", "-i", FILM,
    "-frames:v", "1", "-q:v", "3", "-f", "mjpeg", "pipe:1",
  ]);
  if (poster.status !== 0 || !poster.stdout?.length) throw new Error("poster extraction failed");
  await writeFile(path.join(OUT, "media/voltaire-poster.jpg"), poster.stdout);

  // ── index.html — the living world page ──
  let world = await readFile("upload/VOLTAIRE — Full Regeneration (2).html", "utf8");

  // 1. hero frame → the film (breathing humans on the beat)
  world = world.replace(
    /<div class="frame-inner" style="background-image:url\('data:image\/jpeg;base64,[^']+'\)">/,
    `<div class="frame-inner" style="background-image:url('/img/world-01.jpg')">` +
      `<video id="film" src="/media/voltaire-beat.mp4?v=2" poster="/media/voltaire-poster.jpg?v=2" autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>`,
  );
  world = world.replace(
    `<div class="frame-badge">♪ Feel the bass — tap to turn on sound</div>`,
    `<button class="frame-badge" id="soundBtn" type="button" aria-pressed="false" style="cursor:pointer;font:inherit;border:1px solid var(--border)">♪ Feel the bass — tap to turn on sound</button>`,
  );

  // 2. remaining embedded images → /img/world-NN.jpg (02..12 after the frame swap)
  let n = 1;
  world = world.replace(/data:image\/jpeg;base64,[A-Za-z0-9+/=]{100,}/g, () => {
    n++;
    return `/img/world-${String(n).padStart(2, "0")}.jpg`;
  });

  // 4. brand → main site
  world = world.replace(
    /<div class="brand">([\s\S]*?)<\/div>\s*<\/div>/,
    `<a class="brand" href="https://playbeatdigital.world" style="text-decoration:none;color:inherit">$1</div></a>`,
  );
  // nav: a Sign in link to the world's sign-in page (Task 28)
  world = world.replace(
    `<span class="pill mono"><i class="pulse-dot"></i>WORLD PREVIEW</span>`,
    `<span class="pill mono"><i class="pulse-dot"></i>WORLD PREVIEW</span>\n    <a class="ghost" href="/signin.html" style="text-decoration:none">Sign in</a>`,
  );
  world = world
    .replace(
      `<button class="cta">Enter the world ↗</button>`,
      `<a class="cta" href="#scenes" style="text-decoration:none">Enter the world ↗</a>`,
    )
    .replace(
      `<button class="cta">Enter the world</button>`,
      `<a class="cta" href="#scenes" style="text-decoration:none">Enter the world</a>`,
    )
    .replace(
      `<button class="ghost">Explore the worlds ↓</button>`,
      `<a class="ghost" href="#street" style="text-decoration:none">Explore the worlds ↓</a>`,
    )
    .replace(
      `<button class="cta">Enter VOLTAIRE ↗</button>`,
      `<a class="cta" href="https://playbeatdigital.world#studio" style="text-decoration:none">Enter VOLTAIRE ↗</a>`,
    );

  // 4. favicon + sound toggle script
  world = world.replace(
    `<title>VOLTAIRE — People Playing With The Beat</title>`,
    `<title>VOLTAIRE — People Playing With The Beat</title>` +
      `\n  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230A0C12'/%3E%3Ctext x='32' y='44' font-family='sans-serif' font-weight='700' font-size='36' text-anchor='middle' fill='%23FF7A3D'%3EV%3C/text%3E%3C/svg%3E">`,
  );
  world = world.replace(
    `</body>`,
    `<script>
  (function(){
    var v=document.getElementById('film'),b=document.getElementById('soundBtn');
    if(!v||!b)return;
    b.addEventListener('click',function(){
      v.muted=!v.muted;
      b.textContent=v.muted?'♪ Feel the bass — tap to turn on sound':'♪ Bass on — tap to mute';
      b.setAttribute('aria-pressed',String(!v.muted));
      if(!v.musted&&v.paused)v.play().catch(function(){});
    });
  })();
  </script>
</body>`,
  );
  await writeFile(path.join(OUT, "index.html"), world);

  // ── logo.html — blue-fire V ──
  let logo = await readFile("upload/PlayBeat Voltaire (2).html", "utf8");
  logo = logo.replace(/data:image\/png;base64,[A-Za-z0-9+/=]{100,}/g, "/img/voltaire-logo.png");
  await writeFile(path.join(OUT, "logo.html"), logo);

  // ── signin.html — real Firebase sign-in (Task 28) ──
  let signin = await readFile("upload/PlayBeat VOLTAIRE _ Sign in _ Sign up (3).html", "utf8");
  signin = signin.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]{100,}/g, "/img/voltaire-signin.webp");
  // Inject the federated UI + phone flow + signed-in panel + module script
  // right before the .volt-auth-card closes (after both tab panels).
  const authInject = await readFile("scripts/voltaire-auth.inject.html", "utf8");
  const formEnd = signin.lastIndexOf("</form>");
  if (formEnd < 0) throw new Error("signin.html: no <form> found");
  const panelClose = signin.indexOf("</div>", formEnd); // closes #signup tab panel
  const cardClose = signin.indexOf("</div>", panelClose + 6); // closes .volt-auth-card
  if (panelClose < 0 || cardClose < 0) throw new Error("signin.html: card structure not found");
  signin = signin.slice(0, cardClose) + "\n  " + authInject + "\n  " + signin.slice(cardClose);
  // Give the card an id for the busy-state CSS hook.
  signin = signin.replace('class="volt-auth-card"', 'class="volt-auth-card" id="volt-auth-card"');
  await writeFile(path.join(OUT, "signin.html"), signin);

  // ── bots.html ──
  await copyFile("upload/Model Bots (1).html", path.join(OUT, "bots.html"));

  const count = (await walk(OUT)).length;
  console.log(`built ${count} objects → ${OUT}`);
}

/* ────────────────────────── upload + domains ────────────────────────── */

async function walk(dir: string, base = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(path.join(dir, e.name), rel)));
    else out.push(rel);
  }
  return out;
}

async function api(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    result?: Record<string, unknown>;
    errors?: unknown;
  };
  return { status: res.status, json };
}

async function main() {
  await build();

  // 0. token verify
  const v = await api("GET", `https://api.cloudflare.com/client/v4/accounts/${ACCT}/tokens/verify`);
  console.log(`token verify: ${v.status} ${JSON.stringify(v.json.result ?? {})}`);

  const s3 = new AwsClient({ accessKeyId: KEY, secretAccessKey: SECRET, service: "s3", region: "auto" });

  // 1. ensure bucket
  let head = await s3.fetch(`${EP}/${BUCKET}`, { method: "HEAD" }).catch(() => null);
  if (!head || head.status === 404) {
    const put = await s3.fetch(`${EP}/${BUCKET}`, { method: "PUT" });
    console.log(`create bucket: ${put.status} ${put.statusText}`);
  } else {
    console.log(`bucket exists (HEAD ${head?.status})`);
  }

  // 2. upload objects
  const files = await walk(OUT);
  let ok = 0;
  for (const rel of files) {
    const buf = await readFile(path.join(OUT, rel));
    const ext = path.extname(rel);
    const res = await s3.fetch(`${EP}/${BUCKET}/${rel}`, {
      method: "PUT",
      body: buf,
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control":
          rel === "index.html" || rel === "signin.html"
            ? "public, max-age=300"
            : "public, max-age=3600",
      },
    });
    if (res.ok) ok++;
    else console.error(`  ✗ ${rel}: ${res.status} ${res.statusText}`);
  }
  console.log(`uploaded ${ok}/${files.length} objects`);

  // 3. public r2.dev — PUT domains/managed {"enabled":true}
  let worldUrl = "";
  const pubEnable = await api("PUT", `${API}/r2/buckets/${BUCKET}/domains/managed`, { enabled: true });
  console.log(`public r2.dev: ${pubEnable.status} ${JSON.stringify(pubEnable.json.result ?? pubEnable.json.errors).slice(0, 140)}`);
  const pub = await api("GET", `${API}/r2/buckets/${BUCKET}/domains/managed`);
  const domain = (pub.json.result as { domain?: string } | undefined)?.domain;
  if (domain) {
    worldUrl = `https://${domain}`;
    console.log(`r2.dev: ${worldUrl}`);
  }

  // 4. custom domain — SAFE attach: the hostname has been served by the
  // "voltaire-world" Worker via a Workers Domain since Task 25 (an R2
  // custom domain on the same hostname caused the bare-"/" 404). Only POST
  // the R2 custom domain when the Workers Domain is NOT in place.
  let custom = false;
  const workersDomains = await api("GET", `${API}/workers/domains`);
  const workerHolds = ((workersDomains.json.result ?? []) as { hostname?: string; service?: string }[]).some(
    (d) => d.hostname === "voltaire.playbeat.digital" && d.service === "voltaire-world",
  );
  if (workerHolds) {
    custom = true;
    worldUrl = "https://voltaire.playbeat.digital";
    console.log("hostname held by workers domain (voltaire-world) ✓ — skipping R2 custom domain");
  } else {
    const att = await api("POST", `${API}/r2/buckets/${BUCKET}/domains/custom`, {
      domain: "voltaire.playbeat.digital",
      zoneId: "1cb2b3ac243514b2e2a090d77545f5b8",
      enabled: true,
    });
    if (att.status < 300 && att.json.success) {
      custom = true;
      console.log("custom domain attached: voltaire.playbeat.digital ✓");
    } else {
      console.log(`custom domain attach failed: ${att.status}`, JSON.stringify(att.json.errors));
    }
  }

  await writeFile("/tmp/r2-world-url.txt", worldUrl);
  console.log(`\nWORLD URL: ${worldUrl || "(none — enable public access in R2 dashboard)"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
