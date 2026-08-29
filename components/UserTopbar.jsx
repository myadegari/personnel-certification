"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Home } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const LABELS = {
  "": "داشبورد",
  courses: "دوره‌های مرکز",
  profile: "پروفایل کاربری",
};

function buildTrail(pathname) {
  const segments = pathname.split("/").filter(Boolean); // e.g. ["dashboard","courses"]
  const rest = segments.slice(1); // drop "dashboard"
  const crumbs = [{ label: "داشبورد", href: "/dashboard", root: true }];
  let path = "";
  for (const seg of rest) {
    path += `/${seg}`;
    crumbs.push({ label: LABELS[seg] || seg, href: `/dashboard${path}` });
  }
  return crumbs;
}

export default function UserTopbar() {
  const pathname = usePathname();
  const crumbs = buildTrail(pathname);

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-16 items-center gap-3 border-b border-black/5 bg-white/70 px-4 backdrop-blur-xl lg:px-6"
    >
      <SidebarTrigger className="cursor-pointer" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <BreadcrumbItem key={c.href} className="flex items-center gap-1.5">
                {c.root && <Home className="size-3.5 text-muted-foreground" />}
                {last ? (
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={c.href}>{c.label}</Link>
                  </BreadcrumbLink>
                )}
                {!last && <BreadcrumbSeparator />}
              </BreadcrumbItem>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </motion.header>
  );
}
