"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

// Rendered-page cache (fileId@width -> dataURL), FIFO-capped so a long
// browsing session can't grow unbounded. Makes pagination back/forward instant.
const CACHE_LIMIT = 120;
const pageCache = new Map();

const cacheKey = (fileId, width) => `${fileId}@${width}`;

function cacheGet(key) {
  if (!pageCache.has(key)) return null;
  const value = pageCache.get(key);
  pageCache.delete(key);
  pageCache.set(key, value); // refresh LRU position
  return value;
}

function cacheSet(key, dataUrl) {
  if (pageCache.has(key)) pageCache.delete(key);
  pageCache.set(key, dataUrl);
  if (pageCache.size > CACHE_LIMIT) {
    pageCache.delete(pageCache.keys().next().value);
  }
}

let pdfjsPromise = null;

// pdf.js is heavy and DOM-only: load it lazily on the client, pinned to the
// same-origin worker copied into public/ by scripts/copy-pdf-worker.mjs.
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/**
 * Renders the first page of a PDF as a canvas thumbnail.
 * Loads bytes from the same-origin /api/file/[id] endpoint (staff-authorized)
 * — fetching the cross-origin presigned URL directly would need CORS headers
 * from storage and would taint the canvas.
 * Any failure falls back to a designed placeholder instead of a broken tile.
 */
export default function PdfThumbnail({ fileId, name, width = 320, className }) {
  const canvasRef = useRef(null);
  const [state, setState] = useState(
    () => (cacheGet(cacheKey(fileId, width)) ? "ready" : "loading") // "loading" | "ready" | "error"
  );

  useEffect(() => {
    let cancelled = false;
    const key = cacheKey(fileId, width);

    const cached = cacheGet(key);
    if (cached) {
      draw(cached);
      setState("ready");
      return;
    }

    setState("loading");

    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const loadingTask = pdfjs.getDocument(`/api/file/${fileId}?raw=1`);
        const pdf = await loadingTask.promise;
        if (cancelled) {
          loadingTask.destroy();
          return;
        }
        try {
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1 });
          const scale = (width / viewport.width) * (window.devicePixelRatio || 1);
          const scaled = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(scaled.width);
          canvas.height = Math.floor(scaled.height);
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport: scaled }).promise;
          if (cancelled) return;

          const dataUrl = canvas.toDataURL("image/png");
          cacheSet(key, dataUrl);
          draw(dataUrl);
          setState("ready");
        } finally {
          await loadingTask.destroy();
        }
      } catch (err) {
        console.error(`PDF thumbnail failed for ${fileId}:`, err?.message || err);
        if (!cancelled) setState("error");
      }
    })();

    function draw(dataUrl) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const img = new Image();
      img.onload = () => {
        if (cancelled || !canvasRef.current) return;
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    }

    return () => {
      cancelled = true;
    };
  }, [fileId, width]);

  if (state === "error") {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-rose-50 to-stone-100 text-stone-400",
          className
        )}
      >
        <FileText className="size-8" />
        <span className="text-[10px]">پیش‌نمایش موجود نیست</span>
      </div>
    );
  }

  return (
    <div className={cn("relative flex h-full w-full items-center justify-center bg-white", className)}>
      <canvas
        ref={canvasRef}
        aria-label={name ? `پیش‌نمایش ${name}` : "پیش‌نمایش PDF"}
        className={cn(
          "max-h-full max-w-full transition-opacity duration-200",
          state === "ready" ? "opacity-100" : "opacity-0"
        )}
      />
      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-50">
          <div className="size-7 animate-spin rounded-full border-2 border-stone-200 border-t-rose-400" />
          <span className="text-[10px] text-stone-400">در حال ساخت پیش‌نمایش…</span>
        </div>
      )}
    </div>
  );
}
