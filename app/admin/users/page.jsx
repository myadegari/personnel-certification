import UserManagementClient from "@/components/admin/UserManagementClient";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {internalAxios} from '@/lib/axios';
import { headers } from "next/headers";

// Helper function to fetch data on the server
async function getUsers(page = 1, limit = 10) {
  const cookie = headers().get('cookie');
  try {
    const { data } = await internalAxios.get(`/admin/users?page=${page}&limit=${limit}`, {
        headers: { 'Cookie': cookie }
    });
    return data;
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
        
      </div>
      <UserManagementClient initialData={initialData} />
    </div>
  );
}
