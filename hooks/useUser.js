import { useQuery } from '@tanstack/react-query';
import {internalAxios} from '@/lib/axios';

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await internalAxios.get('/profile');
      return data;
    }
  });
}