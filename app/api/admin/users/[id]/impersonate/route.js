import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { requireAdmin } from "@/lib/authGuard";
import { canImpersonate } from "@/lib/roles";

// POST: Validate that the current staff user may impersonate the target and
// return a summary for the confirmation dialog. The actual session swap is
// performed by the `impersonation` NextAuth provider on the client's signIn().
export async function POST(request, { params }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json(
        { error: "نمی‌توانید وارد حساب خود شوید." },
        { status: 400 }
      );
    }

    await dbConnect();
    const target = await User.findById(id).select("-password");
    if (!target) {
      return NextResponse.json({ error: "کاربر یافت نشد." }, { status: 404 });
    }

    if (target.status !== "VERIFIED") {
      return NextResponse.json(
        { error: "فقط می‌توان وارد حساب کاربران تایید‌شده شد." },
        { status: 400 }
      );
    }

    if (!canImpersonate(session.user.role, target.role)) {
      return NextResponse.json(
        { error: "شما اجازه ورود به حساب این کاربر را ندارید." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      target: {
        id: target._id.toString(),
        name: `${target.firstName} ${target.lastName}`,
        role: target.role,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "خطا در بررسی دسترسی." }, { status: 500 });
  }
}
