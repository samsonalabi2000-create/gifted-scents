import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { paginate, pageMeta } from '../utils/pagination.js';
import { nairaToKobo, effectivePrice } from '../utils/money.js';
import { getSetting } from './settings.service.js';

const csv = (v) =>
  v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : [];

const live = { isActive: true, deletedAt: null };

export const cardSelect = {
  id: true,
  name: true,
  slug: true,
  type: true,
  gender: true,
  minPriceKobo: true,
  hasDiscount: true,
  inStock: true,
  isBestseller: true,
  isNewArrival: true,
  isFeatured: true,
  ratingAvg: true,
  ratingCount: true,
  concentration: true,
  brand: {
    select: {
      name: true,
      slug: true,
    },
  },
  family: {
    select: {
      name: true,
      slug: true,
    },
  },
  images: {
    orderBy: [
      { isPrimary: 'desc' },
      { sortOrder: 'asc' },
    ],
    take: 2,
    select: {
      url: true,
      alt: true,
      width: true,
      height: true,
    },
  },
  variants: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      label: true,
      priceKobo: true,
      salePriceKobo: true,
      stock: true,
      lowStockAt: true,
      isDefault: true,
    },
  },
};

/** Shape a product row into the compact card the storefront renders. */
export const toCard = (p, lowStockThreshold = 5) => {
  const vs = p.variants || [];
  const inStockVars = vs.filter((v) => v.stock > 0);
  const pool = inStockVars.length ? inStockVars : vs;

  const cheapest = pool
    .slice()
    .sort((a, b) => effectivePrice(a) - effectivePrice(b))[0];

  const def =
    vs.find((v) => v.isDefault && v.stock > 0) || cheapest;

  const onSale =
    cheapest &&
    cheapest.salePriceKobo != null &&
    cheapest.salePriceKobo < cheapest.priceKobo;

  const lowStock =
    inStockVars.length > 0 &&
    inStockVars.every(
      (v) => v.stock <= (v.lowStockAt ?? lowStockThreshold)
    );

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    gender: p.gender,
    concentration: p.concentration,
    brand: p.brand,
    family: p.family,
    image: p.images?.[0] || null,
    image2: p.images?.[1] || null,
    priceKobo: cheapest
      ? effectivePrice(cheapest)
      : p.minPriceKobo,
    compareAtKobo: onSale ? cheapest.priceKobo : null,
    hasMultipleSizes: vs.length > 1,
    defaultVariantId: def?.id || null,
    inStock: inStockVars.length > 0,
    lowStock,
    isBestseller: p.isBestseller,
    isNewArrival: p.isNewArrival,
    onSale: Boolean(onSale),
    ratingAvg: Number(p.ratingAvg),
    ratingCount: p.ratingCount,
    variants: vs.map((v) => ({
      id: v.id,
      label: v.label,
      priceKobo: effectivePrice(v),
      compareAtKobo:
        v.salePriceKobo != null &&
        v.salePriceKobo < v.priceKobo
          ? v.priceKobo
          : null,
      stock: v.stock,
    })),
  };
};

export const withCards = async (rows) => {
  const threshold =
    Number(await getSetting('inventory.lowStockThreshold')) || 5;

  return rows.map((r) => toCard(r, threshold));
};

const ORDER = {
  newest: [{ createdAt: 'desc' }],
  price_asc: [{ minPriceKobo: 'asc' }],
  price_desc: [{ minPriceKobo: 'desc' }],
  popular: [
    { soldCount: 'desc' },
    { createdAt: 'desc' },
  ],
  rating: [
    { ratingAvg: 'desc' },
    { ratingCount: 'desc' },
  ],
  featured: [
    { isFeatured: 'desc' },
    { isBestseller: 'desc' },
    { createdAt: 'desc' },
  ],
};

export const buildWhere = (q = {}) => {
  const and = [live];

  if (q.category) {
    and.push({
      category: {
        OR: [
          { slug: q.category },
          { parent: { slug: q.category } },
        ],
      },
    });
  }

  if (csv(q.ids).length) {
    and.push({
      id: {
        in: csv(q.ids)
          .filter((x) => /^[0-9a-f-]{36}$/i.test(x))
          .slice(0, 50),
      },
    });
  }

  if (csv(q.brand).length) {
    and.push({
      brand: { slug: { in: csv(q.brand) } },
    });
  }

  if (q.gender) {
    and.push({
      gender: {
        in: [
          ...csv(q.gender).map((g) => g.toUpperCase()),
          'UNISEX',
        ].filter((g, i, a) => a.indexOf(g) === i),
      },
    });
  }

  if (csv(q.family).length) {
    and.push({
      family: { slug: { in: csv(q.family) } },
    });
  }

  for (const note of csv(q.note)) {
    and.push({
      notes: { some: { note: { slug: note } } },
    });
  }

  if (csv(q.longevity).length) {
    and.push({
      longevity: {
        in: csv(q.longevity).map((s) => s.toUpperCase()),
      },
    });
  }

  if (csv(q.sillage).length) {
    and.push({
      sillage: {
        in: csv(q.sillage).map((s) => s.toUpperCase()),
      },
    });
  }

  if (csv(q.type).length) {
    and.push({
      type: {
        in: csv(q.type).map((s) => s.toUpperCase()),
      },
    });
  }

  if (csv(q.occasion).length) {
    and.push({
      occasions: { hasSome: csv(q.occasion) },
    });
  }

  if (csv(q.size).length) {
    and.push({
      variants: {
        some: {
          isActive: true,
          label: { in: csv(q.size) },
        },
      },
    });
  }

  if (q.minPrice) {
    and.push({
      minPriceKobo: {
        gte: nairaToKobo(q.minPrice),
      },
    });
  }

  if (q.maxPrice) {
    and.push({
      minPriceKobo: {
        lte: nairaToKobo(q.maxPrice),
      },
    });
  }

  if (q.inStock === 'true') {
    and.push({ inStock: true });
  }

  if (q.sale === 'true') {
    and.push({ hasDiscount: true });
  }

  if (q.bestseller === 'true') {
    and.push({ isBestseller: true });
  }

  if (q.new === 'true') {
    and.push({ isNewArrival: true });
  }

  if (q.featured === 'true') {
    and.push({ isFeatured: true });
  }

  return { AND: and };
};

export const listProducts = async (query) => {
  const pg = paginate(query, {
    defaultLimit: 24,
    maxLimit: 48,
  });

  const where = buildWhere(query);

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: cardSelect,
      orderBy: ORDER[query.sort] || ORDER.featured,
      skip: pg.skip,
      take: pg.take,
    }),
  ]);

  return {
    items: await withCards(rows),
    meta: pageMeta(total, pg),
  };
};

export const getFacets = async () => {
  const [
    brands,
    categories,
    families,
    notes,
    sizes,
    price,
  ] = await Promise.all([
    prisma.brand.findMany({
      where: {
        isActive: true,
        products: { some: live },
      },
      orderBy: { name: 'asc' },
      select: {
        name: true,
        slug: true,
        isArabic: true,
      },
    }),

    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        name: true,
        slug: true,
        parentId: true,
      },
    }),

    prisma.fragranceFamily.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        name: true,
        slug: true,
      },
    }),

    prisma.fragranceNote.findMany({
      where: {
        products: {
          some: { product: live },
        },
      },
      orderBy: { name: 'asc' },
      select: {
        name: true,
        slug: true,
        group: true,
      },
    }),

    prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: live,
      },
      distinct: ['label'],
      select: { label: true },
    }),

    prisma.product.aggregate({
      where: live,
      _min: { minPriceKobo: true },
      _max: { minPriceKobo: true },
    }),
  ]);

  return {
    brands,
    categories,
    families,
    notes,
    sizes: sizes.map((s) => s.label),
    price: {
      minKobo: price._min.minPriceKobo ?? 0,
      maxKobo: price._max.minPriceKobo ?? 0,
    },
  };
};

const detailInclude = {
  brand: true,
  category: true,
  family: true,
  images: {
    orderBy: [
      { isPrimary: 'desc' },
      { sortOrder: 'asc' },
    ],
  },
  variants: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { image: true },
  },
  notes: {
    include: { note: true },
  },
};

export const getProductBySlug = async (slug) => {
  const p = await prisma.product.findFirst({
    where: { slug, ...live },
    include: detailInclude,
  });

  if (!p) {
    throw new AppError(
      'This product could not be found.',
      404,
      'NOT_FOUND'
    );
  }

  const grouped = {
    top: [],
    heart: [],
    base: [],
  };

  for (const n of p.notes) {
    grouped[n.layer.toLowerCase()].push({
      name: n.note.name,
      slug: n.note.slug,
      group: n.note.group,
    });
  }

  const threshold =
    Number(await getSetting('inventory.lowStockThreshold')) || 5;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    gender: p.gender,
    concentration: p.concentration,
    shortDescription: p.shortDescription,
    description: p.description,
    longevity: p.longevity,
    sillage: p.sillage,
    occasions: p.occasions,
    videoUrl: p.videoUrl,
    isBestseller: p.isBestseller,
    isNewArrival: p.isNewArrival,
    ratingAvg: Number(p.ratingAvg),
    ratingCount: p.ratingCount,
    inStock: p.inStock,
    isDemo: p.isDemo,

    brand: {
      name: p.brand.name,
      slug: p.brand.slug,
      isArabic: p.brand.isArabic,
    },

    category: p.category && {
      name: p.category.name,
      slug: p.category.slug,
    },

    family: p.family && {
      name: p.family.name,
      slug: p.family.slug,
    },

    images: p.images.map((i) => ({
      id: i.id,
      url: i.url,
      alt: i.alt,
      width: i.width,
      height: i.height,
    })),

    variants: p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      sizeMl: v.sizeMl,
      sku: v.sku,
      priceKobo: v.priceKobo,
      salePriceKobo: v.salePriceKobo,
      effectiveKobo: effectivePrice(v),
      stock: v.stock,
      lowStock:
        v.stock > 0 &&
        v.stock <= (v.lowStockAt ?? threshold),
      isDefault: v.isDefault,
      imageId: v.imageId,
    })),

    notes: grouped,

    seo: {
      title: p.seoTitle,
      description: p.seoDescription,
      keywords: p.seoKeywords,
    },

    updatedAt: p.updatedAt,
  };
};

const LABELS = {
  SIMILAR_PROFILE: 'Similar scents',
  ALTERNATIVE: 'Alternatives',
  INSPIRED_BY: 'Inspired by',
  COMPLEMENTARY: 'Complete your collection',
  SAME_FAMILY: 'Same fragrance family',
};

/**
 * Recommendation rows are real catalog products.
 * Explicit admin-defined relations win; fall back to family and brand.
 */
export const getRecommendations = async (slug) => {
  const p = await prisma.product.findFirst({
    where: { slug, ...live },
    select: {
      id: true,
      brandId: true,
      familyId: true,
      gender: true,
    },
  });

  if (!p) {
    throw new AppError(
      'This product could not be found.',
      404,
      'NOT_FOUND'
    );
  }

  const rels = await prisma.productRelation.findMany({
    where: {
      fromId: p.id,
      to: live,
    },
    include: {
      to: { select: cardSelect },
    },
    take: 24,
  });

  const sections = [];

  for (const type of Object.keys(LABELS)) {
    const rows = rels
      .filter((r) => r.type === type)
      .map((r) => r.to);

    if (rows.length) {
      sections.push({
        type,
        title: LABELS[type],
        note:
          type === 'INSPIRED_BY'
            ? 'Independent products - not made by the designer brand.'
            : null,
        items: await withCards(rows),
      });
    }
  }

  const used = new Set([
    p.id,
    ...rels.map((r) => r.toId),
  ]);

  const fill = async (where, title, type) => {
    const rows = await prisma.product.findMany({
      where: {
        ...live,
        id: { notIn: [...used] },
        ...where,
      },
      select: cardSelect,
      orderBy: [{ soldCount: 'desc' }],
      take: 8,
    });

    rows.forEach((r) => used.add(r.id));

    if (rows.length) {
      sections.push({
        type,
        title,
        note: null,
        items: await withCards(rows),
      });
    }
  };

  if (p.familyId) {
    await fill(
      { familyId: p.familyId, gender: p.gender },
      'You may also like',
      'SAME_FAMILY'
    );
  }

  await fill(
    { brandId: p.brandId },
    'Popular from this brand',
    'SAME_BRAND'
  );

  return sections;
};

/**
 * List active brands and attach a cover image from a real product.
 * Featured products and best sellers are preferred as cover images.
 */
export const listBrands = async () => {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: [
      { isFeatured: 'desc' },
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      isArabic: true,
      isFeatured: true,
      description: true,
      _count: {
        select: {
          products: {
            where: live,
          },
        },
      },
    },
  });

  if (brands.length === 0) {
    return [];
  }

  const brandIds = brands.map((brand) => brand.id);

  const products = await prisma.product.findMany({
    where: {
      ...live,
      brandId: {
        in: brandIds,
      },
      images: {
        some: {},
      },
    },
    orderBy: [
      { isFeatured: 'desc' },
      { soldCount: 'desc' },
      { name: 'asc' },
    ],
    select: {
      id: true,
      brandId: true,
      name: true,
      images: {
        orderBy: [
          { isPrimary: 'desc' },
          { sortOrder: 'asc' },
        ],
        take: 1,
        select: {
          url: true,
          alt: true,
        },
      },
    },
  });

  const imageByBrand = new Map();

  for (const product of products) {
    const image = product.images?.[0];

    if (
      !imageByBrand.has(product.brandId) &&
      image?.url
    ) {
      imageByBrand.set(product.brandId, {
        url: image.url,
        alt: image.alt || product.name,
      });
    }
  }

  return brands.map((brand) => ({
    ...brand,
    coverImage: imageByBrand.get(brand.id) || null,
  }));
};

export const listCategories = () =>
  prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      parentId: true,
    },
  });

export const listFamilies = () =>
  prisma.fragranceFamily.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
    },
  });

export const getBrand = async (slug) => {
  const b = await prisma.brand.findFirst({
    where: { slug, isActive: true },
  });

  if (!b) {
    throw new AppError('Brand not found.', 404, 'NOT_FOUND');
  }

  return b;
};

export const getCategory = async (slug) => {
  const c = await prisma.category.findFirst({
    where: { slug, isActive: true },
  });

  if (!c) {
    throw new AppError(
      'Category not found.',
      404,
      'NOT_FOUND'
    );
  }

  return c;
};

export const getFamily = async (slug) => {
  const f = await prisma.fragranceFamily.findUnique({
    where: { slug },
  });

  if (!f) {
    throw new AppError(
      'Fragrance family not found.',
      404,
      'NOT_FOUND'
    );
  }

  return f;
};

export const cardsByIds = async (ids) => {
  if (!ids.length) {
    return [];
  }

  const rows = await prisma.product.findMany({
    where: {
      id: { in: ids },
      ...live,
    },
    select: cardSelect,
  });

  const map = new Map(
    (await withCards(rows)).map((c) => [c.id, c])
  );

  // Preserve input order and drop products that are not real/active.
  return ids.map((id) => map.get(id)).filter(Boolean);
};
