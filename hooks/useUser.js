import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await axios.get('/profile');
      return data;
    }
  });
}