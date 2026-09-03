'use client';
import { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMutation } from '@tanstack/react-query';
import { internalAxios } from '@/lib/axios';
import { gooeyToast } from 'goey-toast';
import { motion } from 'motion/react';
import { fadeUp } from '@/lib/motion';
import { Key as KeyRound, Loader as Loader2 } from "reicon-react";
import PasswordInput from "@/components/password-input";
import SectionCard from "@/components/admin/ui/SectionCard";

const changePassword = async (passwords) => {
  const { data } = await internalAxios.post('/profile/change-password', passwords);
  return data;
};

const MIN_LENGTH = 8;

export default function ChangePasswordForm() {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text }

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    if (status) setStatus(null);
  };

  const validationError = () => {
    if (passwords.newPassword && passwords.newPassword.length < MIN_LENGTH) {
      return `رمز عبور جدید باید حداقل ${MIN_LENGTH} کاراکتر باشد.`;
    }
    if (passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword) {
      return 'رمز عبور جدید و تکرار آن یکسان نیستند.';
    }
    return null;
  };

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (data) => {
      setStatus({ type: 'success', text: data.message });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      gooeyToast.success(data.message || 'رمز عبور با موفقیت تغییر کرد.');
    },
    onError: (error) => {
      setStatus({
        type: 'error',
        text: error.response?.data?.message || 'خطایی رخ داد.',
      });
    },
  });

  const isFilled =
    passwords.currentPassword && passwords.newPassword && passwords.confirmPassword;
  const canSubmit = isFilled && !validationError();

  const handleSubmit = (e) => {
    e.preventDefault();
    const errorText = validationError();
    if (errorText) {
      setStatus({ type: 'error', text: errorText });
      return;
    }
    mutation.mutate(passwords);
  };

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show">
      <SectionCard
        title="تغییر رمز عبور"
        description={`رمز عبور جدید باید حداقل ${MIN_LENGTH} کاراکتر باشد.`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              value={passwords.currentPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
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
                <p className="text-xs text-emerald-600">رمزها یکسان هستند.</p>
              )}
          </div>

          <Button
            type="submit"
            className="w-full gap-2 bg-gradient-to-l from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-transform hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] cursor-pointer"
            disabled={mutation.isPending || !canSubmit}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> در حال تغییر...
              </>
            ) : (
              <>
                <KeyRound className="size-4" /> تغییر رمز عبور
              </>
            )}
          </Button>

          <div role="status" aria-live="polite">
            {status && (
              <p
                className={`text-sm ${
                  status.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {status.text}
              </p>
            )}
          </div>
        </form>
      </SectionCard>
    </motion.div>
  );
}
