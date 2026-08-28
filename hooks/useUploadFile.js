import { useMutation } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";

/**
 * Uploads a file to /api/upload.
 * @param {object} payload
 * @param {File} payload.file
 * @param {"stamp1"|"stamp2"} payload.fileType
 * @param {string} [payload.courseCode] - required for stamp uploads
 * @returns {Promise<string>} the stored file id (url field)
 */
export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, fileType, courseCode }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", fileType);
      if (courseCode) {
        formData.append("courseCode", courseCode);
      }
      const { data } = await internalAxios.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return data.url;
    },
  });
}
