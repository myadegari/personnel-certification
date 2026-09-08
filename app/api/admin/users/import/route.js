import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcrypt";
import { requireAdmin } from "@/lib/authGuard";
import { canManageUser } from "@/lib/roles";
import { parseWorkbook, validateUserRow, generateTempPassword } from "@/lib/xlsx";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

const MAX_ROWS = 2000;

export async function POST(request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const mode = formData.get("mode") === "commit" ? "commit" : "dry-run";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "فایل اکسل ارسال نشده است." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    let rawRows;
    try {
      rawRows = await parseWorkbook(bytes);
    } catch (parseError) {
      return NextResponse.json(
        { error: "فایل اکسل قابل خواندن نیست: " + parseError.message },
        { status: 400 }
      );
    }

    if (!rawRows.length) {
      return NextResponse.json({ error: "فایل اکسل خالی است." }, { status: 400 });
    }
    if (rawRows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `حداکثر ${MAX_ROWS} ردیف مجاز است.` },
        { status: 400 }
      );
    }

    await dbConnect();

    const actorRole = session.user.role;
    const results = [];
    const summary = { total: rawRows.length, created: 0, updated: 0, skipped: 0, errors: 0 };

    for (let i = 0; i < rawRows.length; i += 1) {
      const line = rawRows[i].__line; // true spreadsheet row number
      const validation = validateUserRow(rawRows[i], { actorRole });

      if (!validation.ok) {
        summary.errors += 1;
        results.push({ line, status: "error", errors: validation.errors });
        continue;
      }

      const data = validation.data;
      const existing = await User.findOne({ personnelNumber: data.personnelNumber });

      if (existing && !canManageUser(actorRole, existing.role)) {
        summary.errors += 1;
        results.push({
          line,
          personnelNumber: data.personnelNumber,
          status: "error",
          errors: ["شما اجازه تغییر این کاربر را ندارید."],
        });
        continue;
      }

      if (mode === "dry-run") {
        if (existing) {
          summary.updated += 1;
          results.push({ line, personnelNumber: data.personnelNumber, status: "update", errors: [] });
        } else {
          summary.created += 1;
          results.push({ line, personnelNumber: data.personnelNumber, status: "create", errors: [] });
        }
        continue;
      }

      // commit
      try {
        let generatedPassword = null;
        if (existing) {
          Object.assign(existing, {
            firstName: data.firstName,
            lastName: data.lastName,
            nationalId: data.nationalId,
            email: data.email,
            gender: data.gender,
            role: data.role,
            status: data.status,
          });
          if (data.password) {
            existing.password = await bcrypt.hash(data.password, 10);
          }
          await existing.save();
          summary.updated += 1;
          results.push({ line, personnelNumber: data.personnelNumber, status: "updated", errors: [] });
        } else {
          const password = data.password || generateTempPassword();
          if (!data.password) generatedPassword = password;
          await User.create({
            ...data,
            password: await bcrypt.hash(password, 10),
          });
          summary.created += 1;
          results.push({
            line,
            personnelNumber: data.personnelNumber,
            status: "created",
            generatedPassword,
            errors: [],
          });
        }
      } catch (saveError) {
        if (saveError?.code === 11000) {
          summary.errors += 1;
          results.push({
            line,
            personnelNumber: data.personnelNumber,
            status: "error",
            errors: ["تکراری (کد ملی یا ایمیل با کاربر دیگری یکی است)."],
          });
        } else {
          summary.errors += 1;
          results.push({
            line,
            personnelNumber: data.personnelNumber,
            status: "error",
            errors: [saveError.message || "خطای نامشخص."],
          });
        }
      }
    }

    // Only real imports are audited; dry-runs are trial parses.
    if (mode === "commit") {
      await recordAuditEvent({
        request,
        session,
        action: AUDIT_ACTIONS.USER_IMPORT,
        resourceType: AUDIT_RESOURCE_TYPES.USER,
        metadata: { mode, summary },
      });
    }

    return NextResponse.json({ mode, summary, results });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Failed to import users" }, { status: 500 });
  }
}