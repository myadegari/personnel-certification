"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import { gooeyToast } from "goey-toast";
import { motion } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GlassBadge } from "@/components/shared/glass-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BADGE_TONES } from "@/lib/statusLabels";
import { formatBytes, cn } from "@/lib/utils";
import { formatDate } from "@/lib/persian-date";
import PdfThumbnail from "@/components/admin/PdfThumbnail";
import { Calendar, Copy, Download, Link as ExternalLink, FileText, FolderOpen, Hashtag as Hash, FileText as FileType2, Loader as Loader2, Save, Trash as Trash2 } from "reicon-react";
import { BUCKET_LABELS_FA } from "@/lib/mediaConstants";

const isPdf = (item) => item.mimeType === "application/pdf";

function MediaPreview({ item }) {
  if (item.kind === "image" && item.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.url}
        alt={item.alt || item.title}
        className="max-h-full max-w-full object-contain"
      />
    );
  }
  if (isPdf(item) && item.url) {
    return <PdfThumbnail fileId={item.id} name={item.title || item.originalName} width={640} />;
  }
  return (
    <div className="flex flex-col items-center gap-2 text-muted-foreground">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm">
        <FileText className="size-7" />
      </span>
      <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
        {item.mimeType?.split("/")[1]?.toUpperCase() || "FILE"}
      </span>
      <span className="text-xs">پیش‌نمایش تصویری موجود نیست</span>
    </div>
  );
}

function MetaCard({ icon: Icon, label, value, ltr }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/60 p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("truncate text-sm font-medium text-foreground", ltr && "font-mono text-xs")} dir={ltr ? "ltr" : undefined}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function MediaDetailBody({ item, onRequestDelete }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(item.title || "");
  const [alt, setAlt] = useState(item.alt || "");
  const [downloading, setDownloading] = useState(false);

  const renameMutation = useMutation({
    mutationFn: async () => {
      await internalAxios.patch(`/admin/media/${item.id}`, { title, alt });
    },
    onSuccess: () => {
      gooeyToast.success("تغییرات ذخیره شد.");
      queryClient.invalidateQueries({ queryKey: ["adminMedia"] });
    },
    onError: (e) => gooeyToast.error(e.response?.data?.error || "خطا در ذخیره تغییرات."),
  });

  // Cross-origin presigned URLs ignore the `download` attribute, so stream the
  // file through a same-origin blob to trigger a real download.
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/file/${item.id}`);
      if (!response.ok) throw new Error("دانلود ناموفق بود.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = item.originalName || item.title || "file";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      gooeyToast.error(err?.message || "خطا در دانلود فایل.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainer(0.06)}
      initial="hidden"
      animate="show"
      className="mt-4 space-y-5"
    >
      {/* Hero preview */}
      <motion.div
        variants={fadeUp}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-muted to-muted p-4"
      >
        <MediaPreview item={item} />
        {item.inUse && (
          <div className="absolute start-3 top-3">
            <Badge className={BADGE_TONES.amber}>در حال استفاده</Badge>
          </div>
        )}
      </motion.div>

      {/* Badges */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        <Badge className={BADGE_TONES.green}>
          <FolderOpen className="me-1 size-3" />
          {BUCKET_LABELS_FA[item.bucket] || item.bucket}
        </Badge>
        <Badge className={BADGE_TONES.gray}>{item.mimeType}</Badge>
        <Badge className={BADGE_TONES.gray}>{formatBytes(item.size)}</Badge>
      </motion.div>

      {/* Meta grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <MetaCard icon={FileText} label="نام فایل" value={item.originalName} />
        <MetaCard icon={FileType2} label="نوع" value={item.mimeType} ltr />
        <MetaCard icon={Hash} label="حجم" value={formatBytes(item.size)} />
        <MetaCard
          icon={FolderOpen}
          label="دسته"
          value={BUCKET_LABELS_FA[item.bucket] || item.bucket}
        />
        <MetaCard
          icon={Calendar}
          label="تاریخ بارگذاری"
          value={item.uploadedAt ? formatDate(new Date(item.uploadedAt), "yyyy/MM/dd HH:mm") : null}
        />
        <MetaCard icon={Hash} label="شناسه" value={item.id} ltr />
      </motion.div>

      {/* Actions */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer"
          onClick={() => {
            navigator.clipboard?.writeText(item.url || "");
            gooeyToast.success("لینک کپی شد.");
          }}
        >
          <Copy className="size-4" /> کپی لینک
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer"
          onClick={handleDownload}
          disabled={downloading || !item.url}
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} دانلود
        </Button>
        <Button size="sm" variant="outline" className="cursor-pointer" asChild disabled={!item.url}>
          <a href={item.url || "#"} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" /> مشاهده
          </a>
        </Button>
      </motion.div>

      {/* Edit */}
      <motion.div variants={fadeUp} className="space-y-3 border-t border-black/5 pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="detail-title">عنوان</Label>
          <Input id="detail-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="detail-alt">متن جایگزین (Alt)</Label>
          <Input id="detail-alt" value={alt} onChange={(e) => setAlt(e.target.value)} />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 cursor-pointer bg-gradient-to-l from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-emerald-700"
          disabled={renameMutation.isPending || (title === (item.title || "") && alt === (item.alt || ""))}
          onClick={() => renameMutation.mutate()}
        >
          <Save className="size-4" /> {renameMutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer text-destructive hover:bg-destructive/10"
          disabled={!item.deletable}
          onClick={() => onRequestDelete?.(item)}
        >
          <Trash2 className="size-4" /> حذف
        </Button>
      </motion.div>
      {!item.deletable && (
        <p className="text-xs text-muted-foreground">
          این فایل سیستمی یا در حال استفاده است و قابل حذف نیست.
        </p>
      )}
    </motion.div>
  );
}

export default function MediaDetailSheet({ item, open, onOpenChange, onRequestDelete }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-full overflow-hidden border-white/50 bg-white/70 shadow-[0_40px_120px_-30px_rgba(2,44,34,0.45)] backdrop-blur-2xl sm:max-w-md">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 -right-16 size-72 rounded-full bg-emerald-400/30 blur-3xl" />
          <div className="absolute bottom-10 -left-24 size-72 rounded-full bg-teal-300/25 blur-3xl" />
        </div>
        <div className="flex items-center gap-3 px-4 pt-4">
          <GlassBadge icon={FileText} />
          <div className="min-w-0 text-right">
            <SheetTitle className="text-lg font-bold">جزئیات رسانه</SheetTitle>
            <SheetDescription className="truncate text-sm text-muted-foreground">{item?.originalName}</SheetDescription>
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 pb-6">
            {item && (
              <MediaDetailBody key={item.id} item={item} onRequestDelete={onRequestDelete} />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
