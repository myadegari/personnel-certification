"use client";

import { useState, useEffect, useRef } from "react";
import { internalAxios } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import CertificatePatternCombobox from "./CertificatePatternCombobox";
import { useQuery } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { useFileUrl } from "@/hooks/useFileUrl";
import { useUploadFile, useCourseMutation } from "@/hooks/useCourseMutation";
import UserSearchCombobox from "./UserSearchCombobox";

const fetchCertificateSequences = async () => {
  const { data } = await internalAxios.get("/admin/certificate-sequences");
  return data;
};

// A self-contained component for the form fields
const CourseFormFields = ({
  formData,
  setFormData,
  sequences,
  selectedManager1,
  setSelectedManager1,
  selectedManager2,
  setSelectedManager2,
  stampFile1,
  handleFile1Change,
  stampPreview1,
  refStampFile1,
  stampFile2,
  handleFile2Change,
  stampPreview2,
  refStampFile2,
  isEditing = false,
}) => {
  const currentPattern = formData.certificateNumberPattern;
  const currentSequence = sequences.find((s) => s.pattern === currentPattern);

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
      {/* Course Details Section */}
      <div className="p-4 border rounded-md space-y-4">
        <h4 className="font-semibold mb-2">اطلاعات اولیه دوره</h4>
        <Input
          name="name"
          placeholder="نام دوره"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <div>
          <Label>تاریخ برگزاری</Label>
          <DatePicker
            calendar={persian}
            locale={persian_fa}
            value={formData.date}
            onChange={(dateObject) =>
              setFormData({ ...formData, date: dateObject?.toDate?.() || null })
            }
            placeholder="تاریخ برگزاری"
            inputClass="w-full px-3 py-2 border rounded-md h-10"
            containerClassName="w-full"
          />
        </div>
        <div>
          <Label>مهلت ثبت‌نام (اختیاری)</Label>
          <DatePicker
            calendar={persian}
            locale={persian_fa}
            value={formData.enrollmentDeadline}
            onChange={(dateObject) =>
              setFormData({
                ...formData,
                enrollmentDeadline: dateObject?.toDate?.() || null,
              })
            }
            placeholder="پیش‌فرض: یک روز پس از شروع دوره"
            inputClass="w-full px-3 py-2 border rounded-md h-10"
            containerClassName="flex-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            در صورت عدم انتخاب، مهلت به طور خودکار یک روز پس از تاریخ برگزاری
            دوره تعیین می‌شود.
          </p>
        </div>
        <Input
          name="duration"
          type="number"
          placeholder="مدت زمان (ساعت)"
          value={formData.duration}
          onChange={(e) =>
            setFormData({ ...formData, duration: e.target.value })
          }
          required
        />
        <Input
          name="organizingUnit"
          placeholder="واحد برگزار کننده"
          value={formData.organizingUnit}
          onChange={(e) =>
            setFormData({ ...formData, organizingUnit: e.target.value })
          }
          required
        />
        <CertificatePatternCombobox
          value={formData.certificateNumberPattern}
          onChange={(newValue) =>
            setFormData((prev) => ({
              ...prev,
              certificateNumberPattern: newValue,
            }))
          }
        />
        {currentSequence && (
          <div className="text-sm text-muted-foreground mt-1">
            <p>الگوی فعلی: {currentSequence.pattern}</p>
            <p>شماره بعدی: {currentSequence.lastNumber + 1}</p>
            {currentSequence.description && (
              <p>توضیحات: {currentSequence.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Signatories and Stamps Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Signatory 1 */}
        <div className="p-4 border rounded-md">
          <h4 className="font-semibold mb-2">امضاکننده اول</h4>
          <div className="space-y-4">
            <UserSearchCombobox
              selectedUser={selectedManager1}
              onSelectUser={(user) => {
                setSelectedManager1(user);
                setFormData({ ...formData, signatory: user?._id || null });
              }}
            />
            <div className="w-full space-y-2 flex justify-between items-center">
              <Label>تصویر مهر</Label>
              <Input
                ref={refStampFile1}
                id="stamp1"
                name="stamp1"
                type="file"
                accept="image/*"
                onChange={handleFile1Change}
                onClick={(e) => (e.target.value = null)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => refStampFile1.current?.click()}
              >
                {stampPreview1 ? "تغییر تصویر" : "بارگذاری تصویر"}
              </Button>
            </div>
            {stampPreview1 && (
              <div className="p-2 border rounded-md bg-gray-50 flex justify-center">
                <img src={stampPreview1} alt="مهر ۱" width={80} height={80} />
              </div>
            )}
          </div>
        </div>
        {/* Signatory 2 */}
        <div className="p-4 border rounded-md">
          <h4 className="font-semibold mb-2">امضاکننده دوم (اختیاری)</h4>
          <div className="space-y-4">
            <UserSearchCombobox
              selectedUser={selectedManager2}
              onSelectUser={(user) => {
                setSelectedManager2(user);
                setFormData({ ...formData, signatory2: user?._id || null });
              }}
            />
            <div className="w-full space-y-2 flex justify-between items-center">
              <Label>تصویر مهر</Label>
              <Input
                ref={refStampFile2}
                id="stamp2"
                name="stamp2"
                type="file"
                accept="image/*"
                onChange={handleFile2Change}
                onClick={(e) => (e.target.value = null)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => refStampFile2.current?.click()}
              >
                {stampPreview2 ? "تغییر تصویر" : "بارگذاری تصویر"}
              </Button>
            </div>
            {stampPreview2 && (
              <div className="p-2 border rounded-md bg-gray-50 flex justify-center">
                <img src={stampPreview2} alt="مهر ۲" width={80} height={80} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CourseFormModal({ isOpen, onClose, courseData }) {
  const uploadFileMutation = useUploadFile();
  const courseMutation = useCourseMutation();
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
  const [error, setError] = useState("");

  const isEditing = !!courseData;
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
    setCurrentStep(1);
    setCreatedCourseId(null);
    setError("");
  };

  const handleFile1Change = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setStampFile1(file);
      setStampPreview1(URL.createObjectURL(file));
    }
  };
  const handleFile2Change = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setStampFile2(file);
      setStampPreview2(URL.createObjectURL(file));
    }
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

      let stampId1 = courseData?.unitStamp || null;
      let stampId2 = courseData?.unitStamp2 || null;

      if (stampFile1) {
        stampId1 = await uploadFileMutation.mutateAsync({
          file: stampFile1,
          fileType: "stamp1",
          courseCode: formData.courseCode,
        });
      }
      if (stampFile2) {
        stampId2 = await uploadFileMutation.mutateAsync({
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
        unitStamp: stampId1,
        unitStamp2: stampId2,
      };

      await courseMutation.mutateAsync(finalData);
      onClose();
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.message || "خطایی رخ داد.";
      setError(errorMessage);
    }
  };

  const renderCreateMode = () => {
    if (currentStep === 1) {
      return (
        <>
          <div className="p-4 border rounded-md space-y-4">
            <h4 className="font-semibold mb-2">اطلاعات اولیه دوره</h4>
            <Input
              name="name"
              placeholder="نام دوره"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <div>
              {/* <Label>تاریخ برگزاری</Label> */}
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                value={formData.date}
                onChange={(date) =>
                  setFormData({ ...formData, date: date?.toDate?.() || null })
                }
                placeholder="تاریخ برگزاری"
                inputClass="w-full px-3 py-2 border rounded-md h-10"
                containerClassName="w-full"
              />
            </div>
            <div>
              {/* <Label>مهلت ثبت‌نام (اختیاری)</Label> */}
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                value={formData.enrollmentDeadline}
                onChange={(date) =>
                  setFormData({
                    ...formData,
                    enrollmentDeadline: date?.toDate?.() || null,
                  })
                }
                placeholder="پیش‌فرض: یک روز پس از شروع دوره"
                inputClass="w-full px-3 py-2 border rounded-md h-10"
                containerClassName="w-full"
              />
            </div>
            <Input
              name="duration"
              type="number"
              placeholder="مدت زمان (ساعت)"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: e.target.value })
              }
              required
            />
            <Input
              name="organizingUnit"
              placeholder="واحد برگزار کننده"
              value={formData.organizingUnit}
              onChange={(e) =>
                setFormData({ ...formData, organizingUnit: e.target.value })
              }
              required
            />
            <CertificatePatternCombobox
              value={formData.certificateNumberPattern}
              onChange={(val) =>
                setFormData((p) => ({ ...p, certificateNumberPattern: val }))
              }
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={courseMutation.isPending}>
              ادامه به مرحله بعد
            </Button>
          </DialogFooter>
        </>
      );
    }
    if (currentStep === 2) {
      return (
        <>
          <CourseFormFields
            {...{
              formData,
              setFormData,
              sequences,
              selectedManager1,
              setSelectedManager1,
              selectedManager2,
              setSelectedManager2,
              stampFile1,
              handleFile1Change,
              stampPreview1,
              refStampFile1,
              stampFile2,
              handleFile2Change,
              stampPreview2,
              refStampFile2,
              isEditing,
            }}
          />
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurrentStep(1)}
            >
              بازگشت
            </Button>
            <Button
              type="submit"
              disabled={
                courseMutation.isPending || uploadFileMutation.isPending
              }
            >
              اتمام و ذخیره
            </Button>
          </DialogFooter>
        </>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "ویرایش دوره" : `ایجاد دوره - مرحله ${currentStep}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-red-500 text-sm bg-red-50 p-3 rounded-md text-center">
              {error}
            </p>
          )}

          {isEditing ? (
            <>
              <CourseFormFields
                {...{
                  formData,
                  setFormData,
                  sequences,
                  selectedManager1,
                  setSelectedManager1,
                  selectedManager2,
                  setSelectedManager2,
                  stampFile1,
                  handleFile1Change,
                  stampPreview1,
                  refStampFile1,
                  stampFile2,
                  handleFile2Change,
                  stampPreview2,
                  refStampFile2,
                  isEditing,
                }}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={
                    courseMutation.isPending || uploadFileMutation.isPending
                  }
                >
                  ذخیره تغییرات
                </Button>
              </DialogFooter>
            </>
          ) : (
            renderCreateMode()
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
