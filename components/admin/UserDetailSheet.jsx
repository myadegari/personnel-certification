"use client";

import { Badge } from "@radix-ui/themes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useFileUrl } from "@/hooks/useFileUrl";
import { ROLE_LABELS_FA } from "@/lib/roles";

const STATUS_LABELS = {
  PENDING: { label: "در انتظار تکمیل", color: "orange" },
  NEED_TO_VERIFY: { label: "در انتظار تایید", color: "yellow" },
  VERIFIED: { label: "تایید شده", color: "green" },
  REJECTED: { label: "رد شده", color: "ruby" },
};

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-dashed py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default function UserDetailSheet({ user, open, onOpenChange }) {
  const signatureQuery = useFileUrl(user?.signatureImage);
  const status = STATUS_LABELS[user?.status] || { label: "نامشخص", color: "gray" };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-emerald-100 text-emerald-700">
                {user?.firstName?.[0] ?? "?"}
                {user?.lastName?.[0] ?? ""}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <SheetTitle>
                {user ? `${user.firstName} ${user.lastName}` : ""}
              </SheetTitle>
              <SheetDescription>جزئیات کاربر</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {user && (
          <div className="flex flex-col gap-1 px-4 pb-6">
            <div className="mb-2 flex items-center gap-2">
              <Badge color={status.color} radius="full">
                {status.label}
              </Badge>
              <Badge color="blue" variant="outline" radius="full">
                {ROLE_LABELS_FA[user.role] || user.role}
              </Badge>
            </div>
            <Field label="شماره پرسنلی" value={user.personnelNumber} />
            <Field label="کد ملی" value={user.nationalId} />
            <Field label="ایمیل" value={user.email} />
            <Field label="جنسیت" value={user.gender === "Male" ? "آقا" : user.gender === "Female" ? "خانم" : ""} />
            <Field label="سمت" value={user.position} />
            <Field label="عضو هیات علمی" value={user.isProfessor ? "بله" : "خیر"} />
            <Field
              label="تاریخ عضویت"
              value={user.createdAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(new Date(user.createdAt)) : ""}
            />
            <div className="mt-3">
              <span className="text-xs text-muted-foreground">امضای کاربر</span>
              <div className="mt-1 flex h-24 items-center justify-center rounded-md border bg-gray-50 p-2">
                {signatureQuery.data ? (
                  <img src={signatureQuery.data} alt="signature" className="max-h-full object-contain" />
                ) : (
                  <span className="text-sm text-gray-400">امضایی ثبت نشده است</span>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
