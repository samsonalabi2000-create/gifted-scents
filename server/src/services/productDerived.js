import { effectivePrice } from '../utils/money.js';

/** Keeps the denormalised Product columns (minPriceKobo, hasDiscount, inStock) in sync with its variants. */
export const recomputeDerived = async (tx, productId) => {
  const variants = await tx.productVariant.findMany({ where: { productId, isActive: true } });
  const inStockVars = variants.filter((v) => v.stock > 0);
  const pool = inStockVars.length ? inStockVars : variants;
  const minPriceKobo = pool.length ? Math.min(...pool.map(effectivePrice)) : 0;
  const hasDiscount = pool.some((v) => v.salePriceKobo != null && v.salePriceKobo < v.priceKobo);
  await tx.product.update({ where: { id: productId }, data: { minPriceKobo, hasDiscount, inStock: inStockVars.length > 0 } });
};
