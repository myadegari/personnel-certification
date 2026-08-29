"use client";

import { useState, useMemo, useCallback, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import CertificateStatus from "@/components/CertificateStatus";
import { gooeyToast } from "goey-toast";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Lock,
  Users,
  Clock,
  BadgeCheck,
  Ban,
} from "lucide-react";
import DataTableShell from "./ui/DataTableShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ENROLLMENT_STATUS,
  ENROLLMENT_STATUS_FILTERS,
  STATUS_TONE_CLASSES,
} from "@/lib/enrollmentStatus";

function StatusPill({ status }) {
  const meta = ENROLLMENT_STATUS[status] || ENROLLMENT_STATUS.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE_CLASSES[meta.tone]}`}
    >
      {meta.label}
    </span>
  );
}

// Status cell: PENDING rows get inline Approve/Reject actions; terminal rows
// (APPROVED/REJECTED) are immutable and render a locked pill only.
function StatusCell({ enrollment, onApprove, onReject, isPending }) {
  const meta = ENROLLMENT_STATUS[enrollment.status];
  if (meta.locked) {
    return (
      <div className="flex items-center gap-1.5">
        <StatusPill status={enrollment.status} />
        <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusPill status="PENDING" />
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
        disabled={isPending}
        onClick={() => onApprove(enrollment)}
        aria-label="تایید"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
        disabled={isPending}
        onClick={() => onReject(enrollment)}
        aria-label="رد"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function StatCards({ counts }) {
  const items = [
    { key: "total", label: "کل ثبت‌نام‌ها", value: counts?.total ?? 0, icon: Users, tone: "text-slate-600 bg-slate-100" },
    { key: "PENDING", label: ENROLLMENT_STATUS.PENDING.label, value: counts?.PENDING ?? 0, icon: Clock, tone: "text-amber-600 bg-amber-100" },
    { key: "APPROVED", label: ENROLLMENT_STATUS.APPROVED.label, value: counts?.APPROVED ?? 0, icon: BadgeCheck, tone: "text-emerald-600 bg-emerald-100" },
    { key: "REJECTED", label: ENROLLMENT_STATUS.REJECTED.label, value: counts?.REJECTED ?? 0, icon: Ban, tone: "text-rose-600 bg-rose-100" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.key}
          className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{it.label}</span>
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${it.tone}`}>
              <it.icon className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function FilterChips({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ENROLLMENT_STATUS_FILTERS.map((f) => {
        const active = value === f.value;
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => onChange(f.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              active
                ? "bg-emerald-600 text-white shadow-sm"
                : "border border-black/5 bg-white/70 text-slate-600 hover:bg-white"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

function SelectionBar({ count, onApprove, onReject, onClear, approving, rejecting }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 backdrop-blur"
    >
      <span className="text-sm font-medium text-emerald-900">
        {count} مورد انتخاب شده
      </span>
      <div className="ms-auto flex items-center gap-2">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onApprove} disabled={approving}>
          <Check className="h-4 w-4" /> تایید گروهی
        </Button>
        <Button size="sm" variant="destructive" onClick={onReject} disabled={rejecting}>
          <X className="h-4 w-4" /> رد گروهی
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}>
          پاکسازی
        </Button>
      </div>
    </motion.div>
  );
}

function EnrollmentCard({ enrollment, index, selected, onToggle, onApprove, onReject, isPending }) {
  const u = enrollment.user || {};
  const terminal = ENROLLMENT_STATUS[enrollment.status]?.locked;
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      transition={{ delay: index * 0.03 }}
      className={`rounded-2xl border p-4 backdrop-blur-sm ${
        selected ? "border-emerald-300 bg-emerald-50/60" : "border-black/5 bg-white/80"
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(enrollment._id)}
          disabled={terminal}
          aria-label="انتخاب"
          className="mt-1"
        />
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-emerald-100 text-xs text-emerald-700">
            {u.firstName?.[0]}
            {u.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {u.firstName} {u.lastName}
          </p>
          <p dir="ltr" className="text-xs text-muted-foreground tabular-nums">
            {u.personnelNumber}
          </p>
        </div>
        <StatusCell enrollment={enrollment} onApprove={onApprove} onReject={onReject} isPending={isPending} />
      </div>
      <div className="mt-3 border-t border-black/5 pt-3">
        <CertificateStatus enrollment={enrollment} />
      </div>
    </motion.div>
  );
}

export default function EnrollmentsClient({ initialData, courseId }) {
  const [pagination, setPagination] = useState({
    pageIndex: initialData.pagination.currentPage - 1,
    pageSize: 10,
  });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState(() => new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const lastBulkStatus = useRef(null);

  const queryClient = useQueryClient();

  const queryKey = ["enrollments", courseId, statusFilter, pagination.pageIndex];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const page = pagination.pageIndex + 1;
      const params = new URLSearchParams({ page });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await internalAxios.get(
        `/admin/courses/${courseId}/enrollments?${params.toString()}`
      );
      return res.data;
    },
    initialData:
      statusFilter === "ALL" && pagination.pageIndex === 0
        ? initialData
        : undefined,
    placeholderData: keepPreviousData,
  });

  const enrollmentsData = data?.enrollments || [];
  const pageCount = data?.pagination?.pageCount || 0;
  const counts = data?.counts;

  const isTerminal = (e) => ENROLLMENT_STATUS[e.status]?.locked;
  const selectableRows = useMemo(
    () => enrollmentsData.filter((e) => !isTerminal(e)),
    [enrollmentsData]
  );

  const allSelected = selectableRows.length > 0 && selectableRows.every((e) => selected.has(e._id));
  const someSelected = selectableRows.some((e) => selected.has(e._id));

  const toggleRow = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      selectableRows.forEach((e) => next.add(e._id));
      return next;
    });
  }, [allSelected, selectableRows]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const onFilterChange = (val) => {
    setStatusFilter(val);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    clearSelection();
  };

  const singleMutation = useMutation({
    mutationFn: ({ id, status }) => internalAxios.put(`/admin/enrollments/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments", courseId] });
    },
    onError: (err) =>
      gooeyToast.error(err?.response?.data?.error || "خطا در به‌روزرسانی وضعیت"),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ ids, status }) => {
      lastBulkStatus.current = status;
      return internalAxios.post(`/admin/enrollments/bulk`, { ids, status });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["enrollments", courseId] });
      clearSelection();
      const updated = res?.updated ?? 0;
      const skipped = res?.skippedCount ?? 0;
      const errs = res?.errorCount ?? 0;
      const verb = lastBulkStatus.current === "APPROVED" ? "تایید" : "رد";
      let msg = `تعداد ${updated} ثبت‌نام ${verb} شد`;
      if (skipped) msg += `، ${skipped} مورد نهایی شده نادیده گرفته شد`;
      if (errs) msg += `، ${errs} خطا`;
      gooeyToast.success(msg);
    },
    onError: (err) =>
      gooeyToast.error(err?.response?.data?.error || "خطا در عملیات گروهی"),
  });

  const isRowPending = (e) =>
    singleMutation.isPending && singleMutation.variables?.id === e._id;

  const handleApprove = (e) => singleMutation.mutate({ id: e._id, status: "APPROVED" });
  const handleReject = (e) => singleMutation.mutate({ id: e._id, status: "REJECTED" });

  const handleBulkApprove = () => {
    bulkMutation.mutate({ ids: Array.from(selected), status: "APPROVED" });
  };
  const confirmBulkReject = () => {
    setBulkRejectOpen(false);
    bulkMutation.mutate({ ids: Array.from(selected), status: "REJECTED" });
  };

  const columns = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={toggleAll}
          disabled={selectableRows.length === 0}
          aria-label="انتخاب همه"
        />
      ),
      cell: ({ row }) => {
        const e = row.original;
        return (
          <Checkbox
            checked={selected.has(e._id)}
            onCheckedChange={() => toggleRow(e._id)}
            disabled={isTerminal(e)}
            aria-label="انتخاب ردیف"
          />
        );
      },
    },
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
            <span className="font-medium">
              {u.firstName} {u.lastName}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "user.personnelNumber",
      header: "شماره پرسنلی",
      cell: ({ row }) => (
        <span dir="ltr" className="tabular-nums">
          {row.original.user?.personnelNumber}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: ({ row }) => (
        <StatusCell
          enrollment={row.original}
          onApprove={handleApprove}
          onReject={handleReject}
          isPending={isRowPending(row.original)}
        />
      ),
    },
    {
      accessorKey: "certificateUrl",
      header: "گواهی",
      cell: ({ row }) => <CertificateStatus enrollment={row.original} />,
    },
  ];

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
    <div className="space-y-4">
      <StatCards counts={counts} />

      <FilterChips value={statusFilter} onChange={onFilterChange} />

      <AnimatePresence>
        {selected.size > 0 && (
          <SelectionBar
            count={selected.size}
            onApprove={handleBulkApprove}
            onReject={() => setBulkRejectOpen(true)}
            onClear={clearSelection}
            approving={bulkMutation.isPending && lastBulkStatus.current === "APPROVED"}
            rejecting={bulkMutation.isPending && lastBulkStatus.current === "REJECTED"}
          />
        )}
      </AnimatePresence>

      <DataTableShell
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        isEmpty={!enrollmentsData.length}
        emptyTitle="ثبت‌نامی وجود ندارد"
        skeletonCols={5}
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
                    className={`border-b transition-colors hover:bg-emerald-50/40 ${
                      selected.has(row.original._id) ? "bg-emerald-50/60" : ""
                    }`}
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

        <div className="space-y-3 p-3 md:hidden">
          <AnimatePresence initial={false}>
            {enrollmentsData.map((e, i) => (
              <EnrollmentCard
                key={e._id}
                enrollment={e}
                index={i}
                selected={selected.has(e._id)}
                onToggle={toggleRow}
                onApprove={handleApprove}
                onReject={handleReject}
                isPending={isRowPending(e)}
              />
            ))}
          </AnimatePresence>
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

      <AlertDialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>رد گروهی ثبت‌نام‌ها</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از رد کردن {selected.size} ثبت‌نام انتخاب‌شده اطمینان دارید؟ این وضعیت نهایی
              و غیرقابل تغییر خواهد بود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={confirmBulkReject}
            >
              رد کردن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
