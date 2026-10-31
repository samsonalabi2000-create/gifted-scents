import { env } from '../../config/env.js';

const timeoutFetch = async (url, init) => {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25_000);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(t); }
};

// Each provider: complete({ system, messages }) -> string. Add a provider = add an entry. Nothing else changes.
export const providers = {
  anthropic: async ({ system, messages }) => {
    const res = await timeoutFetch(env.ai.baseUrl || 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ai.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.ai.model || 'claude-haiku-4-5-20251001', max_tokens: 700, temperature: 0.3, system, messages }),
    });
    if (!res.ok) throw new Error(`AI provider responded ${res.status}`);
    const json = await res.json();
    return json.content?.map((b) => b.text || '').join('') || '';
  },
  // Any OpenAI-compatible endpoint (set AI_BASE_URL and AI_MODEL)
  openai: async ({ system, messages }) => {
    const res = await timeoutFetch(`${(env.ai.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.ai.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.ai.model || 'gpt-4o-mini', temperature: 0.3, max_tokens: 700, messages: [{ role: 'system', content: system }, ...messages] }),
    });
    if (!res.ok) throw new Error(`AI provider responded ${res.status}`);
    const json = await res.json();
    return json.choices?.[0]?.message?.content || '';
  },
};

export const aiConfigured = () => Boolean(env.ai.apiKey) && env.ai.provider in providers;
