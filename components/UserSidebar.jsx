"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LayoutDashboard, GraduationCap, Settings } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { ROLE_LABELS_FA } from "@/lib/roles";

const HeaderSkeleton = () => (
  <div className="flex items-center gap-4 animate-pulse flex-row-reverse">
    <div className="h-8 w-24 rounded-md bg-gray-200"></div>
    <div className="h-8 w-8 rounded-full bg-gray-200"></div>
  </div>
);
const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-8 w-8 rounded-full bg-gray-200 text-gray-500 p-1"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const UserStatusIndicator = ({ children, state, className }) => {
  return (
    <div className=" relative">
      <div
        className={clsx(
          {
            "bg-yellow-400": state == "NEED_TO_VERIFY",
            "bg-green-500": state == "VERIFIED",
          },
          "w-2 h-2 rounded-full absolute border-4 border-white box-content -right-1 -top-1",
          className
        )}
      ></div>
      {children}
    </div>
  );
};

export function UserSidebar() {
  const { data: userData, isLoading: isUserDataLoading } = useUser();
  const { data: session, status } = useSession();

  const getUserSubtitle = () => {
    if (!session?.user) return "";
    // اگر کاربر سمت خود را وارد کرده باشد، آن را نمایش بده
    if (userData.position) {
      return userData.position;
    }
    // در غیر این صورت، نقش پیش‌فرض را نمایش بده
    return ROLE_LABELS_FA[userData.role] || "کاربر";
  };
  const pathname = usePathname();

  const getLinkClassName = (path) => {
    let isActive;

    if (path === "/dashboard") {
      // Only active if exactly on /admin
      isActive = pathname === "/dashboard";
    } else {
      // Active if exact match or starts with path + '/'
      isActive = pathname === path || pathname.startsWith(path + "/");
    }

    return clsx(
      "py-2 px-4 rounded-md rounded-l-3xl font-bold transition-colors duration-500 ease-in-out flex gap-2 items-center",
      isActive
        ? "bg-emerald-500 text-white cursor-auto"
        : "hover:bg-emerald-500/10  text-gray-700 hover:text-gray-900"
    );
  };
  return ( 
    <Sidebar side="right">
      <SidebarHeader>
        <Link href="/" className="text-xl  font-bold self-center  text-emerald-800 ">
          سامانه کارمندان
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="space-y-1">
          <Link href="/dashboard" className={getLinkClassName("/dashboard")}>
            <LayoutDashboard size={25} />
            داشبورد
          </Link>
          <Link
            href="/dashboard/courses"
            className={getLinkClassName("/dashboard/courses")}
          >
            <GraduationCap size={25} />
            دوره های مرکز
          </Link>
          <Link
            href="/dashboard/profile"
            className={getLinkClassName("/dashboard/profile")}
          >
            <Settings size={25} />
            پروفایل کاربری
          </Link>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-4 flex-col">
          <h2 className="text-xs font-bold text-gray-400">پنل کاربری</h2>
          {/* مهم: مدیریت وضعیت‌ها برای جلوگیری از پرش
                      1. status === 'loading': نمایش اسکلت
                      2. status === 'authenticated': نمایش اطلاعات کاربر
                      3. status === 'unauthenticated': چیزی نمایش داده نمی‌شود
                    */}
          {status === "loading" && <HeaderSkeleton />}

          {status === "authenticated" && !isUserDataLoading && (
            <>
              <div className="flex flex-row-reverse items-center gap-4">
                <div className="text-xs text-right">
                  <div className="font-semibold">{`${userData.firstName} ${userData.lastName}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {getUserSubtitle()}
                  </div>
                </div>

                <UserStatusIndicator state={userData.status}>
                  <UserIcon />
                </UserStatusIndicator>
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="cursor-pointer rounded- w-10/12 px-8 hover:bg-red-700"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" /> خروج از سامانه
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
