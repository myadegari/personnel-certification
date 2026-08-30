"use client";

import { motion } from "motion/react";
import {
  BadgeCheck,
  Briefcase,
  Calendar,
  GraduationCap,
  Hash,
  Mail,
  PenLine,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useFileUrl } from "@/hooks/useFileUrl";
import { ROLE_LABELS_FA } from "@/lib/roles";
import { USER_STATUS_META, FALLBACK_STATUS_META } from "@/lib/statusLabels";
import { formatDate } from "@/lib/persian-date";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { initialsOf } from "@/components/shared/SidebarNavLink";
import InfoField from "@/components/shared/InfoField";

export default function UserDetailSheet({ user, open, onOpenChange }) {
  const signatureQuery = useFileUrl(user?.signatureImage);
  const status = USER_STATUS_META[user?.status] || FALLBACK_STATUS_META;
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : "جزئیات کاربر";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{fullName}</SheetTitle>
          <SheetDescription>جزئیات کاربر</SheetDescription>
        </SheetHeader>

        {user && (
          <motion.div
            variants={staggerContainer(0.06)}
            initial="hidden"
            animate="show"
            className="space-y-5 px-1 pb-6"
          >
            {/* Hero */}
            <motion.div
              variants={fadeUp}
              className="relative overflow-hidden rounded-2xl border border-black/5 bg-white/80 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0" />
              <div className="relative flex items-center gap-3">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-base font-bold text-white shadow-md shadow-emerald-500/25">
                  {initialsOf(fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-gray-900">{fullName}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-sky-600/20 text-sky-700">
                      <ShieldCheck className="me-1 size-3" />
                      {ROLE_LABELS_FA[user.role] || user.role}
                    </Badge>
                    <Badge className={status.tone}>
                      <BadgeCheck className="me-1 size-3" />
                      {status.label}
                    </Badge>
                  </div>
                </div>
                {user.personnelNumber && (
                  <span
                    dir="ltr"
                    className="hidden shrink-0 items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium tabular-nums text-gray-700 sm:inline-flex"
                  >
                    <Hash className="size-3" /> {user.personnelNumber}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Details */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 gap-2">
              <InfoField
                icon={Hash}
                label="شماره پرسنلی"
                value={user.personnelNumber ? <span dir="ltr">{user.personnelNumber}</span> : null}
              />
              <InfoField
                icon={Hash}
                label="کد ملی"
                value={user.nationalId ? <span dir="ltr">{user.nationalId}</span> : null}
              />
              <InfoField
                icon={Mail}
                label="ایمیل"
                value={user.email ? <span dir="ltr">{user.email}</span> : null}
              />
              <InfoField
                icon={UserRound}
                label="جنسیت"
                value={
                  user.gender === "Male" ? "آقا" : user.gender === "Female" ? "خانم" : ""
                }
              />
              <InfoField icon={Briefcase} label="سمت" value={user.position} />
              <InfoField
                icon={GraduationCap}
                label="عضو هیات علمی"
                value={user.isProfessor ? "بله" : "خیر"}
              />
              <InfoField
                icon={Calendar}
                label="تاریخ عضویت"
                value={
                  user.createdAt
                    ? formatDate(new Date(user.createdAt), "yyyy/MM/dd")
                    : null
                }
              />
            </motion.div>

            {/* Signature */}
            <motion.div variants={fadeUp} className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <PenLine className="size-3.5" /> امضای کاربر
              </p>
              {signatureQuery.isLoading ? (
                <div className="h-24 w-full animate-pulse rounded-2xl bg-gray-100" />
              ) : signatureQuery.data ? (
                <div className="inline-flex max-w-full rounded-2xl border border-black/5 bg-white p-3 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signatureQuery.data}
                    alt="امضای کاربر"
                    className="h-20 max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-black/10 bg-white/60 py-6 text-center">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                    <PenLine className="size-4" />
                  </span>
                  <p className="text-xs text-muted-foreground">امضایی ثبت نشده است</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </SheetContent>
    </Sheet>
  );
}
