'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from "@/components/password-input"
import { gooeyToast } from 'goey-toast';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [personnelNumber, setPersonnelNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        personnelNumber,
        password,
      });

      if (result.error) {
        if (result.error === 'ACCOUNT_NOT_ACTIVE') {
          gooeyToast.error('حساب کاربری شما فعال نیست. با مدیر سیستم تماس بگیرید.', { duration: 5000 });
        } else if (result.error === 'ACCOUNT_REJECTED') {
          gooeyToast.error('حساب کاربری شما توسط مدیر رد شده است.', { duration: 5000 });
        } else {
          gooeyToast.error('شماره پرسنلی یا رمز عبور اشتباه است.', { duration: 5000 });
          setIsLoading(false);
        }
      } else if (result.ok) {
        // On successful login, redirect to the root which will be handled by middleware
        router.push('/');
      }
    } catch (err) {
      gooeyToast.error('خطایی در ارتباط با سرور رخ داد.', { duration: 5000 });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-20">
      <Card className="w-full max-w-md drop-shadow-amber-800/20 ">
        <CardHeader>
          <CardTitle className="text-center">ورود به سامانه</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-2" htmlFor="personnelNumber">شماره پرسنلی</Label>
              <Input
                id="personnelNumber"
                dir="ltr"
                autoComplete="username"
                inputMode="numeric"
                value={personnelNumber}
                onChange={(e) => setPersonnelNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="mb-2" htmlFor="password">رمز عبور</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={true}
              />
            </div>
            <Button type="submit" className="w-full cursor-pointer" loading={isLoading}>
              {isLoading ? 'در حال ورود...' : 'ورود'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-3 pt-4">
          <div className="text-sm">
            <Link href="/authentication/forgot-password" className="text-primary hover:underline">
              فراموشی رمز عبور
            </Link>
          </div>
        </CardFooter>
      </Card>

    </div>
  );
}
