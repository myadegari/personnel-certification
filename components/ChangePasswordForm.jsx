'use client';
import { useState } from 'react';
import { Card, CardContent,CardHeader,CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from '@tanstack/react-query';
import {internalAxios} from '@/lib/axios';
import PasswordInput from "@/components/comp-23"

const changePassword = async (passwords) => {
  const { data } = await internalAxios.post('/profile/change-password', passwords);
  return data;
};
export default function ChangePasswordForm() {
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  // const [isLoading, setIsLoading] = useState(false);
  
  const handleChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (data) => {
        setMessage(data.message);
        setPasswords({ currentPassword: '', newPassword: '' });
    },
    onError: (error) => setMessage(error.response?.data?.message || 'خطایی رخ داد.'),
});

const handleSubmit = (e) => {
  e.preventDefault();
  mutation.mutate(passwords);
};
  return (
    <Card className="gap-0 h-full">
      <CardHeader>
        <CardTitle>
          تغییر رمز عبور
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 h-full">
        <form onSubmit={handleSubmit} className="space-y-4 [&>div>Label]:mb-2 grid h-full">
          <div>
            <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
            <PasswordInput id="currentPassword" name="currentPassword" value={passwords.currentPassword} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="newPassword">رمز عبور جدید</Label>
            <PasswordInput id="newPassword" name="newPassword" value={passwords.newPassword} onChange={handleChange} />
          </div>
          <Button className="w-full cursor-pointer self-end" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'در حال تغییر...' : 'تغییر رمز'}</Button>
          {message && <p className={`text-sm mt-2 ${message.includes('موفقیت') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}