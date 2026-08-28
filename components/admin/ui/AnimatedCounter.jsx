"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion";

export default function AnimatedCounter({
  value = 0,
  duration = 1.2,
  format = (n) => Math.round(n).toLocaleString("fa-IR"),
  className,
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}
