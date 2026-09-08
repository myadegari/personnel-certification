"use client";

import * as React from "react";
import { motion } from "motion/react";
import { X } from "reicon-react";

import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, ImagePickerTile } from "@/components/shared/form-dialog";
import OrganizingUnitsPicker from "@/components/OrganizingUnitsPicker";
import UserSearchCombobox from "@/components/admin/UserSearchCombobox";

/** Glass surface visual (no padding/width); shared by dialogs and alert-dialogs. */
export const GLASS_SURFACE =
  "overflow-hidden rounded-[2rem] border-white/50 bg-white/85 text-foreground shadow-[0_40px_120px_-30px_rgba(2,44,34,0.45)] backdrop-blur-2xl";

const GLASS_SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-3xl",
  "2xl": "sm:max-w-4xl",
};

/** Glass shell for a DialogContent (the new dialog popup is flex-col, no padding). */
export function glassShell(size = "lg", className) {
  return cn(GLASS_SURFACE, "gap-0 p-0", GLASS_SIZES[size] ?? GLASS_SIZES.lg, className);
}

/** Glass surface for an AlertDialogContent (keeps the primitive's own padding/width). */
export function glassSurface(className) {
  return cn(GLASS_SURFACE, className);
}

export const PRIMARY_BTN =
  "cursor-pointer gap-2 bg-gradient-to-l from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30 transition duration-300 hover:from-emerald-700 hover:to-teal-600 active:scale-[.98]";

export const GLASS_BADGE =
  "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 ring-1 ring-white/40";

export const GLASS_TITLE = "text-2xl font-extrabold tracking-tight sm:text-[1.7rem]";
export const GLASS_DESC = "mt-1 text-sm";

/** Gradient icon chip used at the start of a glass header. */
export function GlassBadge({ icon: Icon, className }) {
  if (!Icon) return null;
  return (
    <span className={cn(GLASS_BADGE, className)}>
      <Icon className="size-6" aria-hidden />
    </span>
  );
}

/**
 * Gradient-mesh backdrop rendered as a fragment, so the dialog's own
 * DialogHeader / DialogPanel / DialogFooter become the popup's flex-col
 * children directly (the new DialogContent is a padding-less flex column).
 */
export function GlassPanel({ children, className }) {
  return (
    <>
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
        <div className="absolute -top-24 -right-16 size-72 rounded-full bg-emerald-400/30 blur-3xl" />
        <div className="absolute top-10 -left-24 size-72 rounded-full bg-teal-300/25 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 size-72 rounded-full bg-sky-300/20 blur-3xl" />
      </div>
      {children}
    </>
  );
}

/** Dialog header: gradient badge + display title + description + optional children (e.g. Stepper). */
export function GlassHeader({ icon, title, description, children, className }) {
  return (
    <DialogHeader className={cn("gap-0 text-right", className)}>
      <div className="flex items-center gap-4">
        <GlassBadge icon={icon} />
        <div className="min-w-0">
          <DialogTitle className={GLASS_TITLE}>{title}</DialogTitle>
          {description && <DialogDescription className={GLASS_DESC}>{description}</DialogDescription>}
        </div>
      </div>
      {children}
    </DialogHeader>
  );
}

/** Scrollable dialog body: a min-h-0 flex-1 ScrollArea (custom overlay bar). */
export function GlassScroll({ children, className }) {
  return (
    <ScrollArea className={cn("min-h-0 flex-1", className)}>
      <div className="px-6 pb-6">{children}</div>
    </ScrollArea>
  );
}

/** Frosted, gradient-accented section card for a group of fields. */
export function GlassSection({ icon: Icon, title, description, children, className }) {
  return (
    <motion.section
      variants={fadeUp}
      dir="rtl"
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/60 bg-white/60 p-5 shadow-[0_20px_50px_-24px_rgba(2,44,34,0.35)] backdrop-blur-xl",
        className
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-emerald-400/60 to-transparent"
      />
      <header className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <h4 className="text-sm font-bold text-foreground">{title}</h4>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </motion.section>
  );
}

import {UserSquare} from "reicon-react"
/**
 * One signatory block: person picker + unit picker + stamp, in a glass card.
 * `deputy` (name + units) drives the unit options; when null a free-text
 * fallback is shown. `optional` allows clearing and a 0-min unit selection.
 */
export function SignatoryCard({
  icon,
  title,
  subtitle,
  optional,
  selectedUser,
  onSelectUser,
  onClear,
  deputy,
  units,
  onUnitsChange,
  preview,
  inputRef,
  onFileChange,
  onOpenPicker,
  onClearStamp,
  stampLabel = "تصویر مهر",
}) {
  const unitOptions = React.useMemo(() => {
    if (!deputy) return [];
    const opts = [];
    if (deputy.name) opts.push({ value: deputy.name, label: deputy.name });
    for (const u of deputy.units || []) {
      if (!opts.some((o) => o.value === u)) opts.push({ value: u, label: u });
    }
    for (const u of units || []) {
      if (!opts.some((o) => o.value === u)) opts.push({ value: u, label: u });
    }
    return opts;
  }, [deputy, units]);

  return (
    <motion.div
    dir="rtl"
      variants={fadeUp}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-white/60 bg-white/60 p-5 shadow-[0_20px_50px_-24px_rgba(2,44,34,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-24px_rgba(2,44,34,0.45)]"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-emerald-400/60 to-transparent"
      />
      <header className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
          <UserSquare className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {optional && selectedUser && (
          <button
            type="button"
            onClick={onClear}
            aria-label="حذف امضاکننده"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600"
          >
            <X className="size-4" />
          </button>
        )}
      </header>

      <Field label="امضاکننده" required={!optional}>
        <UserSearchCombobox selectedUser={selectedUser} onSelectUser={onSelectUser} />
      </Field>

      <Field
        label="واحد(های) امضا"
        hint={
          deputy
            ? "نام معاونت و/یا حداکثر دو واحد از واحدهای او."
            : selectedUser
              ? "این کاربر معاونت ندارد؛ واحد را دستی وارد کنید."
              : "ابتدا امضاکننده را انتخاب کنید."
        }
      >
        {deputy ? (
          <OrganizingUnitsPicker
            options={unitOptions}
            selected={units || []}
            onChange={onUnitsChange}
            max={2}
            min={optional ? 0 : 1}
          />
        ) : (
          <Input
            placeholder="نام واحد"
            value={units?.[0] || ""}
            onChange={(e) => onUnitsChange(e.target.value ? [e.target.value] : [])}
            disabled={optional && !selectedUser}
          />
        )}
      </Field>

      <Field label={stampLabel}>
        <ImagePickerTile
          preview={preview}
          inputRef={inputRef}
          onFileChange={onFileChange}
          onOpenPicker={onOpenPicker}
          onClear={onClearStamp}
          label={stampLabel}
          placeholder="تصویر مهر را انتخاب یا بارگذاری کنید"
        />
      </Field>
    </motion.div>
  );
}
