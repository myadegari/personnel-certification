import { useMutation, useQueryClient } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";

// This function ONLY makes an API call to create a course.
const createCourse = (newCourse) => {
  return internalAxios.post("/admin/courses", newCourse);
};

// This function ONLY makes an API call to update a course.
const updateCourse = ({ id, ...updatedCourse }) => {
  return internalAxios.put(`/admin/courses/${id}`, updatedCourse);
};


/**
 * A custom mutation hook for creating or updating courses.
 * It dynamically chooses the correct API endpoint based on the
 * presence of an 'id' in the submitted data.
 */
export function useCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (coursePayload) => {
      // If the payload has an 'id', we are updating an existing course.
      if (coursePayload.id) {
        const { data } = await updateCourse(coursePayload);
        return data;
      }
      // Otherwise, we are creating a new one.
      const { data } = await createCourse(coursePayload);
      return data;
    },
    // After a successful mutation, invalidate the courses query to refetch fresh data.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCourses"] });
    },
    // Re-throw the error to be caught by the component's try/catch block.
    onError: (error) => {
      throw error;
    },
  });
}
