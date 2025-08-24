'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// A small component to safely render dates on the client side
const ClientSideDate = ({ timestamp }) => {
  const [formattedDate, setFormattedDate] = useState('');
  useEffect(() => {
    if (timestamp) {
      setFormattedDate(new Date(timestamp * 1000).toLocaleDateString('fa-IR'));
    }
  }, [timestamp]);
  return <>{formattedDate || '...'}</>;
};

export default function UserCoursesTable({ initialData }) {
  const [data, setData] = useState(initialData.enrollments);
  const [pageCount, setPageCount] = useState(initialData.pagination.pageCount);
  const [pagination, setPagination] = useState({
    pageIndex: initialData.pagination.currentPage - 1,
    pageSize: 5,
  });

  // Fetch new data when pagination changes
  useEffect(() => {
    async function fetchData() {
      const page = pagination.pageIndex + 1;
      const limit = pagination.pageSize;
      const res = await fetch(`/api/my-courses?page=${page}&limit=${limit}`);
      const newData = await res.json();
      setData(newData.enrollments);
      setPageCount(newData.pagination.pageCount);
    }
    // Don't fetch for the initial page (pageIndex 0) since we already have the data
    if (pagination.pageIndex > 0 || initialData.pagination.currentPage > 1) {
       fetchData();
    } else {
       setData(initialData.enrollments);
       setPageCount(initialData.pagination.pageCount);
    }
  }, [pagination, initialData]);

  const columns = useMemo(() => [
    {
      accessorFn: row => row.course?.name || 'نامشخص',
      header: 'نام دوره',
    },
{
    accessorKey: 'course.duration',
    header: 'مدت زمان دوره',
    cell: ({ row }) => <>{row.original.course?.duration || 'نامشخص'}</>,
},
    {
      accessorKey: 'course.date',
      header: 'تاریخ برگزاری',
      cell: ({ row }) => <ClientSideDate timestamp={row.original.course?.date} />,
    },
    {
      accessorKey: 'certificateUrl',
      header: 'گواهی',
      cell: ({ row }) => (
        row.original.certificateUrl ? (
          <Button asChild size="sm">
            <a href={row.original.certificateUrl} download>دانلود</a>
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">صادر نشده</span>
        )
      ),
    },
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
    <div>
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  دوره‌ای یافت نشد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-center space-x-2 space-x-reverse py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          قبلی
        </Button>
        <span>
          صفحه{' '}
          <strong>
            {table.getState().pagination.pageIndex + 1} از {table.getPageCount()}
          </strong>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          بعدی
        </Button>
      </div>
    </div>
  );
}