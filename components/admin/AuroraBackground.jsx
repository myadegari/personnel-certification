"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion";

export default function AuroraBackground({ container }) {
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ container });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 120]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -120]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-stone-50">
      <motion.div
        style={{ y: y1 }}
        className="absolute -top-32 right-[-10%] size-[42rem] rounded-full bg-emerald-300/30 blur-3xl animate-float"
      />
      <motion.div
        style={{ y: y2 }}
        className="absolute top-1/3 left-[-15%] size-[38rem] rounded-full bg-amber-200/40 blur-3xl animate-float [animation-delay:-3s]"
      />
      <motion.div
        style={{ y: y1 }}
        className="absolute bottom-[-20%] right-1/4 size-[34rem] rounded-full bg-sky-200/40 blur-3xl animate-float [animation-delay:-5s]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/60" />
    </div>
  );
}
