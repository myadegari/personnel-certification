"use client";

import { useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AuroraBackground from "@/components/admin/AuroraBackground";
import ImpersonationBanner from "@/components/ImpersonationBanner";

/**
 * Shared app chrome: sidebar + aurora glass content surface with a sticky
 * topbar and its own scroll container. The admin and user areas only differ
 * in which sidebar/topbar they pass in.
 */
export default function AppShell({ sidebar, topbar, children }) {
  const scrollRef = useRef(null);

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      {sidebar}
      <SidebarInset className="h-svh overflow-hidden">
        <AuroraBackground container={scrollRef} />
        <div className="z-40 shrink-0">
          <ImpersonationBanner />
          {topbar}
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
