"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { Scroll as ScrollText, UserCheck, ShieldCheck, FileText } from "reicon-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import TablePager from "@/components/shared/TablePager";
import {
  AUDIT_ACTION_LABELS_FA,
  AUDIT_RESOURCE_LABELS_FA,
} from "@/lib/auditConstants";

const RESOURCE_TYPE_OPTIONS = Object.entries(AUDIT_RESOURCE_LABELS_FA).map(
  ([value, label]) => ({ value, label })
);

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

const fetchAuditLogs = async ({ queryKey }) => {
  const [, { page, limit, action, resourceType }] = queryKey;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (action) params.set("action", action);
  if (resourceType) params.set("resourceType", resourceType);
  const { data } = await internalAxios.get(`/admin/audit-logs?${params.toString()}`);
  return data;
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["auditLogs", { page, limit, action, resourceType }],
    queryFn: fetchAuditLogs,
    placeholderData: keepPreviousData,
  });

  const logs = data?.logs ?? [];
  const pageCount = data?.pagination?.pageCount ?? 1;

  const onFilterChange = (setter) => (value) => {
    setter(value === "all" ? "" : value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="گزارش فعالیت‌ها"
        description="ردپای کامل اقدامات کاربران و مدیران برای بازبینی و اشکال‌زدایی."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={action || "all"} onValueChange={onFilterChange(setAction)}>
          <SelectTrigger className="w-56 cursor-pointer" aria-label="فیلتر نوع فعالیت">
            <SelectValue placeholder="همه فعالیت‌ها" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه فعالیت‌ها</SelectItem>
            {(data?.actions ?? []).map((a) => (
              <SelectItem key={a} value={a}>
                {AUDIT_ACTION_LABELS_FA[a] || a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={resourceType || "all"}
          onValueChange={onFilterChange(setResourceType)}
        >
          <SelectTrigger className="w-44 cursor-pointer" aria-label="فیلتر موضوع">
            <SelectValue placeholder="همه موارد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه موارد</SelectItem>
            {RESOURCE_TYPE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : logs.length ? (
          <motion.ol
            variants={staggerContainer(0.04)}
            initial="hidden"
            animate="show"
            className="relative space-y-1 border-r-2 border-dashed border-black/10 pr-6"
          >
            {logs.map((log) => {
              const isImpersonation = log.action?.startsWith("IMPERSONATE");
              const isSecurity = ["LOGIN", "LOGOUT", "PASSWORD_CHANGE", "PASSWORD_RESET", "PASSWORD_RESET_REQUEST"].includes(log.action);
              const dotClass = isImpersonation
                ? "bg-amber-500 text-white"
                : isSecurity
                  ? "bg-sky-500 text-white"
                  : "bg-emerald-500 text-white";
              return (
                <motion.li key={log._id} variants={fadeUp} className="relative pb-4">
                  <span
                    className={`absolute -right-[31px] top-1 flex size-6 items-center justify-center rounded-full ring-4 ring-white ${dotClass}`}
                  >
                    {isImpersonation ? (
                      <ShieldCheck className="size-3.5" />
                    ) : isSecurity ? (
                      <UserCheck className="size-3.5" />
                    ) : (
                      <FileText className="size-3.5" />
                    )}
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-black/[0.03]">
                    <div className="text-sm">
                      <span className="font-medium">{log.actorName || "سیستم"}</span>
                      {" "}
                      {log.actorRole && (
                        <span className="text-muted-foreground">({log.actorRole})</span>
                      )}
                      {" "}
                      <span className="font-semibold text-emerald-800">
                        {AUDIT_ACTION_LABELS_FA[log.action] || log.action}
                      </span>
                      {log.resourceType && (
                        <span className="text-muted-foreground">
                          {" "}— {AUDIT_RESOURCE_LABELS_FA[log.resourceType] || log.resourceType}
                        </span>
                      )}
                      {log.resourceId && (
                        <span dir="ltr" className="ms-1 inline-block max-w-40 truncate align-bottom text-xs text-muted-foreground">
                          {log.resourceId}
                        </span>
                      )}
                      {log.metadata?.targetName && (
                        <span className="text-muted-foreground"> → {log.metadata.targetName}</span>
                      )}
                      {log.metadata?.courseName && (
                        <span className="text-muted-foreground"> → {log.metadata.courseName}</span>
                      )}
                      {typeof log.metadata?.status === "string" && (
                        <span className="text-muted-foreground"> ({log.metadata.status})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {log.ip && (
                        <span dir="ltr" className="tabular-nums">{log.ip}</span>
                      )}
                      <span>{formatDateTime(log.createdAt)}</span>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <ScrollText className="size-8 opacity-50" />
            <p className="text-sm">رویدادی ثبت نشده است.</p>
          </div>
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
