import { useMutation, useQueryClient } from '@tanstack/react-query';
import {internalAxios} from '@/lib/axios';

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, fileType, courseCode }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);
      formData.append('courseCode', courseCode);
      
      const { data } = await internalAxios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.url;
    }
  });
}
const createCourse = (newCourse) => internalAxios.post('/admin/courses', newCourse);
const updateCourse = ({ id, ...updatedCourse }) => internalAxios.put(`/admin/courses/${id}`, updatedCourse);

export function useCourseMutation(onClose,courseData) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: courseData ? updateCourse : createCourse,
        onSuccess: (updatedData, variables) => {
            queryClient.setQueryData(['adminCourses'], (oldData) => ({
                ...oldData, ...variables, // 
            }));
            queryClient.invalidateQueries(['adminCourses']);
            onClose();
        },
        onError: (error) => {
          setError(error.response?.data?.error || error.message);
        }
      });;
}