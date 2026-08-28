'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

// It's good practice to have the WebSocket URL in an environment variable.
const MICROSERVICE_URL = process.env.NEXT_PUBLIC_MICROSERVICE_URL || 'http://localhost:8000';
const MICROSERVICE_WS_URL = MICROSERVICE_URL.replace('http', 'ws');

// A simple utility to wait for a specific duration.
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function CertificateStatus({ enrollment }) {
  // The component's state is now derived directly from the enrollment prop.
  // If a certificateUrl exists, the job is considered complete.
  const [status, setStatus] = useState("not_started")
  
  
  // const [status, setStatus] = useState(isComplete ? 'completed' : 'loading');

  useEffect(() => {
    let ws = null;
    let isMounted = true;
    
    // Asynchronous function to fetch initial status and handle WebSocket connection.
    const fetchStatusAndConnect = async () => {
      
      // If there's no jobId, it means the process hasn't started yet.
      if (!enrollment.jobId) {
        setStatus('not_started');
        return;
      }

      // First, fetch the status from the REST API to get the current state.
      try {
        const response = await fetch(`${MICROSERVICE_URL}/certificates/status/${enrollment.jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch initial job status');
        }
        const data = await response.json();
        // Update the status based on the fetched data.
        if (isMounted) {
          setStatus(data.status);
        }

        // Only establish a WebSocket connection if the job is still in progress.
        if (data.status !== 'completed' && data.status !== 'failed') {
          ws = new WebSocket(`${MICROSERVICE_WS_URL}/ws/certificates?job_id=${enrollment.jobId.toString()}`);

          ws.onopen = () => {};

          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              if (isMounted) {
                setStatus(message.status);
              }
            } catch (e) {
              console.error('Failed to parse WebSocket message:', e);
            }
          };

          ws.onerror = () => {
            // Connection errors are surfaced through the status UI
          };

          ws.onclose = () => {
            // Handle reconnect logic if needed, but for 'completed', it's intentional.
          };
        } else if (isMounted) {
            // The job has already completed or failed, so we don't need a WebSocket.
            setStatus(data.status);
        }
      } catch (error) {
        console.error('Error fetching initial status or connecting WebSocket:', error);
        if (isMounted) {
          setStatus('error');
        }
      }
    };
    
    fetchStatusAndConnect();

    // This cleanup function ensures the WebSocket is closed when the component unmounts.
    return () => {
      isMounted = false;
      if (ws) {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }
    };
    // The dependency array ensures this effect runs only when the enrollment prop or its jobId changes.
  }, [enrollment.jobId]);
  
  
  // This function opens the certificate URL in a new browser tab.
  const viewCertificate = () => {
    if (enrollment.certificateUrl) {
      window.open(enrollment.certificateUrl, '_blank');
    } else {
      // This is a fallback in case the URL is not available.
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

  // Render the appropriate UI based on the current status.
  switch (status) {
    case 'loading':
    case 'pending':
    case 'queued':
      return <Badge variant="secondary">در صف صدور</Badge>;
    case 'processing':
      return <Badge variant="outline" className="animate-pulse">در حال پردازش...</Badge>;
    case 'completed':
      // When complete, show buttons to view or download the certificate.
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
