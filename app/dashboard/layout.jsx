// File: app/dashboard/layout.jsx
import UserShell from "@/components/UserShell";

export default function DashboardLayout({ children }) {
  return <UserShell>{children}</UserShell>;
}
