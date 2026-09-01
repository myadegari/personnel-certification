import Course from "@/models/Course";

/** Find an unused 5-digit numeric course code (retried by the caller on a rare duplicate race). */
export async function generateUniqueCourseCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = String(Math.floor(10000 + Math.random() * 90000));
    const exists = await Course.exists({ courseCode: code });
    if (!exists) return code;
  }
  throw new Error("Could not allocate a unique course code");
}
