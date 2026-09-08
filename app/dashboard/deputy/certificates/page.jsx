"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { internalAxios } from "@/lib/axios";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { Badge } from "@/components/ui/badge";
import { BADGE_TONES } from "@/lib/statusLabels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/admin/ui/PageHeader";
import SectionCard from "@/components/admin/ui/SectionCard";
import { AlertTriangle, Link as ExternalLink, Search, ArrowRight, ChevronRight, ChevronLeft, FileCheck as FileCheck2 } from "reicon-react";
import Link from "next/link";
import { toShamsi, toPersianDigits } from "@/lib/persian-date";

function DeputyCertificatesView() {
  const searchParams = useSearchParams();
  const [courseFilter, setCourseFilter] = useState(searchParams.get("course") || "all");
  const [yearFilter, setYearFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce the search box so typing doesn't hammer the API.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Course/year filter options = union of manageable deputy courses + courses
  // this head signs, matching the certificates API's scope (so a ?course=
  // deep-link to a signed-only course resolves to a real option, not a raw id).
  const { data: dashboard } = useQuery({
    queryKey: ["deputyDashboard"],
    queryFn: async () => (await internalAxios.get("/dashboard/deputy")).data,
  });
  const { data: signatoryData } = useQuery({
    queryKey: ["signatoryCourses"],
    queryFn: async () => (await internalAxios.get("/dashboard/signatory")).data,
  });
  const courses = (() => {
    const map = new Map();
    for (const c of dashboard?.courses || []) map.set(String(c._id), { _id: c._id, name: c.name, date: c.date });
    for (const c of signatoryData?.courses || []) {
      if (!map.has(String(c._id))) map.set(String(c._id), { _id: c._id, name: c.name, date: c.date });
    }
    return [...map.values()];
  })();
  const yearOptions = [...new Set(courses.map((c) => toShamsi(new Date(c.date * 1000)).year))]
    .sort((a, b) => b - a);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["deputyCertificates", { courseFilter, yearFilter, search, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (courseFilter !== "all") params.set("courseId", courseFilter);
      if (yearFilter !== "all") params.set("year", yearFilter);
      if (search) params.set("q", search);
      return (await internalAxios.get(`/dashboard/deputy/certificates?${params.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });

  const certificates = data?.certificates || [];
  const { total = 0, pageCount = 1 } = data?.pagination || {};

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertTriangle className="size-8 text-rose-500" />
        <p className="text-sm text-muted-foreground">خطا در بارگذاری گواهی‌ها.</p>
        <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => refetch()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="گواهی‌های صادر شده"
        description="گواهی‌های صادر شده برای دوره‌هایی که مدیریت یا امضا می‌کنید"
        actions={
          <Button asChild variant="outline" className="cursor-pointer">
            <Link href="/dashboard/deputy">
              <ArrowRight className="h-4 w-4" /> بازگشت به معاونت
            </Link>
          </Button>
        }
      />

      <SectionCard title="فهرست گواهی‌ها" description={`${total} گواهی`}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select value={courseFilter} onValueChange={resetPage(setCourseFilter)}>
            <SelectTrigger className="w-52 cursor-pointer">
              <SelectValue placeholder="همه دوره‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دوره‌ها</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={resetPage(setYearFilter)}>
            <SelectTrigger className="w-40 cursor-pointer">
              <SelectValue placeholder="همه سال‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه سال‌ها</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>سال {y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative min-w-56 flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="جستجو بر اساس نام یا کد ملی"
              aria-label="جستجو بر اساس نام یا کد ملی"
              className="pr-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : certificates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileCheck2 className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {courses.length === 0
                ? "دوره‌ای برای این معاونت ثبت نشده است."
                : "گواهی‌ای با این فیلترها یافت نشد."}
            </p>
          </div>
        ) : (
          <>
            <motion.div
              key={certificates.map((c) => String(c.enrollmentId || c.guestId)).join("|")}
              variants={staggerContainer(0.04)}
              initial="hidden"
              animate="show"
              className={isFetching ? "pointer-events-none opacity-60" : ""}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-bold text-muted-foreground">کاربر</th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-muted-foreground">کد ملی</th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-muted-foreground">دوره</th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-muted-foreground">شماره گواهی</th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-muted-foreground">تاریخ صدور</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-muted-foreground">مشاهده</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((cert) => (
                      <motion.tr
                        key={cert.enrollmentId || cert.guestId}
                        variants={fadeUp}
                        className="border-b transition-colors hover:bg-emerald-50/40"
                      >
                        <td className="px-3 py-2 text-sm">
                          {cert.fullName || "—"}
                          {cert.isGuest && (
                            <Badge className={`${BADGE_TONES.blue} ms-2`} aria-label="گواهی مهمان">مهمان</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm font-mono text-right" dir="ltr">{cert.nationalId || "—"}</td>
                        <td className="px-3 py-2 text-sm">{cert.courseName || "—"}</td>
                        <td className="px-3 py-2 text-sm font-mono text-right" dir="ltr">{cert.certificateUniqueId || "—"}</td>
                        <td className="px-3 py-2 text-sm">{cert.issuedAt || "—"}</td>
                        <td className="px-3 py-2 text-center">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                            <a href={cert.certificateUrl || "#"} target="_blank" rel="noopener noreferrer" aria-label="مشاهده گواهی">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {pageCount > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  صفحه {toPersianDigits(String(page))} از {toPersianDigits(String(pageCount))} — {toPersianDigits(String(total))} گواهی
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="cursor-pointer"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="صفحه قبل"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="cursor-pointer"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="صفحه بعد"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}

export default function DeputyCertificatesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <PageHeader title="گواهی‌های صادر شده" description="در حال بارگذاری..." />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      }
    >
      <DeputyCertificatesView />
    </Suspense>
  );
}
