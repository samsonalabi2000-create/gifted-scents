import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { getSetting } from './settings.service.js';
import { lowStock } from './adminProduct.service.js';

const PAID = Prisma.sql`o."paymentStatus" = 'SUCCESS' AND o.status NOT IN ('REFUNDED','CANCELLED')`;
const TZ = 'Africa/Lagos';

const sum = async (from) => {
  const r = await prisma.$queryRaw(Prisma.sql`SELECT COALESCE(SUM(o."totalKobo"),0)::bigint AS revenue, COUNT(*)::int AS orders FROM "Order" o WHERE ${PAID} AND o."createdAt" >= ${from}`);
  return { revenueKobo: Number(r[0].revenue), orders: r[0].orders };
};

const lagosStart = (unit) => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  if (unit === 'month') d.setDate(1);
  const offset = new Date().getTime() - now.getTime(); // convert the Lagos wall-clock back to a real instant
  return new Date(d.getTime() + offset);
};

export const dashboard = async () => {
  const threshold = Number(await getSetting('inventory.lowStockThreshold')) || 5;
  const [today, month, all, statusCounts, pending, recentOrders, recentCustomers, top, low, tickets, pendingReviews, products, customers, payments, attention] = await Promise.all([
    sum(lagosStart('day')), sum(lagosStart('month')), sum(new Date(0)),
    prisma.order.groupBy({ by: ['status'], _count: true }),
    prisma.order.count({ where: { status: { in: ['PENDING', 'PAID', 'PROCESSING'] } } }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, orderNumber: true, customerName: true, totalKobo: true, status: true, paymentStatus: true, createdAt: true } }),
    prisma.user.findMany({ where: { role: 'CUSTOMER', deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, firstName: true, lastName: true, email: true, createdAt: true } }),
    topProducts(5),
    lowStock(threshold),
    prisma.supportTicket.groupBy({ by: ['status'], _count: true }),
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
    prisma.payment.groupBy({ by: ['status'], _count: true, _sum: { amountKobo: true } }),
    prisma.order.count({ where: { needsAttention: true } }),
  ]);
  const tk = Object.fromEntries(tickets.map((t) => [t.status, t._count]));
  return {
    today, month, all, pendingOrders: pending, needsAttention: attention,
    completedOrders: statusCounts.find((s) => s.status === 'DELIVERED')?._count || 0,
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
    recentOrders, recentCustomers, topProducts: top, lowStockCount: low.length, lowStock: low.slice(0, 8),
    openTickets: (tk.NEW || 0) + (tk.OPEN || 0) + (tk.IN_PROGRESS || 0), newTickets: tk.NEW || 0, pendingReviews, products, customers,
    payments: payments.map((p) => ({ status: p.status, count: p._count, amountKobo: Number(p._sum.amountKobo || 0) })),
  };
};

export const topProducts = async (limit = 10) =>
  (await prisma.$queryRaw(Prisma.sql`SELECT oi."productName" AS name, oi."brandName" AS brand, SUM(oi.quantity)::int AS units, SUM(oi."lineTotalKobo")::bigint AS revenue
    FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" WHERE ${PAID}
    GROUP BY oi."productName", oi."brandName" ORDER BY units DESC LIMIT ${limit}`)).map((r) => ({ name: r.name, brand: r.brand, units: r.units, revenueKobo: Number(r.revenue) }));

export const salesOverTime = async (days = 30) => {
  const d = Math.min(Math.max(Number(days) || 30, 7), 365);
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT to_char(day, 'YYYY-MM-DD') AS date, COALESCE(s.revenue,0)::bigint AS revenue, COALESCE(s.orders,0)::int AS orders
    FROM generate_series((now() AT TIME ZONE ${TZ})::date - ${d - 1}::int, (now() AT TIME ZONE ${TZ})::date, interval '1 day') AS day
    LEFT JOIN (SELECT (o."createdAt" AT TIME ZONE ${TZ})::date AS d, SUM(o."totalKobo") AS revenue, COUNT(*) AS orders FROM "Order" o WHERE ${PAID} GROUP BY 1) s ON s.d = day::date
    ORDER BY day`);
  return rows.map((r) => ({ date: r.date, revenueKobo: Number(r.revenue), orders: r.orders }));
};

export const analyticsReport = async (days) => {
  const [series, top, byType] = await Promise.all([
    salesOverTime(days), topProducts(10),
    prisma.$queryRaw(Prisma.sql`SELECT p.type::text AS type, SUM(oi."lineTotalKobo")::bigint AS revenue FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      JOIN "ProductVariant" v ON v.id = oi."variantId" JOIN "Product" p ON p.id = v."productId" WHERE ${PAID} GROUP BY p.type ORDER BY revenue DESC`),
  ]);
  const total = series.reduce((n, d) => n + d.revenueKobo, 0); const orders = series.reduce((n, d) => n + d.orders, 0);
  return { series, topProducts: top, revenueByType: byType.map((r) => ({ type: r.type, revenueKobo: Number(r.revenue) })), totals: { revenueKobo: total, orders, aovKobo: orders ? Math.round(total / orders) : 0 } };
};
