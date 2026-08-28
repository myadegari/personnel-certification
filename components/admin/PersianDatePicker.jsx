"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, toPersianDigits, toShamsi, today } from "@/lib/persian-date";

/**
 * Jalali (Shamsi) date picker built on the shadcn Calendar + Radix Popover.
 * Renders in a portal, so it is never clipped by an ancestor's overflow.
 * `value` is a plain JS Date (or null); `onChange` receives Date | null.
 */
export function PersianDatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  id,
  disabled,
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between rounded-2xl border-black/10 bg-stone-100/60 px-3 font-normal shadow-none",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {value ? formatDate(value, "yyyy/MM/dd EEEE") : placeholder}
          </span>
          <CalendarDays className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          defaultMonth={value ?? undefined}
          onSelect={(date) => {
            onChange?.(date ?? null);
            setOpen(false);
          }}
        />
        <div className="mt-1 flex items-center justify-between border-t border-black/5 pt-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="cursor-pointer text-xs text-emerald-700 hover:bg-emerald-500/10"
            onClick={() => {
              onChange?.(today());
              setOpen(false);
            }}
          >
            امروز
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="cursor-pointer text-xs text-muted-foreground"
            onClick={() => {
              onChange?.(null);
              setOpen(false);
            }}
          >
            پاک کردن
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Jalali year picker (same trigger styling as PersianDatePicker) using a
 * scrollable grid of years. `year` is a numeric Shamsi year.
 */
export function PersianYearPicker({
  year,
  onYearChange,
  id,
  disabled,
  span = 12,
}) {
  const [open, setOpen] = useState(false);
  const currentYear = toShamsi(new Date()).year;
  const years = [];
  for (let y = currentYear; y >= currentYear - span; y -= 1) years.push(y);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-10 w-auto min-w-24 justify-between gap-2 rounded-2xl border-black/10 bg-stone-100/60 px-3 font-normal shadow-none"
        >
          <span className="tabular-nums">{year ? toPersianDigits(String(year)) : "سال"}</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-auto p-2">
        <div className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto">
          {years.map((y) => (
            <Button
              key={y}
              type="button"
              size="sm"
              variant={y === year ? "default" : "ghost"}
              className="cursor-pointer tabular-nums"
              onClick={() => {
                onYearChange?.(y);
                setOpen(false);
              }}
            >
              {toPersianDigits(String(y))}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default PersianDatePicker;
