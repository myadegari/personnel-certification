'use client';
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from '@tanstack/react-query';
import axios from '@/lib/axios';

const changePassword = async (passwords) => {
  const { data } = await axios.post('/profile/change-password', passwords);
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
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
            <Input id="currentPassword" name="currentPassword" type="password" value={passwords.currentPassword} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="newPassword">رمز عبور جدید</Label>
            <Input id="newPassword" name="newPassword" type="password" value={passwords.newPassword} onChange={handleChange} />
          </div>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'در حال تغییر...' : 'تغییر رمز'}</Button>
          {message && <p className={`text-sm mt-2 ${message.includes('موفقیت') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}