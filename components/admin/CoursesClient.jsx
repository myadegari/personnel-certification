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
import { Badge } from "@radix-ui/themes";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, Pencil, Trash2, ArrowLeft, CalendarDays } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import CourseFormModal from "./CourseFormModal";
import ConfirmDialog from "./ConfirmDialog";
import DataTableShell from "./ui/DataTableShell";
import { internalAxios } from "@/lib/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

const fmtDate = (ts) =>
  ts
    ? new DateObject({ date: new Date(ts * 1000), calendar: persian, locale: persian_fa }).format()
    : "—";

export default function CoursesClient({ initialCourses }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);

  const data = initialCourses || [];

  const invalidateCourses = () =>
    queryClient.invalidateQueries({ queryKey: ["adminCourses"] });

  const deleteCourseMutation = useMutation({
    mutationFn: (courseId) => internalAxios.delete(`/admin/courses/${courseId}`),
    onSuccess: () => {
      toast.success("دوره با موفقیت حذف شد.");
      invalidateCourses();
    },
    onError: (error) => toast.error(`خطا در حذف دوره: ${error.message}`),
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
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { accessorKey: "organizingUnit", header: "واحد برگزار کننده" },
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
                <span className="text-xs text-gray-500">(پیش‌فرض)</span>
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
              <Button asChild variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                <Link href={`/admin/courses/${course._id}/enrollments`} title="مدیریت ثبت‌نام‌ها">
                  <Users2 />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={() => { setEditingCourse(course); setIsModalOpen(true); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer text-red-600 hover:text-red-700"
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
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی دوره..."
            className="pr-9"
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
        isEmpty={!filtered.length}
        emptyTitle="دوره‌ای یافت نشد"
        emptyDescription={search ? "با فیلتر دیگری جستجو کنید." : "اولین دوره را ایجاد کنید."}
      >
        <div className="overflow-x-auto">
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
                    <p className="font-semibold">{course.name}</p>
                    <p className="text-xs text-muted-foreground">{course.organizingUnit}</p>
                  </div>
                  <Badge color="green" radius="full">{course.duration} ساعت</Badge>
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
                  <Button variant="outline" size="icon" className="cursor-pointer" onClick={() => { setEditingCourse(course); setIsModalOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="cursor-pointer text-red-600" onClick={() => setConfirm({ type: "delete", course })}>
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
    </div>
  );
}

function Users2() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
