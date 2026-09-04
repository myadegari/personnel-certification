'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import PasswordInput from '@/components/password-input';
import { internalAxios } from '@/lib/axios';
import { gooeyToast } from 'goey-toast';

const MIN_LENGTH = 8;

export default function SetPasswordPage() {
  const router = useRouter();
  const { update } = useSession();
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setPasswords((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < MIN_LENGTH) {
      setError(`رمز عبور جدید باید حداقل ${MIN_LENGTH} کاراکتر باشد.`);
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('رمز عبور جدید و تکرار آن یکسان نیستند.');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await internalAxios.post('/auth/set-new-password', passwords);
      gooeyToast.success(data.message || 'رمز عبور شما تنظیم شد.');
      // Refresh the JWT so the forced-change flag clears without re-login.
      await update();
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'خطایی در تغییر رمز عبور رخ داد.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-20">
      <Card className="w-full max-w-md drop-shadow-amber-800/20">
        <CardHeader>
          <CardTitle className="text-center">تعیین رمز عبور جدید</CardTitle>
          <CardDescription className="text-center">
            شما با رمز عبور موقت وارد شده‌اید. برای ادامه، لطفاً یک رمز عبور جدید
            انتخاب کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 p-2 text-center text-sm text-rose-700 ring-1 ring-inset ring-rose-600/20">
                {error}
              </p>
            )}
            <div>
              <Label htmlFor="newPassword">رمز عبور جدید</Label>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                value={passwords.newPassword}
                onChange={handleChange}
                required
                minLength={MIN_LENGTH}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">تکرار رمز عبور جدید</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handleChange}
                required
              />
              {passwords.confirmPassword &&
                passwords.newPassword === passwords.confirmPassword && (
                  <p className="mt-1 text-xs text-emerald-600">رمزها یکسان هستند.</p>
                )}
            </div>
            <Button
              type="submit"
              className="w-full cursor-pointer"
              loading={isLoading}
            >
              {isLoading ? 'در حال ذخیره...' : 'ذخیره رمز عبور و ادامه'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/authentication/login' })}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            خروج از حساب
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
