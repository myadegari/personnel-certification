"use client";

import { Badge } from "@/components/ui/badge";
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
import { USER_STATUS_META, FALLBACK_STATUS_META } from "@/lib/statusLabels";

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
  const status = USER_STATUS_META[user?.status] || FALLBACK_STATUS_META;

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
                {user ? `${user.firstName} ${user.lastName}` : "جزئیات کاربر"}
              </SheetTitle>
              <SheetDescription>جزئیات کاربر</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {user && (
          <div className="flex flex-col gap-1 px-4 pb-6">
            <div className="mb-2 flex items-center gap-2">
              <Badge className={status.tone}>{status.label}</Badge>
              <Badge variant="outline" className="border-sky-600/20 text-sky-700">
                {ROLE_LABELS_FA[user.role] || user.role}
              </Badge>
            </div>
            <Field label="شماره پرسنلی" value={<span dir="ltr">{user.personnelNumber}</span>} />
            <Field label="کد ملی" value={<span dir="ltr">{user.nationalId}</span>} />
            <Field label="ایمیل" value={<span dir="ltr">{user.email}</span>} />
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
                  <img src={signatureQuery.data} alt="امضای کاربر" className="max-h-full object-contain" />
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
