'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gooeyToast } from 'goey-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Certificate view/download for guest rows (persons without an account) in
 * the admin enrollments table. Guests carry their status on the
 * GuestCertificate document, mirrored from the generation webhook; a light
 * poll keeps in-flight rows fresh and stops once terminal.
 */
export default function GuestCertificateActions({ guest }) {
  const hasJob = !!guest?.jobId;
  const [downloading, setDownloading] = useState(false);

  const { data } = useQuery({
    queryKey: ['guestCertificateStatus', guest?._id],
    queryFn: async () => {
      const res = await fetch(`/api/verify/${guest.jobId}`, { method: 'HEAD' });
      return { ready: res.ok };
    },
    enabled: hasJob && guest.certificateStatus !== 'completed',
    refetchInterval: 2500,
  });

  const ready = guest.certificateStatus === 'completed' || data?.ready;
  const viewCertificate = () => {
    if (guest.certificateUrl) window.open(guest.certificateUrl, '_blank', 'noopener');
  };

  const downloadCertificate = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/verify/${guest._id}`);
      if (!response.ok) {
        throw new Error('امکان دریافت فایل گواهی وجود ندارد.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${guest.certificateUniqueId || guest._id}.pdf`;
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

  if (ready) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={viewCertificate}>مشاهده گواهی</Button>
        <Button size="sm" variant="outline" loading={downloading} onClick={downloadCertificate}>دانلود گواهی</Button>
      </div>
    );
  }
  if (guest.certificateStatus === 'failed') {
    return <Badge variant="destructive">خطا در صدور</Badge>;
  }
  if (hasJob) {
    return <Badge variant="outline" className="animate-pulse">در حال پردازش...</Badge>;
  }
  return <Badge variant="secondary">در صف صدور</Badge>;
}
