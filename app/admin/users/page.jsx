import UserManagementClient from "@/components/admin/UserManagementClient";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
// import {internalAxios} from '@/lib/axios';
import axios from "axios";
import { headers } from "next/headers";

// Helper function to fetch data on the server
const NEXTJS_APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
async function getUsers(page = 1, limit = 10) {
  const cookie_h = await headers();
  const cookie = cookie_h.get('cookie')
  try {
    const { data } = await axios.get(`/api/admin/users?page=${page}&limit=${limit}`, {
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
