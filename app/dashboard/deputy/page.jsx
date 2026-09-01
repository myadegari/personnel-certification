"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { internalAxios } from "@/lib/axios";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { Badge } from "@/components/ui/badge";
import { BADGE_TONES } from "@/lib/statusLabels";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import SectionCard from "@/components/admin/ui/SectionCard";
import { AlertTriangle, Users, FileCheck2, Clock, ExternalLink, Building2, Layers, FileUp } from "lucide-react";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import BulkIssueDialog from "@/components/BulkIssueDialog";

const fmtDate = (ts) =>
  ts
    ? new DateObject({ date: new Date(ts * 1000), calendar: persian, locale: persian_fa }).format()
    : "—";

function DeputyCourseCard({ course }) {
  const { stats, issueProgress } = course;
  const progressPct = issueProgress.max > 0 ? Math.round((issueProgress.issued / issueProgress.max) * 100) : 0;

  return (
    <motion.div variants={fadeUp} className="rounded-2xl border border-black/5 bg-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{course.name}</p>
          <p className="text-xs text-muted-foreground">{course.organizingUnit}</p>
        </div>
        <Badge className={BADGE_TONES.green}>{course.duration} ساعت</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">در انتظار</p>
        </div>
        <div>
          <p className="text-lg font-bold text-emerald-600">{stats.approved}</p>
          <p className="text-xs text-muted-foreground">تایید شده</p>
        </div>
        <div>
          <p className="text-lg font-bold text-sky-600">{stats.issued}</p>
          <p className="text-xs text-muted-foreground">صادر شده</p>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">پیشرفت صدور</span>
          <span className="font-medium">{issueProgress.issued}/{issueProgress.max}</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        مهلت ثبت‌نام: {fmtDate(course.enrollmentDeadline)}
      </div>
    </motion.div>
  );
}

export default function DeputyDashboardPage() {
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["deputyDashboard"],
    queryFn: async () => (await internalAxios.get("/dashboard/deputy")).data,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="معاونت من" description="در حال بارگذاری..." />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertTriangle className="size-8 text-rose-500" />
        <p className="text-sm text-muted-foreground">خطا در بارگذاری اطلاعات معاونت.</p>
        <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => refetch()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  const { deputy, courses = [], certificates = [] } = data || {};
  const totalIssued = certificates.length;
  const totalCourses = courses.length;
  const totalPending = courses.reduce((s, c) => s + c.stats.pending, 0);
  const totalApproved = courses.reduce((s, c) => s + c.stats.approved, 0);

  return (
    <>
    <div className="space-y-6">
      <PageHeader
        title={deputy?.name || "معاونت"}
        description={`شماره معاونت: ${String(deputy?.number || "").padStart(2, "0")} — ${totalCourses} دوره`}
        actions={
          <Button className="cursor-pointer" onClick={() => setBulkDialogOpen(true)}>
            <FileUp className="h-4 w-4" /> صدور دسته‌جمعی
          </Button>
        }
      />

      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard title="دوره‌ها" value={totalCourses} icon={Layers} accent="emerald" />
        <StatCard title="در انتظار تایید" value={totalPending} icon={Clock} accent="amber" />
        <StatCard title="تایید شده" value={totalApproved} icon={Users} accent="violet" />
        <StatCard title="گواهی‌های صادر شده" value={totalIssued} icon={FileCheck2} accent="rose" />
      </motion.div>

      {courses.length > 0 && (
        <SectionCard title="دوره‌های معاونت" description="دوره‌های تحت مدیریت شما">
          <motion.div
            variants={staggerContainer(0.05)}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-2"
          >
            {courses.map((course) => (
              <DeputyCourseCard key={course._id} course={course} />
            ))}
          </motion.div>
        </SectionCard>
      )}

      {certificates.length > 0 && (
        <SectionCard title="گواهی‌های صادر شده" description="آخرین گواهی‌های صادر شده برای این معاونت">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">کاربر</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">کد ملی</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">شماره گواهی</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">تاریخ صدور</th>
                  <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">مشاهده</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.enrollmentId} className="border-b transition-colors hover:bg-emerald-50/40">
                    <td className="px-3 py-2 text-sm">
                      {cert.user?.firstName} {cert.user?.lastName}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono" dir="ltr">{cert.user?.nationalId || "—"}</td>
                    <td className="px-3 py-2 text-sm font-mono" dir="ltr">{cert.certificateUniqueId || "—"}</td>
                    <td className="px-3 py-2 text-sm">{cert.issuedAt || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                        <a href={cert.certificateUrl || "#"} target="_blank" rel="noopener noreferrer" aria-label="مشاهده گواهی">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {!courses.length && !certificates.length && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Building2 className="size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">دوره یا گواهی‌ای برای این معاونت ثبت نشده است.</p>
        </div>
      )}
    </div>

      <BulkIssueDialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen} />
    </>
  );
}