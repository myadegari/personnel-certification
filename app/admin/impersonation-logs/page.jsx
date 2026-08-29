"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { BADGE_TONES } from "@/lib/statusLabels";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { LogIn, LogOut } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import TablePager from "@/components/shared/TablePager";
import { ROLE_LABELS_FA } from "@/lib/roles";

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ImpersonationLogsPage() {
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["impersonationLogs", { page, limit }],
    queryFn: async () => {
      const { data } = await internalAxios.get(`/admin/impersonation-logs?page=${page}&limit=${limit}`);
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const logs = data?.logs ?? [];
  const pageCount = data?.pagination?.pageCount ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader
        title="گزارش ورود به حساب‌ها"
        description="رویدادهای ورود مدیران به حساب کاربران برای بازبینی و ممیزی."
      />

      <div className="rounded-2xl border border-black/5 bg-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl shimmer" />
            ))}
          </div>
        ) : logs.length ? (
          <motion.ol
            variants={staggerContainer(0.05)}
            initial="hidden"
            animate="show"
            className="relative space-y-1 border-r-2 border-dashed border-black/10 pr-6"
          >
            {logs.map((log) => (
              <motion.li key={log._id} variants={fadeUp} className="relative pb-4">
                <span
                  className={
                    "absolute -right-[31px] top-1 flex size-6 items-center justify-center rounded-full ring-4 ring-white " +
                    (log.action === "START" ? "bg-amber-500 text-white" : "bg-gray-400 text-white")
                  }
                >
                  {log.action === "START" ? <LogIn className="size-3.5" /> : <LogOut className="size-3.5" />}
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-black/[0.03]">
                  <div className="text-sm">
                    <span className="font-medium">{log.actorName}</span>
                    <span className="text-muted-foreground"> ({ROLE_LABELS_FA[log.actorRole] || "نامشخص"}) </span>
                    {log.action === "START" ? "وارد حساب" : "خروج از حساب"}{" "}
                    <span className="font-medium">{log.targetName}</span>
                    <span className="text-muted-foreground"> ({ROLE_LABELS_FA[log.targetRole] || "نامشخص"})</span> شد
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={log.action === "START" ? BADGE_TONES.amber : BADGE_TONES.gray}>
                      {log.action === "START" ? "ورود" : "خروج"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">رویدادی ثبت نشده است.</p>
        )}
      </div>

      <TablePager
        page={page}
        pageCount={pageCount}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(pageCount, p + 1))}
        canPrev={page > 1}
        canNext={page < pageCount}
      />
    </div>
  );
}
