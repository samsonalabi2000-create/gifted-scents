import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { sendEmail } from './email.service.js';
import { templates } from './emailTemplates.js';

// Channel registry. WHATSAPP / SMS slots exist in the schema; add a handler here to switch them on.
const channels = {
  EMAIL: async ({ recipient, template, payload }) => {
    const build = templates[template];
    if (!build) throw new Error(`No email template "${template}"`);
    await sendEmail({ to: recipient, ...build(payload) });
  },
  IN_APP: async () => {}, // the Notification row itself is the in-app record
};

/** Fire-and-forget safe: failures are recorded, never thrown into order/payment logic. */
export const notify = async ({ template, recipient, userId = null, payload, via = ['EMAIL'] }) => {
  for (const channel of via) {
    let row;
    try {
      row = await prisma.notification.create({ data: { userId, channel, template, recipient, payload: JSON.parse(JSON.stringify(payload)), status: 'QUEUED' } });
      const handler = channels[channel];
      if (!handler) throw new Error(`Channel ${channel} is not enabled`);
      await handler({ recipient, template, payload });
      await prisma.notification.update({ where: { id: row.id }, data: { status: 'SENT', sentAt: new Date() } });
    } catch (err) {
      logger.warn({ err: err.message, template, channel }, 'notification failed');
      if (row) await prisma.notification.update({ where: { id: row.id }, data: { status: 'FAILED', error: String(err.message).slice(0, 300) } }).catch(() => {});
    }
  }
};
