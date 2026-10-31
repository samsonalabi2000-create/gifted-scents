// Removes ONLY rows flagged isDemo (demo orders, customers, products + their reviews/variants). Real data is untouched.
import { prisma } from '../src/config/prisma.js';
const orders = await prisma.order.deleteMany({ where: { isDemo: true } });
const products = await prisma.product.deleteMany({ where: { isDemo: true } });
const users = await prisma.user.deleteMany({ where: { isDemo: true } });
console.log(`Removed demo data: ${orders.count} orders, ${products.count} products, ${users.count} customers.`);
await prisma.$disconnect();
