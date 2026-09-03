"use client";

import { useEffect, useId, useRef, useState } from "react";
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
import { Label } from "@/components/ui/label";
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
import { Download, CloudUpload as UploadCloud, FileText as FileSpreadsheet } from "reicon-react";
import { clsx } from "clsx";
import { PersianDatePicker } from "@/components/admin/PersianDatePicker";

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

export default function BulkIssueDialog({ open, onOpenChange, initialCourseId, scope = "deputy" }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState("upload");
  const [courseId, setCourseId] = useState("");
  const [file, setFile] = useState(null);
  const [issueDate, setIssueDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const courseSelectId = useId();
  const issueDateId = useId();

  // Deputy scope lists the head's own private courses; admin scope lists all
  // courses (issuance authorization is enforced server-side either way).
  const { data: dashboard } = useQuery({
    queryKey: ["deputyDashboard"],
    queryFn: async () => (await internalAxios.get("/dashboard/deputy")).data,
    enabled: open && scope === "deputy",
  });
  const { data: adminCourses } = useQuery({
    queryKey: ["adminCourses"],
    queryFn: async () => (await internalAxios.get("/admin/courses")).data,
    enabled: open && scope === "admin",
  });
  const courses = (scope === "admin"
    ? (adminCourses || []).map((c) => ({ _id: c._id, name: c.name, date: c.date }))
    : dashboard?.courses || []
  ).filter(Boolean);

  const selectedCourse = courses.find((c) => c._id === courseId) || null;

  // Preselect the course when opened from a per-course action button.
  useEffect(() => {
    if (open) setCourseId(initialCourseId || "");
  }, [open, initialCourseId]);

  const reset = () => {
    setStep("upload");
    setCourseId("");
    setFile(null);
    setIssueDate(null);
    setPreview(null);
    setResults(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // CSV is validated by extension or MIME: the accept attr only filters the
  // file picker, so drag-and-drop must be checked separately.
  const isCsvFile = (f) =>
    Boolean(f) && (/\.csv$/i.test(f.name || "") || f.type === "text/csv");

  const acceptFile = (candidate) => {
    if (!candidate) return false;
    if (!isCsvFile(candidate)) {
      gooeyToast.error("فقط فایل CSV پذیرفته می‌شود.");
      return false;
    }
    setFile(candidate);
    return true;
  };

  const onFileChange = (e) => {
    acceptFile(e.target.files?.[0]);
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
    const issueDateSec = issueDate ? Math.floor(new Date(issueDate).getTime() / 1000) : null;
    if (issueDateSec && selectedCourse && Number.isFinite(selectedCourse.date) && issueDateSec < selectedCourse.date) {
      gooeyToast.error("تاریخ صدور نمی‌تواند قدیمی‌تر از تاریخ برگزاری دوره باشد.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      formData.append("courseId", courseId);
      if (issueDateSec) formData.append("issueDate", String(issueDateSec));
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
        queryClient.invalidateQueries({ queryKey: ["enrollments"] });
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
              <Label htmlFor={courseSelectId} className="text-sm font-medium text-foreground">دوره</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger id={courseSelectId} className="w-full">
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
            <div className="space-y-1.5">
              <Label htmlFor={issueDateId} className="text-sm font-medium text-foreground">تاریخ صدور (اختیاری)</Label>
              <PersianDatePicker
                id={issueDateId}
                value={issueDate}
                onChange={(d) => setIssueDate(d)}
                placeholder="پیش‌فرض: امروز"
              />
              <p className="text-[11px] text-muted-foreground">
                در صورت انتخاب، روی همه گواهی‌های این فایل اعمال می‌شود؛ نمی‌تواند قدیمی‌تر از تاریخ برگزاری دوره باشد.
              </p>
            </div>
            <div
              role="button"
              tabIndex={0}
              aria-label="انتخاب فایل CSV"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                acceptFile(e.dataTransfer.files?.[0]);
              }}
              className={clsx(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                file ? "border-emerald-500 bg-emerald-50/50" : "border-border hover:border-emerald-400"
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
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
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
                  {preview.results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        نتیجه‌ای برای نمایش نیست
                      </TableCell>
                    </TableRow>
                  ) : (
                    preview.results.map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{r.line}</TableCell>
                        <TableCell dir="ltr">{r.nationalId || "—"}</TableCell>
                        <TableCell>
                          <RowStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-xs text-destructive">
                          {(r.errors || []).join("، ") || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
                  {results.results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        نتیجه‌ای برای نمایش نیست
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.results.map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{r.line}</TableCell>
                        <TableCell dir="ltr">{r.nationalId || "—"}</TableCell>
                        <TableCell>
                          <RowStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell dir="ltr" className="font-mono text-xs">{r.certificateNumber || "—"}</TableCell>
                        <TableCell className="text-xs text-destructive">
                          {(r.errors || []).join("، ") || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
              <Button
                className="cursor-pointer"
                disabled={!file || !courseId}
                loading={loading}
                onClick={() => runImport("dry-run")}
              >
                بررسی فایل
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" className="cursor-pointer" onClick={() => setStep("upload")} disabled={loading}>
                بازگشت
              </Button>
              <Button className="cursor-pointer" loading={loading} onClick={() => runImport("commit")}>
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