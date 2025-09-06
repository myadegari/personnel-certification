'use client';

import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getPaginationRowModel, flexRender } from '@tanstack/react-table';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CertificateStatus from '@/components/CertificateStatus';

// --- کامپوننت برای تغییر وضعیت ---
function StatusSelector({ enrollment, onStatusChange }) {
  const [status, setStatus] = useState(enrollment.status);
  const [isLoading, setIsLoading] = useState(false);

  const handleValueChange = async (newStatus) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollment._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updatedEnrollment = await res.json();
      setStatus(updatedEnrollment.status);
      onStatusChange(updatedEnrollment); // Notify parent to update data
    } catch (error) {
      console.error(error);
      // Optionally show an error toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Select onValueChange={handleValueChange} value={status} disabled={isLoading}>
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
  const [data, setData] = useState(initialData.enrollments);
  const [pagination, setPagination] = useState({
    pageIndex: initialData.pagination.currentPage - 1,
    pageSize: 10,
  });
  const [pageCount, setPageCount] = useState(initialData.pagination.pageCount);

  useEffect(() => {
    async function fetchData() {
      const page = pagination.pageIndex + 1;
      const res = await fetch(`/api/admin/courses/${courseId}/enrollments?page=${page}`);
      const newData = await res.json();
      setData(newData.enrollments);
      setPageCount(newData.pagination.pageCount);
    }
    fetchData();
  }, [pagination, courseId]);
  
  const handleStatusChange = (updatedEnrollment) => {
    setData(currentData => 
      currentData.map(e => e._id === updatedEnrollment._id ? updatedEnrollment : e)
    );
  };

  const columns = useMemo(() => [
    { 
      accessorFn: row => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`,
      header: 'نام کاربر' 
    },
    { accessorKey: 'user.personnelNumber', header: 'شماره پرسنلی' },
    { 
      accessorKey: 'status', 
      header: 'وضعیت',
      cell: ({ row }) => <StatusSelector enrollment={row.original} onStatusChange={handleStatusChange} />
    },
     { 
      accessorKey: 'certificateUrl', 
      header: 'گواهی',
      cell: ({ row }) => <CertificateStatus enrollment={row.original}/>,   },
  ], []);

  const table = useReactTable({
    data,
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
