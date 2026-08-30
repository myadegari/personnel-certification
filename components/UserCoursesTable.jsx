'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Button } from "@/components/ui/button";
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { internalAxios } from '@/lib/axios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import CertificateStatus from '@/components/CertificateStatus';
import { motion, AnimatePresence } from 'motion/react';
import { fadeUp } from '@/lib/motion';
import { Inbox } from 'lucide-react';
import TablePager from '@/components/shared/TablePager';
import { toPersianDigits } from '@/lib/persian-date';

const fetchUserCourses = async ({ queryKey }) => {
  const [_key, { page, limit, year }] = queryKey;
  let url = `/my-courses?page=${page}&limit=${limit}`;
  if (year != null) url += `&year=${year}`;
  const { data } = await internalAxios.get(url);
  return data;
};

const ClientSideDate = ({ timestamp }) => {
  if (!timestamp) return <>...</>;
  return <>{new Date(timestamp * 1000).toLocaleDateString('fa-IR')}</>;
};

export default function UserCoursesTable({ initialData, year = null }) {
  const [pagination, setPagination] = useState({
    pageIndex: initialData.pagination.currentPage - 1,
    pageSize: 5,
  });

  // Jump back to page 1 whenever the year filter changes.
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [year]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['myCourses', { page: pagination.pageIndex + 1, limit: pagination.pageSize, year }],
    queryFn: fetchUserCourses,
    initialData:
      pagination.pageIndex === 0 && year == null ? initialData : undefined,
    placeholderData: keepPreviousData,
  });

  const tableData = useMemo(() => data?.enrollments || [], [data]);
  const pageCount = useMemo(() => data?.pagination?.pageCount || 0, [data]);

  const columns = useMemo(() => [
    {
      accessorFn: (row) => row.course?.name || 'نامشخص',
      header: 'نام دوره',
      cell: ({ row }) => <span className="font-medium">{row.original.course?.name || 'نامشخص'}</span>,
    },
    {
      accessorKey: 'course.duration',
      header: 'مدت زمان',
      cell: ({ row }) => <span className="tabular-nums">{row.original.course?.duration ?? 'نامشخص'}</span>,
    },
    {
      accessorKey: 'course.date',
      header: 'تاریخ برگزاری',
      cell: ({ row }) => <ClientSideDate timestamp={row.original.course?.date} />,
    },
    {
      accessorKey: 'certificateUrl',
      header: 'گواهی',
      cell: ({ row }) => <CertificateStatus enrollment={row.original} />,
    },
  ], []);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  if (isError) {
    return <p className="py-10 text-center text-sm text-muted-foreground">خطا در دریافت اطلاعات.</p>;
  }

  if (isLoading && !initialData) {
    return (
      <div className="space-y-2 p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl shimmer" />
        ))}
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-stone-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              <AnimatePresence initial={false}>
                {rows.map((row, i) => (
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
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32">
                  <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                      <Inbox className="size-6" />
                    </div>
                    <p className="text-sm">
                      {year != null
                        ? `دوره‌ای برای سال ${toPersianDigits(String(year))} یافت نشد.`
                        : 'هنوز دوره‌ای را با موفقیت نگذرانده‌اید.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePager
        page={pagination.pageIndex + 1}
        pageCount={pageCount}
        onPrev={() => table.previousPage()}
        onNext={() => table.nextPage()}
        canPrev={table.getCanPreviousPage()}
        canNext={table.getCanNextPage()}
      />
    </div>
  );
}
