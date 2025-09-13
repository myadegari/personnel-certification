'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

// It's good practice to have the WebSocket URL in an environment variable.
const MICROSERVICE_WS_URL = (process.env.NEXT_PUBLIC_MICROSERVICE_URL || 'http://localhost:8000').replace('http', 'ws');

export default function CertificateStatus({ enrollment }) {
  // The component's state is now derived directly from the enrollment prop.
  // If a certificateUrl exists, the job is considered complete.
  const isComplete = !!enrollment.certificateUrl;
  
  const [status, setStatus] = useState(isComplete ? 'completed' : 'loading');

  useEffect(() => {
    // If the certificate is already generated, we don't need a WebSocket connection.
    if (isComplete || !enrollment.jobId) {
      setStatus(isComplete ? 'completed' : 'not_started');
      return;
    }

    // Establish the WebSocket connection if the job is not yet complete.
    const ws = new WebSocket(`${MICROSERVICE_WS_URL}/ws/certificates?job_id=${enrollment.jobId}`);

    ws.onopen = () => {
      console.log('WebSocket connection established for job:', enrollment.jobId);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received status update:', message);
        setStatus(message.status);

        // When the job is completed, the WebSocket connection can be closed.
        if (message.status === 'completed') {
          // A small delay can help ensure the UI updates before the connection closes.
          setTimeout(() => ws.close(), 500);
          // Instead of reloading, we now rely on the button using the certificateUrl.
          // You might want to trigger a data refresh for the parent component here.
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        setStatus('error');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('error');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed for job:', enrollment.jobId);
    };

    // This cleanup function ensures the WebSocket is closed when the component unmounts.
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
    // The dependency array ensures this effect runs only when the job ID changes or completion status changes.
  }, [enrollment.jobId, isComplete]);
  
  // This function opens the certificate URL in a new browser tab.
  const viewCertificate = () => {
    if (enrollment.certificateUrl) {
      window.open(enrollment.certificateUrl, '_blank');
    } else {
      // This is a fallback in case the URL is not available.
      alert('لینک گواهی هنوز آماده نشده است.');
    }
  };

  // Render the appropriate UI based on the current status.
  switch (status) {
    case 'loading':
    case 'pending':
    case 'queued':
      return <Badge variant="secondary">در صف صدور</Badge>;
    case 'processing':
      return <Badge variant="outline" className="animate-pulse">در حال پردازش...</Badge>;
    case 'completed':
      // When complete, show a button to view the certificate.
      return <Button size="sm" onClick={viewCertificate}>مشاهده گواهی</Button>;
    case 'failed':
      return <Badge variant="destructive">خطا در صدور</Badge>;
    case 'error':
      return <Badge variant="destructive">خطای اتصال</Badge>;
    default:
      return <span className="text-xs text-muted-foreground">صادر نشده</span>;
  }
}
