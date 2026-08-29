"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import { gooeyToast } from "goey-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BADGE_TONES } from "@/lib/statusLabels";
import { Copy, Download, Trash2, Save } from "lucide-react";
import { BUCKET_LABELS_FA } from "@/lib/mediaConstants";

function formatBytes(n) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
  } catch {
    return d;
  }
}

function MediaDetailBody({ item, onRequestDelete }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(item.title || "");
  const [alt, setAlt] = useState(item.alt || "");

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

  return (
    <div className="mt-4 space-y-5">
      <div className="flex items-center justify-center rounded-2xl border border-black/5 bg-stone-50 p-4">
        {item.kind === "image" && item.url ? (
          <img src={item.url} alt={item.alt || item.title} className="max-h-64 rounded-lg object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <Download className="size-8" />
            <span className="text-sm">پیش‌نمایش در دسترس نیست</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className={BADGE_TONES.green}>{BUCKET_LABELS_FA[item.bucket] || item.bucket}</Badge>
        <Badge className={BADGE_TONES.gray}>{item.mimeType}</Badge>
        <Badge className={BADGE_TONES.gray}>{formatBytes(item.size)}</Badge>
        {item.inUse && <Badge className={BADGE_TONES.amber}>در حال استفاده</Badge>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="detail-title">عنوان</Label>
        <Input id="detail-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="detail-alt">متن جایگزین (Alt)</Label>
        <Input id="detail-alt" value={alt} onChange={(e) => setAlt(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border border-black/5 bg-white/60 p-3">
          <p className="text-xs text-muted-foreground">تاریخ بارگذاری</p>
          <p className="font-medium">{formatDate(item.uploadedAt)}</p>
        </div>
        <div className="rounded-xl border border-black/5 bg-white/60 p-3">
          <p className="text-xs text-muted-foreground">شناسه</p>
          <p className="truncate font-mono text-xs" dir="ltr">{item.id}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
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
        <Button size="sm" variant="outline" className="cursor-pointer" asChild disabled={!item.url}>
          <a href={item.url || "#"} target="_blank" rel="noreferrer" download>
            <Download className="size-4" /> دانلود
          </a>
        </Button>
      </div>

      <div className="flex gap-2 border-t border-black/5 pt-4">
        <Button
          size="sm"
          className="cursor-pointer flex-1"
          disabled={renameMutation.isPending}
          onClick={() => renameMutation.mutate()}
        >
          <Save className="size-4" /> {renameMutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer text-red-600 hover:bg-red-500/10"
          disabled={!item.deletable}
          onClick={() => onRequestDelete?.(item)}
        >
          <Trash2 className="size-4" /> حذف
        </Button>
      </div>
      {!item.deletable && (
        <p className="text-xs text-muted-foreground">
          این فایل سیستمی یا در حال استفاده است و قابل حذف نیست.
        </p>
      )}
    </div>
  );
}

export default function MediaDetailSheet({ item, open, onOpenChange, onRequestDelete }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>جزئیات رسانه</SheetTitle>
          <SheetDescription>{item?.originalName}</SheetDescription>
        </SheetHeader>
        {item && (
          <MediaDetailBody key={item.id} item={item} onRequestDelete={onRequestDelete} />
        )}
      </SheetContent>
    </Sheet>
  );
}
