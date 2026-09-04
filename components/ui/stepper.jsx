"use client";

import { Fragment, useId } from "react";
import { motion } from "motion/react";
import { Check } from "reicon-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const spring = { type: "spring", stiffness: 260, damping: 26, mass: 0.6 };

/**
 * Linear, RTL-aware step indicator. Completed steps render a check, the active
 * step gets an animated pill, and (when `onStepClick` is provided) completed
 * steps become buttons so the user can jump back. Forward jumps are never
 * offered. `layoutId` defaults to a per-instance id so multiple steppers on one
 * page don't share the motion pill.
 */
function Stepper({
  steps = [],
  current = 0,
  onStepClick,
  layoutId,
  showProgress = true,
  className,
}) {
  const autoId = useId();
  const pillLayoutId = layoutId ?? `stepper-pill-${autoId}`;

  return (
    <div className={cn("space-y-3", className)}>
      <ol className="flex items-center gap-2" aria-label="مراحل">
        {steps.map((label, i) => {
          const active = current === i;
          const done = current > i;
          const clickable = Boolean(onStepClick) && done;

          const circle = (
            <span
              className={cn(
                "relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-bold",
                active
                  ? "bg-emerald-500 text-white"
                  : done
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-black/5 text-muted-foreground"
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
          );

          const labelSpan = (
            <span
              className={cn(
                "relative z-10 text-sm font-medium",
                active ? "text-emerald-700" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          );

          return (
            <Fragment key={i}>
              <li className="relative" aria-current={active ? "step" : undefined}>
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onStepClick(i)}
                    title="بازگشت به این مرحله"
                    className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {circle}
                    {labelSpan}
                  </button>
                ) : (
                  <div className="relative flex items-center gap-2 rounded-full px-3 py-1.5">
                    {active && (
                      <motion.span
                        layoutId={pillLayoutId}
                        className="absolute inset-0 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30"
                        transition={spring}
                      />
                    )}
                    {circle}
                    {labelSpan}
                  </div>
                )}
              </li>
              {i < steps.length - 1 && (
                <li aria-hidden="true" className="h-px w-6 bg-black/10" />
              )}
            </Fragment>
          );
        })}
      </ol>
      {showProgress && (
        <Progress value={((current + 1) / steps.length) * 100} className="h-1.5" />
      )}
    </div>
  );
}

export { Stepper };
