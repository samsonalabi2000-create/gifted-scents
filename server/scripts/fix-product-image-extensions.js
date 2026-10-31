
/**
 * Gifted Scents — Safe Product Image Extension Repair
 *
 * PURPOSE:
 *   Detect and correct extensions on the five image files identified
 *   by the previous audit.
 *
 * SAFETY:
 *   - DRY RUN by default. No files are changed without --apply.
 *   - Checks actual image signatures before renaming.
 *   - Never overwrites an existing destination file.
 *   - Never uploads images or accesses the database.
 *   - Renames files only; does not convert image contents.
 *
 * Run from the server directory:
 *   node scripts/fix-product-image-extensions.js
 *
 * Apply verified corrections:
 *   node scripts/fix-product-image-extensions.js --apply
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGE_DIR = path.resolve(__dirname, '../import-images');
const APPLY = process.argv.includes('--apply');

// Only the five files identified by the previous audit.
const TARGET_FILES = [
  'chanel-bleu-de-chanel.jpg',
  'lattafa-lattafa-khamrah.jpg',
  'lattafa-lattafa-khamrah__2.jpg',
  'lattafa-lattafa-khamrah__3.jpg',
  'versace-versace-bright-crystal.jpg',
];

async function detectImageFormat(filePath) {
  const handle = await fs.open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(64);
    const { bytesRead } = await handle.read(buffer, 0, 64, 0);

    if (bytesRead < 12) {
      throw new Error('File is too small to identify safely.');
    }

    // JPEG
    if (
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return '.jpg';
    }

    // PNG
    if (
      buffer.subarray(0, 8).equals(
        Buffer.from([
          0x89, 0x50, 0x4e, 0x47,
          0x0d, 0x0a, 0x1a, 0x0a,
        ])
      )
    ) {
      return '.png';
    }

    // WebP
    if (
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return '.webp';
    }

    // AVIF / AVIS ISO Base Media File Format
    if (
      buffer.toString('ascii', 4, 8) === 'ftyp'
    ) {
      const brands = buffer.toString('ascii', 8, bytesRead);

      if (
        brands.startsWith('avif') ||
        brands.startsWith('avis') ||
        brands.includes('avif') ||
        brands.includes('avis')
      ) {
        return '.avif';
      }
    }

    throw new Error(
      'Unrecognised image format. File was not changed.'
    );
  } finally {
    await handle.close();
  }
}

async function repair() {
  console.log('\nGifted Scents — Image Extension Repair');
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Directory: ${IMAGE_DIR}\n`);

  // Fail safely if the expected folder does not exist.
  const directoryStat = await fs.stat(IMAGE_DIR).catch(() => null);

  if (!directoryStat?.isDirectory()) {
    throw new Error(
      `Image directory does not exist: ${IMAGE_DIR}`
    );
  }

  let renamed = 0;
  let alreadyCorrect = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of TARGET_FILES) {
    const source = path.join(IMAGE_DIR, filename);

    try {
      const sourceStat = await fs.lstat(source);

      if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
        console.log(`SKIP: ${filename} is not a regular file.`);
        skipped++;
        continue;
      }

      const actualExtension = await detectImageFormat(source);
      const currentExtension = path.extname(filename).toLowerCase();

      if (actualExtension === currentExtension) {
        console.log(`OK: ${filename} already has the correct extension.`);
        alreadyCorrect++;
        continue;
      }

      const correctedName =
        path.basename(filename, path.extname(filename)) +
        actualExtension;

      const destination = path.join(IMAGE_DIR, correctedName);

      // Do not overwrite an existing file, even if it looks similar.
      const destinationStat = await fs.lstat(destination).catch(
        (error) => {
          if (error.code === 'ENOENT') return null;
          throw error;
        }
      );

      if (destinationStat) {
        console.log(
          `CONFLICT: ${filename} -> ${correctedName}`
        );
        console.log(
          '  Destination already exists. Neither file was changed.'
        );
        skipped++;
        continue;
      }

      if (!APPLY) {
        console.log(
          `PREVIEW: ${filename} -> ${correctedName} ` +
          `(verified ${actualExtension.slice(1).toUpperCase()})`
        );
        renamed++;
        continue;
      }

      // Recheck the destination immediately before renaming.
      try {
        await fs.access(destination);
        console.log(
          `CONFLICT: ${correctedName} already exists. Skipping.`
        );
        skipped++;
        continue;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }

      await fs.rename(source, destination);

      console.log(`RENAMED: ${filename} -> ${correctedName}`);
      renamed++;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`MISSING: ${filename}`);
        skipped++;
      } else {
        console.error(`FAILED: ${filename}: ${error.message}`);
        failed++;
      }
    }
  }

  console.log('\nRepair summary');
  console.log(`Renamed / proposed: ${renamed}`);
  console.log(`Already correct:    ${alreadyCorrect}`);
  console.log(`Skipped:            ${skipped}`);
  console.log(`Failed:             ${failed}`);

  if (!APPLY) {
    console.log('\nDRY RUN ONLY. No files were renamed.');
    console.log(
      'Review the preview above. If every proposed correction is ' +
      'correct, run:'
    );
    console.log(
      'node scripts/fix-product-image-extensions.js --apply'
    );
  } else {
    console.log('\nRepair run finished. Review every result above.');
    console.log(
      'No database records were changed and no images were uploaded.'
    );
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

repair().catch((error) => {
  console.error(`\nREPAIR STOPPED: ${error.message}`);
  process.exitCode = 1;
});
