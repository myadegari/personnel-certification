'use client';
import { useState } from 'react';
import { Button } from "./ui/button";

export default function EnrollButton({ courseId, status }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleEnroll = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setCurrentStatus('PENDING'); // Update the UI immediately
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (currentStatus === 'APPROVED') {
    return <Button disabled className="w-full bg-green-600">ثبت‌نام شده (تایید شده)</Button>;
  }
  
  if (currentStatus === 'PENDING') {
    return <Button disabled className="w-full bg-yellow-500">در انتظار تایید</Button>;
  }

  return (
    <div className="w-full">
      <Button onClick={handleEnroll} disabled={isLoading} className="w-full">
        {isLoading ? 'در حال ارسال...' : 'ثبت‌نام در دوره'}
      </Button>
      {message && <p className="text-xs text-center mt-2">{message}</p>}
    </div>
  );
}