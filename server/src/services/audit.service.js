import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

/** Never throws: auditing must not break the action being audited. */
export const audit = async ({ actor, action, entity, entityId, diff, req, tx }) => {
  try {
    await (tx || prisma).auditLog.create({
      data: { actorId: actor?.id ?? null, action, entity, entityId: entityId ? String(entityId) : null, diff: diff ?? undefined, ip: req?.ip ?? null },
    });
  } catch (err) {
    logger.error({ err, action }, 'audit log failed');
  }
};
