"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fadeUp } from "@/lib/motion";
import { toPersianDigits } from "@/lib/persian-date";

/** Initials (max 2 letters) for avatar fallbacks. */
export function initialsOf(name) {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "؟";
  return parts.slice(0, 2).map((p) => p[0]).join("");
}

export function isActivePath(pathname, path, rootPath) {
  if (path === rootPath) return pathname === rootPath;
  return pathname === path || pathname.startsWith(path + "/");
}

/**
 * Sidebar nav item with the animated active pill and a tooltip that only
 * shows when the sidebar is collapsed to its icon rail.
 */
export default function SidebarNavLink({
  href,
  icon: Icon,
  children,
  active,
  collapsed,
  badge = 0,
}) {
  return (
    <motion.div variants={fadeUp} className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className="group/nav relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-bold transition-colors duration-300 hover:bg-muted group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:hover:bg-transparent"
          >
            {active && (
              <motion.span
                layoutId="activeNavPill"
                className="absolute inset-0 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 flex items-center gap-3 transition-transform duration-300 group-hover/nav:translate-x-[-2px] ${
                active ? "text-white" : "text-muted-foreground group-hover/nav:text-foreground"
              }`}
            >
              <span className="relative shrink-0">
                <Icon size={20} />
                {badge > 0 && (
                  <span className="absolute -end-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                    {toPersianDigits(String(badge > 99 ? "99+" : String(badge)))}
                  </span>
                )}
              </span>
              <span className="truncate group-data-[collapsible=icon]:hidden">{children}</span>
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="left" hidden={!collapsed}>
          {children}
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}
