"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gooeyToast } from "goey-toast";
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
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { AlertTriangle, Users, FileCheck2, Clock, ExternalLink, Building2, Layers, FileUp, Plus, Pencil, Trash2, UserPlus } from "lucide-react";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import BulkIssueDialog from "@/components/BulkIssueDialog";
import SingleIssueDialog from "@/components/SingleIssueDialog";
import DeputyCourseFormDialog from "@/components/DeputyCourseFormDialog";

const fmtDate = (ts) =>
  ts
    ? new DateObject({ date: new Date(ts * 1000), calendar: persian, locale: persian_fa }).format()
    : "—";

function DeputyCourseCard({ course, onEdit, onDelete, onIssue, canManage }) {
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
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>مهلت ثبت‌نام: {fmtDate(course.enrollmentDeadline)}</span>
        {canManage && (
          <span className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-emerald-700" aria-label={`صدور گواهی برای ${course.name}`} title="صدور گواهی" onClick={() => onIssue?.(course)}>
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" aria-label={`ویرایش ${course.name}`} title="ویرایش دوره" onClick={() => onEdit?.(course)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-red-600" aria-label={`حذف ${course.name}`} title="حذف دوره" onClick={() => onDelete?.(course)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function DeputyDashboardPage() {
  const queryClient = useQueryClient();
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [singleDialogOpen, setSingleDialogOpen] = useState(false);
  const [singleIssueCourse, setSingleIssueCourse] = useState(null);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["deputyDashboard"],
    queryFn: async () => (await internalAxios.get("/dashboard/deputy")).data,
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (courseId) => internalAxios.delete(`/dashboard/deputy/courses/${courseId}`),
    onSuccess: () => {
      gooeyToast.success("دوره حذف شد.");
      queryClient.invalidateQueries({ queryKey: ["deputyDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["deputyCourses"] });
    },
    onError: (err) => gooeyToast.error(err.response?.data?.error || "خطا در حذف دوره"),
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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={() => { setEditingCourse(null); setCourseDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> ایجاد دوره
            </Button>
            <Button variant="outline" className="cursor-pointer" onClick={() => { setSingleIssueCourse(null); setSingleDialogOpen(true); }}>
              <UserPlus className="h-4 w-4" /> صدور تکی
            </Button>
            <Button className="cursor-pointer" onClick={() => setBulkDialogOpen(true)}>
              <FileUp className="h-4 w-4" /> صدور دسته‌جمعی
            </Button>
          </div>
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
              <DeputyCourseCard
                key={course._id}
                course={course}
                canManage={course.visibility === "DEPUTY"}
                onEdit={(c) => { setEditingCourse(c); setCourseDialogOpen(true); }}
                onDelete={(c) => setDeleteConfirm(c)}
                onIssue={(c) => { setSingleIssueCourse(c); setSingleDialogOpen(true); }}
              />
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
                  <tr key={cert.enrollmentId || cert.guestId} className="border-b transition-colors hover:bg-emerald-50/40">
                    <td className="px-3 py-2 text-sm">
                      {cert.fullName || "—"}
                      {cert.isGuest && (
                        <Badge className={`${BADGE_TONES.blue} ms-2`} aria-label="گواهی مهمان">مهمان</Badge>
                      )}
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
      <SingleIssueDialog
        open={singleDialogOpen}
        onOpenChange={(v) => {
          setSingleDialogOpen(v);
          if (!v) setSingleIssueCourse(null);
        }}
        initialCourseId={singleIssueCourse?._id}
      />
      <DeputyCourseFormDialog
        open={courseDialogOpen}
        onOpenChange={(v) => {
          setCourseDialogOpen(v);
          if (!v) setEditingCourse(null);
        }}
        courseData={editingCourse}
      />
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
        title="حذف دوره"
        description={deleteConfirm ? `آیا از حذف «${deleteConfirm.name}» اطمینان دارید؟ این عمل قابل بازگشت نیست.` : ""}
        confirmText="حذف"
        destructive
        loading={deleteCourseMutation.isPending}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteCourseMutation.mutate(deleteConfirm._id);
            setDeleteConfirm(null);
          }
        }}
      />
    </>
  );
}