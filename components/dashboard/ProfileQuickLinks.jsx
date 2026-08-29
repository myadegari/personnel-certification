"use client";

import { LayoutDashboard, GraduationCap } from "lucide-react";
import QuickLink from "@/components/shared/QuickLink";

// Client wrapper so the lucide icon references stay on the client side —
// server components cannot pass component functions as props.
export default function ProfileQuickLinks() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <QuickLink
        href="/dashboard"
        title="داشبورد"
        desc="نمای کلی دوره‌ها و گواهی‌های شما"
        icon={LayoutDashboard}
      />
      <QuickLink
        href="/dashboard/courses"
        title="دوره‌های مرکز"
        desc="مشاهده و ثبت‌نام در دوره‌های آموزشی"
        icon={GraduationCap}
      />
    </div>
  );
}
