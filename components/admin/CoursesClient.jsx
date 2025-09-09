"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import CourseFormModal from "./CourseFormModal"; // We will create this
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import {internalAxios} from "@/lib/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function CoursesClient({ initialCourses }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const data = initialCourses || [];

  const deleteCourseMutation = useMutation({
    mutationFn: (courseId) =>
      internalAxios.delete(`/admin/courses/${courseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminCourses"]);
    },
    onError: (error) => {
      alert(`خطا در حذف دوره: ${error.message}`);
    },
  });

  const handleDelete = (courseId) => {
    if (confirm("آیا از حذف این دوره اطمینان دارید؟")) {
      deleteCourseMutation.mutate(courseId);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };
  const handleCreate = () => {
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  const columns = useMemo(
    () => [
      { accessorKey: "name", header: "نام دوره" },
      { accessorKey: "organizingUnit", header: "واحد برگزار کننده" },
      {
        accessorKey: "date",
        header: "تاریخ برگزاری",
        cell: ({ row }) =>
          new DateObject({
            date: new Date(row.original.date * 1000),

            calendar: persian,
            locale: persian_fa,
          }).format(),
      },
      {
        id: "actions",
        header: "عملیات",
        cell: ({ row }) => (
          <div className="space-x-2 space-x-reverse">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/courses/${row.original._id}/enrollments`}>
                مدیریت ثبت‌نام
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(row.original)}
            >
              ویرایش
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(row.original._id)}
              disabled={deleteCourseMutation.isLoading}
            >
              {deleteCourseMutation.isLoading ? "در حال حذف..." : "حذف"}
            </Button>
          </div>
        ),
      },
    ],
    [deleteCourseMutation.isLoading]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleCreate}>ایجاد دوره جدید</Button>
      </div>

      <CourseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        courseData={editingCourse}
        onSave={() => {
          setIsModalOpen(false);
          refetchCourses();
        }}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
