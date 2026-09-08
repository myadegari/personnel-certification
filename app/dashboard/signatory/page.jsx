"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { internalAxios } from "@/lib/axios";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { toShamsi, toPersianDigits } from "@/lib/persian-date";
import { Badge } from "@/components/ui/badge";
import { BADGE_TONES } from "@/lib/statusLabels";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import SectionCard from "@/components/admin/ui/SectionCard";
import {
  AlertTriangle,
  FileCheck as FileCheck2,
  PenWriting,
  Layers,
  Search,
  ChevronRight,
  ChevronLeft,
} from "reicon-react";

const ROLE_LABEL = {
  primary: "امضاکننده اول",
  secondary: "امضاکننده دوم",
  both: "امضای اول و دوم",
};

function SignatoryCourseCard({ course }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/80 px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" title={course.name}>{course.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge className={BADGE_TONES.green}>{ROLE_LABEL[course.role] || "امضاکننده"}</Badge>
          {course.organizingUnit && <span className="truncate">{course.organizingUnit}</span>}
        </div>
      </div>
      <Badge className={`${BADGE_TONES.blue} shrink-0`} aria-label="تعداد گواهی صادر شده">
        {toPersianDigits(String(course.stats?.issued || 0))} گواهی
      </Badge>
      <Button asChild variant="ghost" size="sm" className="shrink-0 cursor-pointer text-emerald-700">
        <Link href={`/dashboard/signatory/certificates?course=${course._id}`}>
          <FileCheck2 className="size-4" /> گواهی‌ها
        </Link>
      </Button>
    </motion.div>
  );
}

export default function SignatoryCoursesPage() {
  const [yearFilter, setYearFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["signatoryCourses"],
    queryFn: async () => (await internalAxios.get("/dashboard/signatory")).data,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="دوره‌های امضا" description="در حال بارگذاری..." />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertTriangle className="size-8 text-rose-500" />
        <p className="text-sm text-muted-foreground">خطا در بارگذاری دوره‌ها.</p>
        <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => refetch()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  const courses = data?.courses || [];
  const totalCourses = courses.length;
  const totalIssued = courses.reduce((s, c) => s + (c.stats?.issued || 0), 0);

  const PER_PAGE = 6;
  const courseYearOf = (c) => toShamsi(new Date(c.date * 1000)).year;
  const yearOptions = [...new Set(courses.map(courseYearOf))].sort((a, b) => b - a);
  const filtered = courses.filter((c) => {
    if (yearFilter !== "all" && courseYearOf(c) !== Number(yearFilter)) return false;
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="دوره‌های امضا"
        description="دوره‌هایی که به‌عنوان امضاکننده در آن‌ها انتخاب شده‌اید"
      />

      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2"
      >
        <StatCard title="دوره‌ها" value={totalCourses} icon={Layers} accent="emerald" />
        <StatCard title="گواهی‌های صادر شده" value={totalIssued} icon={FileCheck2} accent="rose" />
      </motion.div>

      {courses.length > 0 ? (
        <SectionCard title="فهرست دوره‌ها" description="دوره‌هایی که امضا می‌کنید">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 cursor-pointer">
                <SelectValue placeholder="همه سال‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه سال‌ها</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>سال {toPersianDigits(String(y))}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative min-w-56 flex-1 max-w-xs">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="جستجو بر اساس نام دوره"
                aria-label="جستجو بر اساس نام دوره"
                className="pr-9"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">دوره‌ای با این فیلترها یافت نشد.</p>
          ) : (
            <motion.div
              key={visible.map((c) => String(c._id)).join("|")}
              variants={staggerContainer(0.05)}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-3"
            >
              {visible.map((course) => (
                <SignatoryCourseCard key={course._id} course={course} />
              ))}
            </motion.div>
          )}

          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                صفحه {toPersianDigits(String(safePage))} از {toPersianDigits(String(pageCount))} — {toPersianDigits(String(filtered.length))} دوره
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="cursor-pointer" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="صفحه قبل">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="cursor-pointer" disabled={safePage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} aria-label="صفحه بعد">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SectionCard>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <PenWriting className="size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">شما فعلاً امضاکننده هیچ دوره‌ای نیستید.</p>
        </div>
      )}
    </div>
  );
}
