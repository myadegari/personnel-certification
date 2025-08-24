// File: app/admin/layout.jsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// This is a server component
export default function AdminLayout({ children }) {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <span className="">پنل مدیریت</span>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-4 text-sm font-medium">
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              داشبورد
            </Link>
            <Link
              href="/admin/courses"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              مدیریت دوره‌ها
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              مدیریت کاربران
            </Link>
            {/* لینک مدیریت ثبت‌نام‌ها از اینجا حذف می‌شود چون از داخل هر دوره قابل دسترسی است */}
          </nav>
        </div>
      </aside>
      <main className="flex flex-col p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
