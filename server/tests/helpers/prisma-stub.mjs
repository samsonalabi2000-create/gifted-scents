const none = ['findUnique', 'findFirst', 'aggregate'];
const row = ['update', 'create', 'upsert', 'delete'];
const delegate = new Proxy({}, { get: (_t, m) => async () => (m === 'findMany' || m === 'groupBy' ? [] : m === 'count' ? 0 : m === 'updateMany' || m === 'deleteMany' ? { count: 0 } : row.includes(m) ? { id: 'stub-id' } : none.includes(m) ? null : null) });
export class PrismaClient {
  constructor() {
    return new Proxy(this, { get: (_t, prop) => {
      if (prop === '$queryRaw' || prop === '$executeRawUnsafe') return async () => [];
      if (prop === '$transaction') return async (arg) => (typeof arg === 'function' ? arg(this) : Promise.all(arg));
      if (prop === '$disconnect') return async () => {};
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      return delegate;
    } });
  }
}
const tag = (strings, ...values) => ({ strings, values });
export const Prisma = { sql: tag, join: (a) => a, empty: '' };
export default { PrismaClient, Prisma };
