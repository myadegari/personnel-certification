'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Link from 'next/link';

export default function LoginPage() {
  const [personnelNumber, setPersonnelNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signIn('credentials', {
      redirect: false,
      personnelNumber,
      password,
    });

    setIsLoading(false);

    if (result.error) {
      setError('شماره پرسنلی یا رمز عبور اشتباه است.');
    } else if (result.ok) {
      router.push('/');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">ورود به سامانه</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div>
              <Input
                placeholder="شماره پرسنلی"
                value={personnelNumber}
                onChange={(e) => setPersonnelNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="رمز عبور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
              {isLoading ? 'در حال ورود...' : 'ورود'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-3 pt-4">
          <div className="text-sm">
            <Link href="/forgot-password" className="text-blue-600 hover:underline">
              فراموشی رمز عبور
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">
            حساب کاربری ندارید؟{' '}
            <Link href="/signup" className="font-semibold text-blue-600 hover:underline">
              ثبت‌نام کنید
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
