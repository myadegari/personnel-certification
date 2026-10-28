"use client";

import * as React from "react";

function legacyCopyToClipboard(value) {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("tabindex", "-1");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.padding = "0";
  textarea.style.border = "0";
  textarea.style.outline = "0";
  textarea.style.boxShadow = "none";
  textarea.style.background = "transparent";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export function useCopyToClipboard({
  timeout = 2000,
  onCopy,
  onCopyError,
} = {}) {
  const [isCopied, setIsCopied] = React.useState(false);
  const timeoutIdRef = React.useRef(null);

  React.useEffect(
    () => () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    },
    []
  );

  const markCopied = React.useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    setIsCopied(true);
    onCopy?.();

    if (timeout !== 0) {
      timeoutIdRef.current = setTimeout(() => {
        setIsCopied(false);
        timeoutIdRef.current = null;
      }, timeout);
    }
  }, [onCopy, timeout]);

  const markCopyFailed = React.useCallback(
    (error) => {
      onCopyError?.(error instanceof Error ? error : new Error("Copy failed"));
    },
    [onCopyError]
  );

  const copyToClipboard = React.useCallback(
    (value) => {
      if (typeof window === "undefined") return;
      if (!value) return;

      const copyWithFallback = (error) => {
        const ok = legacyCopyToClipboard(value);
        if (ok) {
          markCopied();
        } else {
          markCopyFailed(error);
        }
      };

      if (!navigator.clipboard?.writeText) {
        copyWithFallback(new Error("Clipboard API unavailable"));
        return;
      }

      try {
        Promise.resolve(navigator.clipboard.writeText(value)).then(
          markCopied,
          copyWithFallback
        );
      } catch (error) {
        copyWithFallback(error);
      }
    },
    [markCopyFailed, markCopied]
  );

  return { copyToClipboard, isCopied };
}
