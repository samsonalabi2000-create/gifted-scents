// Customer-supplied text is stored as plain text. React escapes on output; this also strips markup server-side.
export const stripTags = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
export const clip = (s, n) => stripTags(s).slice(0, n);
