import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export const IMPORT_COLUMNS = [
  "personnelNumber",
  "firstName",
  "lastName",
  "nationalId",
  "email",
  "gender",
  "position",
  "isProfessor",
  "role",
  "status",
  "password",
];

export const EXPORT_COLUMNS = [
  "personnelNumber",
  "firstName",
  "lastName",
  "nationalId",
  "email",
  "gender",
  "position",
  "isProfessor",
  "role",
  "status",
  "createdAt",
];

const VALID_GENDERS = ["Male", "Female"];
const VALID_STATUSES = ["PENDING", "NEED_TO_VERIFY", "VERIFIED", "REJECTED"];
const VALID_ROLES = ["USER", "ADMIN", "SUPERADMIN"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function truthy(value) {
  return ["1", "true", "yes", "y", "on", "بله"].includes(String(value).trim().toLowerCase());
}

export function parseCsv(text) {
  return parse(text, {
    columns: (header) => header.map((h) => String(h).trim().replace(/^\uFEFF/, "")),
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

export function stringifyCsv(rows, columns) {
  return stringify(rows, { header: true, columns });
}

export function buildTemplateCsv() {
  const sample = {
    personnelNumber: "1001",
    firstName: "علی",
    lastName: "رضایی",
    nationalId: "0012345678",
    email: "ali.rezaei@example.com",
    gender: "Male",
    position: "کارشناس",
    isProfessor: "false",
    role: "USER",
    status: "VERIFIED",
    password: "",
  };
  return stringifyCsv([sample], IMPORT_COLUMNS);
}

// Validate a single raw CSV row into a normalized user payload.
// Returns { ok, errors, data }.
export function validateUserRow(raw, { actorRole = "USER" } = {}) {
  const errors = [];
  const get = (key) => (raw[key] ?? "").toString().trim();

  const personnelNumber = get("personnelNumber");
  const firstName = get("firstName");
  const lastName = get("lastName");
  const nationalId = get("nationalId");
  const email = get("email");
  const gender = get("gender");
  const position = get("position");
  const isProfessor = truthy(get("isProfessor"));

  let role = get("role") || "USER";
  let status = get("status") || "VERIFIED";
  const password = get("password");

  if (!personnelNumber) errors.push("شماره پرسنلی الزامی است.");
  if (!firstName) errors.push("نام الزامی است.");
  if (!lastName) errors.push("نام خانوادگی الزامی است.");
  if (!nationalId) errors.push("کد ملی الزامی است.");
  if (!email) errors.push("ایمیل الزامی است.");
  else if (!EMAIL_RE.test(email)) errors.push("ایمیل نامعتبر است.");
  if (!gender) errors.push("جنسیت الزامی است.");
  else if (!VALID_GENDERS.includes(gender))
    errors.push("جنسیت باید Male یا Female باشد.");

  if (!VALID_ROLES.includes(role)) errors.push("نقش نامعتبر است.");
  if (actorRole !== "SUPERADMIN" && role !== "USER")
    errors.push("فقط سوپرادمین می‌تواند نقش غیر از کاربر وارد کند.");
  if (!VALID_STATUSES.includes(status)) errors.push("وضعیت نامعتبر است.");
  if (password && password.length < 8)
    errors.push("رمز عبور باید حداقل ۸ کاراکتر باشد.");

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    data: {
      personnelNumber,
      firstName,
      lastName,
      nationalId,
      email,
      gender,
      position,
      isProfessor,
      role,
      status,
      password: password || null,
    },
  };
}

export function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

// --- Bulk certificate issuance (guests) ---

export const CERTIFICATE_IMPORT_COLUMNS = [
  "firstName",
  "lastName",
  "nationalId",
  "gender",
];

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

// Persian/Arabic digits -> Latin digits (user records may store either form).
export function normalizeDigits(value) {
  return String(value ?? "").replace(/[۰-۹٠-٩]/g, (d) => {
    const p = PERSIAN_DIGITS.indexOf(d);
    if (p > -1) return String(p);
    return String(ARABIC_DIGITS.indexOf(d));
  });
}

// Validate a single bulk-certificate CSV row. Gender is required because the
// certificate template prints it as the honorific (جناب آقای / سرکار خانم).
// Returns { ok, errors, data }.
export function validateCertificateRow(raw) {
  const errors = [];
  const get = (key) => (raw[key] ?? "").toString().trim();

  const firstName = get("firstName");
  const lastName = get("lastName");
  const nationalId = normalizeDigits(get("nationalId"));
  const gender = get("gender");

  if (!firstName) errors.push("نام الزامی است.");
  if (!lastName) errors.push("نام خانوادگی الزامی است.");
  if (!nationalId) errors.push("کد ملی الزامی است.");
  else if (!/^\d{10}$/.test(nationalId))
    errors.push("کد ملی باید ۱۰ رقم باشد.");
  if (!gender) errors.push("جنسیت الزامی است.");
  else if (!["Male", "Female"].includes(gender))
    errors.push("جنسیت باید Male یا Female باشد.");

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    data: { firstName, lastName, nationalId, gender },
  };
}

export function buildCertificateTemplateCsv() {
  const sample = {
    firstName: "علی",
    lastName: "رضایی",
    nationalId: "0012345678",
    gender: "Male",
  };
  return stringifyCsv([sample], CERTIFICATE_IMPORT_COLUMNS);
}
