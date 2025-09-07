// hooks/useFileUrl.js
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export const useFileUrl = (fileId) => {
  return useQuery({
    queryKey: ['fileUrl', fileId], // Unique key per file
    queryFn: async () => {
      if (!fileId) return null; // Don't fetch if no ID
      const { data } = await axios.get(`/file/${fileId}`);
      return data.url;
    },
    enabled: !!fileId, // Only run if fileId exists
  });
};