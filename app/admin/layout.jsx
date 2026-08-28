// File: app/admin/layout.jsx
import AdminShell from "@/components/admin/AdminShell";

// This is a server component
export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
