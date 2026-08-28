"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { internalAxios } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import CertificatePatternCombobox from "./CertificatePatternCombobox";
import { useQuery } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { useFileUrl } from "@/hooks/useFileUrl";
import { useCourseMutation } from "@/hooks/useCourseMutation";
import { useUploadFile } from "@/hooks/useUploadFile";
import UserSearchCombobox from "./UserSearchCombobox";
import MediaPickerDialog from "./MediaPickerDialog";
import { PersianDatePicker } from "./PersianDatePicker";
import { formatDate } from "@/lib/persian-date";
import { motion, AnimatePresence } from "motion/react";
import { spring, fadeUp, staggerContainer, usePrefersReducedMotion } from "@/lib/motion";
import { clsx } from "clsx";
import {
  GraduationCap,
  Info,
  Users,
  ImagePlus,
  Upload,
  X,
  Check,
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const fetchCertificateSequences = async () => {
  const { data } = await internalAxios.get("/admin/certificate-sequences");
  return data;
};

function formatPersian(dateLike) {
  if (!dateLike) return "—";
  try {
    return formatDate(new Date(dateLike), "yyyy/MM/dd");
  } catch {
    return "—";
  }
}

function Field({ label, hint, className, children }) {
  return (
    <div className={clsx("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FormSection({ icon: Icon, title, description, children }) {
  return (
    <motion.section
      variants={fadeUp}
      className="rounded-3xl border border-black/5 bg-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm"
    >
      <header className="mb-4 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <Icon className="size-5" />
        </span>
        <div>
          <h4 className="font-semibold">{title}</h4>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </motion.section>
  );
}

function Stepper({ currentStep }) {
  const steps = ["اطلاعات دوره", "امضاها و مهرها"];
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        {steps.map((label, i) => {
          const n = i + 1;
          const active = currentStep === n;
          const done = currentStep > n;
          return (
            <Fragment key={n}>
              <div className="relative flex items-center gap-2 rounded-full px-3 py-1.5">
                {active && (
                  <motion.span
                    layoutId="courseStepPill"
                    className="absolute inset-0 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30"
                    transition={spring}
                  />
                )}
                <span
                  className={clsx(
                    "relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-bold",
                    active
                      ? "bg-emerald-500 text-white"
                      : done
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-black/5 text-gray-500"
                  )}
                >
                  {done ? <Check className="size-3.5" /> : n}
                </span>
                <span className={clsx("relative z-10 text-sm font-medium", active ? "text-emerald-700" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && <div className="h-px w-6 bg-black/10" />}
            </Fragment>
          );
        })}
      </div>
      <Progress value={(currentStep / steps.length) * 100} className="h-1.5" />
    </div>
  );
}

function CourseDetailsFields({ formData, setFormData, sequences }) {
  const currentSequence = sequences.find((s) => s.pattern === formData.certificateNumberPattern);
  return (
    <FormSection icon={Info} title="اطلاعات دوره">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="نام دوره" className="sm:col-span-2">
          <Input
            name="name"
            placeholder="نام دوره"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </Field>
        <Field label="تاریخ برگزاری">
          <PersianDatePicker
            value={formData.date}
            onChange={(d) => setFormData({ ...formData, date: d })}
            placeholder="تاریخ برگزاری"
          />
        </Field>
        <Field
          label="مهلت ثبت‌نام (اختیاری)"
          hint="در صورت عدم انتخاب، یک روز پس از تاریخ برگزاری تعیین می‌شود."
        >
          <PersianDatePicker
            value={formData.enrollmentDeadline}
            onChange={(d) => setFormData({ ...formData, enrollmentDeadline: d })}
            placeholder="پیش‌فرض: یک روز پس از شروع دوره"
          />
        </Field>
        <Field label="مدت زمان (ساعت)">
          <Input
            name="duration"
            type="number"
            placeholder="مدت زمان (ساعت)"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            required
          />
        </Field>
        <Field label="واحد برگزارکننده">
          <Input
            name="organizingUnit"
            placeholder="واحد برگزار کننده"
            value={formData.organizingUnit}
            onChange={(e) => setFormData({ ...formData, organizingUnit: e.target.value })}
            required
          />
        </Field>
        <Field label="الگوی شماره گواهی" className="sm:col-span-2">
          <CertificatePatternCombobox
            value={formData.certificateNumberPattern}
            onChange={(val) => setFormData((prev) => ({ ...prev, certificateNumberPattern: val }))}
          />
          {currentSequence && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>الگوی فعلی: <b className="font-mono text-gray-700">{currentSequence.pattern}</b></span>
              <span>شماره بعدی: <b className="text-gray-700">{(currentSequence.lastNumber + 1).toLocaleString("fa-IR")}</b></span>
              {currentSequence.description && <span>{currentSequence.description}</span>}
            </div>
          )}
        </Field>
      </div>
    </FormSection>
  );
}

function StepSummary({ formData, onEdit }) {
  const rows = [
    { label: "نام دوره", value: formData.name },
    { label: "تاریخ برگزاری", value: formatPersian(formData.date) },
    { label: "مهلت ثبت‌نام", value: formData.enrollmentDeadline ? formatPersian(formData.enrollmentDeadline) : "خودکار (یک روز پس از برگزاری)" },
    { label: "مدت زمان", value: formData.duration ? `${formData.duration} ساعت` : "—" },
    { label: "واحد برگزارکننده", value: formData.organizingUnit },
    { label: "الگوی گواهی", value: formData.certificateNumberPattern },
  ];
  return (
    <motion.div variants={fadeUp} className="rounded-3xl border border-black/5 bg-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold text-gray-800">خلاصه اطلاعات دوره</h4>
        <Button type="button" size="sm" variant="ghost" className="cursor-pointer text-emerald-700 hover:bg-emerald-500/10" onClick={onEdit}>
          <ArrowRight className="size-4" /> ویرایش
        </Button>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 border-b border-dashed border-black/5 py-1.5 text-sm last:border-0">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="truncate font-medium text-gray-800">{r.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </motion.div>
  );
}

function StampPickerTile({ preview, inputRef, onFileChange, onOpenPicker, onClear, label }) {
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
        <div className="group relative flex h-28 items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-stone-50">
          <img src={preview} alt={label} className="max-h-full object-contain" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/45 group-hover:opacity-100">
            <button type="button" onClick={onOpenPicker} className="cursor-pointer rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-white">
              کتابخانه
            </button>
            <button type="button" onClick={() => inputRef.current?.click()} className="cursor-pointer rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-white">
              تغییر
            </button>
            <button type="button" onClick={onClear} className="cursor-pointer rounded-lg bg-red-500/90 p-1.5 text-white hover:bg-red-500" aria-label="حذف">
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-black/10 p-4 text-center transition-colors hover:border-emerald-400/50">
          <ImagePlus className="size-6 text-emerald-600" />
          <p className="text-xs text-muted-foreground">تصویر مهر را انتخاب یا بارگذاری کنید</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={onOpenPicker}>
              <ImagePlus className="size-4" /> کتابخانه
            </Button>
            <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" /> بارگذاری
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SignatoryCard({ title, description, selectedUser, onSelectUser, preview, inputRef, onFileChange, onOpenPicker, onClear }) {
  return (
    <FormSection icon={Users} title={title} description={description}>
      <div className="space-y-4">
        <Field label="امضاکننده">
          <UserSearchCombobox selectedUser={selectedUser} onSelectUser={onSelectUser} />
        </Field>
        <Field label="تصویر مهر">
          <StampPickerTile
            preview={preview}
            inputRef={inputRef}
            onFileChange={onFileChange}
            onOpenPicker={onOpenPicker}
            onClear={onClear}
            label={title}
          />
        </Field>
      </div>
    </FormSection>
  );
}

export default function CourseFormModal({ isOpen, onClose, courseData }) {
  const uploadFileMutation = useUploadFile();
  const courseMutation = useCourseMutation();
  const reduced = usePrefersReducedMotion();
  const [currentStep, setCurrentStep] = useState(1);
  const [createdCourseId, setCreatedCourseId] = useState(null);

  const initialFormData = {
    name: "",
    date: null,
    duration: "",
    organizingUnit: "",
    signatory: null,
    signatory2: null,
    certificateNumberPattern: "",
    courseCode: uuidv4(),
    enrollmentDeadline: null,
  };

  const [formData, setFormData] = useState(initialFormData);
  const refStampFile1 = useRef(null);
  const refStampFile2 = useRef(null);
  const [selectedManager1, setSelectedManager1] = useState(null);
  const [selectedManager2, setSelectedManager2] = useState(null);
  const [stampFile1, setStampFile1] = useState(null);
  const [stampFile2, setStampFile2] = useState(null);
  const [stampPreview1, setStampPreview1] = useState("");
  const [stampPreview2, setStampPreview2] = useState("");
  const [stampId1, setStampId1] = useState(null);
  const [stampId2, setStampId2] = useState(null);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [error, setError] = useState("");

  const isEditing = !!courseData;
  const isSubmitting = courseMutation.isPending || uploadFileMutation.isPending;
  const { data: sequences = [] } = useQuery({
    queryKey: ["certificateSequences"],
    queryFn: fetchCertificateSequences,
    enabled: isOpen,
  });

  const stamp1UrlQuery = useFileUrl(courseData?.unitStamp);
  const stamp2UrlQuery = useFileUrl(courseData?.unitStamp2);

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        setFormData({
          courseCode: courseData.courseCode || uuidv4(),
          name: courseData.name || "",
          date: courseData.date ? new Date(courseData.date * 1000) : null,
          enrollmentDeadline: courseData.enrollmentDeadline
            ? new Date(courseData.enrollmentDeadline * 1000)
            : null,
          duration: courseData.duration || "",
          organizingUnit: courseData.organizingUnit || "",
          signatory: courseData.signatory?._id || null,
          signatory2: courseData.signatory2?._id || null,
          certificateNumberPattern: courseData.certificateNumberPattern || "",
        });
        setSelectedManager1(courseData.signatory || null);
        setSelectedManager2(courseData.signatory2 || null);
        setCreatedCourseId(courseData._id);
        setStampId1(courseData.unitStamp || null);
        setStampId2(courseData.unitStamp2 || null);
        setStampPreview1(stamp1UrlQuery.data || "");
        setStampPreview2(stamp2UrlQuery.data || "");
      } else {
        resetForm();
      }
      setError("");
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseData, isOpen, stamp1UrlQuery.data, stamp2UrlQuery.data]);

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedManager1(null);
    setSelectedManager2(null);
    setStampPreview1("");
    setStampFile1(null);
    setStampPreview2("");
    setStampFile2(null);
    setStampId1(null);
    setStampId2(null);
    setPickerTarget(null);
    setCurrentStep(1);
    setCreatedCourseId(null);
    setError("");
  };

  const handleFile1Change = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setStampFile1(file);
      setStampId1(null);
      setStampPreview1(URL.createObjectURL(file));
    }
  };
  const handleFile2Change = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setStampFile2(file);
      setStampId2(null);
      setStampPreview2(URL.createObjectURL(file));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      let courseId = createdCourseId;
      if (!isEditing && currentStep === 1) {
        const step1Data = {
          name: formData.name,
          date: formData.date
            ? Math.floor(new Date(formData.date).getTime() / 1000)
            : null,
          enrollmentDeadline: formData.enrollmentDeadline
            ? Math.floor(new Date(formData.enrollmentDeadline).getTime() / 1000)
            : null,
          duration: formData.duration,
          organizingUnit: formData.organizingUnit,
          certificateNumberPattern: formData.certificateNumberPattern,
          courseCode: formData.courseCode,
        };
        const createdCourse = await courseMutation.mutateAsync(step1Data);
        setCreatedCourseId(createdCourse._id);
        courseId = createdCourse._id;
        setCurrentStep(2);
        return;
      }

      if (!formData.signatory) {
        setError("لطفاً امضاکننده اول را انتخاب کنید.");
        return;
      }

      let finalStampId1 = stampId1 || null;
      let finalStampId2 = stampId2 || null;

      if (stampFile1) {
        finalStampId1 = await uploadFileMutation.mutateAsync({
          file: stampFile1,
          fileType: "stamp1",
          courseCode: formData.courseCode,
        });
      }
      if (stampFile2) {
        finalStampId2 = await uploadFileMutation.mutateAsync({
          file: stampFile2,
          fileType: "stamp2",
          courseCode: formData.courseCode,
        });
      }

      const finalData = {
        id: courseId,
        ...formData,
        date: formData.date
          ? Math.floor(new Date(formData.date).getTime() / 1000)
          : null,
        enrollmentDeadline: formData.enrollmentDeadline
          ? Math.floor(new Date(formData.enrollmentDeadline).getTime() / 1000)
          : null,
        unitStamp: finalStampId1,
        unitStamp2: finalStampId2,
      };

      await courseMutation.mutateAsync(finalData);
      onClose();
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.message || "خطایی رخ داد.";
      setError(errorMessage);
    }
  };

  const staggerProps = reduced
    ? {}
    : { variants: staggerContainer(0.08), initial: "hidden", animate: "show" };

  const signatoryCards = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SignatoryCard
        title="امضاکننده اول"
        description="الزامی"
        selectedUser={selectedManager1}
        onSelectUser={(user) => {
          setSelectedManager1(user);
          setFormData({ ...formData, signatory: user?._id || null });
        }}
        preview={stampPreview1}
        inputRef={refStampFile1}
        onFileChange={handleFile1Change}
        onOpenPicker={() => setPickerTarget("stamp1")}
        onClear={clearStamp1}
      />
      <SignatoryCard
        title="امضاکننده دوم"
        description="اختیاری"
        selectedUser={selectedManager2}
        onSelectUser={(user) => {
          setSelectedManager2(user);
          setFormData({ ...formData, signatory2: user?._id || null });
        }}
        preview={stampPreview2}
        inputRef={refStampFile2}
        onFileChange={handleFile2Change}
        onOpenPicker={() => setPickerTarget("stamp2")}
        onClear={clearStamp2}
      />
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/30">
                <GraduationCap className="size-6" />
              </span>
              <div className="text-right">
                <DialogTitle>{isEditing ? "ویرایش دوره" : "ایجاد دوره جدید"}</DialogTitle>
                <DialogDescription>
                  {isEditing ? "اطلاعات دوره را به‌روزرسانی کنید." : "در دو مرحله دوره آموزشی را بسازید."}
                </DialogDescription>
              </div>
            </div>
            {!isEditing && <Stepper currentStep={currentStep} />}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mb-3 flex items-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600">
                    <AlertTriangle className="size-4 shrink-0" /> {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-1" style={{ maxHeight: "60vh" }}>
              {isEditing ? (
                <motion.div {...staggerProps} className="space-y-4">
                  <CourseDetailsFields formData={formData} setFormData={setFormData} sequences={sequences} />
                  {signatoryCards}
                </motion.div>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentStep}
                    initial={reduced ? false : { opacity: 0, x: -24 }}
                    animate={reduced ? false : { opacity: 1, x: 0 }}
                    exit={reduced ? false : { opacity: 0, x: 24 }}
                    transition={spring}
                  >
                    {currentStep === 1 ? (
                      <motion.div {...staggerProps} className="space-y-4">
                        <CourseDetailsFields formData={formData} setFormData={setFormData} sequences={sequences} />
                      </motion.div>
                    ) : (
                      <motion.div {...staggerProps} className="space-y-4">
                        <StepSummary formData={formData} onEdit={() => setCurrentStep(1)} />
                        {signatoryCards}
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            <DialogFooter className="mt-4 sm:justify-between">
              {isEditing ? (
                <>
                  <Button type="button" variant="ghost" className="cursor-pointer" onClick={onClose}>انصراف</Button>
                  <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    ذخیره تغییرات
                  </Button>
                </>
              ) : currentStep === 1 ? (
                <>
                  <Button type="button" variant="ghost" className="cursor-pointer" onClick={onClose}>انصراف</Button>
                  <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                    ادامه
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeft className="size-4" />}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => setCurrentStep(1)} disabled={isSubmitting}>
                    <ArrowRight className="size-4" /> بازگشت
                  </Button>
                  <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    اتمام و ذخیره
                  </Button>
                </>
              )}
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
