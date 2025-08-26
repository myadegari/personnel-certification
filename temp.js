'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    personnelNumber: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    nationalId: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckPersonnelNumber = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
        setError("رمزهای عبور یکسان نیستند.");
        return;
    }
    setError('');
    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'خطایی در ثبت‌نام رخ داد.');
      setSuccess(data.message);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">ایجاد حساب کاربری جدید</CardTitle>
          <CardDescription className="text-center">
            {step === 1 ? 'برای شروع، شماره پرسنلی و رمز عبور خود را وارد کنید.' : 'اطلاعات کاربری خود را تکمیل کنید.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-center text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}
          {success && <p className="mb-4 text-center text-sm text-green-600 bg-green-100 p-2 rounded-md">{success}</p>}
          
          {step === 1 ? (
            <form onSubmit={handleCheckPersonnelNumber} className="space-y-4">
              {/* Step 1 Form Fields */}
            </form>
          ) : (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              {/* Step 2 Form Fields */}
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
                حساب کاربری دارید؟{' '}
                <Link href="/login" className="font-semibold text-blue-600 hover:underline">
                    وارد شوید
                </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}


<aside className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <span className="">پنل مدیریت</span>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-4 text-sm font-medium">
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              داشبورد
            </Link>
            <Link
              href="/admin/courses"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              مدیریت دوره‌ها
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              مدیریت کاربران
            </Link>
            {/* لینک مدیریت ثبت‌نام‌ها از اینجا حذف می‌شود چون از داخل هر دوره قابل دسترسی است */}
          </nav>
        </div>
      </aside>