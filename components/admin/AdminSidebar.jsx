'use client'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
  } from "@/components/ui/sidebar"
  import { LogOut } from "lucide-react";
  import { useSession, signOut } from 'next-auth/react';
  import Link from 'next/link';
  import { Button } from '@/components/ui/button';
  import { usePathname } from 'next/navigation';
  import { clsx } from "clsx";

  const HeaderSkeleton = () => (
    <div className="flex items-center gap-4 animate-pulse flex-row-reverse">
      <div className="h-8 w-24 rounded-md bg-gray-200"></div>
      <div className="h-8 w-8 rounded-full bg-gray-200"></div>
    </div>
  );
  const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 rounded-full bg-gray-200 text-gray-500 p-1">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
  
  export function AdminSidebar() {
    const { data: session, status } = useSession();
    const getUserSubtitle = () => {
     if (!session?.user) return '';
     // اگر کاربر سمت خود را وارد کرده باشد، آن را نمایش بده
     if (session.user.position) {
       return session.user.position;
     }
     // در غیر این صورت، نقش پیش‌فرض را نمایش بده
     return session.user.role === 'ADMIN' ? 'مدیر سیستم' : 'کاربر';
   };
   const pathname = usePathname();

   const getLinkClassName = (path) => { 
    let isActive;
  
  if (path === '/admin') {
    // Only active if exactly on /admin
    isActive = pathname === '/admin';
  } else {
    // Active if exact match or starts with path + '/'
    isActive = pathname === path || pathname.startsWith(path + '/');
  }
    
    return clsx('py-2 px-4 rounded-md transition-colors', isActive ? 'bg-blue-600 text-white cursor-auto' : 'bg-slate-100 hover:bg-slate-200 duration-200 text-gray-700 hover:text-gray-900'); };
    return (
      <Sidebar side="right">
        <SidebarHeader>
        <Link href="/" className="text-xl font-bold self-center text-blue-600 ">
          سامانه کارمندان
        </Link>
          
          </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="text-xs space-y-1">
          <Link href="/admin" className={getLinkClassName('/admin')}>
            داشبورد
          </Link>
          <Link 
            href="/admin/courses" 
            className={getLinkClassName('/admin/courses')}
          >
            مدیریت دوره‌ها
          </Link>
          <Link 
            href="/admin/users" 
            className={getLinkClassName('/admin/users')}
          >
            مدیریت کاربران
          </Link>
          </SidebarGroup>
          <SidebarGroup />
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-4 flex-col">
        <h2 className="text-xs font-bold text-gray-400">پنل مدیریت</h2>
                    {/* مهم: مدیریت وضعیت‌ها برای جلوگیری از پرش
                      1. status === 'loading': نمایش اسکلت
                      2. status === 'authenticated': نمایش اطلاعات کاربر
                      3. status === 'unauthenticated': چیزی نمایش داده نمی‌شود
                    */}
                    {status === 'loading' && <HeaderSkeleton />}
          
                    {status === 'authenticated' && (
                      <>
                      <div className='flex flex-row-reverse items-center gap-4'>
          
                        <div className="text-xs text-right">
                          <div className="font-semibold">{session.user.name}</div>
                          <div className="text-xs text-muted-foreground">{getUserSubtitle()}</div>
                        </div>
          
                        {session.user.profileImage ? (
                          <img
                            src={session.user.profileImage}
                            alt="Profile Picture"
                            width={45}
                            height={45}
                            className="rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <UserIcon />
                        )}
                      </div>
                        
                        <Button variant="destructive" size="sm" className='cursor-pointer w-10/12 px-8 hover:bg-red-700' onClick={() => signOut()}>
<LogOut className="h-4 w-4" /> خروج از سامانه
                        </Button>
                      </>
                    )}
                  </div>
  
          </SidebarFooter>
      </Sidebar>
    )
  }