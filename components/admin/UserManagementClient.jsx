"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { internalAxios } from "@/lib/axios";
import { gooeyToast } from "goey-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { USER_STATUS_META, FALLBACK_STATUS_META } from "@/lib/statusLabels";
import { clsx } from "clsx";
import { Search, Refresh as RefreshCw, Download, Upload, More as MoreVertical, Eye, Edit as Pencil, Check, X, Trash as Trash2, Login as LogIn, SortDownUp as ArrowUpDown, ArrowUp, ArrowDown, UserAdd as UserPlus } from "reicon-react";
import { ROLE_LABELS_FA, ASSIGNABLE_ROLES, isSuperAdmin, canManageUser, canImpersonate } from "@/lib/roles";
import { toPersianDigits } from "@/lib/persian-date";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import UserFormModal from "./UserFormModal";
import UserDetailSheet from "./UserDetailSheet";
import UserImportDialog from "./UserImportDialog";
import ConfirmDialog from "./ConfirmDialog";
import PageHeader from "./ui/PageHeader";
import DataTableShell from "./ui/DataTableShell";
import TablePager from "@/components/shared/TablePager";

const StatusBadge = ({ status }) => {
  const meta = USER_STATUS_META[status] || FALLBACK_STATUS_META;
  return (
    <Badge className={meta.tone} aria-label={meta.label}>
      {meta.label}
    </Badge>
  );
};

const fetchUsers = async ({ queryKey }) => {
  const [, params] = queryKey;
  const { data } = await internalAxios.get("/admin/users", { params });
  return data;
};

export default function UserManagementClient({ initialData }) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const router = useRouter();
  const currentRole = session?.user?.role;
  const currentUserId = session?.user?.id;
  const isSuper = isSuperAdmin(currentRole);

  const [pagination, setPagination] = useState({
    pageIndex: initialData?.pagination?.currentPage ? initialData.pagination.currentPage - 1 : 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState({});

  const [qInput, setQInput] = useState("");
  const [filters, setFilters] = useState({ q: "", role: "", status: "" });
  const [sort, setSort] = useState({ field: "createdAt", order: "desc" });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // { type, user }

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, q: qInput.trim() }));
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      q: filters.q || undefined,
      role: filters.role || undefined,
      status: filters.status || undefined,
      sort: sort.field,
      order: sort.order,
    }),
    [pagination, filters, sort]
  );

  const isDefaultQuery =
    pagination.pageIndex === 0 &&
    !filters.q &&
    !filters.role &&
    !filters.status &&
    sort.field === "createdAt" &&
    sort.order === "desc";

  const { data: tableData, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["adminUsers", queryParams],
    queryFn: fetchUsers,
    initialData: isDefaultQuery ? initialData : undefined,
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (userIds) => internalAxios.delete("/admin/users", { data: { userIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      table.resetRowSelection();
      gooeyToast.success("کاربران با موفقیت حذف شدند.");
    },
    onError: (e) => gooeyToast.error(e.response?.data?.error || "خطا در حذف کاربران."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, status }) =>
      internalAxios.post("/admin/users/update-status", { userId, status }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      gooeyToast.success(res.data?.message || "وضعیت کاربر تغییر کرد.");
    },
    onError: (e) => gooeyToast.error(e.response?.data?.message || "خطا در تغییر وضعیت کاربر."),
  });

  const impersonateMutation = useMutation({
    mutationFn: async (user) => {
      await internalAxios.post(`/admin/users/${user._id}/impersonate`);
      return signIn("impersonation", { targetUserId: user._id, redirect: false });
    },
    onSuccess: (result) => {
      if (result?.error) {
        gooeyToast.error("خطا در ورود به حساب کاربر.");
        return;
      }
      gooeyToast.success("وارد حساب کاربر شدید.");
      router.push("/");
      router.refresh();
    },
    onError: (e) => gooeyToast.error(e.response?.data?.error || "امکان ورود به این حساب وجود ندارد."),
  });

  const handleConfirm = useCallback(() => {
    if (!confirm) return;
    const { type, user } = confirm;
    if (type === "delete") {
      deleteMutation.mutate([user._id]);
    } else if (type === "status") {
      statusMutation.mutate({ userId: user._id, status: user.nextStatus });
    } else if (type === "impersonate") {
      impersonateMutation.mutate(user);
    }
    setConfirm(null);
  }, [confirm, deleteMutation, statusMutation, impersonateMutation]);

  const toggleSort = (field) => {
    setSort((s) =>
      s.field === field
        ? { field, order: s.order === "asc" ? "desc" : "asc" }
        : { field, order: "asc" }
    );
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const downloadCsv = async (url, filename) => {
    try {
      const res = await internalAxios.get(url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      gooeyToast.error("خطا در دریافت فایل خروجی.");
    }
  };

  const handleExportAll = () => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.role) params.set("role", filters.role);
    if (filters.status) params.set("status", filters.status);
    downloadCsv(`/admin/users/export?${params.toString()}`, `users-${Date.now()}.csv`);
  };

  const handleExportSelected = () => {
    const ids = table.getSelectedRowModel().rows.map((r) => r.original._id);
    if (!ids.length) return;
    downloadCsv(`/admin/users/export?ids=${ids.join(",")}`, `users-selected-${Date.now()}.csv`);
  };

  const handleBulkDelete = () => {
    const ids = table.getSelectedRowModel().rows.map((r) => r.original._id);
    if (ids.length) {
      setConfirm({ type: "bulk-delete", count: ids.length, ids });
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="انتخاب همه"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            disabled={!row.getCanSelect()}
            aria-label={`انتخاب ${row.original.firstName} ${row.original.lastName}`}
          />
        ),
      },
      {
        accessorKey: "personnelNumber",
        header: "شماره پرسنلی",
        cell: ({ row }) => <span dir="ltr" className="tabular-nums">{row.original.personnelNumber}</span>,
      },
      {
        id: "name",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        header: "نام کامل",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-100 text-xs text-emerald-700">
                  {u.firstName?.[0]}
                  {u.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col leading-tight">
                <span className="font-medium">{u.firstName} {u.lastName}</span>
                <span className="text-xs text-muted-foreground" dir="ltr">{u.email}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: "نقش",
        cell: ({ row }) => (
          <Badge variant="outline" className="border-sky-600/20 text-sky-700">
            {ROLE_LABELS_FA[row.original.role] || row.original.role}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "وضعیت",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: "عضویت",
        cell: ({ row }) =>
          row.original.createdAt
            ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(row.original.createdAt))
            : "—",
      },
      {
        id: "actions",
        header: "عملیات",
        cell: ({ row }) => {
          const u = row.original;
          const manageable = canManageUser(currentRole, u.role);
          const canImp = canImpersonate(currentRole, u.role) && u._id !== currentUserId && u.status === "VERIFIED";
          const pending = ["PENDING", "NEED_TO_VERIFY"].includes(u.status);

          return (
            <div className="flex items-center justify-start">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" aria-label={`عملیات برای ${u.firstName} ${u.lastName}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-40">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setDetailUser(u)}>
                    <Eye className="h-4 w-4" /> مشاهده جزئیات
                  </DropdownMenuItem>
                  {manageable && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => { setEditingUser(u); setIsModalOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" /> ویرایش
                    </DropdownMenuItem>
                  )}
                  {manageable && pending && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setConfirm({ type: "status", user: { ...u, nextStatus: "VERIFIED" } })}
                    >
                      <Check className="h-4 w-4 text-green-600" /> تایید کاربر
                    </DropdownMenuItem>
                  )}
                  {manageable && pending && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setConfirm({ type: "status", user: { ...u, nextStatus: "REJECTED" } })}
                    >
                      <X className="h-4 w-4 text-destructive" /> رد کاربر
                    </DropdownMenuItem>
                  )}
                  {canImp && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setConfirm({ type: "impersonate", user: u })}
                    >
                      <LogIn className="h-4 w-4 text-amber-600" /> ورود به حساب کاربری
                    </DropdownMenuItem>
                  )}
                  {manageable && u._id !== currentUserId && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={() => setConfirm({ type: "delete", user: u })}
                      >
                        <Trash2 className="h-4 w-4" /> حذف
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [currentRole, currentUserId]
  );

  const handlePaginationChange = useCallback(
    (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      if (next.pageIndex !== pagination.pageIndex) {
        setRowSelection({});
      }
      setPagination(next);
    },
    [pagination]
  );

  const table = useReactTable({
    data: tableData?.users ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: tableData?.pagination?.pageCount ?? 1,
    state: { pagination, rowSelection },
    onPaginationChange: handlePaginationChange,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: (row) =>
      row.original._id !== currentUserId && canManageUser(currentRole, row.original.role),
  });

  const selectedCount = Object.keys(rowSelection).length;
  const total = tableData?.pagination?.totalUsers ?? 0;
  const from = total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const to = Math.min(total, (pagination.pageIndex + 1) * pagination.pageSize);

  const SortHeader = ({ field, children }) => {
    const sorted = sort.field === field;
    const desc = sorted && sort.order === "desc";
    const Icon = !sorted ? ArrowUpDown : desc ? ArrowDown : ArrowUp;
    return (
      <TableHead aria-sort={sorted ? (desc ? "descending" : "ascending") : "none"}>
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className={clsx(
            "flex items-center gap-1 cursor-pointer select-none hover:text-foreground",
            sorted && "text-emerald-700"
          )}
        >
          {children}
          <Icon className="h-3.5 w-3.5" />
        </button>
      </TableHead>
    );
  };

  const confirmConfig = (() => {
    if (!confirm) return {};
    if (confirm.type === "delete")
      return { title: "حذف کاربر", description: `آیا از حذف «${confirm.user.firstName} ${confirm.user.lastName}» اطمینان دارید؟`, confirmText: "حذف", destructive: true };
    if (confirm.type === "bulk-delete")
      return { title: "حذف گروهی", description: `آیا از حذف ${confirm.count.toLocaleString("fa-IR")} کاربر انتخاب‌شده اطمینان دارید؟`, confirmText: "حذف", destructive: true };
    if (confirm.type === "status")
      return {
        title: confirm.user.nextStatus === "VERIFIED" ? "تایید کاربر" : "رد کاربر",
        description: `آیا از ${confirm.user.nextStatus === "VERIFIED" ? "تایید" : "رد"} «${confirm.user.firstName} ${confirm.user.lastName}» اطمینان دارید؟`,
        confirmText: confirm.user.nextStatus === "VERIFIED" ? "تایید" : "رد",
        destructive: confirm.user.nextStatus === "REJECTED",
      };
    if (confirm.type === "impersonate")
      return {
        title: "ورود به حساب کاربری",
        description: `شما در حال ورود به حساب «${confirm.user.firstName} ${confirm.user.lastName}» هستید و دقیقاً همان دسترسی‌های این کاربر را خواهید داشت.`,
        confirmText: "ورود",
      };
    return {};
  })();

  const isConfirmLoading =
    deleteMutation.isPending || statusMutation.isPending || impersonateMutation.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title="مدیریت کاربران"
        description={`${total.toLocaleString("fa-IR")} کاربر ${isSuper ? "" : "(قابل مدیریت)"}`}
        actions={
          <>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> وارد کردن (CSV)
            </Button>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={handleExportAll}>
              <Download className="h-4 w-4" /> خروجی (CSV)
            </Button>
            <Button size="sm" className="cursor-pointer" onClick={() => { setEditingUser(null); setIsModalOpen(true); }}>
              <UserPlus className="h-4 w-4" /> ایجاد کاربر جدید
            </Button>
          </>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white/80 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="جستجوی نام، شماره پرسنلی، ایمیل یا کد ملی..."
            aria-label="جستجوی کاربران"
            className="ps-9"
          />
        </div>
        {isSuper && (
          <Select
            value={filters.role || "all"}
            onValueChange={(v) => { setFilters((f) => ({ ...f, role: v === "all" ? "" : v })); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
          >
            <SelectTrigger className="w-36"><SelectValue placeholder="نقش" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه نقش‌ها</SelectItem>
              {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS_FA[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select
          value={filters.status || "all"}
          onValueChange={(v) => { setFilters((f) => ({ ...f, status: v === "all" ? "" : v })); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
        >
          <SelectTrigger className="w-40"><SelectValue placeholder="وضعیت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            {Object.entries(USER_STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="cursor-pointer" aria-label="نوسازی فهرست" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={clsx("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <span className="text-sm font-medium text-emerald-800">{selectedCount.toLocaleString("fa-IR")} کاربر انتخاب شده</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={handleExportSelected}>
                  <Download className="h-4 w-4" /> خروجی انتخاب‌شده
                </Button>
                <Button variant="destructive" size="sm" className="cursor-pointer" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4" /> حذف انتخاب‌شده‌ها
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <DataTableShell
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        isEmpty={!tableData?.users?.length}
        emptyTitle="کاربری یافت نشد."
        skeletonCols={columns.length}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-stone-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const key = header.column.id;
                    const sortable = ["personnelNumber", "role", "status", "createdAt"].includes(key);
                    return sortable ? (
                      <SortHeader key={header.id} field={key}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </SortHeader>
                    ) : (
                      <TableHead key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
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
                    exit="hidden"
                    transition={{ delay: i * 0.02 }}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-b transition-colors hover:bg-emerald-50/40 data-[state=selected]:bg-muted"
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

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>نمایش {from.toLocaleString("fa-IR")}–{to.toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")}</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(v) => { setPagination({ pageIndex: 0, pageSize: Number(v) }); setRowSelection({}); }}
          >
            <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{toPersianDigits(String(n))} ردیف</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <TablePager
          page={pagination.pageIndex + 1}
          pageCount={table.getPageCount()}
          onPrev={() => table.previousPage()}
          onNext={() => table.nextPage()}
          canPrev={table.getCanPreviousPage()}
          canNext={table.getCanNextPage()}
        />
      </div>

      {/* Modals / dialogs */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userData={editingUser}
        onSave={() => {
          setIsModalOpen(false);
          setEditingUser(null);
          queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
        }}
      />
      <UserDetailSheet user={detailUser} open={!!detailUser} onOpenChange={(o) => !o && setDetailUser(null)} />
      <UserImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        {...confirmConfig}
        loading={isConfirmLoading}
        onConfirm={() => {
          if (confirm?.type === "bulk-delete") {
            deleteMutation.mutate(confirm.ids);
            setConfirm(null);
          } else {
            handleConfirm();
          }
        }}
      />
    </div>
  );
}
