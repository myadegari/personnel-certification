"use client";
import React from "react";
import { motion } from "motion/react";
import { Clock3 } from "reicon-react";
import { fadeUp, spring } from "@/lib/motion";
import AnimatedCounter from "@/components/admin/ui/AnimatedCounter";
import { PersianYearPicker } from "@/components/admin/PersianDatePicker";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toShamsi, fromShamsi } from "@/lib/persian-date";

const getBaseUrl = () => {
  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_URL || "http://localhost:3000";
  }
  return "";
};

async function getAnnualHours(startTimestamp, endTimestamp) {
  try {
    const response = await fetch(
      `${getBaseUrl()}/api/dashboard/stats?startTimestamp=${startTimestamp}&endTimestamp=${endTimestamp}`
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch annual hours:", error);
    return null;
  }
}

function AnnualHours({ year, onYearChange }) {
  const [loading, setLoading] = React.useState(true);
  const [annualHours, setAnnualHours] = React.useState(0);
  const [error, setError] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  // The dashboard owns the selected year (it also filters the certificates
  // table). When cleared (null = "همه"), this card still shows the
  // current-year hours.
  const displayYear = year ?? toShamsi(new Date()).year;

  const getJalaliYearTimestamps = (jalaliYear) => {
    const start = fromShamsi({ year: jalaliYear, month: 1, day: 1 });
    const end = fromShamsi({ year: jalaliYear + 1, month: 1, day: 1 });
    return {
      startTimestamp: start.getTime() / 1000,
      endTimestamp: end.getTime() / 1000,
    };
  };

  React.useEffect(() => {
    let active = true;
    async function fetchData() {
      const { startTimestamp, endTimestamp } = getJalaliYearTimestamps(displayYear);
      const data = await getAnnualHours(startTimestamp, endTimestamp);
      if (active && data) setAnnualHours(data.annualHours);
      if (active) {
        setError(!data);
        setLoading(false);
      }
    }
    fetchData();
    return () => {
      active = false;
    };
  }, [displayYear, attempt]);

  const retryFetch = () => {
    setError(false);
    setLoading(true);
    setAttempt((a) => a + 1);
  };

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={spring}
      className="group relative overflow-hidden rounded-3xl border border-border/60 bg-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/15 to-sky-500/0 opacity-70 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">ساعات آموزشی سالانه</p>
          {error && !loading ? (
            <div className="flex items-center gap-2 py-1.5">
              <p className="text-sm text-muted-foreground">خطا در دریافت ساعت سالانه</p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 cursor-pointer px-2 text-xs"
                onClick={retryFetch}
              >
                تلاش مجدد
              </Button>
            </div>
          ) : (
            <div className="text-3xl font-bold tracking-tight text-sky-700">
              {loading ? (
                <Skeleton className="inline-block h-8 w-16" />
              ) : (
                <AnimatedCounter value={annualHours} />
              )}
              <span className="ms-1 text-base font-semibold text-sky-600/80">ساعت</span>
            </div>
          )}
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white/70 text-sky-600 ring-1 ring-sky-500/20">
          <Clock3 className="size-5" />
        </div>
      </div>
      <div className="relative mt-4 flex justify-start">
        <PersianYearPicker year={displayYear} onYearChange={(y) => onYearChange?.(y)} />
      </div>
    </motion.div>
  );
}

export default AnnualHours;
