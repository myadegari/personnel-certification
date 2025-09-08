// app/verify/[id]/page.js
'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyCertificate({ params }) {
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    // Redirect to API route to fetch & serve PDF
    router.push(`/api/verify/${id}`);
  }, [id, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-lg">در حال بارگذاری گواهینامه...</p>
        <div className="mt-4">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </div>
  );
}