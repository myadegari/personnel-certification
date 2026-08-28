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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import CertificateStatus from "@/components/CertificateStatus";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DataTableShell from "./ui/DataTableShell";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "در انتظار تایید" },
  { value: "APPROVED", label: "تایید شده" },
  { value: "REJECTED", label: "رد شده" },
];

function StatusSelector({ enrollment }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ enrollmentId, status }) =>
      internalAxios.put(`/admin/enrollments/${enrollmentId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments", enrollment.course] });
      toast.success("وضعیت به‌روزرسانی شد.");
    },
    onError: (error) => toast.error(`خطا در به‌روزرسانی وضعیت: ${error.message}`),
  });

  return (
    <Select
      value={enrollment.status}
      onValueChange={(newStatus) =>
        mutation.mutate({ enrollmentId: enrollment._id, status: newStatus })
      }
      disabled={mutation.isPending}
    >
      <SelectTrigger className="w-[170px] cursor-pointer">
        <SelectValue placeholder="تغییر وضعیت" />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function EnrollmentsClient({ initialData, courseId }) {
  const [pagination, setPagination] = useState({
    pageIndex: initialData.pagination.currentPage - 1,
    pageSize: 10,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["enrollments", courseId, pagination.pageIndex],
    queryFn: async () => {
      const page = pagination.pageIndex + 1;
      const res = await internalAxios.get(
        `/admin/courses/${courseId}/enrollments?page=${page}`
      );
      return res.data;
    },
    initialData,
    placeholderData: keepPreviousData,
  });

  const enrollmentsData = data?.enrollments || [];
  const pageCount = data?.pagination?.pageCount || 0;

  const columns = useMemo(
    () => [
      {
        id: "user",
        accessorFn: (row) => `${row.user?.firstName || ""} ${row.user?.lastName || ""}`,
        header: "کاربر",
        cell: ({ row }) => {
          const u = row.original.user || {};
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-100 text-xs text-emerald-700">
                  {u.firstName?.[0]}
                  {u.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{u.firstName} {u.lastName}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "user.personnelNumber",
        header: "شماره پرسنلی",
        cell: ({ row }) => <span dir="ltr" className="tabular-nums">{row.original.user?.personnelNumber}</span>,
      },
      {
        accessorKey: "status",
        header: "وضعیت",
        cell: ({ row }) => <StatusSelector enrollment={row.original} />,
      },
      {
        accessorKey: "certificateUrl",
        header: "گواهی",
        cell: ({ row }) => <CertificateStatus enrollment={row.original} />,
      },
    ],
    []
  );

  const table = useReactTable({
    data: enrollmentsData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  return (
    <div className="space-y-3">
      <DataTableShell
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        isEmpty={!enrollmentsData.length}
        emptyTitle="ثبت‌نامی وجود ندارد"
        skeletonCols={4}
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

      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronRight className="h-4 w-4" /> قبلی
        </Button>
        <span className="text-sm">
          صفحه <strong>{pagination.pageIndex + 1}</strong> از <strong>{pageCount || 1}</strong>
        </span>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          بعدی <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
