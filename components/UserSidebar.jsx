"use client";
import { Fragment } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogOut, LayoutDashboard, GraduationCap, Settings, Building2, FileCheck2 } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { clsx } from "clsx";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLES, ROLE_LABELS_FA } from "@/lib/roles";
import { staggerContainer, usePrefersReducedMotion } from "@/lib/motion";
import { useUser } from "@/hooks/useUser";
import SidebarNavLink, { isActivePath, initialsOf } from "@/components/shared/SidebarNavLink";
import logo from "@/public/logo.png";
import favIcon from "@/public/fav-icon.png";

export function UserSidebar() {
  const { data: session, status } = useSession();
  const { data: userData } = useUser();
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const reduced = usePrefersReducedMotion();

  const getUserSubtitle = () => {
    if (!userData) return "";
    if (userData.position) return userData.position;
    return ROLE_LABELS_FA[userData.role] || "کاربر";
  };

  const accountStatus = userData?.status || session?.user?.status;

  const items = [
    { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
    { href: "/dashboard/courses", label: "دوره‌های مرکز", icon: GraduationCap },
    { href: "/dashboard/profile", label: "پروفایل کاربری", icon: Settings },
  ];
  // DEPUTY_HEAD gets a dedicated tracking page for their deputy's courses,
  // with issued certificates as a sub-page.
  if (userData?.role === ROLES.DEPUTY_HEAD) {
    items.push({
      href: "/dashboard/deputy",
      label: "معاونت من",
      icon: Building2,
      children: [
        { href: "/dashboard/deputy/certificates", label: "گواهی‌های صادر شده", icon: FileCheck2 },
      ],
    });
  }

  return (
    <Sidebar
      side="right"
      collapsible="icon"
      className="border-l border-border/60 bg-white/70 backdrop-blur-xl"
      style={{ "--sidebar": "transparent" }}
    >
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <Link href="/dashboard" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
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
            <span className="text-[11px] font-medium text-muted-foreground">پنل کاربری</span>
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
            {items.map((item) => {
              const hasChildren = !!item.children?.length;
              // A parent with children is only active on its exact page so the
              // sub-page never lights up two pills (shared layoutId) at once.
              const parentActive = hasChildren
                ? pathname === item.href
                : isActivePath(pathname, item.href, "/dashboard");
              return (
                <Fragment key={item.href}>
                  <SidebarNavLink
                    href={item.href}
                    icon={item.icon}
                    active={parentActive}
                    collapsed={collapsed}
                  >
                    {item.label}
                  </SidebarNavLink>
                  {hasChildren && !collapsed && (
                    <div className="flex flex-col gap-1 border-r border-border pr-3 mr-5">
                      {item.children.map((child) => (
                        <SidebarNavLink
                          key={child.href}
                          href={child.href}
                          icon={child.icon}
                          active={isActivePath(pathname, child.href, "/dashboard")}
                          collapsed={false}
                        >
                          {child.label}
                        </SidebarNavLink>
                      ))}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </motion.div>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
        {status === "loading" ? (
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <Skeleton className="size-10 shrink-0 rounded-xl group-data-[collapsible=icon]:size-8" />
            <Skeleton className="h-8 flex-1 rounded-md group-data-[collapsible=icon]:hidden" />
          </div>
        ) : status === "authenticated" ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/60 p-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <div className="relative shrink-0">
              <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-sm group-data-[collapsible=icon]:size-8">
                {initialsOf(`${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() || session.user.name)}
              </span>
              <span
                role="img"
                aria-label={accountStatus === "VERIFIED" ? "حساب فعال" : "در انتظار تایید"}
                title={accountStatus === "VERIFIED" ? "حساب فعال" : "در انتظار تایید"}
                className={clsx(
                  "absolute -right-1 -top-1 size-3 rounded-full border-4 border-white",
                  accountStatus === "VERIFIED" ? "bg-green-500" : "bg-yellow-400"
                )}
              />
            </div>
            <div className="min-w-0 flex-1 text-right group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold text-foreground">
                {`${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() || session.user.name}
              </div>
              <div className="truncate text-xs text-muted-foreground">{getUserSubtitle()}</div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="خروج از سامانه"
              title="خروج از سامانه"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 group-data-[collapsible=icon]:hidden"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="خروج از سامانه"
              title="خروج از سامانه"
              className="hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 group-data-[collapsible=icon]:flex"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
