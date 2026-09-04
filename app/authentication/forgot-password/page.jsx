'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { gooeyToast } from 'goey-toast';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = identifier.trim();
    if (!value) return;

    setIsLoading(true);
    try {
      const isEmail = value.includes('@');
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEmail ? { email: value } : { personnelNumber: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        gooeyToast.error(data.message || 'خطا در ثبت درخواست.');
        return;
      }
      setSubmitted(true);
      gooeyToast.success(data.message);
    } catch {
      gooeyToast.error('خطایی در ارتباط با سرور رخ داد.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-20">
      <Card className="w-full max-w-md drop-shadow-amber-800/20">
        <CardHeader>
          <CardTitle className="text-center">فراموشی رمز عبور</CardTitle>
          <CardDescription className="text-center">
            با توجه به اینکه سامانه به اینترنت متصل نیست، بازیابی رمز عبور از طریق
            مدیر سامانه انجام می‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-3 rounded-2xl bg-emerald-50 p-4 text-center text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
              <p className="font-semibold">درخواست شما ثبت شد.</p>
              <p>
                برای دریافت رمز عبور موقت، با مدیر سامانه به‌صورت حضوری یا تلفنی
                تماس بگیرید. پس از دریافت رمز موقت، هنگام ورود باید رمز جدیدی
                تعیین کنید.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="identifier">شماره پرسنلی یا ایمیل</Label>
                <Input
                  id="identifier"
                  dir="ltr"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="مثلاً ۱۲۳۴۵۶"
                  autoComplete="username"
                  required
                />
              </div>
              <Button type="submit" className="w-full cursor-pointer" loading={isLoading}>
                {isLoading ? 'در حال ثبت درخواست...' : 'ثبت درخواست بازنشانی'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/authentication/login" className="text-sm text-primary hover:underline">
            بازگشت به صفحه ورود
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
