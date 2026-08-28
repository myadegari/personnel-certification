"use client";

import { useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import AuroraBackground from "@/components/admin/AuroraBackground";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export default function AdminShell({ children }) {
  const scrollRef = useRef(null);

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AdminSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <AuroraBackground container={scrollRef} />
        <div className="z-40 shrink-0">
          <ImpersonationBanner />
          <AdminTopbar />
        </div>
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 lg:p-6"
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
