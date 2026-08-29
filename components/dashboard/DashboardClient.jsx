"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { GraduationCap, Clock, FileCheck2, ArrowLeft, BookOpenCheck } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import SectionCard from "@/components/admin/ui/SectionCard";
import AnnualHours from "@/components/AnnualHours";
import UserCoursesTable from "@/components/UserCoursesTable";

function QuickLink({ href, title, desc, icon: Icon }) {
  return (
    <Link href={href}>
      <div className="group flex items-center justify-between gap-4 rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm transition-shadow hover:shadow-[0_12px_40px_rgb(16,185,129,0.15)]">
        <div className="flex items-center gap-4">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        </div>
        <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-transform group-hover:-translate-x-1">
          <ArrowLeft className="size-5" />
        </div>
      </div>
    </Link>
  );
}

function VerifyOverlay() {
  return (
    <div className="absolute inset-0 z-20 grid place-content-center justify-items-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-3xl border border-amber-200 bg-white/80 p-8 text-center shadow-[0_20px_60px_rgb(0,0,0,0.12)] backdrop-blur-xl"
      >
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Clock className="size-7" />
        </div>
        <h3 className="text-lg font-bold text-amber-800">حساب کاربری در انتظار تایید است</h3>
        <p className="mt-2 text-sm leading-6 text-amber-700/90">
          حساب کاربری شما با موفقیت ایجاد شده و در حال حاضر منتظر تایید توسط مدیر سیستم می‌باشد.
          پس از تایید، به تمامی امکانات دسترسی خواهید داشت.
        </p>
      </motion.div>
    </div>
  );
}

export default function DashboardClient({ stats, initialCoursesData, user }) {
  const notVerified = user?.status !== "VERIFIED";

  return (
    <div className="relative space-y-6">
      {notVerified && <VerifyOverlay />}

      <div className={notVerified ? "pointer-events-none select-none blur-sm" : ""} aria-hidden={notVerified}>
        <PageHeader
          title={`سلام، ${user?.firstName || "کاربر"}`}
          description="خلاصه‌ای از دوره‌ها و گواهی‌های شما"
        />

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <StatCard
            title="دوره‌های گذرانده"
            value={stats.totalCourses}
            icon={GraduationCap}
            accent="emerald"
          />
          <StatCard
            title="مجموع کل ساعات آموزشی"
            value={stats.totalHours}
            icon={BookOpenCheck}
            accent="violet"
            hint="ساعت"
          />
          <AnnualHours />
          <StatCard
            title="در انتظار بررسی"
            value={stats.pendingCount}
            icon={Clock}
            accent="amber"
          />
          <StatCard
            title="گواهی‌های صادرشده"
            value={stats.certificatesIssued}
            icon={FileCheck2}
            accent="rose"
          />
        </motion.div>

        <SectionCard title="دوره‌های من (تایید شده)" description="فهرست دوره‌هایی که با موفقیت گذرانده‌اید">
          <UserCoursesTable initialData={initialCoursesData} />
        </SectionCard>

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2">
          <QuickLink
            href="/dashboard/courses"
            title="دوره‌های مرکز"
            desc="مشاهده و ثبت‌نام در دوره‌های آموزشی"
            icon={GraduationCap}
          />
          <QuickLink
            href="/dashboard/profile"
            title="پروفایل کاربری"
            desc="مشاهده اطلاعات و تغییر رمز عبور"
            icon={FileCheck2}
          />
        </motion.div>
      </div>
    </div>
  );
}
