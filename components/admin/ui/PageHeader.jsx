"use client";

import { motion } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motion";

export default function PageHeader({ title, description, actions, breadcrumb }) {
  return (
    <motion.div
      variants={staggerContainer(0.06)}
      initial="hidden"
      animate="show"
      className="mb-6 space-y-2"
    >
      {breadcrumb}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <motion.div variants={fadeUp} className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-balance">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </motion.div>
        {actions && (
          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2">
            {actions}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
