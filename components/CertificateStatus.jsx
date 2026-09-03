'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gooeyToast } from 'goey-toast';
import { internalAxios } from '@/lib/axios';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export default function CertificateStatus({ enrollment }) {
  const hasJob = !!enrollment?.jobId;
  const [downloading, setDownloading] = useState(false);

  // Short-lived polling instead of one held-open SSE connection per row
  // (browsers cap ~6 concurrent connections per origin, so a table of rows
  // each holding an EventSource starves every other request). The server
  // persists the resolved status, so terminal rows stop fetching entirely.
  const { data } = useQuery({
    queryKey: ['certificateStatus', enrollment?._id],
    queryFn: async () => {
      const res = await internalAxios.get(
        `/enrollments/${enrollment._id}/certificate-status`
      );
      return res.data;
    },
    enabled: hasJob,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'completed' || s === 'failed' ? false : 2500;
    },
  });

  const status = data?.status ?? (hasJob ? 'loading' : 'not_started');

  const viewCertificate = () => {
    if (enrollment.certificateUrl) {
      window.open(enrollment.certificateUrl, '_blank', 'noopener');
    } else {
      gooeyToast.error('لینک گواهی هنوز آماده نشده است.');
    }
  };

  const downloadCertificate = async () => {
    setDownloading(true);
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
      gooeyToast.error(error.message || 'خطا در دانلود گواهی.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <span role="status" aria-live="polite">
      {renderStatus(status)}
    </span>
  );

  function renderStatus(current) {
    switch (current) {
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
            <Button size="sm" variant="outline" loading={downloading} onClick={downloadCertificate}>دانلود گواهی</Button>
          </div>
        );
      case 'failed':
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant="destructive">خطا در صدور</Badge>
            <span className="text-xs text-muted-foreground">با مدیر سیستم تماس بگیرید</span>
          </div>
        );
      default:
        return <span className="text-xs text-muted-foreground">صادر نشده</span>;
    }
  }
}
