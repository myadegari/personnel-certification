'use client';
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChangePasswordForm() {
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    const res = await fetch('/api/profile/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwords),
    });
    const data = await res.json();
    setMessage(data.message);
    setIsLoading(false);
    if (res.ok) setPasswords({ currentPassword: '', newPassword: '' });
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
          <Button type="submit" disabled={isLoading}>{isLoading ? 'در حال تغییر...' : 'تغییر رمز'}</Button>
          {message && <p className={`text-sm mt-2 ${message.includes('موفقیت') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}