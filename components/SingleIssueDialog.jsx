"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gooeyToast } from "goey-toast";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ExternalLink } from "lucide-react";

const emptyForm = { firstName: "", lastName: "", nationalId: "", gender: "" };

export default function SingleIssueDialog({ open, onOpenChange, initialCourseId }) {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const { data: dashboard } = useQuery({
    queryKey: ["deputyDashboard"],
    queryFn: async () => (await internalAxios.get("/dashboard/deputy")).data,
    enabled: open,
  });
  const courses = dashboard?.courses || [];

  useEffect(() => {
    if (open) {
      setCourseId(initialCourseId || "");
      setFormData(emptyForm);
      setResult(null);
      setError("");
    }
  }, [open, initialCourseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!courseId) {
      setError("انتخاب دوره الزامی است.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await internalAxios.post("/dashboard/deputy/issue", {
        courseId,
        ...formData,
      });
      if (data.skipped) {
        setError(data.reason || "این گواهی قبلاً صادر شده است.");
      } else {
        setResult(data);
        gooeyToast.success(`گواهی ${data.certificateNumber} صادر شد.`);
        queryClient.invalidateQueries({ queryKey: ["deputyDashboard"] });
      }
    } catch (err) {
      setError(err.response?.data?.error || "خطا در صدور گواهی.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>صدور تکی گواهی</DialogTitle>
          <DialogDescription>
            اگر فرد حساب کاربری داشته باشد (کد ملی یکتا)، ثبت‌نام و گواهی برای او صادر می‌شود؛ در غیر این صورت گواهی مهمان ثبت می‌گردد.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm text-muted-foreground">
              {result.isGuest ? "گواهی مهمان" : "گواهی"} با موفقیت صادر شد.
            </p>
            <p className="font-mono text-2xl font-bold tracking-widest" dir="ltr">
              {result.certificateNumber}
            </p>
            <p className="text-xs text-muted-foreground">
              لینک عمومی: /verify/{result.guestId || "…"} — پس از پردازش، PDF از طریق همین لینک قابل مشاهده است.
            </p>
            <DialogFooter className="justify-center gap-2">
              <Button variant="outline" className="cursor-pointer" onClick={() => setResult(null)}>
                صدور مورد دیگر
              </Button>
              <Button className="cursor-pointer" onClick={() => onOpenChange(false)}>پایان</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            <div className="space-y-1.5">
              <Label>دوره</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب دوره" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="singleFirstName">نام</Label>
                <Input
                  id="singleFirstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="singleLastName">نام خانوادگی</Label>
                <Input
                  id="singleLastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="singleNationalId">کد ملی</Label>
              <Input
                id="singleNationalId"
                dir="ltr"
                value={formData.nationalId}
                onChange={(e) => setFormData((p) => ({ ...p, nationalId: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>جنسیت</Label>
              <RadioGroup
                value={formData.gender}
                onValueChange={(v) => setFormData((p) => ({ ...p, gender: v }))}
                className="flex gap-6"
                required
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Male" id="singleMale" />
                  <Label htmlFor="singleMale" className="font-normal">آقا</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Female" id="singleFemale" />
                  <Label htmlFor="singleFemale" className="font-normal">خانم</Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={loading}>
                انصراف
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={loading || !courseId}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
                صدور گواهی
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}