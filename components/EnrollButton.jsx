'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {internalAxios} from '@/lib/axios';
import { Button } from "./ui/button";

const enrollInCourse = (courseId) => internalAxios.post('/enrollments', { courseId });

export default function EnrollButton({ courseId, status, enrollmentDeadline }) {
  const queryClient = useQueryClient();
  const [currentStatus, setCurrentStatus] = useState(status);
  // const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationFn: enrollInCourse,
    onSuccess: () => {
        setCurrentStatus('PENDING');
        // Invalidate the main courses query to refetch and update statuses
        queryClient.invalidateQueries({ queryKey: ['courses'] });
    }, onError: (error) => {
      const errorMessage = error.response?.data?.message || "An error occurred during enrollment.";
      alert(errorMessage); // For a better UX, consider using a toast notification library
  }
});
  
const handleEnroll = () => {
    mutation.mutate(courseId);
  };

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const isDeadlinePassed = nowInSeconds > enrollmentDeadline;
  
  if (currentStatus === 'APPROVED') {
    return <Button disabled className="w-full bg-green-600">ثبت‌نام شده (تایید شده)</Button>;
  }
  
  if (currentStatus === 'PENDING') {
    return <Button disabled className="w-full bg-yellow-500">در انتظار تایید</Button>;
  }
  if (isDeadlinePassed) {
    return <Button disabled className="w-full bg-red-500">مهلت ثبت‌نام به پایان رسیده است</Button>;
  }

  return (
    <div className="w-full">
    <Button onClick={handleEnroll} className="w-full" disabled={mutation.isPending}>
      {mutation.isPending ? 'در حال ارسال...' : 'ثبت‌نام در دوره'}
    </Button>
      {/* {message && <p className="text-xs text-center mt-2">{message}</p>} */}
    </div>
  );
}