"use client";

import { Check } from "reicon-react";
import { clsx } from "clsx";

/**
 * Toggle-chip multi-select for organizing units (deputy name + its units).
 * Enforces min..max selections: with min>=1 the last remaining chip cannot be
 * deselected; with min=0 the selection may be cleared entirely (used for the
 * optional second signatory). Further chips are disabled once `max` are active.
 */
export default function OrganizingUnitsPicker({ options, selected, onChange, max = 2, min = 1 }) {
  const atMax = selected.length >= max;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="انتخاب واحد برگزارکننده">
      {options.map((opt) => {
        const isSel = selected.includes(opt.value);
        const disabled = isSel ? selected.length <= min : atMax;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isSel}
            disabled={disabled}
            onClick={() =>
              onChange(
                isSel
                  ? selected.filter((v) => v !== opt.value)
                  : [...selected, opt.value].slice(0, max)
              )
            }
            className={clsx(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              isSel
                ? "border-emerald-600/30 bg-emerald-50 text-emerald-700"
                : "border-black/10 bg-white text-gray-600 hover:bg-stone-50",
              disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
            )}
          >
            {isSel && <Check className="size-3" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
