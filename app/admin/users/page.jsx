import UserManagementClient from "@/components/admin/UserManagementClient";
import { headers } from "next/headers";

// Helper function to fetch data on the server
const getBaseUrl = () => {
  // If we are on the server, use the internal Docker URL
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL || 'http://localhost:3000';
  }
  // If on client, use relative path or public URL
  return ''; 
};
const NEXTJS_APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
async function getUsers(page = 1, limit = 10) {
  const cookie_h = await headers();
  const cookie = cookie_h.get('cookie')
  try {
    const res = await fetch(
      `${getBaseUrl()}/api/admin/users?page=${page}&limit=${limit}`,
      { headers: { Cookie: cookie }, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return { users: [], pagination: {} };
  }
}

export default async function UserManagementPage() {
  const initialData = await getUsers();

  return (
    <div>
      <UserManagementClient initialData={initialData} />
    </div>
  );
}
