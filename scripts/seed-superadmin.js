import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.js";

function required(name) {
  const value = process.env[name]?.trim();
  return value || null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectWithRetry(url, { attempts = 10, delayMs = 3000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(url, { bufferCommands: false, serverSelectionTimeoutMS: delayMs });
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `Database not ready (attempt ${attempt}/${attempts}): ${error.message || error}`
      );
      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

async function main() {
  const personnelNumber = required("SUPERADMIN_PERSONNEL_NUMBER");
  const firstName = required("SUPERADMIN_FIRST_NAME");
  const lastName = required("SUPERADMIN_LAST_NAME");
  const email = required("SUPERADMIN_EMAIL");
  const nationalId = required("SUPERADMIN_NATIONAL_ID");
  const gender = required("SUPERADMIN_GENDER");
  const password = required("SUPERADMIN_PASSWORD");

  if (!personnelNumber || !firstName || !lastName || !email || !nationalId || !gender || !password) {
    console.warn(
      "Skipping superadmin seed: SUPERADMIN_* environment variables are not fully configured."
    );
    return;
  }

  if (password.length < 8) {
    throw new Error("SUPERADMIN_PASSWORD must be at least 8 characters.");
  }
  if (!["Male", "Female"].includes(gender)) {
    throw new Error("SUPERADMIN_GENDER must be Male or Female.");
  }

  const mongoUrl = process.env.MONGODB_URL?.trim();
  if (!mongoUrl) {
    throw new Error("MONGODB_URL environment variable is not set.");
  }

  await connectWithRetry(mongoUrl);

  const hashedPassword = await bcrypt.hash(password, 10);
  const existing = await User.findOne({ personnelNumber });

  if (existing) {
    existing.firstName = firstName;
    existing.lastName = lastName;
    existing.email = email;
    existing.nationalId = nationalId;
    existing.gender = gender;
    existing.role = "SUPERADMIN";
    existing.status = "VERIFIED";
    existing.password = hashedPassword;
    await existing.save();
    console.log(`Superadmin updated: ${personnelNumber}`);
    return;
  }

  await User.create({
    personnelNumber,
    firstName,
    lastName,
    email,
    nationalId,
    gender,
    password: hashedPassword,
    role: "SUPERADMIN",
    status: "VERIFIED",
  });

  console.log(`Superadmin created: ${personnelNumber}`);
}

main()
  .catch((error) => {
    console.error(`Superadmin seed failed: ${error.message || error}`);
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
