"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import { motion } from "motion/react";
import { Users, Layers, GraduationCap, Clock, FileCheck2, ArrowLeft, AlertTriangle } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import PageHeader from "./ui/PageHeader";
import StatCard from "./ui/StatCard";
import SectionCard from "./ui/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EnrollmentsAreaChart, StatusDonut, TopCoursesBar } from "./dashboard/Charts";
import ActivityFeed from "./dashboard/ActivityFeed";

const getDashboard = async () => {
  const { data } = await internalAxios.get("/admin/dashboard");
  return data;
};

export default function DashboardClient() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: getDashboard,
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-black/5 bg-white/80 py-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
        <AlertTriangle className="size-8 text-rose-500" />
        <p className="text-sm text-muted-foreground">خطا در بارگذاری اطلاعات داشبورد.</p>
        <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => refetch()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="داشبورد مدیریت"
        description="نمای کلی گواهیار"
      />

      {isLoading || !stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-3xl shimmer" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <StatCard title="کل کاربران" value={stats.userCount} icon={Users} accent="emerald" />
          <StatCard title="کل دوره‌ها" value={stats.courseCount} icon={Layers} accent="sky" />
          <StatCard title="کل ثبت‌نام‌ها" value={stats.enrollmentCount} icon={GraduationCap} accent="violet" />
          <StatCard title="در انتظار تایید" value={stats.pendingEnrollments} icon={Clock} accent="amber" />
          <StatCard title="گواهی‌های صادرشده" value={stats.certificatesIssued} icon={FileCheck2} accent="rose" />
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="روند ثبت‌نام (۶ ماه اخیر)"
          className="lg:col-span-2"
        >
          {isLoading ? (
            <Skeleton className="h-[260px] rounded-xl shimmer" />
          ) : (
            <EnrollmentsAreaChart data={data.timeseries} />
          )}
        </SectionCard>
        <SectionCard title="وضعیت ثبت‌نام‌ها">
          {isLoading ? (
            <Skeleton className="h-[260px] rounded-xl shimmer" />
          ) : (
            <StatusDonut data={data.statusBreakdown} />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="پرمخاطب‌ترین دوره‌ها" className="lg:col-span-2">
          {isLoading ? (
            <Skeleton className="h-[260px] rounded-xl shimmer" />
          ) : data.topCourses.length ? (
            <TopCoursesBar data={data.topCourses} />
          ) : (
            <p className="text-sm text-muted-foreground">داده‌ای برای نمایش وجود ندارد.</p>
          )}
        </SectionCard>
        <SectionCard title="فعالیت‌های اخیر">
          {isLoading ? (
            <Skeleton className="h-[260px] rounded-xl shimmer" />
          ) : (
            <ActivityFeed items={data.activity} />
          )}
        </SectionCard>
      </div>

      <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2">
        <QuickLink href="/admin/users" title="مدیریت کاربران" desc="ایجاد، ویرایش و تایید کاربران" />
        <QuickLink href="/admin/courses" title="مدیریت دوره‌ها" desc="ساخت و ویرایش دوره‌ها و گواهی‌ها" />
      </motion.div>
    </div>
  );
}

function QuickLink({ href, title, desc }) {
  return (
    <Link href={href}>
      <div className="group flex items-center justify-between gap-4 rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm transition-shadow hover:shadow-[0_12px_40px_rgb(16,185,129,0.15)]">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-transform group-hover:-translate-x-1">
          <ArrowLeft className="size-5" />
        </div>
      </div>
    </Link>
  );
}
