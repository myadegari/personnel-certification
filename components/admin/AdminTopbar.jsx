"use client";

import BreadcrumbTopbar from "@/components/shared/BreadcrumbTopbar";

const LABELS = {
  "": "داشبورد",
  courses: "دوره‌ها",
  enrollments: "ثبت‌نام‌ها",
  users: "کاربران",
  media: "کتابخانه رسانه",
  "impersonation-logs": "گزارش ورود به حساب‌ها",
};

export default function AdminTopbar() {
  return (
    <BreadcrumbTopbar root={{ label: "داشبورد", href: "/admin" }} labels={LABELS} />
  );
}
