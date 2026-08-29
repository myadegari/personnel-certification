"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Shared navigation card used at the bottom of dashboard pages.
 */
export default function QuickLink({ href, title, desc, icon: Icon }) {
  return (
    <Link href={href}>
      <div className="group flex items-center justify-between gap-4 rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm transition-shadow hover:shadow-[0_12px_40px_rgb(16,185,129,0.15)]">
        <div className="flex items-center gap-4">
          {Icon && (
            <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <Icon className="size-5" />
            </span>
          )}
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        </div>
        <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-transform group-hover:-translate-x-1">
          <ArrowLeft className="size-5" />
        </div>
      </div>
    </Link>
  );
}
