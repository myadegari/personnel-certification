"use client";

import { motion } from "motion/react";
import { fadeUp, spring } from "@/lib/motion";
import AnimatedCounter from "./AnimatedCounter";
import { clsx } from "clsx";

const ACCENTS = {
  emerald: "from-emerald-500/15 to-emerald-500/0 text-emerald-600 ring-emerald-500/20",
  amber: "from-amber-500/15 to-amber-500/0 text-amber-600 ring-amber-500/20",
  sky: "from-sky-500/15 to-sky-500/0 text-sky-600 ring-sky-500/20",
  violet: "from-violet-500/15 to-violet-500/0 text-violet-600 ring-violet-500/20",
  rose: "from-rose-500/15 to-rose-500/0 text-rose-600 ring-rose-500/20",
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  accent = "emerald",
  format,
  sparkline,
  className,
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={spring}
      className={clsx(
        "group relative overflow-hidden rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm",
        className
      )}
    >
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70 transition-opacity group-hover:opacity-100",
          ACCENTS[accent] || ACCENTS.emerald
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">
            <AnimatedCounter value={value} format={format} />
          </p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div
            className={clsx(
              "flex size-11 items-center justify-center rounded-2xl bg-white/70 ring-1",
              ACCENTS[accent] || ACCENTS.emerald
            )}
          >
            <Icon className="size-5" />
          </div>
        )}
      </div>
      {sparkline && <div className="relative mt-4">{sparkline}</div>}
    </motion.div>
  );
}
