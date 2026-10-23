/**
 * r2-worker.ts — serve the VOLTAIRE bucket at voltaire.playbeat.digital.
 *
 * R2 public access has no index-document resolution, so a tiny module Worker
 * with an R2 binding maps "/" → "index.html" (plus pretty-path fallback and
 * range/ETag support) and a zone Workers route captures the subdomain.
 */
import { AwsClient } from "aws4fetch";

const ZONE = "1cb2b3ac243514b2e2a090d77545f5b8";
const SCRIPT = "voltaire-world";
const PATTERN = "voltaire.playbeat.digital/*";
const TOKEN = process.env.R2_API_TOKEN!;
const ACCT = process.env.R2_ACCOUNT_ID!;

const WORKER = `const MIME = {
  html: "text/html; charset=utf-8",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  svg: "image/svg+xml",
};
export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const url = new URL(request.url);
    let key = decodeURIComponent(url.pathname).replace(/^\\/+/, "");
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
      key === "index.html" ? "public, max-age=300" : "public, max-age=3600",
    );
    if (object.range) {
      const end = object.range.end ?? object.size - 1;
      headers.set("content-range", \`bytes \${object.range.offset}-\${end}/\${object.size}\`);
    }
    const status = object.body
      ? request.headers.get("range") && object.range
        ? 206
        : 200
      : 304;
    return new Response(object.body, { headers, status });
  },
};
`;

async function main() {
  // 1. upload the Worker (multipart: metadata + module)
  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2026-01-01",
    bindings: [{ type: "r2_bucket", name: "VOLTAIRE", bucket_name: "voltaire" }],
  };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("worker.js", new Blob([WORKER], { type: "application/javascript+module" }), "worker.js");
  const up = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/workers/scripts/${SCRIPT}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });
  console.log(`upload worker: ${up.status} ${(await up.text()).slice(0, 240)}`);

  // 2. zone route for the subdomain
  let route = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE}/workers/routes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pattern: PATTERN, script: SCRIPT }),
  });
  console.log(`route: ${route.status} ${(await route.text()).slice(0, 300)}`);
  if (route.status === 400) {
    // maybe an identical route exists — list and reuse
    const list = await (
      await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE}/workers/routes`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      })
    ).json();
    console.log("existing routes:", JSON.stringify(list.result));
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

  // 4. verify
  await new Promise((r) => setTimeout(r, 4000));
  for (const p of ["/", "/index.html", "/img/world-07.jpg", "/media/voltaire-beat.mp4", "/logo.html", "/bots.html", "/signin.html"]) {
    const res = await fetch(`https://voltaire.playbeat.digital${p}`, { method: "HEAD" }).catch((e) => e);
    console.log(
      `  ${p} → ${res instanceof Response ? res.status + " " + (res.headers.get("content-type") || "") : String(res)}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
