import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Provider abstraction: add a provider by adding one entry here. Business logic never imports a vendor SDK.
const providers = {
  console: async (msg) => { logger.info({ to: msg.to, subject: msg.subject }, '[email:console] (not actually sent)\n' + msg.text); },
  resend: async (msg) => {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.email.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.email.from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
  },
};

export const sendEmail = async (msg) => {
  const send = providers[env.email.provider];
  if (!send) throw new Error(`Unknown EMAIL_PROVIDER "${env.email.provider}"`);
  return send(msg);
};
