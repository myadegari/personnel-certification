'use client'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logout as LogOut, Users, Grid as LayoutDashboard, Layers, ImagePlus, Scroll as ScrollText, Building2 } from "reicon-react";
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { internalAxios } from '@/lib/axios';
import Image from "next/image";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from "motion/react";
import { ROLE_LABELS_FA, isSuperAdmin } from "@/lib/roles";
import { staggerContainer, usePrefersReducedMotion } from "@/lib/motion";
import SidebarNavLink, { isActivePath, initialsOf } from "@/components/shared/SidebarNavLink";
import logo from "@/public/logo.png";
import favIcon from "@/public/fav-icon.png";

export function AdminSidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const reduced = usePrefersReducedMotion();

  // Pending offline password-reset requests -> badge on the users nav item.
  const { data: resetCounts } = useQuery({
    queryKey: ["adminResetRequests"],
    queryFn: async () => (await internalAxios.get("/admin/users/reset-requests")).data,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const getUserSubtitle = () => {
    if (!session?.user) return '';
    return ROLE_LABELS_FA[session.user.role] || 'کاربر';
  };

  const items = [
    { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
    { href: "/admin/courses", label: "مدیریت دوره‌ها", icon: Layers },
    { href: "/admin/deputies", label: "معاونت‌ها", icon: Building2 },
    { href: "/admin/users", label: "مدیریت کاربران", icon: Users, badge: resetCounts?.requested || 0 },
    { href: "/admin/media", label: "کتابخانه رسانه", icon: ImagePlus },
  ];
  if (isSuperAdmin(session?.user?.role)) {
    items.push({ href: "/admin/audit-logs", label: "گزارش فعالیت‌ها", icon: ScrollText });
  }

  return (
    <Sidebar
      side="right"
      collapsible="icon"
      className="border-l border-black/5 bg-white/70 backdrop-blur-xl"
      style={{ "--sidebar": "transparent" }}
    >
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <Link href="/admin" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          {/* Expanded: logo wordmark + panel subtitle. Collapsed: square icon. */}
          <Image
            src={logo}
            alt="گواهیار"
            className="h-9 w-auto object-contain group-data-[collapsible=icon]:hidden"
            priority
          />
          <Image
            src={favIcon}
            alt="گواهیار"
            width={32}
            height={32}
            className="hidden size-8 shrink-0 object-contain group-data-[collapsible=icon]:block"
            priority
          />
          <span className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-[11px] font-medium text-muted-foreground">پنل مدیریت</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] font-bold text-muted-foreground">ناوبری</SidebarGroupLabel>
          <motion.div
            variants={staggerContainer(0.06)}
            initial={reduced ? false : "hidden"}
            animate={reduced ? false : "show"}
            className="flex flex-col gap-1"
          >
            {items.map((item) => (
              <SidebarNavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                active={isActivePath(pathname, item.href, "/admin")}
                collapsed={collapsed}
                badge={item.badge}
              >
                {item.label}
              </SidebarNavLink>
            ))}
          </motion.div>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
        {status === 'loading' ? (
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <div className="size-10 shrink-0 animate-pulse rounded-xl bg-muted group-data-[collapsible=icon]:size-8" />
            <div className="h-8 flex-1 animate-pulse rounded-md bg-muted group-data-[collapsible=icon]:hidden" />
          </div>
        ) : status === 'authenticated' ? (
          <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/60 p-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-sm group-data-[collapsible=icon]:size-8">
              {initialsOf(session.user.name)}
            </span>
            <div className="min-w-0 flex-1 text-right group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold text-foreground">{session.user.name}</div>
              <div className="truncate text-xs text-muted-foreground">{getUserSubtitle()}</div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="خروج از سامانه"
              title="خروج از سامانه"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive group-data-[collapsible=icon]:hidden"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="خروج از سامانه"
              title="خروج از سامانه"
              className="hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive group-data-[collapsible=icon]:flex"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
