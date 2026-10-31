
/**
 * Gifted Scents — Product Image Audit and Link Generator
 *
 * READ-ONLY DATABASE ACCESS.
 *
 * Reads product names, slugs, brands and attached image URLs from Prisma.
 * Checks files in server/import-images against the exact product slugs.
 * Generates server/product-image-links.csv.
 *
 * Does NOT:
 * - Insert, update or delete database records.
 * - Upload, rename or delete image files.
 * - Download images from the internet.
 *
 * Run from server/:
 *   node scripts/generate-product-image-links.js
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, Prisma } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_DIR = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(SERVER_DIR, 'import-images');
const OUTPUT_CSV = path.join(SERVER_DIR, 'product-image-links.csv');

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
]);

const COLUMNS = [
  'product_id',
  'brand',
  'product_name',
  'product_slug',
  'database_image_count',
  'database_image_urls',
  'valid_local_image_count',
  'valid_local_image_filenames',
  'invalid_local_image_filenames',
  'next_expected_filename',
  'image_search_url',
];

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Load server/.env without replacing environment variables
 * already supplied by the terminal.
 */
async function loadEnvironment() {
  const envPath = path.join(SERVER_DIR, '.env');

  let raw;

  try {
    raw = await fs.readFile(envPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/
    );

    if (!match) continue;

    const [, key, rawValue] = match;

    if (process.env[key] !== undefined) continue;

    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '');
    }

    process.env[key] = value;
  }
}

function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new ConfigError(
      'DATABASE_URL is missing. Check server/.env and use the ' +
      'same database connection configuration as your working Prisma setup.'
    );
  }
}

/**
 * Detect the relevant Prisma fields from generated metadata.
 *
 * If your project uses different field names, the script stops
 * with an explanatory error rather than guessing a database write.
 */
function resolveSchema() {
  const models = Prisma?.dmmf?.datamodel?.models;

  if (!models) {
    throw new ConfigError(
      'Prisma metadata is unavailable. Run npx prisma generate ' +
      'from the server directory, then retry.'
    );
  }

  const product = models.find((model) => model.name === 'Product');

  if (!product) {
    throw new ConfigError(
      'No Prisma Product model was found. Available models: ' +
      models.map((model) => model.name).join(', ')
    );
  }

  const fields = product.fields;

  const getField = (name) =>
    fields.find((field) => field.name === name);

  const scalar = (name) => {
    const field = getField(name);
    return field && field.kind !== 'object' ? field : undefined;
  };

  const firstScalar = (names) =>
    names.find((name) => scalar(name));

  const idField =
    fields.find((field) => field.isId)?.name ?? 'id';

  const nameField = firstScalar(['name', 'title']);
  const slugField = firstScalar(['slug']);

  if (!nameField || !slugField) {
    throw new ConfigError(
      'Could not detect the product name or slug field. ' +
      'Check your Prisma Product model.'
    );
  }

  // Detect a list relation that points to product images.
  const imageRelation = fields.find(
    (field) =>
      field.kind === 'object' &&
      field.isList &&
      (
        field.name.toLowerCase() === 'images' ||
        /image/i.test(field.type)
      )
  );

  if (!imageRelation) {
    throw new ConfigError(
      'Could not detect the Product images relation. ' +
      'Check the relation field in prisma/schema.prisma.'
    );
  }

  const imageModel = models.find(
    (model) => model.name === imageRelation.type
  );

  if (!imageModel) {
    throw new ConfigError(
      `Could not find the Prisma model ${imageRelation.type}.`
    );
  }

  const imageUrlField = imageModel.fields.find(
    (field) =>
      field.kind !== 'object' &&
      [
        'url',
        'imageUrl',
        'image_url',
        'src',
        'secureUrl',
        'secure_url',
        'path',
        'location',
      ].includes(field.name)
  );

  if (!imageUrlField) {
    throw new ConfigError(
      `Could not detect the URL field on ${imageModel.name}. ` +
      'Check the image model in prisma/schema.prisma.'
    );
  }

  // Detect brand relation or a plain text brand field.
  let brand = null;

  const brandRelation = fields.find(
    (field) =>
      field.kind === 'object' &&
      !field.isList &&
      /brand/i.test(field.name)
  );

  if (brandRelation) {
    const brandModel = models.find(
      (model) => model.name === brandRelation.type
    );

    const brandNameField = brandModel?.fields.find(
      (field) =>
        field.kind !== 'object' &&
        ['name', 'title'].includes(field.name)
    );

    if (brandModel && brandNameField) {
      brand = {
        type: 'relation',
        relation: brandRelation.name,
        nameField: brandNameField.name,
      };
    }
  } else if (scalar('brand')) {
    brand = { type: 'scalar', field: 'brand' };
  }

  // Apply a deleted-product filter only if its schema is unambiguous.
  let where = {};
  let filterDescription = 'No soft-delete filter detected';

  if (scalar('deletedAt')) {
    where = { deletedAt: null };
    filterDescription = 'deletedAt IS NULL';
  } else if (scalar('isDeleted')) {
    where = { isDeleted: false };
    filterDescription = 'isDeleted = false';
  }

  return {
    delegate: product.name.charAt(0).toLowerCase() +
      product.name.slice(1),
    idField,
    nameField,
    slugField,
    imageRelation: imageRelation.name,
    imageUrlField: imageUrlField.name,
    brand,
    where,
    filterDescription,
  };
}

/**
 * Fetch product information using findMany only.
 * This function contains no database write operations.
 */
async function fetchProducts(prisma, schema) {
  const delegate = prisma[schema.delegate];

  if (!delegate || typeof delegate.findMany !== 'function') {
    throw new ConfigError(
      `Prisma client does not expose ${schema.delegate}.`
    );
  }

  const select = {
    [schema.idField]: true,
    [schema.nameField]: true,
    [schema.slugField]: true,
    [schema.imageRelation]: {
      select: {
        [schema.imageUrlField]: true,
      },
    },
  };

  if (schema.brand?.type === 'relation') {
    select[schema.brand.relation] = {
      select: { [schema.brand.nameField]: true },
    };
  } else if (schema.brand?.type === 'scalar') {
    select[schema.brand.field] = true;
  }

  const records = await delegate.findMany({
    where: schema.where,
    select,
    orderBy: { [schema.slugField]: 'asc' },
  });

  return records.map((record) => {
    let brandName = '';

    if (schema.brand?.type === 'relation') {
      brandName =
        record[schema.brand.relation]?.[schema.brand.nameField] ?? '';
    } else if (schema.brand?.type === 'scalar') {
      brandName = record[schema.brand.field] ?? '';
    }

    const images = Array.isArray(record[schema.imageRelation])
      ? record[schema.imageRelation]
      : [];

    return {
      id: record[schema.idField],
      name: record[schema.nameField] ?? '',
      slug: record[schema.slugField] ?? '',
      brand: brandName,
      imageUrls: images
        .map((image) => image[schema.imageUrlField])
        .filter((url) => typeof url === 'string' && url.trim()),
    };
  });
}

/**
 * Recognize filenames such as:
 * product-slug.jpg
 * product-slug__2.jpg
 * product-slug__3.webp
 */
function parseFilename(filename) {
  const extension = path.extname(filename).toLowerCase();

  if (!IMAGE_EXTENSIONS.has(extension)) return null;

  const stem = filename.slice(0, -extension.length);

  if (!stem) return null;

  const match = stem.match(/^(.+)__(\d+)$/);

  if (match) {
    const number = Number(match[2]);

    if (number < 2) return null;

    return {
      slug: match[1],
      number,
      extension,
    };
  }

  return {
    slug: stem,
    number: 1,
    extension,
  };
}

/**
 * Check common image file signatures.
 * This is a basic format check, not a full image decode.
 */
async function validateImage(filePath, extension) {
  let handle;

  try {
    const stat = await fs.stat(filePath);

    if (!stat.isFile() || stat.size === 0) {
      return { valid: false, reason: 'Empty or not a regular file' };
    }

    handle = await fs.open(filePath, 'r');

    const buffer = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buffer, 0, 16, 0);

    if (bytesRead < 12) {
      return { valid: false, reason: 'File is too small' };
    }

    const jpeg =
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const png = buffer
      .subarray(0, 8)
      .equals(Buffer.from([
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
      ]));

    const webp =
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';

    const brand = buffer.toString('ascii', 8, 12);

    const avif =
      buffer.toString('ascii', 4, 8) === 'ftyp' &&
      (brand === 'avif' || brand === 'avis');

    const valid =
      ((extension === '.jpg' || extension === '.jpeg') && jpeg) ||
      (extension === '.png' && png) ||
      (extension === '.webp' && webp) ||
      (extension === '.avif' && avif);

    if (valid) return { valid: true, reason: '' };

    const detected = jpeg
      ? 'JPEG'
      : png
        ? 'PNG'
        : webp
          ? 'WebP'
          : avif
            ? 'AVIF'
            : 'unrecognized data';

    return {
      valid: false,
      reason: `Detected ${detected}; extension is ${extension}`,
    };
  } catch (error) {
    return {
      valid: false,
      reason: error.code ?? error.message,
    };
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
}

async function scanImages(products) {
  const productSlugs = new Set(
    products.map((product) => product.slug).filter(Boolean)
  );

  const bySlug = new Map();
  const unmatchedFiles = [];

  let filenames;

  try {
    filenames = await fs.readdir(IMAGES_DIR, {
      withFileTypes: true,
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        directoryFound: false,
        bySlug,
        unmatchedFiles,
      };
    }

    throw error;
  }

  const files = filenames
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const filename of files) {
    const parsed = parseFilename(filename);

    if (!parsed) continue;

    if (!productSlugs.has(parsed.slug)) {
      unmatchedFiles.push(filename);
      continue;
    }

    const result = await validateImage(
      path.join(IMAGES_DIR, filename),
      parsed.extension
    );

    const entry = {
      filename,
      number: parsed.number,
      ...result,
    };

    if (!bySlug.has(parsed.slug)) {
      bySlug.set(parsed.slug, []);
    }

    bySlug.get(parsed.slug).push(entry);
  }

  for (const entries of bySlug.values()) {
    entries.sort(
      (a, b) =>
        a.number - b.number ||
        a.filename.localeCompare(b.filename)
    );
  }

  return {
    directoryFound: true,
    bySlug,
    unmatchedFiles,
  };
}

function nextFilename(slug, entries) {
  const used = new Set(entries.map((entry) => entry.number));

  let number = 1;

  while (used.has(number)) number++;

  return number === 1
    ? `${slug}.jpg`
    : `${slug}__${number}.jpg`;
}

function imageSearchUrl(brand, name) {
  const cleanBrand = String(brand ?? '').trim();
  const cleanName = String(name ?? '').trim();

  const alreadyIncludesBrand =
    cleanBrand &&
    cleanName.toLowerCase().includes(cleanBrand.toLowerCase());

  const query = [
    alreadyIncludesBrand ? '' : cleanBrand,
    cleanName,
  ].filter(Boolean).join(' ');

  return 'https://www.google.com/search?tbm=isch&q=' +
    encodeURIComponent(query);
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';

  const text = String(value);

  return /[",\r\n]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

function toCsv(rows) {
  const lines = [COLUMNS.join(',')];

  for (const row of rows) {
    lines.push(
      COLUMNS.map((column) => csvEscape(row[column])).join(',')
    );
  }

  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

async function main() {
  let prisma;

  try {
    await loadEnvironment();
    requireDatabaseUrl();

    const schema = resolveSchema();

    prisma = new PrismaClient({
      log: ['error'],
    });

    console.log('\nGifted Scents — Product Image Audit');
    console.log('Mode: READ ONLY');
    console.log('Connecting to PostgreSQL through Prisma...\n');

    const products = await fetchProducts(prisma, schema);
    const local = await scanImages(products);

    const invalidFiles = [];
    const rows = products.map((product) => {
      const entries = local.bySlug.get(product.slug) ?? [];
      const valid = entries.filter((entry) => entry.valid);
      const invalid = entries.filter((entry) => !entry.valid);

      for (const entry of invalid) {
        invalidFiles.push(
          `${entry.filename}: ${entry.reason}`
        );
      }

      return {
        product_id: product.id,
        brand: product.brand,
        product_name: product.name,
        product_slug: product.slug,
        database_image_count: product.imageUrls.length,
        database_image_urls: product.imageUrls.join(' | '),
        valid_local_image_count: valid.length,
        valid_local_image_filenames:
          valid.map((entry) => entry.filename).join(' | '),
        invalid_local_image_filenames:
          invalid.map((entry) => entry.filename).join(' | '),
        next_expected_filename: product.slug
          ? nextFilename(product.slug, entries)
          : '',
        image_search_url: imageSearchUrl(
          product.brand,
          product.name
        ),
      };
    });

    await fs.writeFile(
      OUTPUT_CSV,
      toCsv(rows),
      'utf8'
    );

    const withDatabaseImages = products.filter(
      (product) => product.imageUrls.length > 0
    ).length;

    const withValidLocalImages = rows.filter(
      (row) => row.valid_local_image_count > 0
    ).length;

    console.log('Products found:', products.length);
    console.log('Products with database images:', withDatabaseImages);
    console.log(
      'Products without database images:',
      products.length - withDatabaseImages
    );
    console.log(
      'Products with valid local images:',
      withValidLocalImages
    );

    if (!local.directoryFound) {
      console.warn(
        '\nWARNING: import-images folder was not found:',
        IMAGES_DIR
      );
    }

    if (invalidFiles.length) {
      console.warn('\nInvalid image files:');

      for (const file of invalidFiles) {
        console.warn(' -', file);
      }
    }

    if (local.unmatchedFiles.length) {
      console.warn(
        '\nFiles whose names do not match any product slug:',
        local.unmatchedFiles.length
      );

      for (const filename of local.unmatchedFiles.slice(0, 20)) {
        console.warn(' -', filename);
      }
    }

    console.log('\nCSV created at:');
    console.log(OUTPUT_CSV);
    console.log(
      '\nThe CSV contains Google Images search links, not direct downloads.'
    );
    console.log(
      'No database records or image files were changed.'
    );
  } catch (error) {
    console.error('\nImage audit failed.');

    if (error instanceof ConfigError) {
      console.error(error.message);
    } else {
      console.error(error.message ?? error);

      if (error.code) {
        console.error('Error code:', error.code);
      }

      if (error.code === 'P1000') {
        console.error(
          'Check the database username and password in server/.env.'
        );
      } else if (error.code === 'P1001') {
        console.error(
          'Check that PostgreSQL is running and the database host is correct.'
        );
      } else if (
        error.code === 'P2021' ||
        error.code === 'P2022'
      ) {
        console.error(
          'The Prisma schema and database may be out of sync.'
        );
      }
    }

    process.exitCode = 1;
  } finally {
    if (prisma) {
      await prisma.$disconnect().catch((error) => {
        console.error(
          'Prisma disconnect warning:',
          error.message
        );
      });
    }
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === __filename
) {
  main();
}

export {
  csvEscape,
  toCsv,
  parseFilename,
  validateImage,
  nextFilename,
  imageSearchUrl,
};
