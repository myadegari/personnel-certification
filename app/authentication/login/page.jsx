'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [personnelNumber, setPersonnelNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // The useEffect that was here has been removed, as the logic is now in handleSubmit.

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const result = await signIn('credentials', {
            redirect: false,
            personnelNumber,
            password,
        });

        if (result.error) {
            // NEW: Check for our custom error message here
            if (result.error.startsWith('PENDING_VERIFICATION')) {
                const email = result.error.split(',')[1];
                // Redirect to the signup page with the necessary parameters
                router.push(`/authentication/signup?step=3&email=${email}`);
                // No need to set loading to false, as we are navigating away
                return; 
            }
            // For any other error, display a generic message
            setError('شماره پرسنلی یا رمز عبور اشتباه است.');
        } else if (result.ok) {
            // On successful login, redirect to the root which will be handled by middleware
            router.push('/');
        }
    } catch (err) {
        // Catch any unexpected network errors
        setError('خطایی در ارتباط با سرور رخ داد.');
    } finally {
        // This will only run if we aren't redirecting
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-20">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">ورود به سامانه</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
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
            <Link href="/authentication/forgot-password" className="text-blue-600 hover:underline">
              فراموشی رمز عبور
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">
            حساب کاربری ندارید؟{' '}
            <Link href="/authentication/signup" className="font-semibold text-blue-600 hover:underline">
              ثبت‌نام کنید
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
