import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dbConnect from "../lib/dbConnect.js";
import User from "../models/User.js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    return null;
  }
  return value;
}

function optional(name, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function parseBoolean(value) {
  return ["1", "true", "yes", "y", "on"].includes(String(value).toLowerCase());
}

async function main() {
  const personnelNumber = required("SUPERADMIN_PERSONNEL_NUMBER");
  const firstName = required("SUPERADMIN_FIRST_NAME");
  const lastName = required("SUPERADMIN_LAST_NAME");
  const email = required("SUPERADMIN_EMAIL");
  const nationalId = required("SUPERADMIN_NATIONAL_ID");
  const gender = required("SUPERADMIN_GENDER");
  const password = required("SUPERADMIN_PASSWORD");
  const position = optional("SUPERADMIN_POSITION");
  const isProfessor = parseBoolean(optional("SUPERADMIN_IS_PROFESSOR", "false"));

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

  await dbConnect();

  const hashedPassword = await bcrypt.hash(password, 10);
  const existing = await User.findOne({ personnelNumber });

  if (existing) {
    existing.firstName = firstName;
    existing.lastName = lastName;
    existing.email = email;
    existing.nationalId = nationalId;
    existing.gender = gender;
    existing.position = position;
    existing.isProfessor = isProfessor;
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
    position,
    isProfessor,
    password: hashedPassword,
    role: "SUPERADMIN",
    status: "VERIFIED",
  });

  console.log(`Superadmin created: ${personnelNumber}`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
