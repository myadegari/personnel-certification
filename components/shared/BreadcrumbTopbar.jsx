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

/**
 * Shared sticky topbar: mobile sidebar trigger + breadcrumb trail built from
 * the current pathname. `labels` maps path segments to Persian titles;
 * unknown segments fall back to "نامشخص" instead of a raw enum value.
 */
export default function BreadcrumbTopbar({ root, labels }) {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const rest = segments.slice(1); // drop the root segment (e.g. "admin")
  const crumbs = [{ label: root.label, href: root.href, root: true }];
  let path = "";
  for (const seg of rest) {
    path += `/${seg}`;
    crumbs.push({ label: labels[seg] || "نامشخص", href: `${root.href}${path}` });
  }

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
