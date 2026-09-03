"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import { gooeyToast } from "goey-toast";
import { motion } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Upload, Check, ImageMinus as ImageOff, Loader as Loader2 } from "reicon-react";
import MediaUploadDialog from "./MediaUploadDialog";

export default function MediaPickerDialog({
  open,
  onOpenChange,
  multiple = false,
  onSelect,
}) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);

  const params = useMemo(() => {
    const p = new URLSearchParams({ page: "1", limit: "60", type: "image" });
    if (q) p.set("q", q);
    return p.toString();
  }, [q]);

  const { data, isLoading } = useQuery({
    queryKey: ["adminMedia", "picker", params],
    queryFn: async () => {
      const { data } = await internalAxios.get(`/admin/media?${params}`);
      return data;
    },
    enabled: open,
  });

  const items = data?.items ?? [];

  const toggle = (item) => {
    setSelected((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      if (multiple) {
        return exists ? prev.filter((p) => p.id !== item.id) : [...prev, item];
      }
      return exists ? [] : [item];
    });
  };

  const isSelected = (id) => selected.some((p) => p.id === id);

  const confirm = () => {
    if (!selected.length) {
      gooeyToast.error("ابتدا یک رسانه انتخاب کنید.");
      return;
    }
    onSelect?.(multiple ? selected : selected[0]);
    setSelected([]);
    onOpenChange(false);
  };

  const close = () => {
    setSelected([]);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>انتخاب از کتابخانه رسانه</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="جستجو در رسانه‌ها..."
                aria-label="جستجو در رسانه‌ها"
                className="ps-9"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="size-4" /> بارگذاری
            </Button>
          </div>

          <div className="mt-2 max-h-[50vh] overflow-y-auto rounded-2xl border border-black/5 bg-stone-50/60 p-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                <ImageOff className="size-8" />
                <p className="text-sm">تصویری یافت نشد. ابتدا بارگذاری کنید.</p>
              </div>
            ) : (
              <motion.div
                variants={staggerContainer(0.03)}
                initial="hidden"
                animate="show"
                className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5"
              >
                {items.map((item) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    variants={fadeUp}
                    onClick={() => toggle(item)}
                    className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-white transition-all ${
                      isSelected(item.id)
                        ? "border-emerald-500 ring-2 ring-emerald-500/30"
                        : "border-transparent hover:border-emerald-300"
                    }`}
                  >
                    {item.url ? (
                      <img src={item.url} alt={item.alt || item.title} className="size-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageOff className="size-5" />
                      </div>
                    )}
                    {isSelected(item.id) && (
                      <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>

          <DialogFooter className="items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              {selected.length ? `${selected.length.toLocaleString("fa-IR")} مورد انتخاب شده` : "هنوز موردی انتخاب نشده"}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={close}>
                انصراف
              </Button>
              <Button type="button" className="cursor-pointer" onClick={confirm} disabled={!selected.length}>
                انتخاب
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MediaUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={(data) => {
          queryClient.invalidateQueries({ queryKey: ["adminMedia"] });
          const f = data?.file;
          if (f) {
            const picked = {
              id: String(f._id),
              title: f.title || f.originalName,
              url: f.presignedUrl,
            };
            setSelected((prev) => (multiple ? [...prev, picked] : [picked]));
          }
        }}
      />
    </>
  );
}
