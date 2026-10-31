// Number comes from Site Settings (admin-editable). Never hard-code it in components.
export const waLink = (number, text = 'Hello Gifted Scents') => {
  const d = String(number || '').replace(/\D/g, '');
  if (!d) return null;
  const intl = d.startsWith('234') ? d : d.startsWith('0') ? `234${d.slice(1)}` : d;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
};
export const WA = {
  product: (p) => `Hello Gifted Scents, I'd like to ask about ${p.brand ? p.brand + ' ' : ''}${p.name}.`,
  order: (n) => `Hello Gifted Scents, where is my order${n ? ' ' + n : ''}?`,
  help: 'Hello Gifted Scents, I need help.',
  chat: 'Hello Gifted Scents, I would like to talk to someone.',
};
