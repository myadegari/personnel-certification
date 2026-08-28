"use client";

import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clsx } from "clsx";

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-9 flex-1 shimmer"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function DataTableShell({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  skeletonRows = 6,
  skeletonCols = 5,
  emptyTitle = "موردی یافت نشد",
  emptyDescription,
  emptyAction,
  toolbar,
  children,
  className,
}) {
  return (
    <div className={clsx("space-y-3", className)}>
      {toolbar}
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
        {isLoading ? (
          <TableSkeleton rows={skeletonRows} cols={skeletonCols} />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertTriangle className="size-8 text-rose-500" />
            <p className="text-sm text-muted-foreground">خطا در بارگذاری اطلاعات.</p>
            {onRetry && (
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={onRetry}>
                تلاش مجدد
              </Button>
            )}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
              <Inbox className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{emptyTitle}</p>
              {emptyDescription && (
                <p className="text-sm text-muted-foreground">{emptyDescription}</p>
              )}
            </div>
            {emptyAction}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
