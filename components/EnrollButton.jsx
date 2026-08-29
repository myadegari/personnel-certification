'use client';
import { useMutation } from '@tanstack/react-query';
import { internalAxios } from '@/lib/axios';
import { gooeyToast } from 'goey-toast';
import { Button } from './ui/button';
import {
  CheckCircle2,
  Clock3,
  XCircle,
  CalendarX2,
  Users,
  Loader2,
  Plus,
} from 'lucide-react';

const enrollInCourse = (courseId) => internalAxios.post('/enrollments', { courseId });

export default function EnrollButton({ courseId, status, deadlinePassed, capacityFull, onEnrolled }) {
  const mutation = useMutation({
    mutationFn: enrollInCourse,
    onSuccess: () => {
      onEnrolled?.(courseId, 'PENDING');
      gooeyToast.success('درخواست ثبت‌نام شما ارسال شد.');
    },
    onError: (error) => {
      gooeyToast.error(error.response?.data?.message || 'خطا در ثبت‌نام رخ داد.');
    },
  });

  if (status === 'APPROVED') {
    return (
      <Button disabled className="w-full gap-2 rounded-xl border border-emerald-600/15 bg-emerald-100 text-emerald-700 disabled:opacity-100">
        <CheckCircle2 className="h-4 w-4" /> ثبت‌نام شده (تایید شده)
      </Button>
    );
  }

  if (status === 'PENDING') {
    return (
      <Button disabled className="w-full gap-2 rounded-xl border border-amber-500/20 bg-amber-100 text-amber-700 disabled:opacity-100">
        <Clock3 className="h-4 w-4" /> در انتظار بررسی
      </Button>
    );
  }

  if (status === 'REJECTED') {
    return (
      <Button disabled className="w-full gap-2 rounded-xl border border-rose-500/20 bg-rose-100 text-rose-700 disabled:opacity-100">
        <XCircle className="h-4 w-4" /> رد شده
      </Button>
    );
  }

  if (deadlinePassed) {
    return (
      <Button disabled className="w-full gap-2 rounded-xl border border-black/5 bg-stone-100 text-stone-500 disabled:opacity-100">
        <CalendarX2 className="h-4 w-4" /> اتمام مهلت ثبت‌نام
      </Button>
    );
  }

  if (capacityFull) {
    return (
      <Button disabled className="w-full gap-2 rounded-xl border border-black/5 bg-stone-100 text-stone-500 disabled:opacity-100">
        <Users className="h-4 w-4" /> ظرفیت تکمیل شد
      </Button>
    );
  }

  return (
    <Button
      onClick={() => mutation.mutate(courseId)}
      disabled={mutation.isPending}
      className="w-full gap-2 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-transform hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98]"
    >
      {mutation.isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> در حال ارسال...
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" /> ثبت‌نام در دوره
        </>
      )}
    </Button>
  );
}
