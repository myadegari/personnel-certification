'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export default function CertificateStatus({ enrollment }) {
  // Status is driven by the server's SSE stream (webhook + MongoDB fallback).
  const [status, setStatus] = useState(() =>
    enrollment?.jobId ? 'loading' : 'not_started'
  );

  useEffect(() => {
    if (!enrollment?.jobId) {
      setStatus('not_started');
      return;
    }

    let isMounted = true;
    const source = new EventSource(
      `/api/enrollments/${enrollment._id}/certificate-status/stream`
    );

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (isMounted && data.status) {
          setStatus(data.status);
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    // The server emits `end` once the job reaches a terminal state, so we can
    // stop the browser from auto-reconnecting.
    source.addEventListener('end', () => {
      source.close();
    });

    source.onerror = () => {
      // Connection errors are surfaced through the status UI; EventSource
      // retries automatically until the stream ends.
    };

    return () => {
      isMounted = false;
      source.close();
    };
  }, [enrollment?._id, enrollment?.jobId]);

  const viewCertificate = () => {
    if (enrollment.certificateUrl) {
      window.open(enrollment.certificateUrl, '_blank');
    } else {
      alert('لینک گواهی هنوز آماده نشده است.');
    }
  };

  const downloadCertificate = async () => {
    try {
      const response = await fetch(`/api/verify/${enrollment._id}`);
      if (!response.ok) {
        throw new Error('امکان دریافت فایل گواهی وجود ندارد.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${enrollment.certificateUniqueId || enrollment._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Certificate download error:', error);
      alert(error.message || 'خطا در دانلود گواهی.');
    }
  };

  switch (status) {
    case 'loading':
    case 'pending':
    case 'queued':
      return <Badge variant="secondary">در صف صدور</Badge>;
    case 'processing':
      return <Badge variant="outline" className="animate-pulse">در حال پردازش...</Badge>;
    case 'completed':
      return (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={viewCertificate}>مشاهده گواهی</Button>
          <Button size="sm" variant="outline" onClick={downloadCertificate}>دانلود گواهی</Button>
        </div>
      );
    case 'failed':
      return <Badge variant="destructive">خطا در صدور</Badge>;
    case 'error':
      return <Badge variant="destructive">خطای اتصال</Badge>;
    default:
      return <span className="text-xs text-muted-foreground">صادر نشده</span>;
  }
}
