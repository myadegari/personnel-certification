"use client";

import { useState, useMemo, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { BADGE_TONES } from "@/lib/statusLabels";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import CertificateStatus from "@/components/CertificateStatus";
import GuestCertificateActions from "@/components/admin/GuestCertificateActions";
import { gooeyToast } from "goey-toast";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { Check, X, Lock, Users, Clock, CheckCircle as BadgeCheck, Ban, FileCheck as FileCheck2, AlertTriangle } from "reicon-react";
import DataTableShell from "./ui/DataTableShell";
import TablePager from "@/components/shared/TablePager";
import { toPersianDigits } from "@/lib/persian-date";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  glassSurface,
  GlassPanel,
  GlassBadge,
  GLASS_TITLE,
  GLASS_DESC,
} from "@/components/shared/glass-dialog";
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

// Guest certificate rows participate in listing only: no enrollment status,
// never selectable, never approved/rejected.
const isGuestRow = (e) => !!e.isGuest;
const isTerminal = (e) => isGuestRow(e) || ENROLLMENT_STATUS[e.status]?.locked;

function StatCards({ counts }) {
  const items = [
    { key: "total", label: "کل ثبت‌نام‌ها", value: counts?.total ?? 0, icon: Users, tone: "text-muted-foreground bg-muted" },
    { key: "PENDING", label: ENROLLMENT_STATUS.PENDING.label, value: counts?.PENDING ?? 0, icon: Clock, tone: "text-amber-600 bg-amber-100" },
    { key: "APPROVED", label: ENROLLMENT_STATUS.APPROVED.label, value: counts?.APPROVED ?? 0, icon: BadgeCheck, tone: "text-emerald-600 bg-emerald-100" },
    { key: "REJECTED", label: ENROLLMENT_STATUS.REJECTED.label, value: counts?.REJECTED ?? 0, icon: Ban, tone: "text-rose-600 bg-rose-100" },
    { key: "GUEST", label: "گواهی مهمان", value: counts?.GUEST ?? 0, icon: FileCheck2, tone: "text-sky-600 bg-sky-100" },
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
          <div className="mt-2 text-2xl font-bold tabular-nums">{toPersianDigits(String(it.value))}</div>
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
            aria-pressed={active}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              active
                ? "bg-emerald-600 text-white shadow-sm"
                : "border border-black/5 bg-white/70 text-muted-foreground hover:bg-white"
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
        {toPersianDigits(String(count))} مورد انتخاب شده
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
  const isGuest = !!enrollment.isGuest;
  const terminal = isGuest || ENROLLMENT_STATUS[enrollment.status]?.locked;
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
          aria-label={`انتخاب ${isGuest ? u.firstName || "مهمان" : `${u.firstName} ${u.lastName}`}`}
          className="mt-1"
        />
        <Avatar className="h-10 w-10">
          {isGuest ? (
            <AvatarFallback className="bg-sky-100 text-xs text-sky-700">؟</AvatarFallback>
          ) : (
            <AvatarFallback className="bg-emerald-100 text-xs text-emerald-700">
              {u.firstName?.[0]}
              {u.lastName?.[0]}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {isGuest ? u.firstName || "مهمان" : `${u.firstName} ${u.lastName}`}
            {isGuest && (
              <Badge className={`${BADGE_TONES.blue} ms-2`} aria-label="گواهی مهمان">مهمان</Badge>
            )}
          </p>
          <p dir="ltr" className="text-xs text-muted-foreground tabular-nums">
            {isGuest ? u.nationalId : u.personnelNumber}
          </p>
        </div>
        {isGuest ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <StatusCell enrollment={enrollment} onApprove={onApprove} onReject={onReject} isPending={isPending} />
        )}
      </div>
      <div className="mt-3 border-t border-black/5 pt-3">
        {isGuest ? <GuestCertificateActions guest={enrollment} /> : <CertificateStatus enrollment={enrollment} />}
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
  const [singleRejectTarget, setSingleRejectTarget] = useState(null);

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

  const enrollmentsData = useMemo(() => data?.enrollments || [], [data]);
  const pageCount = data?.pagination?.pageCount || 0;
  const counts = data?.counts;
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

  const handlePaginationChange = useCallback(
    (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      if (next.pageIndex !== pagination.pageIndex) {
        setSelected(new Set());
      }
      setPagination(next);
    },
    [pagination]
  );

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
    mutationFn: ({ ids, status }) =>
      internalAxios.post(`/admin/enrollments/bulk`, { ids, status }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["enrollments", courseId] });
      clearSelection();
      const updated = res?.updated ?? 0;
      const skipped = res?.skippedCount ?? 0;
      const errs = res?.errorCount ?? 0;
      const verb = bulkMutation.variables?.status === "APPROVED" ? "تایید" : "رد";
      let msg = `تعداد ${toPersianDigits(String(updated))} ثبت‌نام ${verb} شد`;
      if (skipped) msg += `، ${toPersianDigits(String(skipped))} مورد نهایی شده نادیده گرفته شد`;
      if (errs) msg += `، ${toPersianDigits(String(errs))} خطا`;
      gooeyToast.success(msg);
    },
    onError: (err) =>
      gooeyToast.error(err?.response?.data?.error || "خطا در عملیات گروهی"),
  });

  const isRowPending = (e) =>
    singleMutation.isPending && singleMutation.variables?.id === e._id;

  const handleApprove = (e) => singleMutation.mutate({ id: e._id, status: "APPROVED" });
  const handleReject = (e) => setSingleRejectTarget(e);
  const confirmSingleReject = () => {
    const target = singleRejectTarget;
    setSingleRejectTarget(null);
    if (target) singleMutation.mutate({ id: target._id, status: "REJECTED" });
  };

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
        const name = [e.user?.firstName, e.user?.lastName].filter(Boolean).join(" ");
        return (
          <Checkbox
            checked={selected.has(e._id)}
            onCheckedChange={() => toggleRow(e._id)}
            disabled={isTerminal(e)}
            aria-label={name ? `انتخاب ${name}` : "انتخاب ردیف"}
          />
        );
      },
    },
    {
      id: "user",
      accessorFn: (row) =>
        row.isGuest
          ? row.user?.firstName || "مهمان"
          : `${row.user?.firstName || ""} ${row.user?.lastName || ""}`,
      header: "کاربر",
      cell: ({ row }) => {
        const u = row.original.user || {};
        if (row.original.isGuest) {
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sky-100 text-xs text-sky-700">؟</AvatarFallback>
              </Avatar>
              <span className="font-medium">{u.firstName || "مهمان"}</span>
              <Badge className={`${BADGE_TONES.blue} shrink-0`} aria-label="گواهی مهمان">مهمان</Badge>
            </div>
          );
        }
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
      header: "کد ملی / پرسنلی",
      cell: ({ row }) => {
        const e = row.original;
        if (e.isGuest) {
          return (
            <span dir="ltr" className="font-mono tabular-nums">
              {e.user?.nationalId || "—"}
            </span>
          );
        }
        return (
          <span dir="ltr" className="tabular-nums">
            {e.user?.personnelNumber}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: ({ row }) => {
        if (row.original.isGuest) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return (
          <StatusCell
            enrollment={row.original}
            onApprove={handleApprove}
            onReject={handleReject}
            isPending={isRowPending(row.original)}
          />
        );
      },
    },
    {
      accessorKey: "certificateUrl",
      header: "گواهی",
      cell: ({ row }) =>
        row.original.isGuest ? (
          <GuestCertificateActions guest={row.original} />
        ) : (
          <CertificateStatus enrollment={row.original} />
        ),
    },
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: enrollmentsData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination },
    onPaginationChange: handlePaginationChange,
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
            approving={bulkMutation.isPending && bulkMutation.variables?.status === "APPROVED"}
            rejecting={bulkMutation.isPending && bulkMutation.variables?.status === "REJECTED"}
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

      <TablePager
        page={pagination.pageIndex + 1}
        pageCount={pageCount}
        onPrev={() => table.previousPage()}
        onNext={() => table.nextPage()}
        canPrev={table.getCanPreviousPage()}
        canNext={table.getCanNextPage()}
      />

      <AlertDialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <AlertDialogContent className={glassSurface()}>
          <GlassPanel>
            <div className="flex items-center gap-4">
              <GlassBadge icon={AlertTriangle} className="from-rose-500 to-red-600 shadow-rose-500/30" />
              <div className="min-w-0 text-right">
                <AlertDialogTitle className={GLASS_TITLE}>رد گروهی ثبت‌نام‌ها</AlertDialogTitle>
                <AlertDialogDescription className={GLASS_DESC}>
                  آیا از رد کردن {toPersianDigits(String(selected.size))} ثبت‌نام انتخاب‌شده اطمینان دارید؟ این وضعیت نهایی
                  و غیرقابل تغییر خواهد بود.
                </AlertDialogDescription>
              </div>
            </div>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer bg-rose-600 text-white hover:bg-rose-700"
                onClick={confirmBulkReject}
              >
                رد کردن
              </AlertDialogAction>
            </AlertDialogFooter>
          </GlassPanel>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!singleRejectTarget}
        onOpenChange={(open) => !open && setSingleRejectTarget(null)}
      >
        <AlertDialogContent className={glassSurface()}>
          <GlassPanel>
            <div className="flex items-center gap-4">
              <GlassBadge icon={AlertTriangle} className="from-rose-500 to-red-600 shadow-rose-500/30" />
              <div className="min-w-0 text-right">
                <AlertDialogTitle className={GLASS_TITLE}>رد ثبت‌نام</AlertDialogTitle>
                <AlertDialogDescription className={GLASS_DESC}>
                  آیا از رد کردن ثبت‌نام{" "}
                  {singleRejectTarget?.user?.firstName
                    ? `${singleRejectTarget.user.firstName} ${singleRejectTarget.user.lastName || ""}`
                    : ""}{" "}
                  اطمینان دارید؟ این وضعیت نهایی و غیرقابل تغییر خواهد بود.
                </AlertDialogDescription>
              </div>
            </div>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer bg-rose-600 text-white hover:bg-rose-700"
                onClick={confirmSingleReject}
              >
                رد کردن
              </AlertDialogAction>
            </AlertDialogFooter>
          </GlassPanel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
