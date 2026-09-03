"use client";

import { motion } from "motion/react";
import { CheckCircle as BadgeCheck, Briefcase, Calendar, GraduationCap, Hashtag as Hash, Mailbox as Mail, PenLine, ShieldCheck, User } from "reicon-react";
import SectionCard from "@/components/admin/ui/SectionCard";
import { Badge } from "@/components/ui/badge";
// import { Skeleton } from "@/components/ui/skeleton";
// import { useFileUrl } from "@/hooks/useFileUrl";
import { ROLE_LABELS_FA } from "@/lib/roles";
import { USER_STATUS_META, FALLBACK_STATUS_META } from "@/lib/statusLabels";
import { formatDate } from "@/lib/persian-date";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { initialsOf } from "@/components/shared/SidebarNavLink";
import InfoField from "@/components/shared/InfoField";

export default function ProfileSummary({ user }) {
  // const signatureFileQuery = useFileUrl(user?.signatureImage);
  const statusMeta = USER_STATUS_META[user?.status] || FALLBACK_STATUS_META;
  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Hero */}
      <motion.div
        variants={fadeUp}
        whileHover={{ y: -4 }}
        className="group relative overflow-hidden rounded-3xl border border-border/60 bg-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/15 to-emerald-500/0 opacity-70 transition-opacity group-hover:opacity-100" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white shadow-lg shadow-emerald-500/30">
            {initialsOf(fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-bold text-foreground">
              {fullName || "—"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-sky-600/20 text-sky-700">
                <ShieldCheck className="me-1 size-3" />
                {ROLE_LABELS_FA[user?.role] || "نامشخص"}
              </Badge>
              <Badge className={statusMeta.tone}>
                <BadgeCheck className="me-1 size-3" />
                {statusMeta.label}
              </Badge>
            </div>
          </div>
          <div className="flex w-full flex-col gap-1.5 text-sm text-muted-foreground sm:w-auto">
            {user?.position && (
              <span className="flex items-center gap-1.5">
                <Briefcase className="size-3.5" /> {user.position}
              </span>
            )}
            {user?.createdAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" /> عضو از{" "}
                {formatDate(new Date(user.createdAt), "yyyy/MM/dd")}
              </span>
            )}
            {user?.personnelNumber && (
              <span
                dir="ltr"
                className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-foreground"
              >
                <Hash className="size-3" /> {user.personnelNumber}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Account details */}
      <SectionCard
        title="اطلاعات فردی و سازمانی"
        description="این اطلاعات توسط مدیر سیستم نگهداری می‌شود"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoField
            icon={User}
            label="نام و نام خانوادگی"
            value={fullName}
          />
          <InfoField
            icon={Hash}
            label="شماره پرسنلی"
            value={user?.personnelNumber ? <span dir="ltr">{user.personnelNumber}</span> : null}
          />
          <InfoField
            icon={Hash}
            label="کد ملی"
            value={user?.nationalId ? <span dir="ltr">{user.nationalId}</span> : null}
          />
          <InfoField
            icon={Mail}
            label="ایمیل"
            value={user?.email ? <span dir="ltr">{user.email}</span> : null}
          />
          <InfoField icon={Briefcase} label="سمت" value={user?.position} />
          <InfoField
            icon={GraduationCap}
            label="عضو هیات علمی"
            value={user?.isProfessor ? "بله" : "خیر"}
          />
        </div>
      </SectionCard>

      {/* Signature */}
      {/* <SectionCard
        title="امضای شما"
        description="این امضا روی گواهی‌های صادرشده شما درج می‌شود"
      >
        {signatureFileQuery.isLoading ? (
          <Skeleton className="h-28 w-full max-w-xs rounded-2xl" />
        ) : signatureFileQuery.data ? (
          <div className="inline-flex max-w-full rounded-2xl border border-border/60 bg-white p-3 shadow-sm">
            
            <img
              src={signatureFileQuery.data}
              alt="امضای کاربر"
              className="h-24 max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-white/60 py-8 text-center">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <PenLine className="size-5" />
            </span>
            <p className="text-sm font-medium">امضایی ثبت نشده است</p>
            <p className="text-xs text-muted-foreground">
              برای ثبت امضا با مدیر سیستم تماس بگیرید.
            </p>
          </div>
        )}
      </SectionCard> */}
    </motion.div>
  );
}
