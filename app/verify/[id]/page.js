'use client';

import { useState, useEffect } from 'react';

// A simple component to show while the PDF is loading.
const LoadingSpinner = () => (
    <div className="text-center">
        <p className="text-lg">در حال بارگذاری گواهینامه...</p>
        <div className="mt-4">
            <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto"></div>
        </div>
    </div>
);

// A component to display any errors that occur.
const ErrorDisplay = ({ message }) => (
     <div className="text-center p-8 bg-red-50 rounded-lg">
        <h1 className="text-2xl font-bold text-red-700">خطا</h1>
        <p className="text-red-600 mt-2">{message || "امکان بارگذاری گواهینامه وجود ندارد."}</p>
    </div>
);

export default function VerifyCertificatePage({ params }) {
  const { id } = params;
  const [pdfUrl, setPdfUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // This variable will hold the generated blob URL.
    let objectUrl = null;
    
    const fetchCertificate = async () => {
        if (!id) {
            setError("شناسه گواهی نامعتبر است.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            // Fetch the raw PDF data from the API route.
            const response = await fetch(`/api/verify/${id}`);
            if (!response.ok) {
                // Try to parse error JSON, with a fallback for non-JSON responses.
                const errorData = await response.json().catch(() => ({ error: `خطای سرور: ${response.status}` }));
                throw new Error(errorData.error);
            }
            
            // Get the response body as a Blob object.
            const blob = await response.blob();
            
            // Create a temporary, safe URL for the blob.
            objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);

        } catch (err) {
            console.error("Fetch certificate error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    fetchCertificate();
    
    // Cleanup function: This is crucial to prevent memory leaks.
    // It runs when the component is unmounted.
    return () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    };
  }, [id]);
  

  return (
    <div className="flex flex-col items-center justify-center h-dvh">
        {isLoading && <LoadingSpinner />}
        {error && !isLoading && <ErrorDisplay message={error} />}
        {!isLoading && !error && pdfUrl && (
             
                <embed
                    src={pdfUrl}
                    title={`گواهینامه ${id}`}
                    className="w-screen h-full"
                    sandbox="allow-scripts allow-same-origin"
                />
      
        )}
    </div>
  );
}