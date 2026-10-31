import { formatNaira } from '../utils/money.js';
import { env } from '../config/env.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shell = (title, body) => `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#fff;color:#1a1412;padding:24px;border-top:4px solid #c9993a">
<h2 style="margin:0 0 16px;color:#8f6a1f">${esc(title)}</h2>${body}
<p style="margin-top:28px;color:#777;font-size:12px">Gifted Scents - Spray Happiness. Share Confidence.</p></div>`;
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const itemsTable = (items) => `<table style="width:100%;border-collapse:collapse">${items.map((i) =>
  `<tr><td style="padding:6px 0">${esc(i.productName)} (${esc(i.variantLabel)}) x ${i.quantity}</td><td style="text-align:right">${formatNaira(i.lineTotalKobo)}</td></tr>`).join('')}</table>`;

export const templates = {
  'order.confirmed': ({ order, items }) => {
    const html = shell(`Order ${order.orderNumber} confirmed`, `<p>Hi ${esc(order.customerName)}, thank you for your order.</p>${itemsTable(items)}
<p><b>Total: ${formatNaira(order.totalKobo)}</b></p><p>We will contact you about delivery to ${esc(order.addressLine)}, ${esc(order.lga)}, ${esc(order.state)}.</p>`);
    return { subject: `Order ${order.orderNumber} confirmed`, html, text: strip(html) };
  },
  'payment.received': ({ order }) => {
    const html = shell('Payment received', `<p>We received your payment of <b>${formatNaira(order.totalKobo)}</b> for order ${esc(order.orderNumber)}.</p>`);
    return { subject: `Payment received for ${order.orderNumber}`, html, text: strip(html) };
  },
  'order.shipped': ({ order }) => {
    const html = shell('Your order is on its way', `<p>Order ${esc(order.orderNumber)} has been dispatched.</p>${order.trackingNote ? `<p>${esc(order.trackingNote)}</p>` : ''}`);
    return { subject: `Order ${order.orderNumber} shipped`, html, text: strip(html) };
  },
  'order.delivered': ({ order }) => {
    const html = shell('Order delivered', `<p>Order ${esc(order.orderNumber)} has been marked as delivered. We hope you love your scent!</p>`);
    return { subject: `Order ${order.orderNumber} delivered`, html, text: strip(html) };
  },
  'auth.reset': ({ name, link }) => {
    const html = shell('Reset your password', `<p>Hi ${esc(name)}, use the link below to choose a new password. It expires in 30 minutes.</p><p><a href="${esc(link)}">Reset password</a></p><p>If you did not ask for this, you can ignore this email.</p>`);
    return { subject: 'Reset your Gifted Scents password', html, text: strip(html) };
  },
  'support.received': ({ ticket }) => {
    const html = shell('We received your message', `<p>Your request <b>${esc(ticket.ticketNumber)}</b> has been received. We will reply as soon as we can.</p>`);
    return { subject: `Support request ${ticket.ticketNumber}`, html, text: strip(html) };
  },
  'support.reply': ({ ticket, body }) => {
    const html = shell(`Reply to ${ticket.ticketNumber}`, `<p>${esc(body).replace(/\n/g, '<br>')}</p><p style="color:#777">Reply on WhatsApp or from your account if you need more help.</p>`);
    return { subject: `Reply to your request ${ticket.ticketNumber}`, html, text: strip(html) };
  },
  'support.staff': ({ ticket }) => {
    const html = shell('New support request', `<p>${esc(ticket.ticketNumber)} from ${esc(ticket.name)} (${esc(ticket.email)}): ${esc(ticket.subject)}</p><p><a href="${env.clientUrl}/admin/support">Open in admin</a></p>`);
    return { subject: `New support request ${ticket.ticketNumber}`, html, text: strip(html) };
  },
};
