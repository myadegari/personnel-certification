import { useMutation, useQueryClient } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, fileType, courseCode }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", fileType);
      formData.append("courseCode", courseCode);
      console.error("formData:", formData);

      const { data } = await internalAxios.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return data.url;
    },
  });
}
// This function ONLY makes an API call to create a course.
const createCourse = (newCourse) => {
  return internalAxios.post("/admin/courses", newCourse);
};

// This function ONLY makes an API call to update a course.
const updateCourse = ({ id, ...updatedCourse }) => {
  return internalAxios.put(`/admin/courses/${id}`, updatedCourse);
};


export function useCourseMutation(onClose, courseData) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: courseData ? updateCourse : createCourse,
    onSuccess: (updatedData, variables) => {
      queryClient.setQueryData(["adminCourses"], (oldData) => ({
        ...oldData,
        ...variables, //
      }));
      queryClient.invalidateQueries(["adminCourses"]);
      onClose();
    },
    onError: (error) => {
      setError(error.response?.data?.error || error.message);
    },
  });
}
