"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toPersianDigits } from "@/lib/persian-date";

/**
 * Shared table pagination footer (RTL): قبلی / صفحه X از Y / بعدی.
 * Numbers render as Persian digits.
 */
export default function TablePager({ page, pageCount, onPrev, onNext, canPrev, canNext }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer"
        onClick={onPrev}
        disabled={!canPrev}
      >
        <ChevronRight className="h-4 w-4" /> قبلی
      </Button>
      <span className="text-sm">
        صفحه <strong>{toPersianDigits(String(page))}</strong> از{" "}
        <strong>{toPersianDigits(String(pageCount || 1))}</strong>
      </span>
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer"
        onClick={onNext}
        disabled={!canNext}
      >
        بعدی <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
}
