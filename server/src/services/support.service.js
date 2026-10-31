import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { clip } from '../utils/sanitize.js';
import { randomCode } from '../utils/crypto.js';
import { paginate, pageMeta } from '../utils/pagination.js';
import { notify } from './notification.service.js';
import { getSetting } from './settings.service.js';
import { audit } from './audit.service.js';

export const createTicket = async (input, user) => {
  let ticket;
  for (let i = 0; i < 5 && !ticket; i++) {
    try {
      ticket = await prisma.supportTicket.create({
        data: {
          ticketNumber: `GS-T-${randomCode(5)}`, userId: user?.id ?? null, name: clip(input.name, 100), email: input.email.toLowerCase(),
          phone: input.phone ? clip(input.phone, 25) : null, orderNumber: input.orderNumber ? clip(input.orderNumber, 40) : null,
          category: input.category ? clip(input.category, 40) : null, subject: clip(input.subject || input.category || 'Support request', 160),
          message: clip(input.message, 4000),
          messages: { create: { sender: 'CUSTOMER', body: clip(input.message, 4000) } },
        },
      });
    } catch (e) { if (e.code !== 'P2002') throw e; }
  }
  if (!ticket) throw new AppError('Could not create your request. Please try again.', 500, 'TICKET_FAILED');
  notify({ template: 'support.received', recipient: ticket.email, userId: ticket.userId, payload: { ticket } });
  const staffEmail = await getSetting('support.email');
  if (staffEmail) notify({ template: 'support.staff', recipient: staffEmail, payload: { ticket } });
  return ticket;
};

const ticketInclude = { messages: { orderBy: { createdAt: 'asc' } }, notes: { orderBy: { createdAt: 'asc' } } };

export const listTickets = async (query) => {
  const pg = paginate(query, { defaultLimit: 20, maxLimit: 50 });
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { OR: [{ ticketNumber: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }, { name: { contains: query.q, mode: 'insensitive' } }, { orderNumber: { contains: query.q, mode: 'insensitive' } }] } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take, include: { _count: { select: { messages: true } } } }),
  ]);
  return { items, meta: pageMeta(total, pg) };
};

export const getTicket = async (id) => {
  const t = await prisma.supportTicket.findUnique({ where: { id }, include: ticketInclude });
  if (!t) throw new AppError('Request not found.', 404, 'NOT_FOUND');
  return t;
};

export const listUserTickets = (userId) => prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { messages: { orderBy: { createdAt: 'asc' } } } });

export const replyToTicket = async (id, body, actor, req) => {
  const ticket = await getTicket(id);
  await prisma.$transaction([
    prisma.supportMessage.create({ data: { ticketId: id, sender: 'STAFF', authorId: actor.id, body: clip(body, 4000) } }),
    prisma.supportTicket.update({ where: { id }, data: { status: ticket.status === 'NEW' || ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status } }),
  ]);
  notify({ template: 'support.reply', recipient: ticket.email, userId: ticket.userId, payload: { ticket, body } });
  await audit({ actor, action: 'support.reply', entity: 'SupportTicket', entityId: id, req });
  return getTicket(id);
};

export const addInternalNote = async (id, body, actor) => {
  await prisma.supportNote.create({ data: { ticketId: id, authorId: actor.id, body: clip(body, 2000), internal: true } });
  return getTicket(id);
};

export const setTicketStatus = async (id, status, actor, req) => {
  const t = await prisma.supportTicket.update({ where: { id }, data: { status, assignedToId: actor.id } });
  await audit({ actor, action: 'support.status', entity: 'SupportTicket', entityId: id, diff: { status }, req });
  return t;
};
