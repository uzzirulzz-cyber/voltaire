/**
 * regrade-images.ts — PlayBeat palette harmonizer.
 *
 * Re-grades the 5 site photos into a warm golden monochrome so every
 * image asset sits inside the navy · silver-gray · yellow · white system
 * (no pink/violet content fighting the theme).
 *
 * Pipeline per image:
 *   1. grayscale
 *   2. linear(1.18, -16) — punch contrast, deepen blacks (navy-friendly)
 *   3. tint #ffd478       — warm honey-gold monochrome (the "yellow" family)
 *   4. re-encode mozjpeg q84
 *
 * Reversible: originals remain in /upload — re-run
 * `bunx tsx scripts/optimize-images.ts` to restore, then delete this pass.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIR = path.resolve(process.cwd(), "public/images");

async function main() {
  const files = (await readdir(DIR)).filter((f) => /\.(jpg|jpeg)$/i.test(f));
  for (const f of files) {
    const p = path.join(DIR, f);
    const src = await readFile(p);

    // pass 1 — grayscale + contrast (guaranteed order via explicit passes)
    const mono = await sharp(src)
      .grayscale()
      .linear(1.18, -16)
      .png()
      .toBuffer();

    // pass 2 — warm golden colorize + final encode
    const out = await sharp(mono)
      .tint({ r: 255, g: 212, b: 120 })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();

    await writeFile(p, out);
    const kb = (out.length / 1024).toFixed(0);
    console.log(`  ${f} → golden-mono ${kb}KB`);
  }
  console.log(`Regraded ${files.length} images → warm golden monochrome.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
