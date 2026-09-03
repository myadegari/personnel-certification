"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BADGE_TONES } from "@/lib/statusLabels";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, Pencil, Trash2, ArrowLeft, CalendarDays, UserPlus, FileUp, Users2 } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import CourseFormModal from "./CourseFormModal";
import ConfirmDialog from "./ConfirmDialog";
import DataTableShell from "./ui/DataTableShell";
import SingleIssueDialog from "@/components/SingleIssueDialog";
import BulkIssueDialog from "@/components/BulkIssueDialog";
import { internalAxios } from "@/lib/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gooeyToast } from "goey-toast";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

const fmtDate = (ts) =>
  ts
    ? new DateObject({ date: new Date(ts * 1000), calendar: persian, locale: persian_fa }).format()
    : "—";

export default function CoursesClient({ initialCourses, isLoading = false, isError = false, onRetry }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [singleIssueCourse, setSingleIssueCourse] = useState(null);
  const [bulkIssueCourse, setBulkIssueCourse] = useState(null);

  const data = initialCourses || [];

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.organizingUnit?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "نام دوره",
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.visibility === "DEPUTY" && (
              <Badge className={BADGE_TONES.blue}>خصوصی</Badge>
            )}
          </span>
        ),
      },
      { accessorKey: "organizingUnit", header: "واحد برگزار کننده" },
      {
        accessorKey: "deputy",
        header: "معاونت",
        cell: ({ row }) => row.original.deputy?.name || "—",
      },
      {
        accessorKey: "date",
        header: "تاریخ برگزاری",
        cell: ({ row }) => <span dir="ltr">{fmtDate(row.original.date)}</span>,
      },
      {
        accessorKey: "enrollmentDeadline",
        header: "مهلت ثبت‌نام",
        cell: ({ row }) => {
          const course = row.original;
          const deadline = course.enrollmentDeadline || (course.date + 86399);
          return (
            <div className="flex flex-col">
              <span dir="ltr">{fmtDate(deadline)}</span>
              {!course.enrollmentDeadline && (
                <span className="text-xs text-muted-foreground">(پیش‌فرض)</span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "عملیات",
        cell: ({ row }) => {
          const course = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-emerald-700" aria-label={`صدور گواهی برای ${course.name}`} title="صدور تکی گواهی" onClick={() => setSingleIssueCourse(course)}>
                <UserPlus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-emerald-700" aria-label={`صدور دسته‌جمعی برای ${course.name}`} title="صدور دسته‌جمعی گواهی" onClick={() => setBulkIssueCourse(course)}>
                <FileUp className="h-4 w-4" />
              </Button>
              <Button asChild variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                <Link href={`/admin/courses/${course._id}/enrollments`} aria-label={`مدیریت ثبت‌نام‌های دوره ${course.name}`} title="مدیریت ثبت‌نام‌ها">
                  <Users2 className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                aria-label={`ویرایش دوره ${course.name}`}
                onClick={() => { setEditingCourse(course); setIsModalOpen(true); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive/80"
                aria-label={`حذف دوره ${course.name}`}
                onClick={() => setConfirm({ type: "delete", course })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-56 flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی دوره..."
            aria-label="جستجوی دوره"
            className="ps-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button className="cursor-pointer" onClick={() => { setEditingCourse(null); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4" /> ایجاد دوره جدید
          </Button>
        </div>
      </div>

      <CourseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        courseData={editingCourse}
        onSave={() => { setIsModalOpen(false); invalidateCourses(); }}
      />

      <DataTableShell
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        isEmpty={!filtered.length}
        emptyTitle="دوره‌ای یافت نشد"
        emptyDescription={search ? "با فیلتر دیگری جستجو کنید." : "اولین دوره را ایجاد کنید."}
        emptyAction={
          !search && (
            <Button size="sm" className="cursor-pointer" onClick={() => { setEditingCourse(null); setIsModalOpen(true); }}>
              <Plus className="h-4 w-4" /> ایجاد اولین دوره
            </Button>
          )
        }
      >
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader className="bg-stone-50">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {table.getRowModel().rows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: i * 0.03 }}
                    className="border-b transition-colors hover:bg-emerald-50/40"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      {/* Card view for small screens */}
      <div className="grid gap-3 md:hidden">
        <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show" className="grid gap-3">
          {filtered.map((course) => (
            <motion.div key={course._id} variants={fadeUp}>
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 font-semibold">
                      {course.name}
                      {course.visibility === "DEPUTY" && (
                        <Badge className={BADGE_TONES.blue}>خصوصی</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{course.organizingUnit}</p>
                  </div>
                  <Badge className={BADGE_TONES.green}>{course.duration} ساعت</Badge>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" /> {fmtDate(course.date)}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1 cursor-pointer">
                    <Link href={`/admin/courses/${course._id}/enrollments`}>
                      ثبت‌نام‌ها <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="icon" className="cursor-pointer text-emerald-700" aria-label={`صدور تکی گواهی برای ${course.name}`} title="صدور تکی گواهی" onClick={() => setSingleIssueCourse(course)}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="cursor-pointer text-emerald-700" aria-label={`صدور دسته‌جمعی برای ${course.name}`} title="صدور دسته‌جمعی گواهی" onClick={() => setBulkIssueCourse(course)}>
                    <FileUp className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="cursor-pointer" aria-label={`ویرایش دوره ${course.name}`} onClick={() => { setEditingCourse(course); setIsModalOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="cursor-pointer text-destructive" aria-label={`حذف دوره ${course.name}`} onClick={() => setConfirm({ type: "delete", course })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="حذف دوره"
        description={confirm ? `آیا از حذف «${confirm.course.name}» اطمینان دارید؟ این عمل قابل بازگشت نیست.` : ""}
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
