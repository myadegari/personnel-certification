"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { glassShell, GlassPanel, GlassHeader, PRIMARY_BTN } from "@/components/shared/glass-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/password-input";
import { internalAxios } from "@/lib/axios";
import { gooeyToast } from "goey-toast";
import { Key as KeyRound, Copy, Refresh } from "reicon-react";
import { cn } from "@/lib/utils";

const MIN_LENGTH = 8;

export default function TempPasswordDialog({ user, open, onOpenChange, onDone }) {
  const [mode, setMode] = useState("generate"); // generate | custom
  const [custom, setCustom] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("generate");
      setCustom("");
      setResult(null);
      setError("");
      setLoading(false);
    }
  }, [open, user?._id]);

  const canSave = mode === "generate" || custom.length >= MIN_LENGTH;

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await internalAxios.post(
        `/admin/users/${user._id}/temp-password`,
        { password: mode === "custom" ? custom : undefined }
      );
      setResult(data.tempPassword);
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.error || "خطا در تنظیم رمز موقت.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      gooeyToast.success("رمز موقت کپی شد.");
    } catch {
      gooeyToast.error("کپی ممکن نشد؛ رمز را دستی انتخاب کنید.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(glassShell("md"),'p-6')}>
        <GlassPanel>
          <GlassHeader
            icon={KeyRound}
            title="تنظیم رمز عبور موقت"
            description={user ? `برای «${user.firstName} ${user.lastName}»` : ""}
          />

        {result ? (
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              رمز موقت ساخته شد. آن را در اختیار کاربر بگذارید؛ کاربر پس از ورود با
              این رمز موظف به تعیین رمز جدید است. این رمز فقط یک‌بار نمایش داده
              می‌شود.
            </p>
            <div
              className="flex items-center gap-2 rounded-2xl border border-black/5 bg-muted/50 p-3"
              dir="ltr"
            >
              <code className="flex-1 break-all font-mono text-base tracking-wider">
                {result}
              </code>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="cursor-pointer"
                onClick={copy}
                aria-label="کپی رمز موقت"
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={generate}
                loading={loading}
              >
                <Refresh className="size-4" /> تولید مجدد
              </Button>
              <Button
                type="button"
                size="sm"
                className="cursor-pointer"
                onClick={() => onOpenChange(false)}
              >
                بستن
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "generate" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setMode("generate")}
              >
                تولید خودکار
              </Button>
              <Button
                type="button"
                variant={mode === "custom" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setMode("custom")}
              >
                رمز دلخواه
              </Button>
            </div>

            {mode === "custom" && (
              <div className="space-y-1.5">
                <Label htmlFor="tempPassword">رمز موقت</Label>
                <PasswordInput
                  id="tempPassword"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder={`حداقل ${MIN_LENGTH} کاراکتر`}
                />
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )}

        {!result && (
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              className={PRIMARY_BTN}
              onClick={generate}
              loading={loading}
              disabled={!canSave}
            >
              تنظیم رمز موقت
            </Button>
          </DialogFooter>
        )}
        </GlassPanel>
      </DialogContent>
    </Dialog>
  );
}
