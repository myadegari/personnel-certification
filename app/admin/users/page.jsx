import UserManagementClient from "@/components/admin/UserManagementClient";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

// Helper function to fetch data on the server
async function getUsers(page = 1, limit = 10) {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/users?page=${page}&limit=${limit}`, {
      cache: 'no-store', // Ensure fresh data
    });
    if (!res.ok) return { users: [], pagination: {} };
    return res.json();
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return { users: [], pagination: {} };
  }
}

export default async function UserManagementPage() {
  const initialData = await getUsers();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">مدیریت کاربران</h1>
        <Button asChild variant="outline">
          <Link href="/admin">بازگشت به داشبورد مدیریت</Link>
        </Button>
      </div>
      <UserManagementClient initialData={initialData} />
    </div>
  );
}
