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
  import { LayoutDashboard,GraduationCap,Settings } from "lucide-react";
  import { useUser } from '@/hooks/useUser';
  import axios from 'axios'; // ✅ Make sure you import axios
  import { useEffect, useState } from 'react'; // ✅ Add these


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
  
  export  function UserSidebar() {
    const { data: session, status } = useSession();
    const { data: userData, isLoading: isUserDataLoading } = useUser();
      // ✅ Add state for profile image URL
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
 // ✅ Fetch image URL when userData or session changes
 useEffect(() => {
  const fetchProfileImage = async () => {
    setIsLoadingImage(true);

    // Priority: userData.profileImage > session.user.profileImage
    const fileId = userData?.profileImage?._id || session?.user?.profileImage;

    if (!fileId) {
      setProfileImageUrl(null);
      setIsLoadingImage(false);
      return;
    }

    try {
      const response = await axios.get(`/api/file/${fileId}`); // ✅ Use GET, not POST
      setProfileImageUrl(response.data.url);
    } catch (error) {
      console.error("Failed to fetch profile image URL:", error);
      setProfileImageUrl(null);
    } finally {
      setIsLoadingImage(false);
    }
  };

  if (status === 'authenticated' && !isUserDataLoading) {
    fetchProfileImage();
  }
}, [userData, session, status, isUserDataLoading]);

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
  
  if (path === '/dashboard') {
    // Only active if exactly on /admin
    isActive = pathname === '/dashboard';
  } else {
    // Active if exact match or starts with path + '/'
    isActive = pathname === path || pathname.startsWith(path + '/');
  }
    
    return clsx('py-2 px-4 rounded-md transition-colors flex gap-2 items-center', isActive ? 'bg-blue-600 text-white cursor-auto' : 'bg-slate-100 hover:bg-slate-200 duration-200 text-gray-700 hover:text-gray-900'); };
    return (
      <Sidebar side="right">
        <SidebarHeader>
        <Link href="/" className="text-xl font-bold self-center text-blue-600 ">
          سامانه کارمندان
        </Link>
          
          </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="space-y-1">
          <Link href="/dashboard" className={getLinkClassName('/dashboard')}>
          <LayoutDashboard size={25}/>
            داشبورد
          </Link>
          <Link 
            href="/dashboard/courses" 
            className={getLinkClassName('/dashboard/courses')}
          >
          <GraduationCap size={25}/>

            دوره های مرکز
          </Link>
          <Link 
            href="/dashboard/profile" 
            className={getLinkClassName('/dashboard/profile')}
          >
            <Settings size={25}/>
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
                    {status === 'loading' && <HeaderSkeleton />}
          
                    {status === 'authenticated' && !isUserDataLoading && (
                      <>
                      <div className='flex flex-row-reverse items-center gap-4'>
          
                        <div className="text-xs text-right">
                          <div className="font-semibold">{session.user.name}</div>
                          <div className="text-xs text-muted-foreground">{getUserSubtitle()}</div>
                        </div>
          
                        {isLoadingImage ? (
                  <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
                ) : profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile Picture"
                    width={45}
                    height={45}
                    className="rounded-full object-cover border-2 border-gray-200"
                    onError={() => setProfileImageUrl(null)} // fallback if image fails
                  />
                ) : (
                  <UserIcon />
                )}
              </div>
                        
                        <Button variant="destructive" size="sm" className='cursor-pointer rounded- w-10/12 px-8 hover:bg-red-700' onClick={() => signOut()}>
<LogOut className="h-4 w-4" /> خروج از سامانه
                        </Button>
                      </>
                    )}
                  </div>
  
          </SidebarFooter>
      </Sidebar>
    )
  }