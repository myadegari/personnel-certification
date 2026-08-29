"use client";

import AppShell from "@/components/shared/AppShell";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";

export default function AdminShell({ children }) {
  return (
    <AppShell sidebar={<AdminSidebar />} topbar={<AdminTopbar />}>
      {children}
    </AppShell>
  );
}
