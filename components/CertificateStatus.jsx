'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const MICROSERVICE_URL = process.env.NEXT_PUBLIC_MICROSERVICE_URL || 'http://localhost:8000';

export default function CertificateStatus({ enrollment }) {
  const [status, setStatus] = useState('loading');
//   const [pdfUrl, setPdfUrl] = useState(enrollment.certificateUrl || '');
  const [jobId, setJobId] = useState(enrollment.jobId || '');

  useEffect(() => {
    if (!enrollment.jobId) {
      setStatus('not_started');
      return;
    }
    
    if (jobId) {
      setStatus('completed');
      return;
    }

    const ws = new WebSocket(`${MICROSERVICE_URL.replace('http', 'ws')}/ws/certificates?job_id=${enrollment.jobId}`);

    ws.onopen = () => {
      console.log('WebSocket connection established for job:', enrollment.jobId);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received status update:', message);
      setStatus(message.status);

      if (message.status === 'completed' && message.pdf_path) {
        setJobId(message.job_id);
        ws.close();
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('error');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed for job:', enrollment.jobId);
    };

    // Cleanup function to close WebSocket on component unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [enrollment.jobId, jobId]);

  const download_pdf = async () => {
    const data = await axios.get(`${MICROSERVICE_URL}/certificates/${jobId}`);
    if (data.status !== 200) {
        alert('خطا در دریافت گواهی');
        return;
    }
    const file = new Blob([data.data], { type: 'application/pdf' });
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL);
    
  }
  if (jobId) {
    return <Button asChild size="sm" onClick={download_pdf}>دانلود گواهی</Button>;
  }

  switch (status) {
    case 'loading':
    case 'pending':
    case 'queued':
      return <Badge variant="secondary">در صف صدور</Badge>;
    case 'processing':
      return <Badge variant="outline">در حال پردازش...</Badge>;
    case 'completed':
      return <Button asChild size="sm" onClick={download_pdf}>دانلود گواهی</Button>;
    case 'failed':
      return <Badge variant="destructive">خطا در صدور</Badge>;
    case 'error':
      return <Badge variant="destructive">خطای اتصال</Badge>;
    default:
      return <span className="text-xs text-muted-foreground">صادر نشده</span>;
  }
}