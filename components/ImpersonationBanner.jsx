"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Login as LogIn } from "reicon-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS_FA } from "@/lib/roles";

export default function ImpersonationBanner() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  const impersonatedBy = session?.user?.impersonatedBy;
  if (!impersonatedBy) return null;

  const handleExit = async () => {
    setIsExiting(true);
    const result = await signIn("impersonation-exit", { redirect: false });
    setIsExiting(false);
    if (!result?.error) {
      router.push("/admin");
      router.refresh();
    }
  };

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-white shadow-md">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        <span>
          شما در حال مشاهده سامانه به‌عنوان{" "}
          <span className="underline">{session.user.name}</span> هستید
          <span className="ms-1 text-xs opacity-90">
            ({ROLE_LABELS_FA[session.user.role] || session.user.role})
          </span>
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="cursor-pointer bg-white text-amber-700 hover:bg-amber-50"
        onClick={handleExit}
        disabled={isExiting}
      >
        <LogIn className="h-4 w-4" />
        {isExiting ? "در حال بازگشت..." : "بازگشت به حساب مدیر"}
      </Button>
    </div>
  );
}
