"use client";
import { Check, Copy } from "lucide"
import { MorphIcon } from "morphicons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AnchoredToastProvider, ToastPrimitive } from "@/components/ui/toast"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { cn } from "@/lib/utils"

export function CopyStateIcon({
  copied,
  idleIcon,
  doneIcon
}) {
  if (!copied && idleIcon) return idleIcon
  if (copied && doneIcon) return doneIcon

  return (<MorphIcon icon={copied ? Check : Copy} spring="snappy" className="size-4" />);
}

/**
 * An icon button that copies `text` to the clipboard, morphs its icon to
 * reflect the result, and anchors a toast to itself confirming the copy —
 * self-contained, no `AnchoredToastProvider` wrapper needed.
 */
export function CopyButton({
  className,
  size = "icon",
  children,
  text,
  label = "کپی",
  toastManager,
  side = "top",
  idleIcon,
  doneIcon,
  onClick,
  onCopySuccess,
  onCopyError,
  ...props
}) {
  const ref = React.useRef(null)
  const pendingValue = React.useRef("")
  const timeout = 2000
  const ownManager = React.useMemo(() => ToastPrimitive.createToastManager(), [])
  const manager = toastManager ?? ownManager

  const { copyToClipboard, isCopied } = useCopyToClipboard({
    timeout,
    onCopy: () => {
      if (ref.current) {
        manager.add({
          title: "کپی شد!",
          timeout,
          positionerProps: { anchor: ref.current, side },
        })
      }
      onCopySuccess?.(pendingValue.current)
    },
    onCopyError: () => {
      if (ref.current) {
        manager.add({
          title: "کپی لینک ممکن نشد.",
          type: "error",
          timeout,
          positionerProps: { anchor: ref.current, side },
        })
      }
      onCopyError?.()
    },
  })

  const button = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            ref={ref}
            className={cn("will-change-transform", className)}
            size={size}
            aria-label={label}
            onClick={(event) => {
              const value = typeof text === "function" ? text() : text
              pendingValue.current = value
              copyToClipboard(value)
              onClick?.(event)
            }}
            {...props}>
            <CopyStateIcon copied={isCopied} idleIcon={idleIcon} doneIcon={doneIcon} />
            {children}
          </Button>
        } />
      <TooltipContent sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  )

  if (toastManager) {
    return button
  }

  return (
    <AnchoredToastProvider toastManager={ownManager}>
      {button}
    </AnchoredToastProvider>
  );
}
