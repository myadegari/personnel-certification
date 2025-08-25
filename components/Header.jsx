'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from './ui/button';

// --- کامپوننت برای حالت بارگذاری (اسکلت) ---
const HeaderSkeleton = () => (
  <div className="flex items-center gap-4 animate-pulse">
    <div className="h-8 w-24 rounded-md bg-gray-200"></div>
    <div className="h-8 w-8 rounded-full bg-gray-200"></div>
  </div>
);

// --- کامپوننت برای آیکون کاربر پیش‌فرض ---
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 rounded-full bg-gray-200 text-gray-500 p-1">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

export default function Header() {
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

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">
          سامانه کارمندان
        </Link>
        <div className="flex items-center gap-4 ">
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
              
              <Button variant="destructive" size="sm" className='cursor-pointer rounded-full px-5 hover:bg-red-700' onClick={() => signOut()}>خروج</Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
