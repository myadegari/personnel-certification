import ExcelJS from "exceljs";

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const IMPORT_COLUMNS = [
  "personnelNumber",
  "firstName",
  "lastName",
  "nationalId",
  "email",
  "gender",
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
  "role",
  "status",
  "createdAt",
];

export const CERTIFICATE_IMPORT_COLUMNS = [
  "firstName",
  "lastName",
  "nationalId",
  "gender",
];

// Columns that must be written as Excel "Text" (numFmt "@") so that values
// such as national IDs keep their leading zeros when the file is re-saved.
const TEXT_FORMAT_COLUMNS = [
  "personnelNumber",
  "nationalId",
  "password",
  "createdAt",
];

const VALID_GENDERS = ["Male", "Female"];
const VALID_STATUSES = ["PENDING", "NEED_TO_VERIFY", "VERIFIED", "REJECTED"];
const VALID_ROLES = ["USER", "ADMIN", "SUPERADMIN"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// Iranian national IDs are always 10 digits. Excel strips leading zeros when a
// value is entered as a number, so restore them before validation/persistence.
function padNationalId(value) {
  const s = normalizeDigits(value);
  return /^\d+$/.test(s) && s.length < 10 ? s.padStart(10, "0") : s;
}

function cellToString(cell) {
  if (!cell) return "";
  const v = cell.value;
  if (v == null) return "";
  if (v instanceof Date) return cell.text ?? "";
  // cell.text safely stringifies rich text, numbers, hyperlinks and results.
  let s = cell.text;
  if (s == null) s = String(v);
  return String(s).trim();
}

// Parse the first worksheet of an .xlsx buffer/array buffer into an array of
// row objects keyed by the header names in row 1. Fully empty rows are skipped
// and each row carries its true spreadsheet row number on the `__line` key.
export async function parseWorkbook(input) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(input);
  const ws = workbook.worksheets[0];
  if (!ws) return [];

  const headerRow = ws.getRow(1);
  const maxCol = headerRow.cellCount;
  const headers = [];
  for (let c = 1; c <= maxCol; c += 1) {
    headers[c] = cellToString(headerRow.getCell(c)).replace(/^﻿/, "");
  }

  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 1) return;
    const obj = {};
    let hasValue = false;
    for (let c = 1; c <= maxCol; c += 1) {
      const key = headers[c];
      if (!key) continue;
      const value = cellToString(row.getCell(c));
      if (value !== "") hasValue = true;
      obj[key] = value;
    }
    if (!hasValue) return;
    obj.__line = rowNumber;
    rows.push(obj);
  });
  return rows;
}

// Build an .xlsx file (returns a Buffer/ArrayBuffer) from ordered columns and
// row objects. `sheetName` labels the single worksheet; id-like columns are
// written as Excel Text so leading zeros survive round-trips.
export async function buildWorkbook({
  columns,
  rows,
  sheetName = "Sheet1",
  textColumns = TEXT_FORMAT_COLUMNS,
}) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(sheetName);

  ws.columns = columns.map((key) => ({
    header: key,
    key,
    width: 20,
  }));

  for (const row of rows) {
    ws.addRow(
      Object.fromEntries(columns.map((key) => [key, row?.[key] ?? ""]))
    );
  }

  columns.forEach((key, idx) => {
    if (textColumns.includes(key)) ws.getColumn(idx + 1).numFmt = "@";
  });

  // Style the header row a little so the template reads clearly in Excel.
  ws.getRow(1).font = { bold: true };

  return workbook.xlsx.writeBuffer();
}

export function buildTemplateWorkbook() {
  const sample = {
    personnelNumber: "1001",
    firstName: "علی",
    lastName: "رضایی",
    nationalId: "0012345678",
    email: "ali.rezaei@example.com",
    gender: "Male",
    role: "USER",
    status: "VERIFIED",
    password: "",
  };
  return buildWorkbook({ columns: IMPORT_COLUMNS, rows: [sample] });
}

export function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

// Validate a single raw imported row into a normalized user payload.
// Returns { ok, errors, data }.
export function validateUserRow(raw, { actorRole = "USER" } = {}) {
  const errors = [];
  const get = (key) => (raw[key] ?? "").toString().trim();

  const personnelNumber = get("personnelNumber");
  const firstName = get("firstName");
  const lastName = get("lastName");
  const nationalId = padNationalId(get("nationalId"));
  const email = get("email");
  const gender = get("gender");

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
      role,
      status,
      password: password || null,
    },
  };
}

// --- Bulk certificate issuance (guests) ---

// Validate a single bulk-certificate row. Gender is required because the
// certificate template prints it as the honorific (جناب آقای / سرکار خانم).
// Returns { ok, errors, data }.
export function validateCertificateRow(raw) {
  const errors = [];
  const get = (key) => (raw[key] ?? "").toString().trim();

  const firstName = get("firstName");
  const lastName = get("lastName");
  const nationalId = padNationalId(get("nationalId"));
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

export function buildCertificateTemplateWorkbook() {
  const sample = {
    firstName: "علی",
    lastName: "رضایی",
    nationalId: "0012345678",
    gender: "Male",
  };
  return buildWorkbook({ columns: CERTIFICATE_IMPORT_COLUMNS, rows: [sample] });
}
