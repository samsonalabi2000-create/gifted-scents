import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { clip } from '../../utils/sanitize.js';
import { toWhatsAppNumber } from '../../utils/phone.js';
import { getAllSettings } from '../settings.service.js';
import { cardsByIds } from '../catalog.service.js';
import { providers, aiConfigured } from './providers.js';
import { retrieveContext } from './retrieval.js';
import { amountsAreGrounded, filterProductIds, needsHuman, parseModelJson } from './guard.js';
import { env } from '../../config/env.js';

const SYSTEM = (name, store) => `You are ${name}, the shopping assistant for ${store}, a Nigerian fragrance and personal-care retailer.
STRICT RULES:
- Use ONLY the JSON "CONTEXT" in the user's message. Never use outside knowledge for prices, stock, delivery, discounts, policies, hours or contact details.
- Recommend ONLY products listed in CONTEXT.products, by their exact "id". Never invent a product, size, price, discount or stock level.
- If a product has inStock=false say it is currently sold out. If CONTEXT lacks the answer, say you do not have that information and offer to connect the customer to a human.
- Quote prices exactly as given (e.g. "priceFrom"). Do not convert, round or estimate.
- Do not claim or imply Gifted Scents is affiliated with, or an official distributor of, any designer brand.
- For refunds, payment disputes, order problems, missing deliveries, complaints or account problems, tell the customer to use "Talk to a human".
- Be warm, concise (max ~120 words), and speak naturally. Plain text only, no markdown tables.
Respond with ONLY valid JSON: {"reply": string, "productIds": string[]}  (max 4 productIds, only ids from CONTEXT).`;

const supportChannels = async () => {
  const s = await getAllSettings();
  const wa = toWhatsAppNumber(s['support.whatsapp']);
  return { whatsappUrl: wa ? `https://wa.me/${wa}?text=${encodeURIComponent('Hello Gifted Scents, I need help.')}` : null, phone: s['store.phone'], email: s['support.email'] || s['store.email'] || null, availability: s['support.availability'] };
};

/** Used when no AI key is configured or the model's answer fails validation: answers purely from retrieved DB rows. */
const groundedFallback = (ctx, message) => {
  const sold = ctx.products.filter((p) => p.inStock).slice(0, 3);
  if (!sold.length) return { reply: "I couldn't find a matching product in stock right now. You can browse the shop, or tap \"Talk to a human\" and the team will help you.", productIds: [] };
  const lines = sold.map((p) => `${p.name} by ${p.brand} (from ${p.priceFrom})`).join('; ');
  return { reply: `Here are some options from our current collection: ${lines}. Tap a card below to see sizes, notes and availability.`, productIds: sold.map((p) => p.id) };
};

export const chat = async ({ message, history = [], conversationId, sessionId, user }) => {
  const s = await getAllSettings();
  const text = clip(message, 800);
  let convo = conversationId ? await prisma.supportConversation.findFirst({ where: { id: conversationId, sessionId } }) : null;
  if (!convo) convo = await prisma.supportConversation.create({ data: { sessionId, userId: user?.id ?? null, status: 'OPEN' } });
  await prisma.chatMessage.create({ data: { conversationId: convo.id, sender: 'CUSTOMER', content: text } });

  const save = async (reply, productIds) => {
    await prisma.chatMessage.create({ data: { conversationId: convo.id, sender: 'AI', content: reply, productRefs: productIds } });
  };

  if (s['ai.enabled'] === false) {
    const channels = await supportChannels();
    const reply = 'The assistant is switched off right now. Please contact the team directly.';
    await save(reply, []);
    return { conversationId: convo.id, reply, products: [], handoff: channels };
  }

  if (needsHuman(text)) {
    await prisma.supportConversation.update({ where: { id: convo.id }, data: { handedOff: true } });
    const channels = await supportChannels();
    const reply = "That's something our team should handle personally so it's sorted properly. You can reach a real person below, or leave your details and we'll follow up.";
    await save(reply, []);
    return { conversationId: convo.id, reply, products: [], handoff: channels, suggestTicket: true };
  }

  const ctx = await retrieveContext(text, history);
  let result;
  if (aiConfigured()) {
    try {
      const msgs = [...history.slice(-6).map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: clip(h.content, 600) })), { role: 'user', content: `CONTEXT:\n${JSON.stringify({ products: ctx.products, store: ctx.facts })}\n\nCUSTOMER MESSAGE:\n${text}` }];
      const raw = await providers[env.ai.provider]({ system: SYSTEM(s['ai.name'], s['store.name']), messages: msgs });
      const parsed = parseModelJson(raw);
      const reply = parsed && typeof parsed.reply === 'string' ? clip(parsed.reply, 1500) : null;
      const allowed = [...ctx.allowedAmountsKobo, ...(ctx.budgetKobo ? [ctx.budgetKobo] : [])];
      if (reply && amountsAreGrounded(reply, allowed)) result = { reply, productIds: filterProductIds(parsed.productIds, ctx.products.map((p) => p.id)).slice(0, 4) };
      else logger.warn({ hadReply: Boolean(reply) }, 'AI reply rejected by grounding guard');
    } catch (err) { logger.warn({ err: err.message }, 'AI provider failed; using grounded fallback'); }
  }
  result ||= groundedFallback(ctx, text);

  // Cards are rebuilt from the DB so price/stock shown is always current, and non-existent ids vanish.
  const products = await cardsByIds(result.productIds);
  await save(result.reply, products.map((p) => p.id));
  return { conversationId: convo.id, reply: result.reply, products, handoff: null };
};

export const assistantPublicConfig = async () => {
  const s = await getAllSettings();
  return { enabled: s['ai.enabled'] !== false, name: s['ai.name'], greeting: s['ai.greeting'], channels: await supportChannels() };
};
export { supportChannels };
