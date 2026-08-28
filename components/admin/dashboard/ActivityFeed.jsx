"use client";

import { motion } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { UserPlus, GraduationCap } from "lucide-react";

function timeAgo(value) {
  try {
    const diff = Date.now() - new Date(value).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins.toLocaleString("fa-IR")} دقیقه پیش`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
    const days = Math.round(hours / 24);
    return `${days.toLocaleString("fa-IR")} روز پیش`;
  } catch {
    return "";
  }
}

export default function ActivityFeed({ items = [] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">فعالیتی وجود ندارد.</p>;
  }
  return (
    <motion.ul
      variants={staggerContainer(0.06)}
      initial="hidden"
      animate="show"
      className="space-y-1"
    >
      {items.map((item, i) => (
        <motion.li
          key={i}
          variants={fadeUp}
          className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-black/[0.03]"
        >
          <div
            className={
              "flex size-9 shrink-0 items-center justify-center rounded-xl " +
              (item.type === "user"
                ? "bg-sky-500/10 text-sky-600"
                : "bg-emerald-500/10 text-emerald-600")
            }
          >
            {item.type === "user" ? (
              <UserPlus className="size-4" />
            ) : (
              <GraduationCap className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {timeAgo(item.createdAt)}
          </span>
        </motion.li>
      ))}
    </motion.ul>
  );
}
