"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gooeyToast } from "goey-toast";
import { motion } from "motion/react";
import { internalAxios } from "@/lib/axios";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { toShamsi, toPersianDigits } from "@/lib/persian-date";
import { Badge } from "@/components/ui/badge";
import { BADGE_TONES } from "@/lib/statusLabels";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import SectionCard from "@/components/admin/ui/SectionCard";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { AlertTriangle, FileCheck as FileCheck2, Building2, Layers, FileUp, Add as Plus, Edit as Pencil, Trash as Trash2, UserAdd as UserPlus, Search, ChevronRight, ChevronLeft } from "reicon-react";
import BulkIssueDialog from "@/components/BulkIssueDialog";
import SingleIssueDialog from "@/components/SingleIssueDialog";
import DeputyCourseFormDialog from "@/components/DeputyCourseFormDialog";

function DeputyCourseCard({ course, onEdit, onDelete, onIssue, canManage }) {
  const { stats } = course;

  return (
    <motion.div variants={fadeUp} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/80 px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" title={course.name}>{course.name}</p>
        {(course.isManaged || course.isSignatory) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {course.isManaged && <Badge className={BADGE_TONES.gray}>قابل مدیریت</Badge>}
            {course.isSignatory && (
              <Badge className={BADGE_TONES.green}>
                {course.signRole === "secondary" ? "امضاکننده دوم" : "امضاکننده اول"}
              </Badge>
            )}
          </div>
        )}
      </div>
      <Badge className={`${BADGE_TONES.blue} shrink-0`} aria-label="تعداد گواهی صادر شده">
        {stats.issued} گواهی
      </Badge>
      <Badge className={`${BADGE_TONES.green} shrink-0`}>{course.duration} ساعت</Badge>
      <div className="flex shrink-0 items-center gap-1">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer text-emerald-700">
          <Link href={`/dashboard/deputy/certificates?course=${course._id}`}>
            <FileCheck2 className="size-4" /> گواهی‌ها
          </Link>
        </Button>
        {canManage && (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-emerald-700" aria-label={`صدور گواهی برای ${course.name}`} title="صدور گواهی" onClick={() => onIssue?.(course)}>
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" aria-label={`ویرایش ${course.name}`} title="ویرایش دوره" onClick={() => onEdit?.(course)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-red-600" aria-label={`حذف ${course.name}`} title="حذف دوره" onClick={() => onDelete?.(course)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
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
  const [courseYearFilter, setCourseYearFilter] = useState("all");
  const [courseSearchInput, setCourseSearchInput] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [coursePage, setCoursePage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["deputyDashboard"],
    queryFn: async () => (await internalAxios.get("/dashboard/deputy")).data,
  });

  // Courses this deputy head signs (first/second, any visibility) — folded into
  // the unified list below so "معاونت من" shows both manageable and signed courses.
  const { data: signatoryData } = useQuery({
    queryKey: ["signatoryCourses"],
    queryFn: async () => (await internalAxios.get("/dashboard/signatory")).data,
  });

  // Debounce the course search box so typing doesn't re-filter every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setCourseSearch(courseSearchInput);
      setCoursePage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [courseSearchInput]);

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
            <Skeleton key={i} className="h-32 rounded-2xl" />
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

  const { deputy, courses = [] } = data || {};
  const signedCourses = signatoryData?.courses || [];

  // Unified list: manageable deputy courses ∪ courses this head signs, deduped
  // by id and flagged. A course the head both manages and signs keeps its
  // management actions and also gets the "امضا" badge.
  const mergedCourses = (() => {
    const map = new Map();
    for (const c of courses) {
      map.set(String(c._id), { ...c, isManaged: true, isSignatory: false, signRole: null });
    }
    for (const c of signedCourses) {
      const key = String(c._id);
      const existing = map.get(key);
      if (existing) {
        existing.isSignatory = true;
        existing.signRole = c.role;
      } else {
        map.set(key, { ...c, isManaged: false, isSignatory: true });
      }
    }
    return [...map.values()].sort((a, b) => (b.date || 0) - (a.date || 0));
  })();

  const totalCourses = mergedCourses.length;
  // Issued totals come from the per-course counters (unbounded). The full
  // filterable list lives on /dashboard/deputy/certificates.
  const totalIssued = mergedCourses.reduce((s, c) => s + (c.stats?.issued || 0), 0);

  // Client-side course filtering/pagination — the dashboard payload already
  // carries every course (and is shared with the issue dialogs).
  const COURSES_PER_PAGE = 6;
  const courseYearOf = (c) => toShamsi(new Date(c.date * 1000)).year;
  const courseYearOptions = [...new Set(mergedCourses.map(courseYearOf))].sort((a, b) => b - a);
  const filteredCourses = mergedCourses.filter((c) => {
    if (courseYearFilter !== "all" && courseYearOf(c) !== Number(courseYearFilter)) return false;
    if (courseSearch && !c.name?.toLowerCase().includes(courseSearch.toLowerCase())) return false;
    return true;
  });
  const coursePageCount = Math.max(1, Math.ceil(filteredCourses.length / COURSES_PER_PAGE));
  // A deleted course must not strand the pager past the last page.
  const safeCoursePage = Math.min(coursePage, coursePageCount);
  const visibleCourses = filteredCourses.slice(
    (safeCoursePage - 1) * COURSES_PER_PAGE,
    safeCoursePage * COURSES_PER_PAGE
  );

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
        className="grid gap-4 md:grid-cols-2"
      >
        <StatCard title="دوره‌ها" value={totalCourses} icon={Layers} accent="emerald" />
        <StatCard title="گواهی‌های صادر شده" value={totalIssued} icon={FileCheck2} accent="rose" />
      </motion.div>

      {mergedCourses.length > 0 && (
        <SectionCard title="دوره‌ها" description="دوره‌هایی که مدیریت می‌کنید یا امضا می‌کنید">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select
              value={courseYearFilter}
              onValueChange={(v) => { setCourseYearFilter(v); setCoursePage(1); }}
            >
              <SelectTrigger className="w-40 cursor-pointer">
                <SelectValue placeholder="همه سال‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه سال‌ها</SelectItem>
                {courseYearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>سال {y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative min-w-56 flex-1 max-w-xs">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={courseSearchInput}
                onChange={(e) => setCourseSearchInput(e.target.value)}
                placeholder="جستجو بر اساس نام دوره"
                aria-label="جستجو بر اساس نام دوره"
                className="pr-9"
              />
            </div>
          </div>

          {visibleCourses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">دوره‌ای با این فیلترها یافت نشد.</p>
          ) : (
            <motion.div
              key={visibleCourses.map((c) => String(c._id)).join("|")}
              variants={staggerContainer(0.05)}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-3"
            >
              {visibleCourses.map((course) => (
                <DeputyCourseCard
                  key={course._id}
                  course={course}
                  canManage={course.isManaged}
                  onEdit={(c) => { setEditingCourse(c); setCourseDialogOpen(true); }}
                  onDelete={(c) => setDeleteConfirm(c)}
                  onIssue={(c) => { setSingleIssueCourse(c); setSingleDialogOpen(true); }}
                />
              ))}
            </motion.div>
          )}

          {coursePageCount > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                صفحه {toPersianDigits(String(safeCoursePage))} از {toPersianDigits(String(coursePageCount))} — {toPersianDigits(String(filteredCourses.length))} دوره
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="cursor-pointer"
                  disabled={safeCoursePage <= 1}
                  onClick={() => setCoursePage((p) => Math.max(1, p - 1))}
                  aria-label="صفحه قبل"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="cursor-pointer"
                  disabled={safeCoursePage >= coursePageCount}
                  onClick={() => setCoursePage((p) => Math.min(coursePageCount, p + 1))}
                  aria-label="صفحه بعد"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {!mergedCourses.length && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Building2 className="size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">دوره‌ای برای مدیریت یا امضای شما ثبت نشده است.</p>
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