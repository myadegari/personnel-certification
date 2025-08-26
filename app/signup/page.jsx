'use client';
// File: app/signup/page.jsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
    gender: '',
    position: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Step 1: Check if personnel number is available
  const handleCheckPersonnelNumber = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // In a real app, you would have a dedicated API to check this.
    // For this example, we'll just move to the next step.
    // A real implementation would be:
    // const res = await fetch(`/api/auth/check-personnel?number=${formData.personnelNumber}`);
    // if (!res.ok) { ... handle error ... }
    
    if (formData.password !== formData.confirmPassword) {
        setError("رمزهای عبور یکسان نیستند.");
        setIsLoading(false);
        return;
    }

    setStep(2);
    setIsLoading(false);
  };

  // Step 2: Submit the full registration form
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

      if (!res.ok) {
        throw new Error(data.message || 'خطایی در ثبت‌نام رخ داد.');
      }

      setSuccess(data.message);
      setTimeout(() => {
        router.push('/login');
      }, 2000);

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
          
          {step === 1 && (
            <form onSubmit={handleCheckPersonnelNumber} className="space-y-4">
              <div>
                <Label htmlFor="personnelNumber" className="mb-2">شماره پرسنلی</Label>
                <Input id="personnelNumber" name="personnelNumber" value={formData.personnelNumber} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="password" className="mb-2">رمز عبور</Label>
                <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="mb-2">تکرار رمز عبور</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
              <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                {isLoading ? 'در حال بررسی...' : 'ادامه'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="mb-2">نام</Label>
                  <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="lastName" className="mb-2">نام خانوادگی</Label>
                  <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
              
              <div>
                <Label htmlFor="nationalId" className="mb-2">کد ملی</Label>
                <Input id="nationalId" name="nationalId" value={formData.nationalId} onChange={handleChange} required />
              </div>
              <div>
                  <Label htmlFor="position" className="mb-2">سمت</Label>
                  <Input id="position" name="position" type="text" value={formData.position} onChange={handleChange} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                
                <div>
                  <Label htmlFor="email" className="mb-2">ایمیل</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                </div>
                <div className=" flex items-center mt-4">
  <Label>جنسیت</Label>
  <RadioGroup
    name="gender"
    value={formData.gender}
    onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
    className="flex gap-4 mr-5"
    required
  >
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="Male" id="Male" />
      <Label htmlFor="Male" className="mr-2 cursor-pointer">آقا</Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="Female" id="Female" />
      <Label htmlFor="Female" className="mr-2 cursor-pointer">خانم</Label>
    </div>
  </RadioGroup>
</div>
              </div>
              <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                {isLoading ? 'در حال ثبت‌نام...' : 'تکمیل ثبت‌نام'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-600">
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
