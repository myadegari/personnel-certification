import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, fileType, courseCode }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);
      formData.append('courseCode', courseCode);
      
      const { data } = await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.url;
    }
  });
}
const createCourse = (newCourse) => axios.post('/admin/courses', newCourse);
const updateCourse = ({ id, ...updatedCourse }) => axios.put(`/admin/courses/${id}`, updatedCourse);
const mutation = ``

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