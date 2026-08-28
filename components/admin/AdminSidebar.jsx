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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogOut, Users, LayoutDashboard, Layers, ShieldCheck, GraduationCap } from "lucide-react";
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from "motion/react";
import { ROLE_LABELS_FA, isSuperAdmin } from "@/lib/roles";
import { fadeUp, staggerContainer, usePrefersReducedMotion } from "@/lib/motion";

function isActivePath(pathname, path) {
  if (path === '/admin') return pathname === '/admin';
  return pathname === path || pathname.startsWith(path + '/');
}

function NavLink({ href, icon: Icon, children, active, collapsed }) {
  return (
    <motion.div variants={fadeUp} className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className="group/nav relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-bold transition-colors duration-300 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            {active && (
              <motion.span
                layoutId="activeNavPill"
                className="absolute inset-0 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 flex items-center gap-3 transition-transform duration-300 group-hover/nav:translate-x-[-2px] ${
                active ? "text-white" : "text-gray-600 group-hover/nav:text-gray-900"
              }`}
            >
              <Icon size={20} className="shrink-0" />
              <span className="truncate group-data-[collapsible=icon]:hidden">{children}</span>
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="left" hidden={!collapsed}>
          {children}
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

function initialsOf(name) {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "؟";
  return parts.slice(0, 2).map((p) => p[0]).join("");
}

export function AdminSidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const reduced = usePrefersReducedMotion();

  const getUserSubtitle = () => {
    if (!session?.user) return '';
    if (session.user.position) return session.user.position;
    return ROLE_LABELS_FA[session.user.role] || 'کاربر';
  };

  const items = [
    { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
    { href: "/admin/courses", label: "مدیریت دوره‌ها", icon: Layers },
    { href: "/admin/users", label: "مدیریت کاربران", icon: Users },
  ];
  if (isSuperAdmin(session?.user?.role)) {
    items.push({ href: "/admin/impersonation-logs", label: "گزارش ورود به حساب‌ها", icon: ShieldCheck });
  }

  return (
    <Sidebar
      side="right"
      collapsible="icon"
      className="border-l border-black/5 bg-white/70 backdrop-blur-xl"
      style={{ "--sidebar": "transparent" }}
    >
      <SidebarHeader className="p-4">
        <Link href="/admin" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/30">
            <GraduationCap size={22} />
          </span>
          <span className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-base font-extrabold text-emerald-800">سامانه کارمندان</span>
            <span className="text-[11px] font-medium text-muted-foreground">پنل مدیریت</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] font-bold text-gray-400">ناوبری</SidebarGroupLabel>
          <motion.div
            variants={staggerContainer(0.06)}
            initial={reduced ? false : "hidden"}
            animate={reduced ? false : "show"}
            className="flex flex-col gap-1"
          >
            {items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                active={isActivePath(pathname, item.href)}
                collapsed={collapsed}
              >
                {item.label}
              </NavLink>
            ))}
          </motion.div>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>

      <SidebarFooter className="p-3">
        {status === 'loading' ? (
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <div className="size-10 shrink-0 animate-pulse rounded-xl bg-gray-200" />
            <div className="h-8 flex-1 animate-pulse rounded-md bg-gray-200 group-data-[collapsible=icon]:hidden" />
          </div>
        ) : status === 'authenticated' ? (
          <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/60 p-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-sm">
              {initialsOf(session.user.name)}
            </span>
            <div className="min-w-0 flex-1 text-right group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold text-gray-800">{session.user.name}</div>
              <div className="truncate text-xs text-muted-foreground">{getUserSubtitle()}</div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              title="خروج از سامانه"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-600 group-data-[collapsible=icon]:hidden"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              title="خروج از سامانه"
              className="hidden size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-600 group-data-[collapsible=icon]:flex"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
