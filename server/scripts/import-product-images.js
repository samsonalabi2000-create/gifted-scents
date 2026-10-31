
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { storeImage } from '../src/services/storage/index.js';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imageDir = path.resolve(__dirname, '../import-images');
const supported = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const apply = process.argv.includes('--apply');

function parseFilename(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (!supported.has(ext)) return null;

  const stem = path.basename(filename, path.extname(filename));
  const match = stem.match(/^(.+?)(?:__(\d+))?$/);

  if (!match) return null;

  return {
    slug: match[1],
    sequence: Number(match[2] || 1),
    filename,
  };
}

async function main() {
  await fs.mkdir(imageDir, { recursive: true });

  const files = (await fs.readdir(imageDir))
    .filter((name) => supported.has(path.extname(name).toLowerCase()))
    .map(parseFilename)
    .filter(Boolean)
    .sort((a, b) =>
      a.slug.localeCompare(b.slug) || a.sequence - b.sequence
    );

  if (files.length === 0) {
    console.log(`No images found in: ${imageDir}`);
    console.log('Add product images before running the importer.');
    return;
  }

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      brand: { select: { name: true } },
      images: {
        select: {
          id: true,
          sortOrder: true,
          isPrimary: true,
        },
      },
    },
  });

  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const groups = new Map();
  const unmatched = [];

  for (const file of files) {
    const product = bySlug.get(file.slug);

    if (!product) {
      unmatched.push(file.filename);
      continue;
    }

    if (!groups.has(product.id)) {
      groups.set(product.id, { product, files: [] });
    }

    groups.get(product.id).files.push(file);
  }

  console.log(`\nMode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Images discovered: ${files.length}`);
  console.log(`Products in database: ${products.length}`);

  for (const { product, files: productFiles } of groups.values()) {
    if (product.images.length > 0) {
      console.log(
        `SKIP existing images: ${product.name} (${product.images.length} already attached)`
      );
      continue;
    }

    console.log(`\n${product.brand.name} — ${product.name}`);

    for (const file of productFiles) {
      console.log(`  ${apply ? 'IMPORT' : 'PREVIEW'} ${file.filename}`);
    }

    if (!apply) continue;

    let sortOrder = 0;

    for (const file of productFiles) {
      let stored;

      try {
        const buffer = await fs.readFile(
          path.join(imageDir, file.filename)
        );

        stored = await storeImage(buffer, { folder: 'products' });

        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: stored.url,
            storageKey: stored.storageKey,
            alt: `${product.brand.name} ${product.name}`,
            width: stored.width,
            height: stored.height,
            sortOrder,
            isPrimary: sortOrder === 0,
          },
        });

        console.log(`  SAVED ${file.filename}`);
        sortOrder += 1;
      } catch (error) {
        console.error(
          `  FAILED ${file.filename}: ${error.message}`
        );

        // If storage succeeded but the database insert failed,
        // remove the newly stored image to avoid leaving an orphan.
        if (stored?.storageKey) {
          const { deleteImage } = await import(
            '../src/services/storage/index.js'
          );
          await deleteImage(stored.storageKey);
        }

        // Continue with other images rather than aborting the batch.
      }
    }
  }

  if (unmatched.length) {
    console.log('\nUNMATCHED FILES — nothing was uploaded for these:');

    for (const filename of unmatched) {
      console.log(`  ${filename}`);
    }
  }

  if (!apply) {
    console.log('\nPreview only. No images were uploaded or saved.');
    console.log('Review the matches, then rerun with --apply.');
  } else {
    console.log('\nImport finished. Review all SAVED, FAILED and SKIP lines.');
  }
}

main()
  .catch((error) => {
    console.error('\nImporter stopped:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
