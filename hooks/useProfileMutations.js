import { useMutation, useQueryClient } from '@tanstack/react-query';
import {internalAxios} from '@/lib/axios';

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, fileType }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);
      
      const { data } = await internalAxios.post('/upload', formData, {
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
      const { data } = await internalAxios.put('/profile', profileData);
      return data;
    },
    onSuccess: (updatedData, variables) => {
      // Update the user cache immediately with the new data
      queryClient.setQueryData(['user'], (oldData) => {
  
        queryClient.invalidateQueries({queryKey:['fileUrl',oldData?.profileImage]})
        queryClient.invalidateQueries({queryKey:['fileUrl',oldData?.signatureImage]})
        
        return{
        ...oldData,
        ...variables, // This contains the updated profile data including new image URLs
      }});
    
      // Also invalidate to ensure fresh data from server
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    }
  });
}