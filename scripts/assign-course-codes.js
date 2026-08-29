import mongoose from "mongoose";
import Course from "../models/Course.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectWithRetry(url, { attempts = 10, delayMs = 3000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(url, { bufferCommands: false, serverSelectionTimeoutMS: delayMs });
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Database not ready (attempt ${attempt}/${attempts}): ${error.message || error}`);
      if (attempt < attempts) await sleep(delayMs);
    }
  }
  throw lastError;
}

const isFiveDigit = (value) => /^\d{5}$/.test(String(value || ""));

async function main() {
  const mongoUrl = process.env.MONGODB_URL?.trim();
  if (!mongoUrl) {
    throw new Error("MONGODB_URL environment variable is not set.");
  }

  await connectWithRetry(mongoUrl);

  const courses = await Course.find({}).select("courseCode name").lean();
  const used = new Set(
    courses.filter((c) => isFiveDigit(c.courseCode)).map((c) => String(c.courseCode))
  );
  const needs = courses.filter((c) => !isFiveDigit(c.courseCode));

  if (!needs.length) {
    console.log("All courses already have a unique 5-digit code.");
    return;
  }

  const randomCode = () => String(Math.floor(10000 + Math.random() * 90000));
  let assigned = 0;

  for (const course of needs) {
    let code = randomCode();
    let guard = 0;
    while (used.has(code) && guard < 1000) {
      code = randomCode();
      guard += 1;
    }
    if (used.has(code)) {
      console.error(`Could not allocate a unique code for course ${course._id} (${course.name}).`);
      continue;
    }
    await Course.updateOne({ _id: course._id }, { $set: { courseCode: code } });
    used.add(code);
    assigned += 1;
    console.log(`Assigned ${code} -> ${course.name} (${course._id})`);
  }

  console.log(`Done. Assigned codes to ${assigned}/${needs.length} course(s).`);
}

main()
  .catch((error) => {
    console.error(`assign-course-codes failed: ${error.message || error}`);
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
