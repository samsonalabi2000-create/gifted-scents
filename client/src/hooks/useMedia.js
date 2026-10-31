import { useEffect, useState } from 'react';
export const useMedia = (query) => {
  const [m, setM] = useState(() => (typeof matchMedia === 'undefined' ? false : matchMedia(query).matches));
  useEffect(() => { const mq = matchMedia(query); const f = () => setM(mq.matches); f(); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, [query]);
  return m;
};
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
