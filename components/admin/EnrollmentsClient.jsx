'use client';

import { useState, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getPaginationRowModel, flexRender } from '@tanstack/react-table';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
// --- کامپوننت برای تغییر وضعیت ---
function StatusSelector({ enrollment }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn:({enrollmentId,status})=>axios.put(`/api/admin/enrollments/${enrollmentId}`,{status}),
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollments', enrollment.course]);
    },
    onError: (error) => {
      alert(`خطا در به‌روزرسانی وضعیت: ${error.message}`);
    }
  })

  // const [status, setStatus] = useState(enrollment.status);
  // const [isLoading, setIsLoading] = useState(false);

  const handleValueChange = async (newStatus) => {
    mutation.mutate({ enrollmentId: enrollment._id, status: newStatus });
  };

  return (
    <Select onValueChange={handleValueChange} defaultValue={enrollment.status} disabled={mutation.isLoading}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="تغییر وضعیت" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="PENDING">در انتظار تایید</SelectItem>
        <SelectItem value="APPROVED">تایید شده</SelectItem>
        <SelectItem value="REJECTED">رد شده</SelectItem>
      </SelectContent>
    </Select>
  );
}


export default function EnrollmentsClient({ initialData, courseId }) {

  const [pagination, setPagination] = useState({
    pageIndex: initialData.pagination.currentPage - 1,
    pageSize: 10,
  });
   const { data, isLoading } = useQuery({
    queryKey: ['enrollments', courseId, pagination.pageIndex], // کلید کوئری شامل شناسه دوره و شماره صفحه
    queryFn: async () => {
      const page = pagination.pageIndex + 1;
      const res = await axios.get(`/admin/courses/${courseId}/enrollments?page=${page}`);
      return res.data;
    },
    initialData: initialData,
    keepPreviousData: true, // برای تجربه کاربری بهتر هنگام تغییر صفحه
  });
  const enrollmentsData = data?.enrollments || [];
  const pageCount = data?.pagination?.pageCount || 0;

  const columns = useMemo(() => [
    { 
      accessorFn: row => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`,
      header: 'نام کاربر' 
    },
    { accessorKey: 'user.personnelNumber', header: 'شماره پرسنلی' },
    { 
      accessorKey: 'status', 
      header: 'وضعیت',
      cell: ({ row }) => <StatusSelector enrollment={row.original}/>
    },
     { 
      accessorKey: 'certificateUrl', 
      header: 'گواهی',
      cell: ({ row }) => row.original.certificateUrl 
        ? <a href={row.original.certificateUrl} className="text-blue-600 hover:underline" download>دانلود</a> 
        : 'صادر نشده'
    },
  ], []);

  const table = useReactTable({
    data:enrollmentsData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  return (
    <div className="rounded-md border">
      {isLoading && <p>در حال بارگذاری...</p>}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Pagination Controls */}
      <div className="flex items-center justify-center space-x-2 space-x-reverse py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>قبلی</Button>
        <span>صفحه <strong>{pagination.pageIndex + 1} از {pageCount}</strong></span>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>بعدی</Button>
      </div>
    </div>
  );
}
