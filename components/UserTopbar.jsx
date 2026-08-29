"use client";

import BreadcrumbTopbar from "@/components/shared/BreadcrumbTopbar";

const LABELS = {
  "": "داشبورد",
  courses: "دوره‌های مرکز",
  profile: "پروفایل کاربری",
};

export default function UserTopbar() {
  return (
    <BreadcrumbTopbar root={{ label: "داشبورد", href: "/dashboard" }} labels={LABELS} />
  );
}
