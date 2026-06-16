import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join, extname, basename } from 'path';

const INPUT = './public/images/retter';
const OUTPUT = './public/images/retter';
const MAX_WIDTH = 800;
const QUALITY = 80;

const files = await readdir(INPUT);
const images = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));

console.log(`Komprimerer ${images.length} billeder...`);

let saved = 0;
for (const file of images) {
  const inputPath = join(INPUT, file);
  const outName = basename(file, extname(file)) + '.webp';
  const outputPath = join(OUTPUT, outName);

  try {
    const info = await sharp(inputPath)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outputPath);

    if (outName !== file) {
      const { unlink } = await import('fs/promises');
      await unlink(inputPath);
    }

    saved++;
    if (saved % 10 === 0) console.log(`  ${saved}/${images.length} done`);
  } catch (e) {
    console.error(`Fejl på ${file}:`, e.message);
  }
}

console.log(`Færdig! ${saved} billeder komprimeret til WebP.`);
