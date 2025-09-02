import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, fileType }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);
      
      const { data } = await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.url;
    }
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profileData) => {
      const { data } = await axios.put('/profile', profileData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session','user'] });
      // queryClient.invalidateQueries({ queryKey: ['user'] });
    }
  });
}