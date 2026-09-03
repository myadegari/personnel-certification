"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import { gooeyToast } from "goey-toast";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BADGE_TONES } from "@/lib/statusLabels";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBytes } from "@/lib/utils";
import PdfThumbnail from "@/components/admin/PdfThumbnail";
import {
  Search,
  Upload,
  Trash2,
  ImageOff,
  FileText,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import PageHeader from "./ui/PageHeader";
import MediaUploadDialog from "./MediaUploadDialog";
import MediaDetailSheet from "./MediaDetailSheet";
import ConfirmDialog from "./ConfirmDialog";
import TablePager from "@/components/shared/TablePager";
import { BUCKET_LABELS_FA } from "@/lib/mediaConstants";

const PAGE_SIZE = 24;
const isPdf = (item) => item.mimeType === "application/pdf";

export default function MediaLibraryClient() {
  const queryClient = useQueryClient();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState("all");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const params = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (q) p.set("q", q);
    if (bucket !== "all") p.set("bucket", bucket);
    if (type !== "all") p.set("type", type);
    return p.toString();
  }, [q, bucket, type, page]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["adminMedia", params],
    queryFn: async () => {
      const { data } = await internalAxios.get(`/admin/media?${params}`);
      return data;
    },
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { total: 0, pageCount: 1, currentPage: 1 };

  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      const results = await Promise.allSettled(
        ids.map((id) => internalAxios.delete(`/admin/media/${id}`))
      );
      return results;
    },
    onSuccess: (results) => {
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      if (ok) gooeyToast.success(`${ok} رسانه حذف شد.`);
      if (failed) gooeyToast.error(`${failed} رسانه قابل حذف نبود.`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["adminMedia"] });
    },
    onError: () => gooeyToast.error("خطا در حذف رسانه."),
  });

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allOnPageSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const toggleSelectPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) items.forEach((i) => next.delete(i.id));
      else items.forEach((i) => next.add(i.id));
      return next;
    });
  };

  const requestDelete = (ids, label) => {
    setConfirm({ ids, label });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="کتابخانه رسانه"
        description={`${pagination.total.toLocaleString("fa-IR")} فایل در سامانه`}
        actions={
          <Button size="sm" className="cursor-pointer" onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" /> بارگذاری رسانه
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white/80 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="جستجوی نام، عنوان یا متن جایگزین..."
            aria-label="جستجوی رسانه"
            className="ps-9"
          />
        </div>
        <Select value={bucket} onValueChange={(v) => { setBucket(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="دسته" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه دسته‌ها</SelectItem>
            {Object.entries(BUCKET_LABELS_FA).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="نوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه انواع</SelectItem>
            <SelectItem value="image">تصویر</SelectItem>
            <SelectItem value="other">سایر</SelectItem>
          </SelectContent>
        </Select>
        {items.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 px-2 text-sm">
            <Checkbox checked={allOnPageSelected} onCheckedChange={toggleSelectPage} />
            انتخاب صفحه
          </label>
        )}
      </div>

      {/* Bulk bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
              <span className="text-sm font-medium">{selected.size.toLocaleString("fa-IR")} مورد انتخاب شده</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer text-destructive hover:bg-destructive/10"
                  disabled={deleteMutation.isPending}
                  onClick={() => requestDelete([...selected], `${selected.size.toLocaleString("fa-IR")} رسانه`)}
                >
                  <Trash2 className="size-4" /> حذف انتخاب‌شده‌ها
                </Button>
                <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => setSelected(new Set())}>
                  <X className="size-4" /> لغو
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertTriangle className="size-8 text-rose-500" />
          <p className="text-sm text-muted-foreground">خطا در بارگذاری کتابخانه رسانه.</p>
          <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => refetch()}>تلاش مجدد</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <ImageOff className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">رسانه‌ای یافت نشد.</p>
          <Button size="sm" className="cursor-pointer" onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" /> بارگذاری اولین رسانه
          </Button>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer(0.04)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        >
          {items.map((item) => (
            <MediaTile
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={() => toggleSelect(item.id)}
              onOpen={() => setDetailItem(item)}
            />
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {pagination.pageCount > 1 && (
        <div className="pt-2">
          <TablePager
            page={pagination.currentPage}
            pageCount={pagination.pageCount}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)}
            canPrev={page > 1}
            canNext={page < pagination.pageCount}
          />
        </div>
      )}

      <MediaUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <MediaDetailSheet
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(v) => !v && setDetailItem(null)}
        onRequestDelete={(item) => {
          setDetailItem(null);
          requestDelete([item.id], item.title || item.originalName);
        }}
      />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title="حذف رسانه"
        description={`آیا از حذف ${confirm?.label || ""} اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (confirm) deleteMutation.mutate(confirm.ids);
          setConfirm(null);
        }}
      />
    </div>
  );
}

function MediaTile({ item, selected, onToggle, onOpen }) {
  return (
    <motion.div variants={fadeUp} className="group relative">
      <div
        className={`relative aspect-square overflow-hidden rounded-2xl border bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(16,185,129,0.15)] ${
          selected ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-black/5"
        }`}
      >
        <button type="button" onClick={onOpen} className="flex h-full w-full cursor-pointer items-center justify-center">
          {item.kind === "image" && item.url ? (
            <img src={item.url} alt={item.alt || item.title} className="size-full object-cover" loading="lazy" />
          ) : isPdf(item) && item.url ? (
            <PdfThumbnail fileId={item.id} name={item.title || item.originalName} />
          ) : (
            <div className="flex flex-col items-center gap-2 bg-gradient-to-br from-muted to-muted text-muted-foreground">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                <FileText className="size-6" />
              </span>
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {item.mimeType?.split("/")[1]?.toUpperCase() || "FILE"}
              </span>
            </div>
          )}
        </button>

        <div className="absolute right-2 top-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onToggle}
            className={`flex size-6 cursor-pointer items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-white/60 bg-white/70 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
            }`}
            aria-label={`انتخاب ${item.title || item.originalName}`}
          >
            {selected && <Check className="size-4" />}
          </button>
        </div>

        {item.inUse && (
          <div className="absolute left-2 top-2">
            <Badge className={BADGE_TONES.amber}>در حال استفاده</Badge>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <p className="truncate text-xs font-medium text-white">{item.title || item.originalName}</p>
          <p className="truncate text-[10px] text-white/70">
            {BUCKET_LABELS_FA[item.bucket] || item.bucket} · {formatBytes(item.size)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
