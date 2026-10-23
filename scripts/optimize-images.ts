/**
 * Task 1 helper — resize uploaded PlayBeat photos into web-ready assets.
 * Usage: bun run scripts/optimize-images.ts
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = "/home/z/my-project/upload";
const OUT = "/home/z/my-project/public/images";

const jobs = [
  { src: "vecteezy_attractive-woman-in-a-dj-headphonesand-sunglasse_26911377.jpg", out: "dj-headphones.jpg", width: 1600 },
  { src: "vecteezy_portrait-of-a-beautiful-young-woman-in-neon-lights-night_32735577.jpg", out: "neon-portrait.jpg", width: 1200 },
  { src: "vecteezy_silhouette-of-a-gracefully-dancing-woman-in-a-blue-haze-and_56791700.jpg", out: "dancing-silhouette.jpg", width: 1200 },
  { src: "vecteezy_live-drum-on-stage-with-spotlights-illuminating-smoke-music_27597944.jpg", out: "drum-stage.jpg", width: 1600 },
  { src: "AdobeStock_765860262_Preview.jpeg", out: "adobe-stage.jpg", width: 1000 },
];

await mkdir(OUT, { recursive: true });

for (const job of jobs) {
  const input = path.join(SRC, job.src);
  const output = path.join(OUT, job.out);
  const meta = await sharp(input)
    .resize({ width: job.width, withoutEnlargement: true })
    .jpeg({ quality: 76, mozjpeg: true, progressive: true })
    .toFile(output);
  console.log(`✔ ${job.out}  ${Math.round(meta.size / 1024)}KB  ${meta.width}x${meta.height}`);
}
console.log("done");
