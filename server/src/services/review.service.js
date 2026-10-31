import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { PURCHASED_STATUSES } from '../config/constants.js';
import { clip } from '../utils/sanitize.js';
import { paginate, pageMeta } from '../utils/pagination.js';

export const recomputeRating = async (productId) => {
  const agg = await prisma.review.aggregate({ where: { productId, status: 'APPROVED' }, _avg: { rating: true }, _count: true });
  await prisma.product.update({ where: { id: productId }, data: { ratingAvg: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0, ratingCount: agg._count } });
};

export const listProductReviews = async (productId, query) => {
  const pg = paginate(query, { defaultLimit: 10, maxLimit: 30 });
  const where = { productId, status: 'APPROVED' };
  const [total, rows, dist] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take, select: { id: true, authorName: true, rating: true, title: true, comment: true, verifiedPurchase: true, createdAt: true } }),
    prisma.review.groupBy({ by: ['rating'], where, _count: true }),
  ]);
  return { items: rows, meta: pageMeta(total, pg), distribution: Object.fromEntries(dist.map((d) => [d.rating, d._count])) };
};

export const homepageReviews = () =>
  prisma.review.findMany({
    where: { status: 'APPROVED', showOnHomepage: true }, orderBy: { createdAt: 'desc' }, take: 12,
    select: { id: true, authorName: true, rating: true, title: true, comment: true, verifiedPurchase: true, product: { select: { name: true, slug: true, brand: { select: { name: true } } } } },
  });

/** Customers can only review what they actually bought (paid order that was not refunded/cancelled). */
export const createReview = async (user, { productId, rating, title, comment }) => {
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null }, select: { id: true } });
  if (!product) throw new AppError('Product not found.', 404, 'NOT_FOUND');
  const purchase = await prisma.orderItem.findFirst({
    where: { variant: { productId }, order: { userId: user.id, paymentStatus: 'SUCCESS', status: { in: PURCHASED_STATUSES } } },
    select: { orderId: true },
  });
  if (!purchase) throw new AppError('You can review a product after you have purchased it.', 403, 'NOT_PURCHASED');
  const dup = await prisma.review.findUnique({ where: { productId_userId: { productId, userId: user.id } } });
  if (dup) throw new AppError('You have already reviewed this product.', 409, 'DUPLICATE_REVIEW');
  return prisma.review.create({ data: {
    productId, userId: user.id, orderId: purchase.orderId, authorName: `${user.firstName} ${user.lastName?.[0] ? user.lastName[0] + '.' : ''}`.trim(),
    rating, title: title ? clip(title, 120) : null, comment: clip(comment, 2000), verifiedPurchase: true, status: 'PENDING',
  } });
};

export const moderateReview = async (id, { status, showOnHomepage }) => {
  const r = await prisma.review.update({ where: { id }, data: { ...(status ? { status } : {}), ...(showOnHomepage !== undefined ? { showOnHomepage } : {}) } });
  await recomputeRating(r.productId);
  return r;
};

export const deleteReview = async (id) => {
  const r = await prisma.review.delete({ where: { id } });
  await recomputeRating(r.productId);
};
