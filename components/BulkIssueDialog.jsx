"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { gooeyToast } from "goey-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function BulkIssueDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState("upload");
  const [courseId, setCourseId] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);

  const { data: dashboard } = useQuery({
    queryKey: ["deputyDashboard"],
    queryFn: async () => (await internalAxios.get("/dashboard/deputy")).data,
    enabled: open,
  });
  const courses = dashboard?.courses || [];

  const reset = () => {
    setStep("upload");
    setCourseId("");
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
    if (!courseId) {
      gooeyToast.error("ابتدا یک دوره انتخاب کنید.");
      return;
    }
    if (!file) {
      gooeyToast.error("ابتدا یک فایل CSV انتخاب کنید.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      formData.append("courseId", courseId);
      const { data } = await internalAxios.post("/dashboard/deputy/bulk-issue", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (mode === "dry-run") {
        setPreview(data);
        setStep("preview");
      } else {
        setResults(data);
        setStep("results");
        queryClient.invalidateQueries({ queryKey: ["deputyDashboard"] });
        gooeyToast.success("صدور گواهی‌ها با موفقیت انجام شد.");
      }
    } catch (err) {
      gooeyToast.error(err.response?.data?.error || "خطا در پردازش فایل.");
    } finally {
      setLoading(false);
    }
  };

  const downloadErrors = (data) => {
    const errorRows = (data.results || [])
      .filter((r) => r.status === "error" || r.status === "skipped")
      .map((r) => ({ line: r.line, nationalId: r.nationalId || "", status: r.status, errors: (r.errors || []).join(" | ") }));
    if (!errorRows.length) {
      gooeyToast("خطایی برای دانلود وجود ندارد.");
      return;
    }
    downloadTextFile("issue-errors.csv", Papa.unparse(errorRows));
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>صدور دسته‌جمعی گواهی</DialogTitle>
          <DialogDescription>
            مرحله {stepIndex + 1} از {STEPS.length}: {STEP_LABELS[step]}
          </DialogDescription>
        </DialogHeader>

        <Progress value={((stepIndex + 1) / STEPS.length) * 100} className="mb-2" />

        {step === "upload" && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">دوره</label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب دوره" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                  <span className="text-xs text-muted-foreground">
                    ستون‌ها: firstName, lastName, nationalId, gender
                  </span>
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
              onClick={() => { window.location.href = "/api/dashboard/deputy/bulk-issue/template"; }}
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
                    <TableHead>کد ملی</TableHead>
                    <TableHead>اقدام</TableHead>
                    <TableHead>خطاها</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.results.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{r.line}</TableCell>
                      <TableCell dir="ltr">{r.nationalId || "—"}</TableCell>
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
            <div className="max-h-72 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ردیف</TableHead>
                    <TableHead>کد ملی</TableHead>
                    <TableHead>اقدام</TableHead>
                    <TableHead>شماره گواهی</TableHead>
                    <TableHead>خطاها</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.results.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{r.line}</TableCell>
                      <TableCell dir="ltr">{r.nationalId || "—"}</TableCell>
                      <TableCell>
                        <RowStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell dir="ltr" className="font-mono text-xs">{r.certificateNumber || "—"}</TableCell>
                      <TableCell className="text-xs text-red-600">
                        {(r.errors || []).join("، ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => downloadErrors(results)}>
              <Download className="h-4 w-4" /> دانلود گزارش خطاها
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "upload" && (
            <>
              <Button variant="outline" className="cursor-pointer" onClick={() => handleOpenChange(false)}>انصراف</Button>
              <Button className="cursor-pointer" disabled={!file || !courseId || loading} onClick={() => runImport("dry-run")}>
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
                تایید و صدور گواهی‌ها
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
      <Badge className={BADGE_TONES.green}>کاربر موجود: {summary.existingUser ?? 0}</Badge>
      <Badge className={BADGE_TONES.blue}>مهمان: {summary.guest ?? 0}</Badge>
      <Badge className={BADGE_TONES.amber}>رد شده: {summary.skipped ?? 0}</Badge>
      <Badge className={BADGE_TONES.ruby}>خطا: {summary.errors ?? 0}</Badge>
    </div>
  );
}

function RowStatusBadge({ status }) {
  const map = {
    existing_user: { color: "green", label: "کاربر موجود" },
    guest: { color: "blue", label: "مهمان" },
    issued: { color: "green", label: "صادر شد" },
    guest_issued: { color: "blue", label: "گواهی مهمان صادر شد" },
    skipped: { color: "amber", label: "رد شده" },
    error: { color: "ruby", label: "خطا" },
  };
  const cfg = map[status] || { color: "gray", label: status };
  return <Badge className={BADGE_TONES[cfg.color] || BADGE_TONES.gray}>{cfg.label}</Badge>;
}