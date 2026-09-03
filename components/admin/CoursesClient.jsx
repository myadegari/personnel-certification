"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import {
  Search,
  Add,
  Edit,
  Trash,
  ArrowLeft,
  CalendarDays,
  UserAdd,
  FileUp,
  Users,
  Building2,
  Layers,
  X,
  Clock,
} from "reicon-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BADGE_TONES } from "@/lib/statusLabels";
import { internalAxios } from "@/lib/axios";
import { gooeyToast } from "goey-toast";
import {
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  toPersianDigits,
} from "@/lib/persian-date";
import { fadeUp, staggerContainer } from "@/lib/motion";
import PageHeader from "@/components/admin/ui/PageHeader";
import DataTableShell from "@/components/admin/ui/DataTableShell";
import PersianDatePicker from "@/components/admin/PersianDatePicker";
import CourseFormModal from "./CourseFormModal";
import ConfirmDialog from "./ConfirmDialog";
import SingleIssueDialog from "@/components/SingleIssueDialog";
import BulkIssueDialog from "@/components/BulkIssueDialog";

const fmtDate = (ts) =>
  ts
    ? new DateObject({ date: new Date(ts * 1000), calendar: persian, locale: persian_fa }).format()
    : "—";

// A course's units: prefer the structured snapshot, fall back to the joined
// display string so legacy records still filter correctly.
const courseUnits = (c) =>
  c.organizingUnits?.length ? c.organizingUnits : c.organizingUnit ? [c.organizingUnit] : [];

const effectiveDeadline = (course) =>
  course.enrollmentDeadline || (course.date + 86399);

const CREATE_BTN =
  "cursor-pointer bg-gradient-to-l from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-emerald-600";

export default function CoursesClient({
  initialCourses,
  isLoading = false,
  isError = false,
  onRetry,
}) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [deputyId, setDeputyId] = useState("all");
  const [unit, setUnit] = useState("all");
  const [confirm, setConfirm] = useState(null);
  const [singleIssueCourse, setSingleIssueCourse] = useState(null);
  const [bulkIssueCourse, setBulkIssueCourse] = useState(null);

  const data = useMemo(() => initialCourses || [], [initialCourses]);

  const invalidateCourses = () =>
    queryClient.invalidateQueries({ queryKey: ["adminCourses"] });

  const deleteCourseMutation = useMutation({
    mutationFn: (courseId) => internalAxios.delete(`/admin/courses/${courseId}`),
    onSuccess: () => {
      gooeyToast.success("دوره با موفقیت حذف شد.");
      invalidateCourses();
    },
    onError: (error) => gooeyToast.error(`خطا در حذف دوره: ${error.message}`),
  });

  const deputyOptions = useMemo(() => {
    const map = new Map();
    let hasNoDeputy = false;
    for (const c of data) {
      if (c.deputy?._id) {
        map.set(String(c.deputy._id), {
          id: String(c.deputy._id),
          name: c.deputy.name,
          number: c.deputy.number,
        });
      } else {
        hasNoDeputy = true;
      }
    }
    return {
      list: [...map.values()].sort((a, b) => (a.number || 0) - (b.number || 0)),
      hasNoDeputy,
    };
  }, [data]);

  const unitOptions = useMemo(() => {
    const scope =
      deputyId === "all"
        ? data
        : data.filter((c) => String(c.deputy?._id || "") === deputyId);
    const set = new Set();
    for (const c of scope) for (const u of courseUnits(c)) if (u) set.add(u);
    return [...set].sort((a, b) => a.localeCompare(b, "fa"));
  }, [data, deputyId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((c) => {
      if (
        q &&
        !(
          c.name?.toLowerCase().includes(q) ||
          c.organizingUnit?.toLowerCase().includes(q)
        )
      )
        return false;

      if (deputyId !== "all") {
        if (deputyId === "none") {
          if (c.deputy) return false;
        } else if (String(c.deputy?._id || "") !== deputyId) {
          return false;
        }
      }

      if (unit !== "all" && !courseUnits(c).includes(unit)) return false;

      if (dateFrom || dateTo) {
        const d = new Date(c.date * 1000);
        if (dateFrom && isBefore(d, startOfDay(dateFrom))) return false;
        if (dateTo && isAfter(d, endOfDay(dateTo))) return false;
      }

      return true;
    });
  }, [data, search, deputyId, unit, dateFrom, dateTo]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (deputyId !== "all" ? 1 : 0) +
    (unit !== "all" ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0);
  const filtersActive = activeFilterCount > 0;

  const clearFilters = () => {
    setSearch("");
    setDateFrom(null);
    setDateTo(null);
    setDeputyId("all");
    setUnit("all");
  };

  const openCreate = () => {
    setEditingCourse(null);
    setIsModalOpen(true);
  };
  const openEdit = (course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const showContent = !isLoading && !isError && filtered.length > 0;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white/80 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
      <div className="relative min-w-52 flex-1">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی دوره..."
          aria-label="جستجوی دوره"
          className="ps-9"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground" aria-hidden>
          <CalendarDays size={16} />
        </span>
        <div className="w-36">
          <PersianDatePicker value={dateFrom} onChange={setDateFrom} placeholder="از تاریخ" />
        </div>
        <span className="text-xs text-muted-foreground">تا</span>
        <div className="w-36">
          <PersianDatePicker value={dateTo} onChange={setDateTo} placeholder="تا تاریخ" />
        </div>
      </div>

      <Select value={deputyId} onValueChange={(v) => { setDeputyId(v); setUnit("all"); }}>
        <SelectTrigger className="w-40">
          <span className="flex min-w-0 items-center gap-1.5">
            <Building2 size={14} className="shrink-0 text-muted-foreground" aria-hidden />
            <SelectValue placeholder="معاونت" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه معاونت‌ها</SelectItem>
          {deputyOptions.hasNoDeputy && <SelectItem value="none">بدون معاونت</SelectItem>}
          {deputyOptions.list.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={unit} onValueChange={setUnit}>
        <SelectTrigger className="w-40">
          <span className="flex min-w-0 items-center gap-1.5">
            <Layers size={14} className="shrink-0 text-muted-foreground" aria-hidden />
            <SelectValue placeholder="واحد" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه واحدها</SelectItem>
          {unitOptions.map((u) => (
            <SelectItem key={u} value={u}>
              {u}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filtersActive && (
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer text-muted-foreground"
          onClick={clearFilters}
        >
          <X size={14} /> پاک‌کردن فیلترها ({toPersianDigits(String(activeFilterCount))})
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="مدیریت دوره‌ها"
        description="ایجاد، ویرایش و مدیریت دوره‌های آموزشی"
        actions={
          <Button className={CREATE_BTN} onClick={openCreate}>
            <Add size={16} /> ایجاد دوره جدید
          </Button>
        }
      />

      {data.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {toPersianDigits(String(filtered.length))} دوره نمایش داده می‌شود
          {filtersActive ? ` از ${toPersianDigits(String(data.length))}` : ""}
        </p>
      )}

      <DataTableShell
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        isEmpty={!filtered.length}
        emptyTitle={filtersActive ? "دوره‌ای با این فیلترها یافت نشد" : "دوره‌ای یافت نشد"}
        emptyDescription={
          filtersActive
            ? "فیلترها را تغییر دهید یا پاک کنید."
            : "اولین دوره را ایجاد کنید."
        }
        emptyAction={
          filtersActive ? (
            <Button size="sm" variant="outline" className="cursor-pointer" onClick={clearFilters}>
              <X size={14} /> پاک‌کردن فیلترها
            </Button>
          ) : (
            <Button size="sm" className={CREATE_BTN} onClick={openCreate}>
              <Add size={14} /> ایجاد اولین دوره
            </Button>
          )
        }
        toolbar={toolbar}
        skeletonRows={6}
        skeletonCols={6}
      >
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>دوره</TableHead>
                <TableHead>معاونت</TableHead>
                <TableHead>واحد برگزارکننده</TableHead>
                <TableHead>تاریخ برگزاری</TableHead>
                <TableHead>مهلت ثبت‌نام</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {filtered.map((course, i) => (
                  <motion.tr
                    key={course._id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: Math.min(i, 12) * 0.02 }}
                    className="border-b border-border/60 transition-colors hover:bg-emerald-500/[0.04]"
                  >
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{course.name}</span>
                        {course.visibility === "DEPUTY" && (
                          <Badge className={BADGE_TONES.blue}>خصوصی</Badge>
                        )}
                      </div>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={12} aria-hidden /> {toPersianDigits(String(course.duration))} ساعت
                      </span>
                    </TableCell>
                    <TableCell>
                      {course.deputy?.name ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <Building2 size={14} className="text-muted-foreground" aria-hidden />
                          {course.deputy.name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {course.organizingUnit ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <Layers size={14} className="text-muted-foreground" aria-hidden />
                          {course.organizingUnit}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm tabular-nums" dir="ltr">
                        <CalendarDays size={14} className="text-muted-foreground" aria-hidden />
                        {fmtDate(course.date)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm tabular-nums" dir="ltr">
                        {fmtDate(effectiveDeadline(course))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer text-emerald-700"
                          aria-label={`صدور تکی گواهی برای ${course.name}`}
                          title="صدور تکی گواهی"
                          onClick={() => setSingleIssueCourse(course)}
                        >
                          <UserAdd size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer text-emerald-700"
                          aria-label={`صدور دسته‌جمعی گواهی برای ${course.name}`}
                          title="صدور دسته‌جمعی گواهی"
                          onClick={() => setBulkIssueCourse(course)}
                        >
                          <FileUp size={16} />
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer"
                          aria-label={`مدیریت ثبت‌نام‌های دوره ${course.name}`}
                          title="مدیریت ثبت‌نام‌ها"
                        >
                          <Link href={`/admin/courses/${course._id}/enrollments`}>
                            <Users size={16} />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer"
                          aria-label={`ویرایش دوره ${course.name}`}
                          title="ویرایش"
                          onClick={() => openEdit(course)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive/80"
                          aria-label={`حذف دوره ${course.name}`}
                          title="حذف"
                          onClick={() => setConfirm({ type: "delete", course })}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      {/* Card view for small screens */}
      {showContent && (
        <motion.div
          variants={staggerContainer(0.05)}
          initial="hidden"
          animate="show"
          className="grid gap-3 md:hidden"
        >
          {filtered.map((course) => (
            <motion.div key={course._id} variants={fadeUp}>
              <article className="rounded-3xl border border-black/5 bg-white/80 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {course.name}
                      {course.visibility === "DEPUTY" && (
                        <Badge className={BADGE_TONES.blue}>خصوصی</Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {course.deputy?.name || "بدون معاونت"}
                    </p>
                  </div>
                  <Badge className={BADGE_TONES.green}>
                    {toPersianDigits(String(course.duration))} ساعت
                  </Badge>
                </div>

                {course.organizingUnit && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Layers size={13} aria-hidden /> {course.organizingUnit}
                  </p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={13} aria-hidden />
                    <span dir="ltr">{fmtDate(course.date)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={13} aria-hidden />
                    مهلت: <span dir="ltr">{fmtDate(effectiveDeadline(course))}</span>
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-1 border-t border-border/60 pt-3">
                  <Button asChild variant="outline" size="sm" className="flex-1 cursor-pointer">
                    <Link href={`/admin/courses/${course._id}/enrollments`}>
                      ثبت‌نام‌ها <ArrowLeft size={14} />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer text-emerald-700"
                    aria-label={`صدور تکی گواهی برای ${course.name}`}
                    title="صدور تکی گواهی"
                    onClick={() => setSingleIssueCourse(course)}
                  >
                    <UserAdd size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer text-emerald-700"
                    aria-label={`صدور دسته‌جمعی گواهی برای ${course.name}`}
                    title="صدور دسته‌جمعی گواهی"
                    onClick={() => setBulkIssueCourse(course)}
                  >
                    <FileUp size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer"
                    aria-label={`ویرایش دوره ${course.name}`}
                    title="ویرایش"
                    onClick={() => openEdit(course)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer text-destructive"
                    aria-label={`حذف دوره ${course.name}`}
                    title="حذف"
                    onClick={() => setConfirm({ type: "delete", course })}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </article>
            </motion.div>
          ))}
        </motion.div>
      )}

      <CourseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        courseData={editingCourse}
        onSave={() => {
          setIsModalOpen(false);
          invalidateCourses();
        }}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="حذف دوره"
        description={
          confirm
            ? `آیا از حذف «${confirm.course.name}» اطمینان دارید؟ این عمل قابل بازگشت نیست.`
            : ""
        }
        confirmText="حذف"
        destructive
        loading={deleteCourseMutation.isPending}
        onConfirm={() => {
          if (confirm?.type === "delete") {
            deleteCourseMutation.mutate(confirm.course._id);
            setConfirm(null);
          }
        }}
      />

      <SingleIssueDialog
        open={!!singleIssueCourse}
        onOpenChange={(v) => !v && setSingleIssueCourse(null)}
        initialCourseId={singleIssueCourse?._id}
        scope="admin"
      />
      <BulkIssueDialog
        open={!!bulkIssueCourse}
        onOpenChange={(v) => !v && setBulkIssueCourse(null)}
        initialCourseId={bulkIssueCourse?._id}
        scope="admin"
      />
    </div>
  );
}
