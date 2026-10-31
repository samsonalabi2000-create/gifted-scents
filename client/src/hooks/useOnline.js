import { useEffect, useState } from 'react';
export const useOnline = () => {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => { const a = () => setOn(true); const b = () => setOn(false); addEventListener('online', a); addEventListener('offline', b); return () => { removeEventListener('online', a); removeEventListener('offline', b); }; }, []);
  return on;
};
