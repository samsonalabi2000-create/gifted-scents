// Nigerian numbers: 0805... -> 234805...  (wa.me needs digits only, international format)
export const toWhatsAppNumber = (raw) => {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('234')) return d;
  if (d.startsWith('0')) return `234${d.slice(1)}`;
  return d;
};
