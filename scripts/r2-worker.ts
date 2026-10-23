/**
 * r2-worker.ts — upload the "voltaire-world" Worker that serves the VOLTAIRE
 * bucket at voltaire.playbeat.digital.
 *
 * Architecture (since Task 25): the hostname is a Workers Domain owned by
 * this Worker (R2 has no index-document resolution, so a bare "/" on an R2
 * custom domain 404s). The Worker maps "/" → index.html, pretty paths,
 * range/ETag — and since Task 28 also backs the sign-in session API
 * (POST /api/auth/firebase · GET /api/auth/me · POST /api/auth/logout).
 *
 * Source: scripts/voltaire-worker.js (kept as a real file, not an inline
 * string, so it can be linted/read on its own).
 */
import { readFile } from "node:fs/promises";
import { AwsClient } from "aws4fetch";

const SCRIPT = "voltaire-world";
const HOSTNAME = "voltaire.playbeat.digital";
const TOKEN = process.env.R2_API_TOKEN!;
const ACCT = process.env.R2_ACCOUNT_ID!;

async function main() {
  const workerSource = await readFile("scripts/voltaire-worker.js", "utf8");

  // 1. upload the Worker (multipart: metadata + module)
  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2026-01-01",
    bindings: [{ type: "r2_bucket", name: "VOLTAIRE", bucket_name: "voltaire" }],
  };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("worker.js", new Blob([workerSource], { type: "application/javascript+module" }), "worker.js");
  const up = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/workers/scripts/${SCRIPT}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });
  console.log(`upload worker: ${up.status} ${(await up.text()).slice(0, 240)}`);
  if (!up.ok) process.exit(1);

  // 2. confirm the Workers Domain still holds the hostname
  const domains = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/workers/domains`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  }).then((r) => r.json());
  const held = (domains.result ?? []).some(
    (d: { hostname?: string; service?: string }) =>
      d.hostname === HOSTNAME && d.service === SCRIPT,
  );
  console.log(`workers domain ${HOSTNAME}: ${held ? "attached to " + SCRIPT + " ✓" : "NOT attached — re-run the Task-25 PUT /workers/domains fix"}`);
  if (!held) {
    const attach = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/workers/domains`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        hostname: HOSTNAME,
        zone_id: "1cb2b3ac243514b2e2a090d77545f5b8",
        service: SCRIPT,
        environment: "production",
      }),
    });
    console.log(`re-attach workers domain: ${attach.status} ${(await attach.text()).slice(0, 240)}`);
  }

  // 3. drop the stray "/" object from the bucket (sigv4)
  const s3 = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  });
  const del = await s3.fetch(`${process.env.R2_ENDPOINT}/voltaire//`, { method: "DELETE" });
  console.log(`cleanup "/" object: ${del.status}`);

  // 4. verify static + API surfaces
  await new Promise((r) => setTimeout(r, 4000));
  for (const p of ["/", "/index.html", "/signin.html", "/img/world-07.jpg", "/media/voltaire-beat.mp4", "/logo.html", "/bots.html"]) {
    const res = await fetch(`https://${HOSTNAME}${p}`, { method: "HEAD" }).catch((e) => e);
    console.log(
      `  ${p} → ${res instanceof Response ? res.status + " " + (res.headers.get("content-type") || "") : String(res)}`,
    );
  }
  const garbage = await fetch(`https://${HOSTNAME}/api/auth/firebase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: "garbage" }),
  });
  console.log(`  POST /api/auth/firebase (garbage) → ${garbage.status} ${await garbage.text()}`);
  const me = await fetch(`https://${HOSTNAME}/api/auth/me`);
  console.log(`  GET /api/auth/me (no cookie) → ${me.status}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
