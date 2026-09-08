"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { gooeyToast } from "goey-toast";
import { internalAxios } from "@/lib/axios";
import { useUploadFile } from "@/hooks/useUploadFile";
import { useFileUrl } from "@/hooks/useFileUrl";
import { useUser } from "@/hooks/useUser";
import { joinUnits } from "@/lib/organizingUnits";
import { spring, fadeUp, staggerContainer, usePrefersReducedMotion } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { Field } from "@/components/shared/form-dialog";
import { PersianDatePicker } from "@/components/admin/PersianDatePicker";
import MediaPickerDialog from "@/components/admin/MediaPickerDialog";
import {
  glassShell,
  GlassPanel,
  GlassHeader,
  GlassScroll,
  GlassSection,
  SignatoryCard,
  PRIMARY_BTN,
} from "@/components/shared/glass-dialog";
import {
  GraduationCap,
  Information as Info,
  Users,
  UserSquare,
  Calendar,
  Clock,
  Check,
  ArrowLeft,
  ArrowRight,
  Save,
  Loader as Loader2,
  AlertTriangle,
} from "reicon-react";

/** Compact recap of step 1 shown atop step 2, with a jump-back edit action. */
function StepSummary({ formData, onEdit }) {
  const dateLabel = formData.date ? new Date(formData.date).toLocaleDateString("fa-IR") : "—";
  const rows = [
    { icon: Info, label: "نام دوره", value: formData.name || "—" },
    { icon: Calendar, label: "تاریخ", value: dateLabel },
    { icon: Clock, label: "مدت", value: formData.duration ? `${formData.duration} ساعت` : "—" },
  ];
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-3xl border border-white/60 bg-white/50 px-5 py-3 text-sm shadow-[0_16px_40px_-28px_rgba(2,44,34,0.4)] backdrop-blur-xl"
    >
      {rows.map((r) => (
        <span key={r.label} className="flex items-center gap-2 text-muted-foreground">
          <r.icon className="size-4 text-emerald-600" />
          <span className="font-semibold text-foreground">{r.value}</span>
          <span className="text-xs">({r.label})</span>
        </span>
      ))}
      <button
        type="button"
        onClick={onEdit}
        className="ms-auto cursor-pointer rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-500/20"
      >
        ویرایش
      </button>
    </motion.div>
  );
}

const emptyForm = {
  name: "",
  date: null,
  duration: "",
  organizingUnits: [],
  organizingUnit: "",
  organizingUnits2: [],
  organizingUnit2: "",
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
  const [currentStep, setCurrentStep] = useState(1);
  const reduced = usePrefersReducedMotion();
  const staggerProps = reduced
    ? {}
    : { variants: staggerContainer(0.08), initial: "hidden", animate: "show" };
  const refStampFile1 = useRef(null);
  const refStampFile2 = useRef(null);

  const stamp1UrlQuery = useFileUrl(courseData?.unitStamp);
  const stamp2UrlQuery = useFileUrl(courseData?.unitStamp2);

  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      if (isEditing) {
        setFormData({
          name: courseData.name || "",
          date: courseData.date ? new Date(courseData.date * 1000) : null,
          duration: courseData.duration || "",
          organizingUnits: courseData.organizingUnits || [],
          organizingUnit: courseData.organizingUnit || "",
          organizingUnits2: courseData.organizingUnits2 || [],
          organizingUnit2: courseData.organizingUnit2 || "",
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

  // Signatory 1's units are scoped to the head's own deputy (the course's
  // deputy, which the server validates against). Signatory 2's units come from
  // that user's own deputy (auto-derived from the chosen person).
  const s1Deputy = deputyName ? { name: deputyName, units: deputyUnits } : null;
  const s2Deputy = selectedSignatory2?.deputy?.name ? selectedSignatory2.deputy : null;

  const handleUnits1Change = (units) =>
    setFormData((prev) => ({ ...prev, organizingUnits: units, organizingUnit: joinUnits(units) }));
  const handleUnits2Change = (units) =>
    setFormData((prev) => ({ ...prev, organizingUnits2: units, organizingUnit2: joinUnits(units) }));

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
    // Step 1 of the create wizard only advances (no request); Enter/submit on
    // step 1 must never create the course prematurely.
    if (!isEditing && currentStep === 1) {
      if (!formData.name.trim() || !formData.date || !formData.duration) {
        setError("نام، تاریخ و مدت زمان دوره الزامی است.");
        return;
      }
      setCurrentStep(2);
      return;
    }
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
        organizingUnits2: formData.signatory2 ? (formData.organizingUnits2 || []) : [],
        organizingUnit2: formData.signatory2 ? (formData.organizingUnit2 || "") : "",
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

  const courseInfo = (
    <GlassSection icon={Info} title="اطلاعات دوره" description="نام، تاریخ و مدت زمان برگزاری">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>
    </GlassSection>
  );

  const signatories = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SignatoryCard
        icon={UserSquare}
        title="امضاکننده اول"
        subtitle="الزامی"
        selectedUser={selectedSignatory1}
        onSelectUser={(user) => {
          setSelectedSignatory1(user);
          setFormData((p) => ({ ...p, signatory: user?._id || null }));
        }}
        deputy={s1Deputy}
        units={formData.organizingUnits}
        onUnitsChange={handleUnits1Change}
        preview={stampPreview1}
        inputRef={refStampFile1}
        onFileChange={handleFile1Change}
        onOpenPicker={() => setPickerTarget("stamp1")}
        onClearStamp={clearStamp1}
        stampLabel="مهر اول"
      />
      <SignatoryCard
        icon={Users}
        title="امضاکننده دوم"
        subtitle="اختیاری"
        optional
        selectedUser={selectedSignatory2}
        onSelectUser={(user) => {
          setSelectedSignatory2(user);
          setFormData((p) => ({ ...p, signatory2: user?._id || null, organizingUnits2: [], organizingUnit2: "" }));
        }}
        onClear={() => {
          setSelectedSignatory2(null);
          setFormData((p) => ({ ...p, signatory2: null, organizingUnits2: [], organizingUnit2: "" }));
          clearStamp2();
        }}
        deputy={s2Deputy}
        units={formData.organizingUnits2}
        onUnitsChange={handleUnits2Change}
        preview={stampPreview2}
        inputRef={refStampFile2}
        onFileChange={handleFile2Change}
        onOpenPicker={() => setPickerTarget("stamp2")}
        onClearStamp={clearStamp2}
        stampLabel="مهر دوم"
      />
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
        <DialogContent className={glassShell("xl")}>
          <GlassPanel>
            <GlassHeader
              icon={GraduationCap}
              title={isEditing ? "ویرایش دوره" : "ایجاد دورهٔ جدید"}
              description="این دوره به معاونت شما اختصاص می‌یابد و در فهرست عمومی دوره‌ها نمایش داده نمی‌شود."
            >
              {!isEditing && (
                <Stepper
                  steps={["اطلاعات دوره", "امضاها و مهرها"]}
                  current={currentStep - 1}
                  onStepClick={(i) => i < currentStep - 1 && setCurrentStep(i + 1)}
                  className="mt-6"
                />
              )}
            </GlassHeader>

            <form onSubmit={handleSubmit} className="mt-6 flex min-h-0 flex-1 flex-col">
              <AnimatePresence initial={false}>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div role="alert" className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">
                      <AlertTriangle className="size-4 shrink-0" /> {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <GlassScroll>
                {isEditing ? (
                  <motion.div {...staggerProps} className="space-y-5">
                    {courseInfo}
                    {signatories}
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
                        <motion.div {...staggerProps}>{courseInfo}</motion.div>
                      ) : (
                        <motion.div {...staggerProps} className="space-y-5">
                          <StepSummary formData={formData} onEdit={() => setCurrentStep(1)} />
                          {signatories}
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </GlassScroll>

              <DialogFooter className="mt-6 sm:justify-between">
                {isEditing ? (
                  <>
                    <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                      انصراف
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className={PRIMARY_BTN}>
                      {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      ذخیره تغییرات
                    </Button>
                  </>
                ) : currentStep === 1 ? (
                  <>
                    <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                      انصراف
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className={PRIMARY_BTN}>
                      ادامه <ArrowLeft className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => setCurrentStep(1)} disabled={isSubmitting}>
                      <ArrowRight className="size-4" /> بازگشت
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className={PRIMARY_BTN}>
                      {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      ایجاد دوره
                    </Button>
                  </>
                )}
              </DialogFooter>
            </form>
          </GlassPanel>
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