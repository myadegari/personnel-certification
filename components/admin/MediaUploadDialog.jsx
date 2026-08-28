"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import { gooeyToast } from "goey-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UploadCloud, Image as ImageIcon } from "lucide-react";
import { motion } from "motion/react";
import { fadeUp } from "@/lib/motion";

export default function MediaUploadDialog({ open, onOpenChange, onUploaded }) {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState("");

  const reset = () => {
    setFile(null);
    setTitle("");
    setAlt("");
    setPreview("");
    setDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("file", file);
      if (title) formData.append("title", title);
      if (alt) formData.append("alt", alt);
      const { data } = await internalAxios.post("/admin/media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: (data) => {
      gooeyToast.success("رسانه با موفقیت بارگذاری شد.");
      queryClient.invalidateQueries({ queryKey: ["adminMedia"] });
      onUploaded?.(data);
      reset();
      onOpenChange(false);
    },
    onError: (e) =>
      gooeyToast.error(e.response?.data?.error || "خطا در بارگذاری رسانه."),
  });

  const pickFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      gooeyToast.error("فقط تصویر مجاز است (JPEG، PNG یا WebP).");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>بارگذاری رسانه</DialogTitle>
        </DialogHeader>

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              dragging ? "border-emerald-500 bg-emerald-500/5" : "border-black/10 hover:border-emerald-400/60 hover:bg-black/[0.02]"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {preview ? (
              <img src={preview} alt="پیش‌نمایش" className="max-h-40 rounded-lg object-contain" />
            ) : (
              <>
                <UploadCloud className="size-8 text-emerald-600" />
                <p className="text-sm font-medium">فایل را اینجا رها کنید یا کلیک کنید</p>
                <p className="text-xs text-muted-foreground">JPEG، PNG یا WebP — حداکثر ۵ مگابایت</p>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="media-title">عنوان</Label>
            <Input id="media-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان رسانه" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="media-alt">متن جایگزین (Alt)</Label>
            <Input id="media-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="توضیح کوتاه" />
          </div>
        </motion.div>

        <DialogFooter>
          <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={!file || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <ImageIcon className="size-4 animate-pulse" /> : <UploadCloud className="size-4" />}
            {mutation.isPending ? "در حال بارگذاری..." : "بارگذاری"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
