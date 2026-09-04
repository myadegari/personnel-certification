"use client";

import { motion } from "motion/react";
import { X, ImagePlus, Upload } from "reicon-react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fadeUp, staggerContainer, usePrefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Labeled form control with optional hint text. */
export function Field({ label, hint, className, children }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Card-wrapped group of fields with an icon chip header. */
export function FormSection({ icon: Icon, title, description, children }) {
  return (
    <motion.section
      variants={fadeUp}
      className="rounded-3xl border border-black/5 bg-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm"
    >
      <header className="mb-4 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <Icon className="size-5" />
        </span>
        <div>
          <h4 className="font-semibold">{title}</h4>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </motion.section>
  );
}

/** Dialog header with an emerald gradient icon badge; `children` renders below (e.g. a Stepper). */
export function DialogIconHeader({ icon: Icon, title, description, children }) {
  return (
    <DialogHeader>
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/30">
          <Icon className="size-6" aria-hidden />
        </span>
        <div className="text-right">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </div>
      </div>
      {children}
    </DialogHeader>
  );
}

/**
 * Image picker tile: hidden file input plus a preview (with hover actions) or an
 * empty dropzone-style state offering library/upload. Shared by stamp and
 * signature pickers.
 */
export function ImagePickerTile({
  preview,
  inputRef,
  onFileChange,
  onOpenPicker,
  onClear,
  label,
  placeholder = "تصویر را انتخاب یا بارگذاری کنید",
}) {
  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        onClick={(e) => (e.target.value = null)}
        className="hidden"
      />
      {preview ? (
        <div className="group relative flex h-28 items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-stone-50">
          <img src={preview} alt={label} className="max-h-full object-contain" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/45 group-hover:opacity-100 group-focus-within:bg-black/45 group-focus-within:opacity-100 [@media(hover:none)]:bg-black/45 [@media(hover:none)]:opacity-100">
            <button type="button" onClick={onOpenPicker} className="cursor-pointer rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-white">
              کتابخانه
            </button>
            <button type="button" onClick={() => inputRef.current?.click()} className="cursor-pointer rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-white">
              تغییر
            </button>
            <button type="button" onClick={onClear} className="cursor-pointer rounded-lg bg-red-500/90 p-1.5 text-white hover:bg-red-500" aria-label="حذف">
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-black/10 p-4 text-center transition-colors hover:border-emerald-400/50">
          <ImagePlus className="size-6 text-emerald-600" />
          <p className="text-xs text-muted-foreground">{placeholder}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={onOpenPicker}>
              <ImagePlus className="size-4" /> کتابخانه
            </Button>
            <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" /> بارگذاری
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Reduced-motion-aware stagger props for a `motion.div` wrapping sections. */
export function useStagger() {
  const reduced = usePrefersReducedMotion();
  return reduced
    ? {}
    : { variants: staggerContainer(0.08), initial: "hidden", animate: "show" };
}
