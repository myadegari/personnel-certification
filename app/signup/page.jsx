"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // Import useSearchParams
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { internalAxios } from "@/lib/axios";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    personnelNumber: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    nationalId: "",
    email: "",
    gender: "",
    position: "",
  });
  const [otp, setOtp] = useState("");
  const [userEmail, setUserEmail] = useState(""); // To store email for OTP step
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [timer, setTimer] = useState(60);
  const router = useRouter();
  const searchParams = useSearchParams(); // NEW: Hook to read URL parameters
  // NEW: This useEffect hook runs once when the component loads
  // It checks if the user was redirected from the login page.
  useEffect(() => {
    const stepFromQuery = searchParams.get("step");
    const emailFromQuery = searchParams.get("email");

    if (stepFromQuery === "3" && emailFromQuery) {
      setStep(Number(stepFromQuery));
      setUserEmail(emailFromQuery);
      setSuccess(
        "کد تایید جدیدی به ایمیل شما ارسال شد. لطفاً ثبت‌نام خود را تکمیل کنید."
      );
    }
  }, [searchParams]);
  // Timer logic for resending OTP
  useEffect(() => {
    let interval;
    if (step === 3 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, canResend]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNextToInfo = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("رمزهای عبور یکسان نیستند.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "خطایی در ثبت‌نام رخ داد.");

      setSuccess(data.message);
      setUserEmail(data.email);
      setStep(3); // Move to OTP step
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSuccess(data.message);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSuccess(data.message);
      setCanResend(false);
      setTimer(60); // Reset timer
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleNextToInfo} className="space-y-4">
            <div>
              <Label htmlFor="personnelNumber">شماره پرسنلی</Label>
              <Input
                id="personnelNumber"
                name="personnelNumber"
                value={formData.personnelNumber}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">تکرار رمز عبور</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              ادامه
            </Button>
          </form>
        );
      case 2:
        return (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">نام</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">نام خانوادگی</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nationalId">کد ملی</Label>
                <Input
                  id="nationalId"
                  name="nationalId"
                  value={formData.nationalId}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="position">سمت</Label>
                <Input
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">ایمیل</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label>جنسیت</Label>
              <RadioGroup
                name="gender"
                value={formData.gender}
                onValueChange={(v) => setFormData((p) => ({ ...p, gender: v }))}
                className="flex gap-4"
                required
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Male" id="Male" />
                  <Label htmlFor="Male">آقا</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Female" id="Female" />
                  <Label htmlFor="Female">خانم</Label>
                </div>
              </RadioGroup>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "در حال ارسال..." : "ثبت‌نام و ارسال کد"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setStep(1)}
            >
              بازگشت
            </Button>
          </form>
        );
      case 3:
        return (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <Label htmlFor="otp">کد تایید</Label>
              <Input
                id="otp"
                name="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="کد ۶ رقمی ارسال شده را وارد کنید"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "در حال بررسی..." : "تایید حساب"}
            </Button>
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={handleResendOtp}
                disabled={!canResend || isLoading}
              >
                {canResend
                  ? "ارسال مجدد کد"
                  : `ارسال مجدد تا ${timer} ثانیه دیگر`}
              </Button>
            </div>
          </form>
        );
      default:
        return null;
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return "برای شروع، شماره پرسنلی و رمز عبور خود را وارد کنید.";
      case 2:
        return "اطلاعات کاربری خود را تکمیل کنید.";
      case 3:
        return `یک کد تایید به ایمیل ${userEmail} ارسال شد. لطفاً آن را وارد کنید.`;
      default:
        return "";
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            ایجاد حساب کاربری
          </CardTitle>
          <CardDescription className="text-center">
            {getStepDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-center text-sm text-red-600 bg-red-100 p-2 rounded-md">
              {error}
            </p>
          )}
          {success && (
            <p className="mb-4 text-center text-sm text-green-600 bg-green-100 p-2 rounded-md">
              {success}
            </p>
          )}
          {renderStepContent()}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            حساب کاربری دارید؟{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-600 hover:underline"
            >
              وارد شوید
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
