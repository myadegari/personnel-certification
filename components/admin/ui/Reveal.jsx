"use client";

import { motion } from "motion/react";
import { fadeUp, staggerContainer, usePrefersReducedMotion } from "@/lib/motion";

export default function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  once = true,
  amount = 0.2,
  ...props
}) {
  const reduced = usePrefersReducedMotion();
  const MotionTag = motion[as] || motion.div;

  if (reduced) {
    const Tag = as;
    return (
      <Tag className={className} {...props}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      transition={{ delay }}
      {...props}
    >
      {children}
    </MotionTag>
  );
}

export function RevealGroup({ children, className, stagger = 0.08, ...props }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={staggerContainer(stagger)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
