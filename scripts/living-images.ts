/**
 * living-images.ts — process the VOLTAIRE living-world photos for the main site.
 *
 * Sources: the 12 images embedded in "VOLTAIRE — Full Regeneration (2).html"
 * (already extracted to /tmp/voltaire-extract) + AdobeStock_765860262_Preview.jpeg.
 *
 * Grade: gentle — keep the photos ALIVE (real humans living a life), just
 * soften saturation a touch and lift warmth so they sit on the navy site
 * without fighting it. NOT a monochrome regrade — life needs color.
 *
 * Output: public/images/living/living-01..12.jpg + living-adobe.jpg
 */
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "/tmp/voltaire-extract";
const OUT = path.resolve(process.cwd(), "public/images/living");

async function grade(src: string, dest: string) {
  const buf = await readFile(src);
  const out = await sharp(buf)
    .resize({ width: 1000, withoutEnlargement: true })
    .modulate({ saturation: 0.88, brightness: 1.04 })
    .linear(1.06, -8)
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  await writeFile(dest, out);
  return (out.length / 1024).toFixed(0);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const files = (await readdir(SRC)).filter((f) => /^uploadVOLTAIREFullRe_\d+\.jpg$/.test(f));
  files.sort();
  for (const f of files) {
    const n = f.match(/_(\d+)/)![1];
    const kb = await grade(path.join(SRC, f), path.join(OUT, `living-${n}.jpg`));
    console.log(`  world-${n} → living-${n}.jpg ${kb}KB`);
  }
  const kb = await grade(
    path.resolve(process.cwd(), "upload/AdobeStock_765860262_Preview.jpeg"),
    path.join(OUT, "living-adobe.jpg"),
  );
  console.log(`  adobe → living-adobe.jpg ${kb}KB`);

  // originals (ungraded) for the R2 world page — copy alongside
  for (const f of files) {
    const n = f.match(/_(\d+)/)![1];
    await copyFile(path.join(SRC, f), path.join(OUT, `world-orig-${n}.jpg`));
  }
  console.log(`Done: ${files.length} living + adobe, ${files.length} originals staged.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
