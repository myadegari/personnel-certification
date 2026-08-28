'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
// import { Button } from "@/components/ui/stateful-button";
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from "@/components/password-input"
import toast, { Toaster } from 'react-hot-toast';
import { Label } from '@/components/ui/label';

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
       // Add a flag to track if we're about to redirect.
       let isRedirecting = false;

    try {
        const result = await signIn('credentials', {
            redirect: false,
            personnelNumber,
            password,
        });

        if (result.error) {
            if (result.error === 'ACCOUNT_NOT_ACTIVE') {
                toast.error('حساب کاربری شما فعال نیست. با مدیر سیستم تماس بگیرید.', { autoClose: 5000 });
            } else if (result.error === 'ACCOUNT_REJECTED') {
                toast.error('حساب کاربری شما توسط مدیر رد شده است.', { autoClose: 5000 });
            } else {
                toast.error('شماره پرسنلی یا رمز عبور اشتباه است.',{ autoClose: 5000, });
            }
        } else if (result.ok) {
            // On successful login, redirect to the root which will be handled by middleware
            router.push('/');
            toast.success('ورود با موفقیت انجام شد.',{
              autoClose: 5000,
            });
             // Set the flag to true.
             isRedirecting = true; 
        }
    } catch (err) {
        // Catch any unexpected network errors
        if (!isRedirecting) {
        toast.error('خطایی در ارتباط با سرور رخ داد.',{  autoClose: 5000,});
        }

        // setError('خطایی در ارتباط با سرور رخ داد.');
    } finally {
        // This will only run if we aren't redirecting
        if (!isRedirecting) {
            setIsLoading(false);
        }
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
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <div>
              <Label className="mb-2" htmlFor="personnelNumber">شماره پرسنلی</Label>
              <Input
              dir="ltr"
                // placeholder="شماره پرسنلی"
                value={personnelNumber}
                onChange={(e) => setPersonnelNumber(e.target.value)}
                required
              />
            </div>
            <div>
              {/* <Input
                type="password"
                placeholder="رمز عبور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              /> */}
              <Label className="mb-2" htmlFor="password">رمز عبور</Label>
              <PasswordInput
              
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={true}
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
        </CardFooter>
      </Card>
    
    </div>
  );
}
