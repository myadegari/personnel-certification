"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gooeyToast } from "goey-toast";
import { internalAxios } from "@/lib/axios";
import { useUploadFile } from "@/hooks/useUploadFile";
import { useFileUrl } from "@/hooks/useFileUrl";
import { useUser } from "@/hooks/useUser";
import { joinUnits } from "@/lib/organizingUnits";
import OrganizingUnitsPicker from "@/components/OrganizingUnitsPicker";
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
import { PersianDatePicker } from "@/components/admin/PersianDatePicker";
import UserSearchCombobox from "@/components/admin/UserSearchCombobox";
import MediaPickerDialog from "@/components/admin/MediaPickerDialog";
import { ImagePlus, Loader as Loader2, Save, X } from "reicon-react";

function Field({ label, hint, required, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StampTile({ preview, inputRef, onFileChange, onOpenPicker, onClear, label }) {
  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        onClick={(e) => (e.target.value = null)}
        className="hidden"
      />
      {preview ? (
        <div className="group relative flex h-24 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted/50">
          <img src={preview} alt={label} className="max-h-full object-contain" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/45 group-hover:opacity-100 group-focus-within:bg-black/45 group-focus-within:opacity-100 [@media(hover:none)]:bg-black/45 [@media(hover:none)]:opacity-100">
            <button type="button" onClick={onOpenPicker} className="cursor-pointer rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-white">
              کتابخانه
            </button>
            <button type="button" onClick={() => inputRef.current?.click()} className="cursor-pointer rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-white">
              تغییر
            </button>
            <button type="button" onClick={onClear} className="cursor-pointer rounded-lg bg-red-500/90 p-1.5 text-white hover:bg-red-500" aria-label="حذف">
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border p-3 text-center transition-colors hover:border-emerald-400/50">
          <ImagePlus className="size-5 text-emerald-600" />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={onOpenPicker}>
              <ImagePlus className="size-4" /> کتابخانه
            </Button>
            <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={() => inputRef.current?.click()}>
              بارگذاری
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const emptyForm = {
  name: "",
  date: null,
  duration: "",
  organizingUnits: [],
  organizingUnit: "",
  signatory: null,
  signatory2: null,
};

export default function DeputyCourseFormDialog({ open, onOpenChange, courseData }) {
  const queryClient = useQueryClient();
  const uploadFileMutation = useUploadFile();
  const { data: currentUser } = useUser();

  // Units of the deputy head's own deputy (from the cached dashboard payload).
  const { data: dashboard } = useQuery({
    queryKey: ["deputyDashboard"],
    queryFn: async () => (await internalAxios.get("/dashboard/deputy")).data,
    enabled: open,
  });
  const deputyName = dashboard?.deputy?.name || "";
  const deputyUnits = dashboard?.deputy?.units || [];

  const isEditing = !!courseData;
  const [formData, setFormData] = useState(emptyForm);
  const [selectedSignatory1, setSelectedSignatory1] = useState(null);
  const [selectedSignatory2, setSelectedSignatory2] = useState(null);
  const [stampFile1, setStampFile1] = useState(null);
  const [stampFile2, setStampFile2] = useState(null);
  const [stampPreview1, setStampPreview1] = useState("");
  const [stampPreview2, setStampPreview2] = useState("");
  const [stampId1, setStampId1] = useState(null);
  const [stampId2, setStampId2] = useState(null);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const refStampFile1 = useRef(null);
  const refStampFile2 = useRef(null);

  const stamp1UrlQuery = useFileUrl(courseData?.unitStamp);
  const stamp2UrlQuery = useFileUrl(courseData?.unitStamp2);

  useEffect(() => {
    if (open) {
      if (isEditing) {
        setFormData({
          name: courseData.name || "",
          date: courseData.date ? new Date(courseData.date * 1000) : null,
          duration: courseData.duration || "",
          organizingUnits: courseData.organizingUnits || [],
          organizingUnit: courseData.organizingUnit || "",
          signatory: courseData.signatory?._id || null,
          signatory2: courseData.signatory2?._id || null,
        });
        setSelectedSignatory1(courseData.signatory || null);
        setSelectedSignatory2(courseData.signatory2 || null);
        setStampId1(courseData.unitStamp || null);
        setStampId2(courseData.unitStamp2 || null);
        setStampPreview1(stamp1UrlQuery.data || "");
        setStampPreview2(stamp2UrlQuery.data || "");
      } else {
        setFormData(emptyForm);
        setSelectedSignatory2(null);
        setStampId1(null);
        setStampId2(null);
        setStampPreview1("");
        setStampPreview2("");
      }
      setStampFile1(null);
      setStampFile2(null);
      setPickerTarget(null);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseData, open, stamp1UrlQuery.data, stamp2UrlQuery.data]);

  // In create mode the selection defaults to the deputy itself once the
  // dashboard payload (with its units) is available.
  useEffect(() => {
    if (open && !isEditing && deputyName && formData.organizingUnits.length === 0) {
      setFormData((prev) => ({
        ...prev,
        organizingUnits: [deputyName],
        organizingUnit: deputyName,
      }));
    }
  }, [open, isEditing, deputyName, formData.organizingUnits.length]);

  // Options = the deputy's own name + its units; legacy snapshot values from
  // an existing course keep showing as chips when editing.
  const unitOptions = (() => {
    const opts = [];
    for (const u of [deputyName, ...deputyUnits]) {
      if (u && !opts.some((o) => o.value === u)) opts.push({ value: u, label: u });
    }
    for (const u of formData.organizingUnits || []) {
      if (!opts.some((o) => o.value === u)) opts.push({ value: u, label: u });
    }
    return opts;
  })();

  const handleUnitsChange = (units) => {
    setFormData((prev) => ({
      ...prev,
      organizingUnits: units,
      organizingUnit: joinUnits(units),
    }));
  };

  // Default signatory 1 to the deputy head themself in create mode (still
  // changeable via the combobox). Applied once the profile is available.
  useEffect(() => {
    if (open && !isEditing && currentUser?._id && !formData.signatory) {
      setSelectedSignatory1(currentUser);
      setFormData((prev) => ({ ...prev, signatory: currentUser._id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEditing, currentUser?._id, formData.signatory]);

  const handleFile1Change = (e) => {
    if (e.target.files?.[0]) {
      setStampFile1(e.target.files[0]);
      setStampId1(null);
      setStampPreview1(URL.createObjectURL(e.target.files[0]));
    }
  };
  const handleFile2Change = (e) => {
    if (e.target.files?.[0]) {
      setStampFile2(e.target.files[0]);
      setStampId2(null);
      setStampPreview2(URL.createObjectURL(e.target.files[0]));
    }
  };
  const clearStamp1 = () => {
    setStampFile1(null);
    setStampId1(null);
    setStampPreview1("");
  };
  const clearStamp2 = () => {
    setStampFile2(null);
    setStampId2(null);
    setStampPreview2("");
  };
  const handlePickStamp = (item) => {
    if (!item) return;
    if (pickerTarget === "stamp1") {
      setStampId1(item.id);
      setStampFile1(null);
      setStampPreview1(item.url || "");
    } else if (pickerTarget === "stamp2") {
      setStampId2(item.id);
      setStampFile2(null);
      setStampPreview2(item.url || "");
    }
    setPickerTarget(null);
  };

  const toSec = (d) => (d ? Math.floor(new Date(d).getTime() / 1000) : null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.name.trim() || !formData.date || !formData.duration) {
      setError("نام، تاریخ و مدت زمان دوره الزامی است.");
      return;
    }
    if (!formData.signatory) {
      setError("انتخاب امضاکننده اول الزامی است.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        date: toSec(formData.date),
        duration: Number(formData.duration),
        organizingUnits: formData.organizingUnits,
        organizingUnit: formData.organizingUnit || joinUnits(formData.organizingUnits),
        signatory: formData.signatory,
        signatory2: formData.signatory2 || null,
        unitStamp: stampFile1 ? null : stampId1,
        unitStamp2: stampFile2 ? null : stampId2,
      };

      let course;
      if (isEditing) {
        const { data } = await internalAxios.put(
          `/dashboard/deputy/courses/${courseData._id}`,
          payload
        );
        course = data;
      } else {
        const { data } = await internalAxios.post("/dashboard/deputy/courses", payload);
        course = data;
      }

      // Stamp file uploads need the course code (the upload route attaches
      // them to the course automatically).
      if (stampFile1) {
        await uploadFileMutation.mutateAsync({
          file: stampFile1,
          fileType: "stamp1",
          courseCode: course.courseCode,
        });
      }
      if (stampFile2) {
        await uploadFileMutation.mutateAsync({
          file: stampFile2,
          fileType: "stamp2",
          courseCode: course.courseCode,
        });
      }

      gooeyToast.success(isEditing ? "دوره ویرایش شد." : "دوره ایجاد شد.");
      queryClient.invalidateQueries({ queryKey: ["deputyDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["deputyCourses"] });
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.error || "خطایی رخ داد.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? "ویرایش دوره" : "ایجاد دوره جدید"}</DialogTitle>
            <DialogDescription>
              این دوره به معاونت شما اختصاص می‌یابد و در فهرست عمومی دوره‌ها نمایش داده نمی‌شود.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            <div className="grid max-h-[55vh] grid-cols-1 gap-4 overflow-y-auto px-1 sm:grid-cols-2">
              <Field label="نام دوره" required className="sm:col-span-2">
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="نام دوره"
                  required
                />
              </Field>
              <Field label="تاریخ برگزاری" required>
                <PersianDatePicker
                  value={formData.date}
                  onChange={(d) => setFormData({ ...formData, date: d })}
                  placeholder="تاریخ برگزاری"
                />
              </Field>
              <Field label="مدت زمان (ساعت)" required>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required
                />
              </Field>
              <Field
                label="واحد برگزارکننده"
                hint={`${deputyName || "معاونت"} و/یا حداکثر دو واحد از واحدهای آن — برای انتخاب/حذف روی گزینه‌ها بزنید.`}
                className="sm:col-span-2"
              >
                <OrganizingUnitsPicker
                  options={unitOptions}
                  selected={formData.organizingUnits}
                  onChange={handleUnitsChange}
                  max={2}
                />
              </Field>
              <Field label="امضاکننده اول" required>
                <UserSearchCombobox
                  selectedUser={selectedSignatory1}
                  onSelectUser={(user) => {
                    setSelectedSignatory1(user);
                    setFormData((p) => ({ ...p, signatory: user?._id || null }));
                  }}
                />
              </Field>
              <Field label="امضاکننده دوم (اختیاری)">
                <UserSearchCombobox
                  selectedUser={selectedSignatory2}
                  onSelectUser={(user) => {
                    setSelectedSignatory2(user);
                    setFormData((p) => ({ ...p, signatory2: user?._id || null }));
                  }}
                />
              </Field>
              <Field label="مهر اول (اختیاری)">
                <StampTile
                  preview={stampPreview1}
                  inputRef={refStampFile1}
                  onFileChange={handleFile1Change}
                  onOpenPicker={() => setPickerTarget("stamp1")}
                  onClear={clearStamp1}
                  label="مهر اول"
                />
              </Field>
              <Field label="مهر دوم (اختیاری)">
                <StampTile
                  preview={stampPreview2}
                  inputRef={refStampFile2}
                  onFileChange={handleFile2Change}
                  onOpenPicker={() => setPickerTarget("stamp2")}
                  onClear={clearStamp2}
                  label="مهر دوم"
                />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                انصراف
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {isEditing ? "ذخیره تغییرات" : "ایجاد دوره"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <MediaPickerDialog
        open={!!pickerTarget}
        onOpenChange={(v) => !v && setPickerTarget(null)}
        onSelect={handlePickStamp}
      />
    </>
  );
}