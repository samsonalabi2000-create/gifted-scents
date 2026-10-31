import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/endpoints.js';
export const useSettings = () => {
  const q = useQuery({ queryKey: ['settings'], queryFn: api.settings, staleTime: 5 * 60_000 });
  return { s: q.data || {}, ...q };
};
