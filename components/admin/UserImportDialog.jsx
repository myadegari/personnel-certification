"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { gooeyToast } from "goey-toast";
import { useQueryClient } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BADGE_TONES } from "@/lib/statusLabels";
import { Download, UploadCloud, FileSpreadsheet, Loader2 } from "lucide-react";
import { clsx } from "clsx";

const STEPS = ["upload", "preview", "results"];
const STEP_LABELS = { upload: "انتخاب فایل", preview: "پیش‌نمایش و اعتبارسنجی", results: "نتیجه" };

function downloadTextFile(filename, text, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["" + text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function UserImportDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setResults(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const runImport = async (mode) => {
    if (!file) {
      gooeyToast.error("ابتدا یک فایل CSV انتخاب کنید.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      const { data } = await internalAxios.post("/admin/users/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (mode === "dry-run") {
        setPreview(data);
        setStep("preview");
      } else {
        setResults(data);
        setStep("results");
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
        gooeyToast.success("ایمپورت با موفقیت انجام شد.");
      }
    } catch (err) {
      gooeyToast.error(err.response?.data?.error || "خطا در پردازش فایل.");
    } finally {
      setLoading(false);
    }
  };

  const downloadErrors = (data) => {
    const errorRows = (data.results || [])
      .filter((r) => r.status === "error")
      .map((r) => ({ line: r.line, personnelNumber: r.personnelNumber || "", errors: (r.errors || []).join(" | ") }));
    if (!errorRows.length) {
      gooeyToast("خطایی برای دانلود وجود ندارد.");
      return;
    }
    downloadTextFile("import-errors.csv", Papa.unparse(errorRows));
  };

  const downloadPasswords = (data) => {
    const rows = (data.results || [])
      .filter((r) => r.generatedPassword)
      .map((r) => ({ personnelNumber: r.personnelNumber, password: r.generatedPassword }));
    if (!rows.length) {
      gooeyToast("رمز عبور تولیدشده‌ای وجود ندارد.");
      return;
    }
    downloadTextFile("generated-passwords.csv", Papa.unparse(rows));
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>وارد کردن دسته‌جمعی کاربران</DialogTitle>
          <DialogDescription>
            مرحله {stepIndex + 1} از {STEPS.length}: {STEP_LABELS[step]}
          </DialogDescription>
        </DialogHeader>

        <Progress value={((stepIndex + 1) / STEPS.length) * 100} className="mb-2" />

        {step === "upload" && (
          <div className="space-y-4 py-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) setFile(dropped);
              }}
              className={clsx(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                file ? "border-emerald-500 bg-emerald-50/50" : "border-gray-300 hover:border-emerald-400"
              )}
            >
              <UploadCloud className="h-8 w-8 text-emerald-600" />
              {file ? (
                <span className="text-sm font-medium">{file.name}</span>
              ) : (
                <>
                  <span className="text-sm font-medium">فایل CSV را بکشید یا کلیک کنید</span>
                  <span className="text-xs text-muted-foreground">ستون‌ها مطابق فایل الگو</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => { window.location.href = "/api/admin/users/import/template"; }}
            >
              <FileSpreadsheet className="h-4 w-4" /> دانلود فایل الگو
            </Button>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-3 py-2">
            <SummaryBar summary={preview.summary} />
            <div className="max-h-72 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ردیف</TableHead>
                    <TableHead>شماره پرسنلی</TableHead>
                    <TableHead>اقدام</TableHead>
                    <TableHead>خطاها</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.results.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{r.line}</TableCell>
                      <TableCell>{r.personnelNumber || "—"}</TableCell>
                      <TableCell>
                        <RowStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-xs text-red-600">
                        {(r.errors || []).join("، ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === "results" && results && (
          <div className="space-y-3 py-2">
            <SummaryBar summary={results.summary} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => downloadErrors(results)}>
                <Download className="h-4 w-4" /> دانلود گزارش خطاها
              </Button>
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => downloadPasswords(results)}>
                <Download className="h-4 w-4" /> دانلود رمزهای تولیدشده
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "upload" && (
            <>
              <Button variant="outline" className="cursor-pointer" onClick={() => handleOpenChange(false)}>انصراف</Button>
              <Button className="cursor-pointer" disabled={!file || loading} onClick={() => runImport("dry-run")}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                بررسی فایل
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" className="cursor-pointer" onClick={() => setStep("upload")} disabled={loading}>
                بازگشت
              </Button>
              <Button className="cursor-pointer" disabled={loading} onClick={() => runImport("commit")}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                تایید و اجرای ایمپورت
              </Button>
            </>
          )}
          {step === "results" && (
            <>
              <Button variant="outline" className="cursor-pointer" onClick={reset}>افزودن فایل دیگر</Button>
              <Button className="cursor-pointer" onClick={() => handleOpenChange(false)}>پایان</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryBar({ summary = {} }) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <Badge className={BADGE_TONES.gray}>مجموع: {summary.total ?? 0}</Badge>
      <Badge className={BADGE_TONES.green}>ایجاد: {summary.created ?? 0}</Badge>
      <Badge className={BADGE_TONES.blue}>بروزرسانی: {summary.updated ?? 0}</Badge>
      <Badge className={BADGE_TONES.ruby}>خطا: {summary.errors ?? 0}</Badge>
    </div>
  );
}

function RowStatusBadge({ status }) {
  const map = {
    create: { color: "green", label: "ایجاد" },
    created: { color: "green", label: "ایجاد شد" },
    update: { color: "blue", label: "بروزرسانی" },
    updated: { color: "blue", label: "بروزرسانی شد" },
    skipped: { color: "gray", label: "رد شده" },
    error: { color: "ruby", label: "خطا" },
  };
  const cfg = map[status] || { color: "gray", label: status };
  return <Badge className={BADGE_TONES[cfg.color] || BADGE_TONES.gray}>{cfg.label}</Badge>;
}
