'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { CheckCircle as BadgeCheck, FileDown, Share as Share2, AlertTriangle, Refresh as RefreshCw } from "reicon-react";
import { Button } from '@/components/ui/button';

function toPersianDigits(value) {
  return String(value ?? '').replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

const LoadingSpinner = () => (
  <div role="status" aria-live="polite" className="text-center">
    <p className="text-lg">در حال بارگذاری گواهینامه...</p>
    <div className="mt-4">
      <div className="w-16 h-16 border-4 border-t-primary border-border rounded-full animate-spin mx-auto"></div>
    </div>
  </div>
);

const ErrorDisplay = ({ message, onRetry }) => (
  <div
    role="alert"
    className="w-full max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center"
  >
    <AlertTriangle className="mx-auto size-10 text-red-500" aria-hidden />
    <h1 className="mt-4 text-xl font-bold text-red-700">گواهینامه قابل مشاهده نیست</h1>
    <p className="mt-2 text-sm text-red-600">{message || 'امکان بارگذاری گواهینامه وجود ندارد.'}</p>
    {onRetry && (
      <Button variant="outline" className="mt-5 cursor-pointer" onClick={onRetry}>
        <RefreshCw className="size-4" /> تلاش مجدد
      </Button>
    )}
  </div>
);

const ERROR_MESSAGES = {
  not_found: 'گواهینامه‌ای با این شناسه یافت نشد. اگر این پیوند را از جای نامعتبری دریافت کرده‌اید، ممکن است جعلی باشد.',
  server: 'خطای سرور در دریافت گواهینامه. لطفاً بعداً دوباره تلاش کنید.',
  network: 'خطا در ارتباط با سرور. اتصال اینترنت خود را بررسی کنید.',
};

export default function VerifyCertificatePage({ params }) {
  const { id } = use(params);
  const [pdfUrl, setPdfUrl] = useState('');
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // null | 'not_found' | 'server' | 'network'
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // This variable will hold the generated blob URL.
    let objectUrl = null;
    let cancelled = false;

    const fetchCertificate = async () => {
      if (!id) {
        setError('not_found');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // Resolve the certificate facts first; a 404 here means the id is
        // unknown/forged and there is no point fetching the PDF.
        const metaRes = await fetch(`/api/verify/${id}/meta`);
        if (cancelled) return;
        if (metaRes.status === 404 || metaRes.status === 400) {
          setError('not_found');
          setIsLoading(false);
          return;
        }
        if (!metaRes.ok) {
          setError('server');
          setIsLoading(false);
          return;
        }
        setMeta(await metaRes.json());

        // Fetch the raw PDF data from the API route.
        const response = await fetch(`/api/verify/${id}`);
        if (cancelled) return;
        if (!response.ok) {
          setError(response.status >= 500 ? 'server' : 'not_found');
          setIsLoading(false);
          return;
        }

        // Get the response body as a Blob object.
        const blob = await response.blob();

        // Create a temporary, safe URL for the blob.
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Fetch certificate error:', err);
        setError('network');
        setIsLoading(false);
      }
    };

    fetchCertificate();

    // Cleanup function: This is crucial to prevent memory leaks.
    // It runs when the component is unmounted.
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [id, reloadKey]);

  const shareLink = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'گواهینامه گواهیار', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // user cancelled the native share sheet or clipboard was blocked
    }
  }, []);

  const retry = useCallback(() => {
    setPdfUrl('');
    setMeta(null);
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
      {isLoading && <LoadingSpinner />}

      {error && !isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <ErrorDisplay
            message={
              error === 'not_found'
                ? ERROR_MESSAGES.not_found
                : error === 'network'
                  ? ERROR_MESSAGES.network
                  : ERROR_MESSAGES.server
            }
            onRetry={error !== 'not_found' ? retry : undefined}
          />
        </div>
      )}

      {!isLoading && !error && pdfUrl && (
        <>
          {/* Verdict banner: the third party's primary question is answered
              before the document itself — this page authenticates the
              certificate, not merely displays a PDF. */}
          <section
            aria-labelledby="verify-verdict"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
          >
            <div className="flex items-center gap-3">
              <BadgeCheck className="size-8 shrink-0 text-emerald-600" aria-hidden />
              <div>
                <h1 id="verify-verdict" className="text-base font-bold text-emerald-800 sm:text-lg">
                  این گواهینامه معتبر است
                </h1>
                <p className="text-xs text-emerald-700">
                  صادرشده توسط سامانه جامع مدیریت دوره‌ها و گواهینامه‌های کارکنان
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={shareLink}>
                <Share2 className="size-4" />
                {copied ? 'کپی شد' : 'اشتراک‌گذاری'}
              </Button>
              <a href={`/api/verify/${id}`} download>
                <Button variant="outline" size="sm" className="cursor-pointer">
                  <FileDown className="size-4" /> دانلود
                </Button>
              </a>
            </div>
          </section>

          {meta && (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 rounded-2xl border border-border bg-card p-4 text-sm sm:grid-cols-2">
              {[
                ['نام دارنده', meta.holder],
                ['دوره', meta.course],
                ['شماره گواهی', meta.certificateNumber ? toPersianDigits(meta.certificateNumber) : null],
                ['تاریخ صدور', meta.issuedAt],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 border-b border-dashed border-border py-1.5 last:border-0 sm:last:border-0">
                    <dt className="shrink-0 text-muted-foreground">{label}</dt>
                    <dd className="truncate font-medium">{value}</dd>
                  </div>
                ))}
            </dl>
          )}

          <div className="mt-3 min-h-96 flex-1 overflow-hidden rounded-2xl border border-border bg-muted">
            <embed
              src={pdfUrl}
              type="application/pdf"
              title={`گواهینامه ${id}`}
              className="h-full w-full"
            />
          </div>
        </>
      )}
    </main>
  );
}
