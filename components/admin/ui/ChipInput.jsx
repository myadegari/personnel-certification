"use client";

import { useState } from "react";
import { Add as Plus, X } from "reicon-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gooeyToast } from "goey-toast";
import { toPersianDigits } from "@/lib/persian-date";
import { clsx } from "clsx";

/**
 * Controlled free-text chip input: type a value, press Enter (or the add
 * button) to attach it as a removable chip. Enforces a case-insensitive
 * dedupe, a maximum count, and a per-chip length cap.
 */
export default function ChipInput({
  id,
  label,
  value = [],
  onChange,
  max = 30,
  maxLength = 60,
  placeholder,
  addLabel = "افزودن",
  description,
  duplicateMessage = "این مورد تکراری است.",
  removeLabel = (chip) => `حذف ${chip}`,
  className,
}) {
  const [input, setInput] = useState("");
  const atMax = value.length >= max;

  const add = () => {
    const item = input.trim().slice(0, maxLength);
    if (!item || atMax) return;
    if (value.some((v) => v.toLowerCase() === item.toLowerCase())) {
      gooeyToast.error(duplicateMessage);
      setInput("");
      return;
    }
    onChange([...value, item]);
    setInput("");
  };

  const remove = (item) => onChange(value.filter((v) => v !== item));

  return (
    <div className={clsx("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {toPersianDigits(String(value.length))} / {toPersianDigits(String(max))}
        </span>
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          dir="rtl"
          maxLength={maxLength}
          disabled={atMax}
        />
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer shrink-0"
          onClick={add}
          disabled={!input.trim() || atMax}
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-1">
          {value.map((item) => (
            <li key={item}>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                {item}
                <button
                  type="button"
                  onClick={() => remove(item)}
                  aria-label={removeLabel(item)}
                  className="cursor-pointer text-emerald-700/60 transition-colors hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {description && (
        <p className="text-[11px] text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
