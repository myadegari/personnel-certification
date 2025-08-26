// File: app/admin/layout.jsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/AdminSidebar"

// This is a server component
export default function AdminLayout({ children }) {
  return (
    <SidebarProvider>

      <AdminSidebar />
      <main className="flex flex-col p-4 lg:p-6 w-full">
      <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
