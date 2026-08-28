"use client";

import { motion } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { clsx } from "clsx";

export default function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}) {
  return (
    <motion.section
      variants={fadeUp}
      className={clsx(
        "rounded-3xl border border-black/5 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm",
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-black/5 px-6 py-4">
          <div>
            {title && <h3 className="font-semibold">{title}</h3>}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={clsx("p-6", bodyClassName)}>{children}</div>
    </motion.section>
  );
}
