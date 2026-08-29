"use client";

import AppShell from "@/components/shared/AppShell";
import { UserSidebar } from "@/components/UserSidebar";
import UserTopbar from "@/components/UserTopbar";

export default function UserShell({ children }) {
  return (
    <AppShell sidebar={<UserSidebar />} topbar={<UserTopbar />}>
      {children}
    </AppShell>
  );
}
