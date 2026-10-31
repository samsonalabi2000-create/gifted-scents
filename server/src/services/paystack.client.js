import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { safeEqual } from '../utils/crypto.js';

const BASE = 'https://api.paystack.co';

const call = async (path, { method = 'GET', body } = {}) => {
  if (!env.paystack.secretKey) throw new AppError('Online payment is not available right now. Please contact us on WhatsApp.', 503, 'PAYMENTS_NOT_CONFIGURED');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method, signal: ctrl.signal,
      headers: { Authorization: `Bearer ${env.paystack.secretKey}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === false) throw new AppError('We could not reach the payment provider. Please try again.', 502, 'PAYSTACK_ERROR', { upstream: json.message });
    return json.data;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('We could not reach the payment provider. Please try again.', 502, 'PAYSTACK_UNREACHABLE');
  } finally { clearTimeout(timer); }
};

export const paystack = {
  initialize: (payload) => call('/transaction/initialize', { method: 'POST', body: payload }),
  verify: (reference) => call(`/transaction/verify/${encodeURIComponent(reference)}`),
  refund: (payload) => call('/refund', { method: 'POST', body: payload }),
};

/** HMAC-SHA512 of the RAW request body, compared in constant time. */
export const verifyPaystackSignature = (rawBody, signature, secret) => {
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
};
