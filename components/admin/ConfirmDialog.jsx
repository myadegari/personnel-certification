"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { clsx } from "clsx";
import { AlertTriangle } from "reicon-react";
import {
  glassSurface,
  GlassPanel,
  GlassBadge,
  GLASS_TITLE,
  GLASS_DESC,
  PRIMARY_BTN,
} from "@/components/shared/glass-dialog";
import { cn } from "@/lib/utils";

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "تایید",
  cancelText = "انصراف",
  destructive = false,
  loading = false,
  onConfirm,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(glassSurface(),'p-6')} size="md">
        <GlassPanel>
          <div className="flex items-center gap-4">
            <GlassBadge
              icon={AlertTriangle}
              className={destructive ? "from-rose-500 to-red-600 shadow-rose-500/30" : undefined}
            />
            <div className="min-w-0 text-right">
              <AlertDialogTitle className={GLASS_TITLE}>{title}</AlertDialogTitle>
              <AlertDialogDescription asChild className="text-pretty">
                <div className={cn(GLASS_DESC)}>{description}</div>
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
            <AlertDialogAction
              className={clsx(
                "cursor-pointer",
                destructive ? "bg-destructive text-white hover:bg-destructive/90" : PRIMARY_BTN
              )}
              disabled={loading}
              onClick={(e) => {
                e.preventDefault();
                onConfirm?.();
              }}
            >
              {loading ? "در حال انجام..." : confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </GlassPanel>
      </AlertDialogContent>
    </AlertDialog>
  );
}
