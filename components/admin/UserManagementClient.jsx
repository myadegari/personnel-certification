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
import { Checkbox } from "@/components/ui/checkbox";
// You will need to create this modal component
import UserFormModal from './UserFormModal'; 

export default function UserManagementClient({ initialData }) {
  const [data, setData] = useState(initialData.users);
  const [pagination, setPagination] = useState({
    pageIndex: initialData.pagination.currentPage - 1,
    pageSize: 10,
  });
  const [pageCount, setPageCount] = useState(initialData.pagination.pageCount);
  const [rowSelection, setRowSelection] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Fetch data from API when pagination changes
  useEffect(() => {
    async function fetchData() {
      const page = pagination.pageIndex + 1;
      const limit = pagination.pageSize;
      const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}`);
      const newData = await res.json();
      setData(newData.users);
      setPageCount(newData.pagination.pageCount);
    }
    fetchData();
  }, [pagination]);

  // Define table columns
  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
    },
    { accessorKey: 'personnelNumber', header: 'شماره پرسنلی' },
    {
      accessorFn: row => `${row.firstName} ${row.lastName}`,
      header: 'نام کامل',
    },
    { accessorKey: 'email', header: 'ایمیل' },
    { accessorKey: 'role', header: 'نقش' },
    {
      id: 'actions',
      header: 'عملیات',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => handleEdit(row.original)}>
          ویرایش
        </Button>
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
    state: {
      pagination,
      rowSelection,
    },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
  });
  
  const handleEdit = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };
  
  const handleBulkDelete = async () => {
    const selectedIds = table.getSelectedRowModel().rows.map(row => row.original._id);
    if (selectedIds.length === 0) return;
    
    if (confirm(`آیا از حذف ${selectedIds.length} کاربر اطمینان دارید؟`)) {
      await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedIds }),
      });
      // Refetch data
      table.resetRowSelection();
      setPagination(prev => ({ ...prev })); // Trigger useEffect
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button onClick={handleCreate}>ایجاد کاربر جدید</Button>
        <Button 
          variant="destructive"
          onClick={handleBulkDelete}
          disabled={Object.keys(rowSelection).length === 0}
        >
          حذف انتخاب شده‌ها
        </Button>
      </div>

      {/* A modal for creating/editing users would go here */}
       <UserFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userData={editingUser} 
        onSave={() => {
          setIsModalOpen(false);
          setPagination(prev => ({...prev})); // Refetch
        }}
      />
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  کاربری یافت نشد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
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